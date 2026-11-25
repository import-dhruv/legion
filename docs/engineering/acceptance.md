# Acceptance tests → implementation mapping

| # | Acceptance test | Verification |
|---|---|---|
| 1 | One LLM key drives multiple specialized agents | `test_gateway.py::test_single_shared_key_is_sent_by_provider_only`, `test_orchestrator_e2e.py::test_agent_messages_and_shared_credentials` |
| 2 | Build a simple full-stack app from a requirement | `test_orchestrator_e2e.py::test_requirement_to_deployed_product_full_workflow`, `scripts/run_demo.py` |
| 3 | CTO generates requirements, architect generates architecture | E2E test asserts artifacts `prd`, `architecture` exist |
| 4 | Orchestrator creates tasks and delegates to engineers | E2E test asserts ≥15 tasks assigned to agents; `tasks_created` event |
| 5 | Frontend and backend agents work in parallel without corruption | `test_task_engine.py::test_dependency_order_and_parallel_waves`; per-agent file scopes in `test_security_and_tools.py` |
| 6 | Agents create/edit real files in isolated workspace | E2E test asserts generated files exist; `test_security_and_tools.py::test_agent_can_write_read_and_git_commit_in_isolated_workspace` |
| 7 | Install dependencies, build, run tests | Tool runtime `shell_run`/`run_tests` with allowlist; `test_quality_loop.py::test_debugging_agent_reproduces_error_and_fixes_file` runs real commands |
| 8 | Introduce bug, debugging agent identifies and fixes | `test_quality_loop.py::test_debugging_agent_reproduces_error_and_fixes_file` |
| 9 | Code reviewer rejects incorrect implementation | `test_quality_loop.py::test_reviewer_can_reject_an_implementation` |
| 10 | Resume interrupted project | `test_task_engine.py::test_interrupted_tasks_are_reset_for_resume`; orchestrator reloads persisted phase |
| 11 | Token consumption and costs tracked | `test_gateway.py::test_usage_is_persisted_and_cost_tracked`, `test_gateway.py::test_budget_ceiling_is_enforced` |
| 12 | Production deployment needs human approval | `test_orchestrator_e2e.py::test_production_deployment_requires_human_approval` |
| 13 | All agents use same credentials without exposure | Gateway is the only credential holder; API `/api/agents` payload has no key; `test_api_control_plane_endpoints` asserts that |

Run all: `cd backend && python -m pytest` → **26 passed**.
