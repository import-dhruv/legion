# API reference

Base URL: `http://localhost:3001`. Interactive docs: `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Service health, agent count, provider/mock mode |
| POST | `/api/projects` | Create project `{requirement, name?, auto_start?, config?}` |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/{id}` | Project detail |
| POST | `/api/projects/{id}/start` | Start or resume orchestration |
| POST | `/api/projects/{id}/control` | `{action: pause|resume|stop}` |
| GET | `/api/projects/{id}/tasks` | Task DAG with statuses, retries, logs |
| PATCH | `/api/projects/{id}/tasks/{task_id}` | Reassign agent or change priority |
| GET | `/api/projects/{id}/messages` | Structured agent messages |
| GET | `/api/projects/{id}/artifacts` / `?name=` | Versioned artifacts |
| GET | `/api/projects/{id}/events` | Persisted event stream |
| GET | `/api/projects/{id}/stream` | SSE live events |
| GET | `/api/projects/{id}/files` / `/files/{path}` | Workspace file tree / file content |
| GET | `/api/projects/{id}/git-history` | Workspace commits |
| GET | `/api/agents` | Organization with live status |
| GET | `/api/usage` | Token/cost/budget summary |
| GET | `/api/approvals?status=pending` | Approval queue |
| POST | `/api/approvals/{id}/decide` | `{approved: boolean, decided_by: string}` |
| GET | `/api/dashboard` | Aggregated control-plane stats |
| GET | `/api/metrics` | Prometheus text exposition |

Message envelope: `{message_id, project_id, from_agent, to_agent, message_type, task_id, content, timestamp}`.
