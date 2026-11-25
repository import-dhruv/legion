# AI Software Engineering Organization (AI-SE) — Architecture

## 1. System context

A single human (CTO / Product Owner) submits a natural-language software requirement. One shared LLM API key powers an organization of 30 specialized agents, coordinated by a central orchestrator, working in isolated workspaces with real file/shell/git tools, persisting all state in a database, and requiring human approval for deployment and destructive operations.

```
Human (CTO/PO)
   │  requirement, approvals, control actions
   ▼
FastAPI Control Plane ── SSE event stream ──▶ Next.js Command Center
   │
   ├── Orchestrator (state machine, phases, escalation)
   │     ├── TaskEngine (DAG scheduler, retries, parallel waves)
   │     ├── AgentRegistry (30 agents, prompts, permissions, model tiers)
   │     ├── MessageBus (structured agent-to-agent protocol)
   │     └── MemoryManager (short-term / project / long-term)
   │
   ├── LLMGateway (ONE key, provider abstraction, budgets, retries, costs)
   │     └── OpenAI-compatible provider | explicit offline mock provider
   │
   ├── ToolRuntime (filesystem, shell, git, tests, browser)
   │     └── WorkspaceManager → Docker sandbox (or restricted local subprocess)
   │
   └── PostgreSQL (source of truth) + Redis (short-term memory, live events)
```

## 2. Non-negotiable design decisions

| Decision | Rationale |
|---|---|
| One `LLMGateway`, one credential | Agents never see credentials. Gateway is the only egress to the model provider. |
| DB is source of truth; Redis is cache | Projects resume after restart. Redis loss is non-fatal. |
| Explicit phase state machine | Predictable, auditable, resumable. No unbounded agent free-for-all. |
| Structured JSON artifacts validated by Pydantic | Agents propose; code validates. Prevents malformed plans corrupting state. |
| Dependency-aware DAG scheduler with file ownership | Parallel agents cannot clobber each other's files. |
| Sandboxed command execution with allowlist, timeout, output cap, secret-free env | Prevents destructive or credential-leaking tool use. |
| Human approval gates for deploy/destructive ops | Safety requirement; approval is persisted and audited. |
| Swappable database URL (Postgres prod / SQLite dev-test) | Runs anywhere; production semantics preserved via SQLAlchemy. |
| Offline mock provider only behind explicit `LLM_PROVIDER=mock` | Allows deterministic end-to-end verification without spending real tokens; never used by default in production. |

## 3. Components

### 3.1 LLM Gateway (`app/llm_gateway`)
- `Provider` protocol with `complete()` and `stream()`.
- `OpenAICompatibleProvider` uses `httpx.AsyncClient` against `LLM_PROVIDER_BASE_URL` with `LLM_PROVIDER_API_KEY` (SecretStr), tenacity retries with exponential backoff on 429/5xx, `asyncio.Semaphore` concurrency cap, token-bucket rate limiting, timeouts, and model capability registry.
- `MockProvider` for deterministic offline tests.
- `BudgetManager`: per-task and per-agent token ceilings, global daily ceiling.
- `UsageLedger`: every call persisted with prompt/completion tokens, latency, cost, success; Redis counters for dashboard.
- Context compression: message trimming by estimated tokens and LLM summarization hook; hash-based result cache for identical deterministic calls; prompt-cache hints forwarded for supporting providers.

### 3.2 Agents (`app/agents`)
30 agent definitions with unique identities, system prompts, departments, hierarchy (`reports_to`), model tier (`cheap`/`standard`/`strong`), tool permissions, and budgets. `AgentRuntime` builds a scoped prompt from task + retrieved memory + relevant messages, executes a bounded tool loop (max iterations), and returns a validated `AgentResult` with artifacts.

Departments: executive (3), product (4), architecture (4), development (6), quality (6), security/DevOps/SRE/perf (4), documentation/delivery/audit (3).

