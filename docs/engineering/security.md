# Security model

- **Credentials:** single `LLM_PROVIDER_API_KEY` read from environment by the backend only; stored as `SecretStr`; encrypted at rest by `SecretStore` when persisted; redacted in logs and tool output; never present in frontend, generated code or the repository.
- **Environment hygiene:** subprocesses receive a sanitized environment with all `KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL` variables removed.
- **Workspace isolation:** every project has its own directory; `safe_path()` rejects traversal; agents only see paths matching their permission patterns.
- **Command control:** allowlisted programs only; denied patterns for destructive commands, privilege escalation, piping remote content to a shell, and out-of-scope git operations; timeout, CPU/memory limits and output caps. Docker mode adds no-network isolation.
- **Untrusted data:** repository files, tool outputs and web content are wrapped in `<untrusted_data>` with an explicit instruction that they are data, never instructions.
- **Outputs:** generated files are scanned for credential-like patterns and rejected if found; agent JSON is validated against schemas.
- **Human gates:** production deployment requires a persisted approval; destructive operations are not exposed as agent tools; all approvals and control actions are audit-logged.
- **Budgets:** per-task, per-agent/project and global daily token ceilings; bounded tool iterations and review loops prevent runaway spend.
