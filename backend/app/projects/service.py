"""Project lifecycle service and in-process background run registry."""
from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone

from app.core.db import SessionLocal
from app.core.models import Project, new_id
from app.observability.events import audit, hub, logger
from app.orchestrator.orchestrator import Orchestrator

_RUNS: dict[str, asyncio.Task] = {}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60] or "project"


def create_project(requirement: str, name: str | None = None, config: dict | None = None) -> dict:
    with SessionLocal() as db:
        p = Project(id=new_id("prj_"), name=name or slugify(requirement), requirement=requirement,
                    status="created", phase="discovery", config=config or {})
        db.add(p)
        db.commit()
        out = project_dict(p)
    audit("human", "project_created", out["id"], {"name": out["name"]})
    return out


def project_dict(p: Project) -> dict:
    return {"id": p.id, "name": p.name, "requirement": p.requirement, "status": p.status,
            "phase": p.phase, "control": p.control, "config": p.config, "summary": p.summary,
            "error": p.error, "created_at": p.created_at.isoformat(), "updated_at": p.updated_at.isoformat()}


def get_project(project_id: str) -> dict | None:
    with SessionLocal() as db:
        p = db.get(Project, project_id)
        return project_dict(p) if p else None


def list_projects() -> list[dict]:
    with SessionLocal() as db:
        return [project_dict(p) for p in db.query(Project).order_by(Project.created_at.desc()).limit(100).all()]


async def start_project(project_id: str, orchestrator: Orchestrator | None = None) -> dict:
    if project_id in _RUNS and not _RUNS[project_id].done():
        return {"project_id": project_id, "status": "already_running"}
    orch = orchestrator or Orchestrator()

    async def runner():
        try:
            await orch.run(project_id)
        except Exception as exc:
            logger.exception("Project run failed: %s", project_id)
            await hub.publish(project_id, "run_failed", str(exc)[:1000])

    task = asyncio.create_task(runner(), name=f"aise-{project_id}")
    _RUNS[project_id] = task
    return {"project_id": project_id, "status": "started"}


def control_project(project_id: str, action: str) -> dict:
    allowed = {"pause": "paused", "resume": "running", "stop": "stopped"}
    if action not in allowed:
        raise ValueError(f"Unknown control action: {action}")
    with SessionLocal() as db:
        p = db.get(Project, project_id)
        if not p:
            raise KeyError(project_id)
        p.control = allowed[action]
        p.updated_at = datetime.now(timezone.utc)
        db.commit()
    audit("human", f"project_{action}", project_id)
    return {"project_id": project_id, "control": allowed[action]}
