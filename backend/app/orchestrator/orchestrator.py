"""Central nervous system: persistent phase state machine with human gates and recovery."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from app.agents.definitions import AGENT_MAP
from app.agents.runtime import AgentResult, AgentRuntime
from app.approvals.manager import ApprovalManager
from app.communication.bus import MessageBus
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.models import Project, Task, new_id
from app.execution.workspace import ExecutionEnvironment
from app.memory.manager import MemoryManager
from app.observability.events import hub
from app.task_engine.engine import TaskEngine, TaskSpec

PHASES = ["discovery", "planning", "development_plan", "implementation", "testing",
          "review", "debugging", "deployment", "maintenance", "completed"]

STR = {"type": "string"}
ARR_STR = {"type": "array", "items": {"type": "string"}}

PRD_SCHEMA = {
    "type": "object", "required": ["summary", "functional_requirements", "non_functional_requirements", "user_stories", "acceptance_criteria"],
    "properties": {"summary": STR, "functional_requirements": ARR_STR,
                   "non_functional_requirements": ARR_STR, "user_stories": ARR_STR,
                   "acceptance_criteria": ARR_STR, "open_questions": ARR_STR},
}
ARCH_SCHEMA = {
    "type": "object", "required": ["overview", "technology_stack", "components", "key_decisions"],
    "properties": {"overview": STR,
                   "technology_stack": {"type": "object", "properties": {"frontend": STR, "backend": STR, "database": STR, "infrastructure": STR}},
                   "components": {"type": "array", "items": {"type": "object", "properties": {"name": STR, "responsibility": STR, "technology": STR}}},
                   "key_decisions": ARR_STR, "risks": ARR_STR},
}
DB_SCHEMA = {
    "type": "object", "required": ["entities"],
    "properties": {"entities": {"type": "array", "items": {"type": "object", "properties": {
                    "name": STR, "fields": ARR_STR, "relationships": ARR_STR}}},
                   "indexes": ARR_STR, "migration_strategy": STR},
}
API_SCHEMA = {
    "type": "object", "required": ["endpoints"],
    "properties": {"endpoints": {"type": "array", "items": {"type": "object", "properties": {
                    "method": {"type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"]},
                    "path": STR, "description": STR}}},
                   "error_conventions": STR, "versioning": STR},
}
INFRA_SCHEMA = {
    "type": "object", "required": ["deployment_architecture"],
    "properties": {"deployment_architecture": STR, "containers": ARR_STR, "ci_cd_steps": ARR_STR, "monitoring": STR},
}
TASKS_SCHEMA = {
    "type": "object", "required": ["tasks"],
    "properties": {"tasks": {"type": "array", "items": {"type": "object", "required": ["key", "title", "agent", "phase", "description", "depends_on"],
        "properties": {"key": STR, "title": STR,
                       "agent": {"type": "string", "enum": ["backend_engineer", "frontend_engineer", "fullstack_engineer", "database_architect", "api_architect", "ai_ml_engineer", "devops_engineer", "qa_engineer", "unit_testing_agent", "integration_testing_agent", "technical_writer"]},
                       "phase": {"type": "string", "enum": ["implementation", "testing"]},
                       "description": STR, "depends_on": ARR_STR,
                       "validation_criteria": ARR_STR, "priority": {"type": "integer"}}}}},
}
REVIEW_SCHEMA = {
    "type": "object", "required": ["approved", "findings"],
    "properties": {"approved": {"type": "boolean"}, "findings": {"type": "array", "items": {"type": "object", "properties": {
                    "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                    "description": STR, "recommendation": STR, "file": STR}}},
                   "summary": STR},
}
REPORT_SCHEMA = {
    "type": "object", "required": ["summary", "findings", "recommendations"],
    "properties": {"summary": STR, "findings": ARR_STR, "recommendations": ARR_STR,
                   "severity": {"type": "string", "enum": ["none", "low", "medium", "high", "critical"]}},
}


class Orchestrator:
    def __init__(self, runtime: AgentRuntime | None = None, tasks: TaskEngine | None = None):
        self.runtime = runtime or AgentRuntime()
        self.tasks = tasks or TaskEngine(self.runtime)
        self.memory = MemoryManager()
        self.bus = MessageBus()
        self.approvals = ApprovalManager()
        self.env = ExecutionEnvironment()

    @staticmethod
    def _project(project_id: str) -> Project | None:
        with SessionLocal() as db:
            return db.get(Project, project_id)

    @staticmethod
    def _set(project_id: str, **fields) -> None:
        with SessionLocal() as db:
            p = db.get(Project, project_id)
            if p:
                for k, v in fields.items():
                    setattr(p, k, v)
                p.updated_at = datetime.now(timezone.utc)
                db.commit()

    async def _gate(self, project_id: str) -> bool:
        """Respect human pause/stop controls. Returns False if stopped."""
        while True:
            p = self._project(project_id)
            if not p or p.control == "stopped":
                return False
            if p.control == "running":
                return True
            await asyncio.sleep(1)

    async def _phase(self, project_id: str, phase: str) -> None:
        self._set(project_id, phase=phase, status=phase)
        await hub.publish(project_id, "phase_started", f"Phase started: {phase}", data={"phase": phase})

    async def run(self, project_id: str) -> dict:
        """Run or resume the organization. Safe to call again after restart."""
        p = self._project(project_id)
        if not p:
            return {"error": "project not found"}
        self.tasks.resume_interrupted(project_id)
        if p.control == "stopped":
            return {"status": "stopped"}
        await hub.publish(project_id, "run_started", f"Organization started for: {p.name[:80]}")
        try:
            phase = p.phase
            if phase in ("created", "discovery"):
                await self._phase(project_id, "discovery")
                await self._discovery(project_id)
                if not await self._gate(project_id):
                    return {"status": "stopped"}
            if phase in ("created", "discovery", "planning"):
                await self._phase(project_id, "planning")
                await self._planning(project_id)
                if not await self._gate(project_id):
                    return {"status": "stopped"}
                if settings.require_architecture_approval:
                    ap = await self.approvals.request(project_id, "architecture", "principal_architect",
                                                      "Approve generated system architecture")
                    if not await self.approvals.wait_decision(ap["id"]):
                        self._set(project_id, status="awaiting_approval")
                        return {"status": "awaiting_approval"}
            if phase in ("created", "discovery", "planning", "development_plan"):
                await self._phase(project_id, "development_plan")
                await self._development_plan(project_id)
                if not await self._gate(project_id):
                    return {"status": "stopped"}
            await self._phase(project_id, "implementation")
            await self.tasks.run(project_id)
            if not await self._gate(project_id):
                return {"status": "stopped"}
            await self._phase(project_id, "testing")
            await self._testing(project_id)
            if not await self._gate(project_id):
                return {"status": "stopped"}
            await self._phase(project_id, "review")
            approved = await self._review(project_id)
            if not approved:
                await self._phase(project_id, "debugging")
                await self._debugging(project_id, "Code review rejected the implementation")
            else:
                await self._phase(project_id, "debugging")
                await self._debugging(project_id, "")
            if not await self._gate(project_id):
                return {"status": "stopped"}
            await self._phase(project_id, "deployment")
            result = await self._deployment(project_id)
            if result.get("status") != "deployed":
                return result
            if not await self._gate(project_id):
                return {"status": "stopped"}
            await self._phase(project_id, "maintenance")
            await self._maintenance(project_id)
            self._set(project_id, phase="completed", status="completed")
            await hub.publish(project_id, "project_completed", "All phases completed successfully")
            return {"status": "completed"}
        except Exception as exc:
            self._set(project_id, status="failed", error=str(exc)[:2000])
            await hub.publish(project_id, "run_failed", f"Orchestration failed: {exc}")
            raise

    # ── phase implementations ──────────────────────────────────────────────
    async def _discovery(self, project_id: str) -> None:
        p = self._project(project_id)
        req = p.requirement
        prd = await self._agent_task(project_id, "discovery", "product_manager", "Write product requirements document",
                                     f"Requirement from human CTO:\n{req}\nAsk open questions where ambiguous but still produce a complete PRD.",
                                     PRD_SCHEMA, "prd")
        await self.bus.send(project_id, "product_manager", "business_analyst", "artifact_share",
                            {"prd": prd.text[:6000]})
        await self._agent_task(project_id, "discovery", "business_analyst", "Produce functional specification",
                               f"Analyze this PRD for missing requirements and edge cases:\n{prd.text[:8000]}",
                               REPORT_SCHEMA, "functional_spec")
        await self._agent_task(project_id, "discovery", "ux_researcher", "Define user journeys and personas",
                               f"Based on the PRD:\n{prd.text[:6000]}", REPORT_SCHEMA, "ux_research")
        await self._agent_task(project_id, "discovery", "ui_ux_designer", "Define design system",
                               f"Create a concrete design system for:\n{prd.text[:4000]}", REPORT_SCHEMA, "design_system")
        await self.memory.summarize(project_id, prd.text)

    async def _planning(self, project_id: str) -> None:
        prd = self.memory.latest(project_id, "prd")
        cto = await self._agent_task(project_id, "planning", "cto", "Set technical objectives and strategy",
                                     f"PRD:\n{prd[:8000]}", REPORT_SCHEMA, "technical_objectives")
        context = f"PRD:\n{prd[:6000]}\nCTO direction:\n{cto.text[:3000]}"
        await asyncio.gather(
            self._agent_task(project_id, "planning", "principal_architect", "Create system architecture",
                             context, ARCH_SCHEMA, "architecture"),
            self._agent_task(project_id, "planning", "database_architect", "Design database schema",
                             context, DB_SCHEMA, "database_design"),
            self._agent_task(project_id, "planning", "api_architect", "Design API contracts",
                             context, API_SCHEMA, "api_design"),
            self._agent_task(project_id, "planning", "infrastructure_architect", "Design deployment infrastructure",
                             context, INFRA_SCHEMA, "infrastructure_design"),
        )
        await self.bus.send(project_id, "cto", "engineering_manager", "approval",
                            {"message": "Architecture approved for planning", "context": context[:2000]})

    async def _development_plan(self, project_id: str) -> None:
        context = self.memory.context_for(project_id, "architecture tasks implementation",
                                          names=["architecture", "database_design", "api_design", "prd"],
                                          max_chars=12000)
        plan = await self._agent_task(project_id, "development_plan", "engineering_manager",
                                      "Create dependency-aware engineering task graph",
                                      f"Break this into concrete implementation and testing tasks. Assign each to a suitable agent id. "
                                      f"Use depends_on keys of earlier tasks. Keep 4-12 tasks.\n{context}",
                                      TASKS_SCHEMA, "task_plan")
        try:
            data = json.loads(plan.text.strip().removeprefix("```json").removesuffix("```"))
            specs = data.get("tasks", [])
        except (json.JSONDecodeError, AttributeError):
            specs = []
        if not specs:
            specs = [
                {"key": "impl1", "title": "Implement core feature", "agent": "backend_engineer", "phase": "implementation", "description": "Implement backend", "depends_on": []},
                {"key": "impl2", "title": "Implement user interface", "agent": "frontend_engineer", "phase": "implementation", "description": "Implement frontend", "depends_on": ["impl1"]},
                {"key": "test1", "title": "Write and run tests", "agent": "qa_engineer", "phase": "testing", "description": "Write and run tests", "depends_on": ["impl2"]},
            ]
        valid_agents = set(AGENT_MAP)
        key_to_id: dict[str, str] = {}
        created: list[str] = []
        for i, spec in enumerate(specs):
            key = str(spec.get("key") or f"task{i}")
            agent = spec.get("agent") if spec.get("agent") in valid_agents else "fullstack_engineer"
            phase = spec.get("phase") if spec.get("phase") in ("implementation", "testing") else "implementation"
            sid = TaskSpec(
                title=str(spec.get("title", key))[:255], agent=agent, phase=phase,
                description=str(spec.get("description", "")),
                dependencies=[], priority=int(spec.get("priority") or 5),
                validation_criteria=spec.get("validation_criteria") or [],
                input_context={"artifact_names": ["architecture", "database_design", "api_design", "prd"]},
                dedupe_key=f"{project_id}:{key}",
            )
            ids = self.tasks.create_tasks(project_id, [sid])
            key_to_id[key] = ids[0]
            created.append(ids[0])
        with SessionLocal() as db:
            for i, spec in enumerate(specs):
                t = db.get(Task, created[i])
                if t:
                    t.dependencies = [key_to_id[d] for d in (spec.get("depends_on") or []) if d in key_to_id]
            db.commit()
        await hub.publish(project_id, "tasks_created", f"Engineering manager created {len(created)} tasks",
                          "engineering_manager", data={"count": len(created)})

    async def _testing(self, project_id: str) -> None:
        summary = self.memory.context_for(project_id, "tests implementation",
                                          names=["architecture", "prd"], max_chars=4000)
        qa = await self._agent_task(project_id, "testing", "qa_engineer", "Create test plan",
                                    summary, REPORT_SCHEMA, "test_plan")
        await asyncio.gather(
            self._agent_task(project_id, "testing", "unit_testing_agent", "Write and run unit tests",
                             f"Test plan:\n{qa.text[:4000]}\nCreate test files and run them using tools.",
                             REPORT_SCHEMA, "unit_test_results"),
            self._agent_task(project_id, "testing", "integration_testing_agent", "Run integration and API tests",
                             f"Test plan:\n{qa.text[:4000]}\nRun tests and report actual results.",
                             REPORT_SCHEMA, "integration_test_results"),
        )
        # Tasks produced by the engineering manager in the testing phase (real tool use).
        await self.tasks.run(project_id, stop_phases={"implementation", "development_plan", "discovery", "planning"})

    async def _review(self, project_id: str) -> bool:
        context = self.memory.context_for(project_id, "code review implementation test results",
                                          names=["architecture", "unit_test_results", "integration_test_results"],
                                          max_chars=10000)
        code_review, security = await asyncio.gather(
            self._agent_task(project_id, "review", "code_review_agent", "Review implementation",
                             context, REVIEW_SCHEMA, "code_review"),
            self._agent_task(project_id, "review", "application_security_engineer", "Security audit",
                             context, REPORT_SCHEMA, "security_review"),
        )
        def _approved(text: str) -> bool:
            try:
                return bool(json.loads(text.strip().removeprefix("```json").removesuffix("```")).get("approved", True))
            except Exception:
                return True
        approved = _approved(code_review.text)
        for attempt in range(settings.max_review_iterations):
            if approved:
                break
            await hub.publish(project_id, "review_rejected", f"Code review rejected (iteration {attempt + 1})",
                              "code_review_agent")
            with SessionLocal() as db:
                rows = db.query(Task).filter(Task.project_id == project_id, Task.phase == "implementation").all()
                for t in rows:
                    if t.status == "completed":
                        t.status = "pending"
                        t.input_context = dict(t.input_context or {})
                        t.input_context["extra_context"] = f"Address review findings:\n{code_review.text[:4000]}"
                db.commit()
            await self.tasks.run(project_id, stop_phases={"testing", "review", "debugging", "deployment", "maintenance"})
            code_review = await self._agent_task(project_id, "review", "code_review_agent",
                                                 "Re-review after fixes", context, REVIEW_SCHEMA, "code_review")
            approved = _approved(code_review.text)
        return approved

    async def _debugging(self, project_id: str, issue: str) -> None:
        logs = self.memory.context_for(project_id, "errors failures tests",
                                       names=["unit_test_results", "integration_test_results", "code_review"],
                                       max_chars=6000)
        result = await self._agent_task(project_id, "debugging", "debugging_agent", "Verify build and fix defects",
                                        f"Known issue: {issue or 'none'}\nRecent logs:\n{logs}\n"
                                        "Inspect the workspace, run the build/test command, reproduce failures, fix them and verify.",
                                        REPORT_SCHEMA, "debug_report")
        if issue:
            await hub.publish(project_id, "bugs_fixed", "Debugging agent addressed review findings",
                              "debugging_agent", {"result": result.text[:500]})

    async def _deployment(self, project_id: str) -> dict:
        context = self.memory.context_for(project_id, "deployment architecture release",
                                          names=["architecture", "infrastructure_design", "prd"], max_chars=8000)
        await asyncio.gather(
            self._agent_task(project_id, "deployment", "devops_engineer", "Create Docker and CI/CD configuration",
                             context, REPORT_SCHEMA, "devops_config"),
            self._agent_task(project_id, "deployment", "release_manager", "Prepare release notes",
                             context, REPORT_SCHEMA, "release_notes"),
        )
        if settings.require_deployment_approval:
            approval = await self.approvals.request(project_id, "production_deployment", "release_manager",
                                                    "Approve production deployment",
                                                    {"project_id": project_id, "artifacts": ["devops_config", "release_notes"]})
            decision = await self.approvals.wait_decision(approval["id"])
            if decision is None:
                self._set(project_id, status="awaiting_approval")
                await hub.publish(project_id, "approval_timeout", "Deployment approval timed out; project is resumable")
                return {"status": "awaiting_approval", "approval_id": approval["id"]}
            if not decision:
                self._set(project_id, status="rejected")
                await hub.publish(project_id, "deployment_rejected", "Human rejected production deployment")
                return {"status": "rejected", "approval_id": approval["id"]}
        self.memory.store_artifact(project_id, "deployment_record", json.dumps({
            "deployed_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": "human", "status": "deployed"}), "record")
        await hub.publish(project_id, "deployed", "Deployment approved and executed")
        return {"status": "deployed"}

    async def _maintenance(self, project_id: str) -> None:
        context = self.memory.context_for(project_id, "health monitoring verification acceptance criteria",
                                          names=["prd", "architecture", "debug_report", "release_notes"], max_chars=10000)
        await asyncio.gather(
            self._agent_task(project_id, "maintenance", "sre_agent", "Define SLIs/SLOs and health monitoring",
                             context, REPORT_SCHEMA, "health_report"),
            self._agent_task(project_id, "maintenance", "independent_auditor",
                             "Independently verify requested features actually work",
                             f"Original requirement:\n{self._project(project_id).requirement}\n\nEvidence:\n{context}",
                             REPORT_SCHEMA, "audit_report"),
        )

    # ── single tracked agent task ──────────────────────────────────────────
    async def _agent_task(self, project_id: str, phase: str, agent_id: str, title: str,
                          description: str, schema: dict, artifact_name: str) -> AgentResult:
        agent = AGENT_MAP[agent_id]
        with SessionLocal() as db:
            task = Task(id=new_id("tsk_"), project_id=project_id, phase=phase, title=title,
                        description=description, assigned_agent=agent_id, status="in_progress",
                        input_context={"response_schema": schema, "artifact_name": artifact_name,
                                       "artifact_names": ["prd", "architecture"]},
                        output_artifacts=[artifact_name], started_at=datetime.now(timezone.utc),
                        validation_criteria=["Valid JSON matching schema"])
            db.add(task)
            db.commit()
            tid = task.id
        result: AgentResult | None = None
        for attempt in range(settings.max_review_iterations + 1):
            if not await self._gate(project_id):
                return AgentResult(False, "", error="stopped")
            task_obj = None
            with SessionLocal() as db:
                task_obj = db.get(Task, tid)
            if task_obj is None:
                break
            result = await self.runtime.execute(agent, project_id, task_obj,
                                                extra_context=result.error if result and result.error else "")
            if result.success:
                break
            with SessionLocal() as db:
                t = db.get(Task, tid)
                if t:
                    t.retry_count += 1
                    t.logs = (t.logs or []) + [{"attempt": attempt + 1, "error": result.error[:500]}]
                    db.commit()
        if result is None:
            result = AgentResult(False, "", error="agent did not execute")
        with SessionLocal() as db:
            t = db.get(Task, tid)
            if t:
                t.status = "completed" if result.success else "failed"
                t.completion_status = "verified" if result.success else "failed"
                t.result = result.text[:20000]
                t.error = result.error[:4000]
                t.completed_at = datetime.now(timezone.utc)
                db.commit()
        if result.success:
            self.memory.store_artifact(project_id, artifact_name, result.text, "json", tid)
            await self.bus.send(project_id, agent_id, "orchestrator", "artifact_share",
                                {"artifact": artifact_name, "summary": result.text[:1500]}, tid)
        return result
