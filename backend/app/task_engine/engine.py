"""Dependency-aware, persistent task scheduler with retries and parallel waves."""
from __future__ import annotations

import asyncio
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone

from app.agents.definitions import AGENT_MAP
from app.agents.runtime import AgentResult, AgentRuntime, agent_for
from app.communication.bus import MessageBus
from app.core.db import SessionLocal
from app.core.models import Task, new_id
from app.memory.manager import MemoryManager
from app.observability.events import hub


@dataclass
class TaskSpec:
    title: str
    agent: str
    phase: str = "implementation"
    description: str = ""
    dependencies: list[str] | None = None
    priority: int = 5
    validation_criteria: list[str] | None = None
    input_context: dict | None = None
    max_retries: int = 2
    dedupe_key: str = ""


class TaskEngine:
    def __init__(self, runtime: AgentRuntime | None = None):
        self.runtime = runtime or AgentRuntime()
        self.bus = MessageBus()
        self.memory = MemoryManager()

    def create_tasks(self, project_id: str, specs: list[TaskSpec]) -> list[str]:
        ids: list[str] = []
        with SessionLocal() as db:
            for spec in specs:
                key = spec.dedupe_key or hashlib.sha256(
                    f"{project_id}:{spec.title}:{spec.agent}".encode()).hexdigest()[:16]
                existing = db.query(Task).filter(Task.project_id == project_id,
                                                 Task.dedupe_key == key).first()
                if existing:
                    ids.append(existing.id)
                    continue
                task = Task(
                    id=new_id("tsk_"), project_id=project_id, phase=spec.phase, title=spec.title,
                    description=spec.description, assigned_agent=spec.agent, priority=spec.priority,
                    dependencies=spec.dependencies or [], status="pending",
                    validation_criteria=spec.validation_criteria or [],
                    input_context=spec.input_context or {}, max_retries=spec.max_retries,
                    dedupe_key=key,
                )
                db.add(task)
                db.flush()
                ids.append(task.id)
            db.commit()
        return ids

    @staticmethod
    def _ready(db, project_id: str) -> list[Task]:
        tasks = db.query(Task).filter(Task.project_id == project_id, Task.status == "pending").all()
        by_id = {t.id: t for t in db.query(Task).filter(Task.project_id == project_id).all()}
        ready = []
        for t in tasks:
            deps = [by_id.get(d) for d in t.dependencies or []]
            if all(d and d.status == "completed" for d in deps):
                ready.append(t)
        ready.sort(key=lambda t: (-t.priority, t.created_at))
        return ready

    def resume_interrupted(self, project_id: str) -> int:
        with SessionLocal() as db:
            rows = db.query(Task).filter(Task.project_id == project_id,
                                         Task.status.in_(["in_progress", "running"])).all()
            for t in rows:
                t.status = "pending"
                t.logs = (t.logs or []) + [{"event": "resumed_after_restart", "at": datetime.now(timezone.utc).isoformat()}]
            db.commit()
            return len(rows)

    async def run(self, project_id: str, concurrency: int | None = None,
                  stop_phases: set[str] | None = None) -> dict:
        """Execute all currently runnable tasks until none remain or project is stopped."""
        from app.core.config import settings
        concurrency = concurrency or settings.project_concurrency
        completed = failed = 0
        while True:
            control, phase = self._control(project_id)
            if control == "stopped":
                await hub.publish(project_id, "execution_stopped", "Execution stopped by human")
                break
            if control == "paused":
                await hub.publish(project_id, "execution_paused", "Execution paused by human")
                await asyncio.sleep(1)
                continue
            with SessionLocal() as db:
                ready = self._ready(db, project_id)
                ids = [t.id for t in ready if not stop_phases or t.phase not in stop_phases]
                if not ids:
                    remaining = db.query(Task).filter(Task.project_id == project_id,
                        Task.status.in_(["pending", "in_progress"])).count()
                    if remaining == 0:
                        break
                    blocked = db.query(Task).filter(Task.project_id == project_id,
                        Task.status == "blocked").count()
                    if blocked:
                        break
                    await asyncio.sleep(0.3)
                    continue
            # Mark in progress before launching the wave (prevents duplicate execution)
            with SessionLocal() as db:
                for tid in ids:
                    t = db.get(Task, tid)
                    if t:
                        t.status = "in_progress"
                        t.started_at = datetime.now(timezone.utc)
                db.commit()
            results = await asyncio.gather(*[self._execute_one(project_id, tid) for tid in ids],
                                           return_exceptions=True)
            for tid, res in zip(ids, results):
                if isinstance(res, Exception):
                    failed += 1
                    await self._fail(project_id, tid, str(res))
                elif res.success:
                    completed += 1
                else:
                    failed += 1
        return {"completed": completed, "failed": failed}

    @staticmethod
    def _control(project_id: str) -> tuple[str, str]:
        from app.core.models import Project
        with SessionLocal() as db:
            p = db.get(Project, project_id)
            return (p.control, p.phase) if p else ("stopped", "")

    async def _execute_one(self, project_id: str, task_id: str) -> AgentResult:
        with SessionLocal() as db:
            task = db.get(Task, task_id)
            if not task:
                return AgentResult(False, "", error="task missing")
            agent = agent_for(task)
            title, description, ctx, validation, retry = (
                task.title, task.description, dict(task.input_context),
                list(task.validation_criteria), task.retry_count)
        result = await self.runtime.execute(agent, project_id, task,
                                            extra_context=ctx.pop("extra_context", ""))
        with SessionLocal() as db:
            t = db.get(Task, task_id)
            if not t:
                return result
            t.logs = (t.logs or []) + [{"attempt": retry + 1, "success": result.success,
                                        "tokens": result.tokens, "error": result.error[:1000],
                                        "at": datetime.now(timezone.utc).isoformat()}]
            t.result = result.text[:20000]
            if result.success:
                t.status = "completed"
                t.completion_status = "verified"
                t.completed_at = datetime.now(timezone.utc)
                if result.artifacts:
                    for art in result.artifacts:
                        self.memory.store_artifact(project_id, art["name"], art["content"], art["kind"], task_id)
                for art in t.output_artifacts:
                    content = self.memory.latest(project_id, art)
                    if not content:
                        content = result.text
                    self.memory.store_artifact(project_id, art, content, "document", task_id)
            else:
                t.status = "failed"
                t.error = result.error[:4000]
                t.retry_count += 1
            db.commit()
        if not result.success:
            await self._fail(project_id, task_id, result.error)
        return result

    async def _fail(self, project_id: str, task_id: str, error: str) -> None:
        with SessionLocal() as db:
            t = db.get(Task, task_id)
            if not t:
                return
            attempts = t.retry_count
            max_retries = t.max_retries
            if attempts > max_retries:
                t.status = "blocked"
                await_msg = f"Task {t.title} blocked after {attempts} attempts: {error[:400]}"
            else:
                t.status = "pending"
                t.input_context = dict(t.input_context or {})
                t.input_context["extra_context"] = (
                    f"PREVIOUS ATTEMPT FAILED. Error:\n{error[:3000]}\nAnalyze and fix it; do not repeat the mistake.")
                await_msg = f"Retrying {t.title} ({attempts}/{max_retries}): {error[:300]}"
            db.commit()
        await self.bus.report_failure(project_id, "task_engine", task_id, error)
        await hub.publish(project_id, "task_failed" if attempts > max_retries else "task_retry",
                          await_msg, "engineering_manager", task_id)
        if attempts > max_retries:
            await self.bus.send(project_id, "engineering_manager", "cto", "escalation",
                                {"task": task_id, "reason": error[:2000]}, task_id)
