"""REST + SSE control plane API."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func

from app.agents.definitions import AGENTS
from app.approvals.manager import ApprovalManager
from app.communication.bus import MessageBus
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.models import AgentRecord, Artifact, Event, LLMUsage, Message, Project, Task
from app.execution.workspace import ExecutionEnvironment
from app.llm_gateway.gateway import get_gateway
from app.memory.manager import MemoryManager
from app.observability.events import EventEncoder, hub
from app.projects import service as projects

router = APIRouter(prefix="/api")
approvals = ApprovalManager()
bus = MessageBus()
memory = MemoryManager()


class CreateProject(BaseModel):
    requirement: str = Field(min_length=10)
    name: str | None = None
    auto_start: bool = True
    config: dict[str, Any] = Field(default_factory=dict)


class ControlRequest(BaseModel):
    action: str = Field(pattern="^(pause|resume|stop)$")


class DecideRequest(BaseModel):
    approved: bool
    decided_by: str = "human"


class TaskUpdate(BaseModel):
    assigned_agent: str | None = None
    priority: int | None = None


@router.get("/health")
async def health():
    return {"status": "ok", "agents": len(AGENTS),
            "llm_provider": settings.llm_provider,
            "mock_mode": get_gateway().uses_mock}


@router.post("/projects")
async def create_project(body: CreateProject):
    p = projects.create_project(body.requirement, body.name, body.config)
    if body.auto_start:
        await projects.start_project(p["id"])
    return p


@router.get("/projects")
async def list_projects():
    return projects.list_projects()


@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    p = projects.get_project(project_id)
    if not p:
        raise HTTPException(404, "project not found")
    return p


@router.post("/projects/{project_id}/start")
async def start_project(project_id: str):
    if not projects.get_project(project_id):
        raise HTTPException(404, "project not found")
    return await projects.start_project(project_id)


@router.post("/projects/{project_id}/control")
async def control(project_id: str, body: ControlRequest):
    try:
        return projects.control_project(project_id, body.action)
    except KeyError:
        raise HTTPException(404, "project not found")
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.get("/projects/{project_id}/tasks")
async def tasks(project_id: str):
    with SessionLocal() as db:
        rows = db.query(Task).filter(Task.project_id == project_id).order_by(Task.created_at).all()
        return [{"id": t.id, "phase": t.phase, "title": t.title, "assigned_agent": t.assigned_agent,
                 "priority": t.priority, "status": t.status, "dependencies": t.dependencies,
                 "retry_count": t.retry_count, "error": t.error, "result": t.result[:600],
                 "logs": t.logs, "created_at": t.created_at.isoformat()} for t in rows]


@router.patch("/projects/{project_id}/tasks/{task_id}")
async def update_task(project_id: str, task_id: str, body: TaskUpdate):
    with SessionLocal() as db:
        t = db.get(Task, task_id)
        if not t or t.project_id != project_id:
            raise HTTPException(404, "task not found")
        if body.assigned_agent:
            t.assigned_agent = body.assigned_agent
        if body.priority is not None:
            t.priority = body.priority
        db.commit()
        return {"id": t.id, "assigned_agent": t.assigned_agent, "priority": t.priority}


@router.get("/projects/{project_id}/messages")
async def messages(project_id: str, limit: int = 200):
    return bus.list_messages(project_id, limit)


@router.get("/projects/{project_id}/artifacts")
async def artifacts(project_id: str, name: str | None = None):
    items = memory.artifacts(project_id, name)
    if name:
        return items[0] if items else {}
    return items


@router.get("/projects/{project_id}/events")
async def events(project_id: str, limit: int = 200):
    with SessionLocal() as db:
        rows = db.query(Event).filter(Event.project_id == project_id).order_by(
            Event.timestamp.desc()).limit(limit).all()
        return [{"id": r.id, "type": r.event_type, "message": r.message, "agent_id": r.agent_id,
                 "task_id": r.task_id, "data": r.data, "timestamp": r.timestamp.isoformat()}
                for r in reversed(rows)]


@router.get("/projects/{project_id}/files")
async def files(project_id: str):
    return ExecutionEnvironment().workspaces.list_files(project_id)


@router.get("/projects/{project_id}/files/{path:path}")
async def read_file(project_id: str, path: str):
    try:
        return {"path": path, "content": ExecutionEnvironment().workspaces.read(project_id, path)}
    except (ValueError, OSError) as exc:
        raise HTTPException(400, str(exc))


@router.get("/projects/{project_id}/git-history")
async def git_history(project_id: str):
    return ExecutionEnvironment().workspaces.history(project_id)


@router.get("/projects/{project_id}/stream")
async def stream(project_id: str):
    async def generator():
        q = await hub.subscribe(project_id)
        try:
            yield "event: connected\ndata: {\"project_id\": \"" + project_id + "\"}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"event: {event['event_type']}\ndata: {json.dumps(event, cls=EventEncoder)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            await hub.unsubscribe(project_id, q)

    return StreamingResponse(generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/agents")
async def list_agents():
    with SessionLocal() as db:
        rows = {r.id: r for r in db.query(AgentRecord).all()}
    return [{"id": a.id, "name": a.name, "role": a.role, "department": a.department,
             "level": a.level, "reports_to": a.reports_to, "model_tier": a.model_tier,
             "permissions": a.tools, "status": rows[a.id].status if a.id in rows else "idle",
             "current_task_id": rows[a.id].current_task_id if a.id in rows else None,
             "responsibilities": list(a.responsibilities)} for a in AGENTS]


@router.get("/usage")
async def usage():
    return get_gateway().usage_summary()


@router.get("/approvals")
async def list_approvals(project_id: str | None = None, status: str | None = None):
    return approvals.list(project_id, status)


@router.post("/approvals/{approval_id}/decide")
async def decide(approval_id: str, body: DecideRequest):
    try:
        return await approvals.decide(approval_id, body.approved, body.decided_by)
    except KeyError:
        raise HTTPException(404, "approval not found")


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    """Prometheus text exposition of live control-plane gauges."""
    data = await dashboard()
    lines = [
        "# HELP aise_projects_total Number of projects",
        "# TYPE aise_projects_total gauge",
        f"aise_projects_total {len(data['projects'])}",
        "# HELP aise_tasks_total Tasks by status",
        "# TYPE aise_tasks_total gauge",
    ]
    for key, value in data["tasks"].items():
        lines.append(f"aise_tasks_total{{status=\"{key}\"}} {value}")
    lines += [
        "# HELP aise_running_agents Agents currently executing",
        "# TYPE aise_running_agents gauge",
        f"aise_running_agents {data['running_agents']}",
        "# HELP aise_llm_tokens_total Tokens consumed",
        "# TYPE aise_llm_tokens_total counter",
        f"aise_llm_tokens_total {data['tokens']}",
        "# HELP aise_llm_cost_usd Estimated LLM spend",
        "# TYPE aise_llm_cost_usd counter",
        f"aise_llm_cost_usd {data['estimated_cost_usd']}",
    ]
    return "\n".join(lines) + "\n"


@router.get("/dashboard")
async def dashboard():
    with SessionLocal() as db:
        projects = db.query(Project).all()
        tasks = db.query(Task).all()
        running_agents = db.query(AgentRecord).filter(AgentRecord.status == "working").count()
        pending = approvals.list(status="pending")
        usage_row = db.query(func.count(LLMUsage.id), func.coalesce(func.sum(LLMUsage.total_tokens), 0),
                             func.coalesce(func.sum(LLMUsage.cost_usd), 0.0)).one()
    return {
        "projects": [projects_module_dict(p) for p in projects],
        "tasks": {"total": len(tasks),
                  "completed": sum(1 for t in tasks if t.status == "completed"),
                  "pending": sum(1 for t in tasks if t.status in ("pending", "in_progress")),
                  "blocked": sum(1 for t in tasks if t.status in ("blocked", "failed"))},
        "running_agents": running_agents,
        "pending_approvals": pending,
        "tokens": usage_row[1], "estimated_cost_usd": round(usage_row[2], 6),
        "llm_requests": usage_row[0],
    }


def projects_module_dict(p):
    return projects.project_dict(p)
