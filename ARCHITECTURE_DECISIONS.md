# Architecture Decisions (ADR log)

| # | Decision | Alternatives considered | Why | Consequences |
|---|---|---|---|---|
| 1 | One centralized `LLMGateway`; no agent holds a credential | Per-agent clients, SDK per agent | Requirement + security: rotate one key, central accounting and quotas | Gateway is a critical component; all model traffic passes through it |
| 2 | OpenAI-compatible HTTP client rather than vendor SDKs | Vendor SDKs | Works with any provider/base URL using one configuration shape | Structured output/tool calling emulated via JSON schemas + parsed envelopes |
| 3 | SQLAlchemy models with configurable `DATABASE_URL` | Postgres-only raw SQL | Build environment had no Postgres credentials; production can still use Postgres | SQLite used in tests; some Postgres-only features (pgvector) opt-in |
| 4 | Explicit phase state machine + DAG task engine | Free-form agent conversation, pure LangGraph | Auditable, resumable, prevents duplicate work and unbounded loops | Less emergent behavior; new phases require code changes |
| 5 | Pydantic-validated JSON artifacts from agents | Free-text handoffs | Agents propose, code validates; prevents malformed plans corrupting state | Agents must produce schema-valid JSON; repair prompt on failure |
| 6 | File ownership scopes per agent | Shared unrestricted workspace | Parallel frontend/backend engineers must not corrupt each other's changes | Cross-cutting work assigned to full-stack engineer or orchestrator |
| 7 | Command allowlist + path containment; Docker when available | Unrestricted shell | Security requirement; agents operate on untrusted input | Some commands need explicit allowlist additions |
| 8 | Redis short-term memory, DB for durable state | DB for everything | Live context is fast and disposable; restarts must resume | Redis outage degrades live context only |
| 9 | Offline mock provider behind explicit env flag | Hardcoded agent replies | Deterministic E2E tests without tokens; never active by default | Tests exercise real orchestration with a fake network boundary |
| 10 | Approval gate persisted as a row and awaited by orchestrator | In-memory callback | Survives restarts and is visible in the UI | Pending deployments pause the pipeline until a human decides |
| 11 | Bounded review/retry loops with escalation | Infinite self-correction | Cost control and no uncontrolled self-modification | Some projects end `blocked` and need human intervention |
| 12 | Policy/version records via audit log, no dynamic prompt mutation | Agents rewriting their own prompts | Requirement: organizational changes versioned and auditable | Standards changes are code changes reviewed like any other |
