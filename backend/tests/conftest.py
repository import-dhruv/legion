"""Deterministic offline test harness: no real credentials or network required."""
import os
from pathlib import Path

os.environ["LLM_PROVIDER"] = "mock"
os.environ["LLM_PROVIDER_API_KEY"] = "test-only-placeholder-key"
os.environ["DATABASE_URL"] = "sqlite:////tmp/opencode/aise-test.db"
os.environ["REDIS_ENABLED"] = "false"
os.environ["SANDBOX_MODE"] = "local"
os.environ["REQUIRE_DEPLOYMENT_APPROVAL"] = "false"
os.environ["REQUIRE_ARCHITECTURE_APPROVAL"] = "false"
os.environ["WORKSPACE_ROOT"] = "/tmp/opencode/aise-test-workspaces"
os.environ["PROJECT_CONCURRENCY"] = "3"
os.environ["LLM_MAX_CONCURRENCY"] = "4"

Path("/tmp/opencode/aise-test.db").unlink(missing_ok=True)

import pytest

from app.core.bootstrap import init_db
from app.core.db import SessionLocal
from app.core.models import (AgentMetric, AgentRecord, Approval, Artifact, AuditLog,
                             Event, LLMUsage, MemoryItem, Message, Project, Task)
from app.llm_gateway.gateway import LLMGateway, set_gateway
from app.llm_gateway.providers import MockProvider


@pytest.fixture(autouse=True)
def fresh_state():
    import shutil
    shutil.rmtree("/tmp/opencode/aise-test-workspaces", ignore_errors=True)
    init_db()
    with SessionLocal() as db:
        for model in (LLMUsage, AgentMetric, Event, Message, Approval, Artifact, MemoryItem, Task, Project):
            db.query(model).delete()
        for fixed_id in ("dag", "retry", "resume", "dedupe"):
            db.add(Project(id=fixed_id, name=fixed_id, requirement="unit test fixture"))
        db.commit()
    agent_rows = None
    with SessionLocal() as db:
        agent_rows = [r for r in db.query(AgentRecord).all()]
        for r in agent_rows:
            r.status = "idle"
            r.current_task_id = None
        db.commit()
    set_gateway(LLMGateway(provider=MockProvider()))
    yield
    set_gateway(None)


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session
