"""Run the complete autonomous workflow offline with the deterministic mock provider.

Usage: python scripts/run_demo.py "Build a task manager with login and teams"
"""
import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ["LLM_PROVIDER"] = "mock"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{ROOT / 'data' / 'demo.db'}")
os.environ.setdefault("WORKSPACE_ROOT", str(ROOT / "data" / "workspaces"))
os.environ.setdefault("REQUIRE_DEPLOYMENT_APPROVAL", "false")
os.environ.setdefault("REDIS_ENABLED", "false")

from app.core.bootstrap import init_db  # noqa: E402
from app.core.db import SessionLocal  # noqa: E402
from app.core.models import Artifact, Event, Project, Task  # noqa: E402
from app.llm_gateway.gateway import LLMGateway, set_gateway  # noqa: E402
from app.llm_gateway.providers import MockProvider  # noqa: E402
from app.orchestrator.orchestrator import Orchestrator  # noqa: E402
from app.projects.service import create_project  # noqa: E402


def responder(request, context):
    import json
    from app.llm_gateway.providers import MockProvider as MP
    schema = request.response_schema
    if schema and "tasks" in schema.get("properties", {}):
        return json.dumps({"tasks": [
            {"key": "api", "title": "Implement backend API", "agent": "backend_engineer",
             "phase": "implementation", "description": "Create REST API and persistence", "depends_on": [],
             "validation_criteria": ["Code compiles"]},
            {"key": "ui", "title": "Implement web interface", "agent": "frontend_engineer",
             "phase": "implementation", "description": "Create responsive UI", "depends_on": ["api"],
             "validation_criteria": ["UI files exist"]},
            {"key": "qa", "title": "Write and run tests", "agent": "qa_engineer", "phase": "testing",
             "description": "Create and execute tests", "depends_on": ["ui"]},
        ]})
    if "TOOL RESULTS" in context:
        return "Verified with tool evidence"
    if request.phase in ("implementation", "testing"):
        path = {"backend_engineer": "backend/app.py", "frontend_engineer": "frontend/page.tsx",
                "qa_engineer": "tests/test_app.py"}.get(request.agent_id, "generated/output.txt")
        return json.dumps({"tool_calls": [
            {"name": "file_write", "arguments": {"path": path, "content": f"# built by {request.agent_id}\n"}},
            {"name": "shell_run", "arguments": {"command": "echo build-ok"}},
        ]})
    return json.dumps(MP._value(schema, context)) if schema else "completed"


async def main(requirement: str):
    init_db()
    set_gateway(LLMGateway(provider=MockProvider(responder=responder)))
    project = create_project(requirement, "demo-project")
    print(f"Project: {project['id']}")
    result = await Orchestrator().run(project["id"])
    with SessionLocal() as db:
        tasks = db.query(Task).filter(Task.project_id == project["id"]).all()
        events = db.query(Event).filter(Event.project_id == project["id"]).count()
        artifacts = db.query(Artifact).filter(Artifact.project_id == project["id"]).count()
    print(f"Result: {result}")
    print(f"Tasks: {len(tasks)} | Events: {events} | Artifacts: {artifacts}")
    print("Workspace:", ROOT / "data" / "workspaces" / project["id"])


if __name__ == "__main__":
    requirement = " ".join(sys.argv[1:]) or "Build a full-stack task management application with authentication and teams"
    asyncio.run(main(requirement))
