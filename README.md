# AI Software Engineering Organization (AI-SE)

A production-oriented multi-agent software engineering platform. One human provides the vision; **one LLM API key powers 30 specialized agents** that plan, architect, implement, test, review, debug, secure, document and deploy a real software product inside isolated workspaces.

## What is implemented

| Capability | Where | Status |
|---|---|---|
| Central LLM gateway: one credential, provider abstraction, concurrency/rate limits, retries, fallback, token budgets, cost tracking, caching, context compression | `backend/app/llm_gateway/` | Implemented |
| 30 agents with unique identities, prompts, hierarchy, model tiers and tool permissions | `backend/app/agents/definitions.py` | Implemented |
| Phase state machine, delegation, review-revise, escalation, pause/resume/stop | `backend/app/orchestrator/` | Implemented |
| Persistent DAG scheduler, parallel waves, retries, duplicate detection, crash resume | `backend/app/task_engine/` | Implemented |
| Structured message bus and scoped context retrieval | `backend/app/communication/` | Implemented |
| Three-layer memory (Redis short-term, DB project, DB long-term) | `backend/app/memory/` | Implemented |
| Real file/shell/git/test/browser tools with path and command allowlists | `backend/app/tools/`, `backend/app/execution/` | Implemented |
| Docker sandbox with no network, CPU/memory caps; restricted local fallback | `backend/app/execution/workspace.py` | Implemented |
| Human approval gates for deployment; audit log; secret encryption/redaction | `backend/app/approvals/`, `backend/app/security/` | Implemented |
| FastAPI REST + SSE API and Prometheus metrics | `backend/app/api/` | Implemented |
| Next.js command center (dashboard, org hierarchy, project workspace, live activity, approvals) | `frontend/` | Implemented |
| Automated end-to-end verification (26 tests) | `backend/tests/` | Implemented and passing |

## Quick start

```bash
cd autonomous-engineering
cp .env.example .env
# Edit .env: set LLM_PROVIDER_API_KEY (the ONLY credential the system needs)
docker compose up --build           # Postgres + Redis + backend + frontend + monitoring
```

Local development without Docker:

```bash
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 3001
cd frontend && npm install && npm run dev       # http://localhost:3000
```

API docs: `http://localhost:3001/docs`.

### Try it without an API key

The offline mock provider replaces **only the model network call**; orchestration, tools, DAG, persistence and approvals are real. It is never selected by default.

```bash
python scripts/run_demo.py "Build a task manager with login, teams and a dashboard"
cd backend && python -m pytest        # 26 passing tests
```

## Using the system

1. Open the command center → **New Project** → describe the product.
2. Watch the live event stream as PM → architects → engineering manager → engineers → QA → review → deployment work.
3. Approve the production deployment in **Approvals** (required by default).
4. Inspect artifacts, source files, task dependencies, agent messages, token usage and git history in the project workspace.
5. Use Pause / Resume / Stop at any time. A restarted server resumes interrupted projects from persisted state.

## Configuration highlights

See `.env.example`. Most important:

- `LLM_PROVIDER_API_KEY` — the single shared key, used only by the backend gateway. Never sent to the frontend, agents' generated code, logs or repositories.
- `LLM_PROVIDER_BASE_URL`, `LLM_MODEL`, `LLM_Fallback_MODEL` — any OpenAI-compatible endpoint.
- `DATABASE_URL` — PostgreSQL in production (`postgresql+psycopg://...`), SQLite for local demo/tests.
- `SANDBOX_MODE` — `docker` (strong isolation), `local` (restricted subprocess) or `auto`.
- `MAX_TOKENS_*`, `LLM_MAX_CONCURRENCY`, `LLM_REQUESTS_PER_MINUTE` — cost and quota controls.
- `REQUIRE_DEPLOYMENT_APPROVAL` — must remain `true` in production.

## Verification

`backend/tests` includes acceptance coverage: one key driving many agents; real file creation/editing; parallel file ownership; dependency ordering and retries; crash resume; token/cost accounting; rejection by the reviewer; debugging with real failing commands; human deployment approval; and the full 30-agent requirement-to-product pipeline.

## Documentation

- `ARCHITECTURE.md` — system context, components, data flow, failure model.
- `ARCHITECTURE_DECISIONS.md` — important engineering tradeoffs.
- `DEVELOPMENT_PROGRESS.md` — milestone status.
- `docs/` — agent catalog, API reference, security model, testing guide.

## Explicit limitations

- No LLM key or PostgreSQL credentials were available in the build environment. The real provider path is tested with a local mock HTTP transport; local runs use SQLite. Set `DATABASE_URL` to Postgres for production.
- Native mobile builds and browser screenshots require platform SDKs / browser binaries; the agents and tools are wired but those external tools must be installed in the target environment.
- Sandboxed execution uses Docker when available; otherwise a restricted local subprocess with allowlists, resource limits and secret-free environment.
