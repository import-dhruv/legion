# Agent catalog

30 agents across 8 departments. Hierarchy: human CTO → CTO → Engineering Manager / Chief Orchestrator → specialists.

| Department | Agents | Model tier | Write scope |
|---|---|---|---|
| Executive | CTO, Engineering Manager, Chief Orchestrator | strong/standard | orchestrator only |
| Product | Product Manager, Business Analyst, UX Researcher, UI/UX Designer | standard/cheap | design docs |
| Architecture | Principal Architect, Database Architect, API Architect, Infrastructure Architect | strong/standard | backend/, infra files |
| Development | Frontend, Backend, Full-Stack, Mobile, AI/ML, Systems Engineers | standard/strong | respective source trees |
| Quality | QA, Unit, Integration, Browser Automation, Code Review, Debugging | cheap/strong | tests/, review artifacts |
| Security | Application Security Engineer | strong | read-only audit |
| DevOps | DevOps, SRE, Performance Engineer | standard | infra files |
| Documentation | Technical Writer, Release Manager, Independent Auditor | cheap/standard | docs, release files |

Each agent definition lives in `backend/app/agents/definitions.py` and is seeded into the `agents` table at startup. The UI shows live status, current task, permissions and responsibilities.

**Rule:** agents never receive the provider credential. They call `LLMGateway` through `AgentRuntime` only.
