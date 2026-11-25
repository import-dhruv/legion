"""Debugging, review rejection and API surface verification."""
import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.agents.definitions import AGENT_MAP
from app.agents.runtime import AgentRuntime
from app.core.db import SessionLocal
from app.core.models import Task
from app.llm_gateway.gateway import LLMGateway, set_gateway
from app.llm_gateway.providers import MockProvider
from app.main import app
from app.projects.service import create_project


def failing_then_fixing_responder(request, context):
    if "TOOL RESULTS" in context and "shell_run" in context:
        return json.dumps({"tool_calls": [
            {"name": "file_write", "arguments": {"path": "backend/fixed.py", "content": "VALUE = 42\n"}},
            {"name": "shell_run", "arguments": {"command": "python -m compileall -q backend"}},
        ]})
    if "TOOL RESULTS" in context:
        return "Bug reproduced, fixed and verified"
    return json.dumps({"tool_calls": [{"name": "shell_run",
                                       "arguments": {"command": "python -c 'raise ValueError(1)'"}}]})


@pytest.mark.asyncio
async def test_debugging_agent_reproduces_error_and_fixes_file():
    set_gateway(LLMGateway(provider=MockProvider(responder=failing_then_fixing_responder)))
    from app.task_engine.engine import TaskEngine
    debug_project = create_project("Debug project for tool loop verification", "debugproj")
    debug_pid = debug_project["id"]
    ids = TaskEngine().create_tasks(debug_pid, [
        __import__("app.task_engine.engine", fromlist=["TaskSpec"]).TaskSpec(
            "Reproduce and fix bug", "debugging_agent", phase="debugging",
            input_context={"extra_context": "raise ValueError in buggy.py"})])
    with SessionLocal() as db:
        task = db.get(Task, ids[0])
    result = await AgentRuntime().execute(AGENT_MAP["debugging_agent"], debug_pid, task)
    assert result.success
    assert any(c["name"] == "shell_run" and c["output"].get("result", {}).get("exit_code", 0) != 0
               for c in result.tool_calls)
    assert any(c["name"] == "file_write" for c in result.tool_calls)


@pytest.mark.asyncio
async def test_reviewer_can_reject_an_implementation():
    def rejecting(request, context):
        return json.dumps({"approved": False, "findings": [
            {"severity": "critical", "description": "SQL injection", "recommendation": "parameterize", "file": "db.py"}],
            "summary": "rejected"})
    set_gateway(LLMGateway(provider=MockProvider(responder=rejecting)))
    from app.task_engine.engine import TaskEngine
    review_project = create_project("Review project for rejection verification", "reviewproj")
    review_pid = review_project["id"]
    ids = TaskEngine().create_tasks(review_pid, [
        __import__("app.task_engine.engine", fromlist=["TaskSpec"]).TaskSpec(
            "Review code", "code_review_agent", phase="review")])
    with SessionLocal() as db:
        task = db.get(Task, ids[0])
    result = await AgentRuntime().execute(AGENT_MAP["code_review_agent"], review_pid, task)
    assert result.success
    assert json.loads(result.text)["approved"] is False


@pytest.mark.asyncio
async def test_api_control_plane_endpoints():
    project = create_project("A test project for the REST API surface.", "api-test")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        health = (await client.get("/api/health")).json()
        assert health["status"] == "ok" and health["agents"] == 30
        agents = (await client.get("/api/agents")).json()
        assert len(agents) == 30
        assert all("api_key" not in json.dumps(a).lower() for a in agents)
        listing = (await client.get("/api/projects")).json()
        assert any(p["id"] == project["id"] for p in listing)
        got = (await client.get(f"/api/projects/{project['id']}")).json()
        assert got["requirement"].startswith("A test project")
        control = (await client.post(f"/api/projects/{project['id']}/control", json={"action": "pause"})).json()
        assert control["control"] == "paused"
        resumed = (await client.post(f"/api/projects/{project['id']}/control", json={"action": "resume"})).json()
        assert resumed["control"] == "running"
        tasks = (await client.get(f"/api/projects/{project['id']}/tasks")).json()
        assert isinstance(tasks, list)
        approvals = (await client.get("/api/approvals")).json()
        assert isinstance(approvals, list)
        dashboard = (await client.get("/api/dashboard")).json()
        assert "estimated_cost_usd" in dashboard and "total" in dashboard["tasks"]
        usage = (await client.get("/api/usage")).json()
        assert "total_tokens" in usage
        files = (await client.get(f"/api/projects/{project['id']}/files")).json()
        assert isinstance(files, list)
        metrics = (await client.get("/api/metrics")).text
        assert "aise_llm_tokens_total" in metrics and "aise_running_agents" in metrics
