"""Dependency-aware scheduling, parallel waves, retries, escalation and resume."""
import asyncio

import pytest

from app.agents.runtime import AgentResult
from app.core.db import SessionLocal
from app.core.models import Task
from app.task_engine.engine import TaskEngine, TaskSpec


class StubRuntime:
    def __init__(self, fail_keys=None):
        self.order = []
        self.fail_keys = fail_keys or set()
        self.lock = asyncio.Lock()

    async def execute(self, agent, project_id, task, extra_context=""):
        async with self.lock:
            self.order.append(task.title)
        fail = task.title in self.fail_keys
        return AgentResult(not fail, "done" if not fail else "simulated failure",
                           error="" if not fail else "boom")


def _titles(project_id):
    with SessionLocal() as db:
        return [t.title for t in db.query(Task).filter(Task.project_id == project_id).all()]


@pytest.mark.asyncio
async def test_dependency_order_and_parallel_waves():
    stub = StubRuntime()
    engine = TaskEngine(stub)
    engine.create_tasks("dag", [
        TaskSpec("foundation", "backend_engineer", dependencies=None),
        TaskSpec("frontend", "frontend_engineer", dependencies=["foundation"]),
        TaskSpec("api", "backend_engineer", dependencies=["foundation"]),
        TaskSpec("tests", "qa_engineer", dependencies=["frontend", "api"], phase="testing"),
    ])
    with SessionLocal() as db:
        by_title = {t.title: t for t in db.query(Task).filter(Task.project_id == "dag").all()}
        by_title["frontend"].dependencies = [by_title["foundation"].id]
        by_title["api"].dependencies = [by_title["foundation"].id]
        by_title["tests"].dependencies = [by_title["frontend"].id, by_title["api"].id]
        db.commit()
    result = await engine.run("dag")
    assert result["completed"] == 4 and result["failed"] == 0
    assert stub.order[0] == "foundation"
    assert set(stub.order[1:3]) == {"frontend", "api"}
    assert stub.order[-1] == "tests"


@pytest.mark.asyncio
async def test_failure_retries_then_escalates():
    stub = StubRuntime(fail_keys={"flaky"})
    engine = TaskEngine(stub)
    engine.create_tasks("retry", [TaskSpec("flaky", "backend_engineer", max_retries=1)])
    await engine.run("retry")
    with SessionLocal() as db:
        t = db.query(Task).filter(Task.project_id == "retry").first()
    assert stub.order.count("flaky") == 2
    assert t.status == "blocked"
    assert t.retry_count == 2


def test_interrupted_tasks_are_reset_for_resume():
    engine = TaskEngine(StubRuntime())
    engine.create_tasks("resume", [TaskSpec("unfinished", "backend_engineer")])
    with SessionLocal() as db:
        t = db.query(Task).filter(Task.project_id == "resume").first()
        t.status = "in_progress"
        db.commit()
    assert engine.resume_interrupted("resume") == 1
    with SessionLocal() as db:
        assert db.query(Task).filter(Task.project_id == "resume").first().status == "pending"


def test_duplicate_tasks_are_not_created():
    engine = TaskEngine(StubRuntime())
    engine.create_tasks("dedupe", [TaskSpec("same", "backend_engineer", dedupe_key="k1")])
    engine.create_tasks("dedupe", [TaskSpec("same", "backend_engineer", dedupe_key="k1")])
    assert _titles("dedupe") == ["same"]
