# Testing guide

```bash
cd backend
python -m pytest                 # 26 tests, offline, no credentials needed
python -m pytest tests/test_orchestrator_e2e.py -v
```

## What is verified

1. One key sent by the provider client, used by 10+ distinct agents; tokens/cost persisted.
2. Full requirement → PRD → architecture → task DAG → parallel implementation → tests → review → approval → maintenance pipeline.
3. Real file creation in an isolated workspace by independent agents; git commits.
4. DAG ordering and parallel waves; retry then escalation; duplicate suppression; crash resume.
5. Debugging agent reproduces a failing command, writes a fix and verifies it.
6. Code reviewer can reject an implementation with structured findings.
7. Human approval required before deployment; decisions are durable and audited.
8. Path traversal, dangerous commands, secret redaction, injection marking and permission scopes.
9. REST endpoints and SSE-capable control plane.

The `MockProvider` is selected only via `LLM_PROVIDER=mock` (set in `tests/conftest.py`). It substitutes the network call and generates schema-valid payloads; it does not fake orchestration, tools, persistence or approvals. The real OpenAI-compatible provider is tested with `httpx.MockTransport` asserting the single Authorization header.
