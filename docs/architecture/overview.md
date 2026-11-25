# Architecture overview (condensed)

See the repository-root `ARCHITECTURE.md` for the full document.

```
Human ──▶ FastAPI control plane ──▶ Orchestrator (phase state machine)
                 │                       │
                 │                       ├─▶ TaskEngine (DAG, waves, retries)
                 │                       ├─▶ AgentRegistry (30 agents)
                 │                       ├─▶ MessageBus
                 │                       └─▶ MemoryManager
                 │
                 ├─▶ LLMGateway (ONE key) ──▶ OpenAI-compatible provider / mock
                 ├─▶ ToolRuntime ──▶ WorkspaceManager ──▶ Docker sandbox / local
                 └─▶ Postgres (durable) + Redis (short-term) + SSE event hub
```

Durable tables: projects, agents, tasks, messages, artifacts, events, llm_usage, approvals, memory_items, audit_logs, agent_metrics.

Execution is bounded and observable: every agent step produces an event, every model call produces a usage row, every tool call is audited, and every approval decision is persisted.