### 3.3 Orchestrator (`app/orchestrator`)
State machine: `discovery → planning → development_plan → implementation → testing → review → debugging → deployment → maintenance → completed`. Each phase declares participating agents, execution mode (sequential/parallel/debate/review-revise), gate conditions, and artifact outputs. Failures trigger retry → reassignment → manager escalation. Pause/resume/stop controls respected at every await point. Project state is persisted after each transition, so a restart resumes from the last durable state.

### 3.4 Task engine (`app/task_engine`)
`TaskSpec` → persisted `Task` rows with dependencies. Kahn topological scheduling; ready tasks run as a bounded parallel wave; `concurrency_per_project` configurable. On failure: increment retry, inject error context, retry with same or reassigned agent; after `max_retries`, escalate to engineering manager and mark blocked. Duplicate detection by content hash.

### 3.5 Communication (`app/communication`)
Immutable message records with the specified protocol envelope. `send`, `request`, `respond`, `broadcast`, and `relevant_for()` which filters by task/project/participants/recency so agents never receive the entire history.

### 3.6 Memory (`app/memory`)
- Short-term: Redis (TTL) / in-process fallback; current task, recent messages, temporary findings.
- Project: DB-backed artifacts, decisions, schemas, contracts, lessons.
- Long-term: standards, patterns, prior solutions, agent performance records.
- Retrieval: tag + keyword scoring, optional semantic search via pgvector when available, summarization via cheap model.

### 3.7 Execution (`app/execution`, `app/tools`)
`WorkspaceManager` confines all paths to `WORKSPACE_ROOT/<project_id>` and rejects traversal. `ShellExecutor` enforces command allow/deny lists, timeout, output limits, and a sanitized environment. `DockerSandbox` runs commands in a container with no network, memory/CPU limits, and the workspace mounted; uses local restricted subprocess as fallback. `GitManager` provides init/status/diff/add/commit. `BrowserTool` wraps Playwright for screenshots and journeys when enabled. Every tool call is permission-checked and audit-logged.

### 3.8 Security (`app/security`)
SecretStr credentials, Fernet encryption at rest for stored keys, audit log, approval gates, command/path validation, prompt-injection warning wrapper around untrusted content, secret scanning of generated files, dependency scanning hook (pip-audit/npm audit if available), and redaction of secrets in all logs and tool outputs.

### 3.9 API (`app/api`) and frontend
FastAPI REST + SSE. Next.js/TypeScript/Tailwind/Zustand command center with dashboard, org hierarchy, project workspace (requirements, task board, files, terminal, test results, logs), live activity, approvals and human controls.

## 4. Data flow (happy path)

1. `POST /api/projects` → project row + orchestrator task in background.
2. PM/BA produce PRD artifact; CTO/architects produce architecture + DB/API designs.
3. Engineering Manager produces validated task DAG.
4. Scheduler runs independent tasks in parallel; each agent uses tools in its own file domain.
5. QA runs real tests in sandbox; failures go to debugging agent with logs.
6. Reviewer/security agents can reject → revision cycle (bounded).
7. DevOps writes Docker/CI files; deployment waits on `POST /api/approvals/{id}/decide`.
8. SRE + auditor produce final health and verification reports.

## 5. Failure and recovery model

- LLM failures: retry with backoff, fallback model, then task reassignment.
- Tool failures: captured with stdout/stderr, fed to debugging agent.
- Process restart: `resume_project()` reloads DAG from DB and reschedules non-terminal tasks.
- Budget exhaustion: project paused with `budget_exceeded` status and human notification.

## 6. Known limitations (explicit)

- PostgreSQL credentials are not available in this environment. SQLAlchemy models support Postgres; local runs/tests use SQLite. Set `DATABASE_URL` to a Postgres DSN to use Postgres. pgvector retrieval is enabled only when the `vector` extension is present.
- No LLM API key is present in this environment. The real provider path is implemented and unit-tested with a local fake HTTP server; the deterministic `mock` provider is used for offline end-to-end verification.
- Docker sandbox is used when the daemon is reachable and `SANDBOX_MODE=docker`; otherwise a restricted local subprocess runner is used with documented tradeoffs.
- Mobile and browser-automation agents are defined and wired; full native mobile builds require platform SDKs not guaranteed in the target environment.
