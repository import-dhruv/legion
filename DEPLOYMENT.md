# Deployment

## Live (public)

- GitHub: https://github.com/import-dhruv/legion
- Command center: https://legion-blue.vercel.app
- API: https://legion-api.vercel.app (`/api/health`, `/docs` on local backend)
- Vercel projects: `legion` (frontend, root `frontend`, Next.js, Node 26), `legion-api` (backend, root `backend`, Python serverless)
- Both Vercel projects are connected to the GitHub repo: every push to `main` deploys automatically.

## What works on Vercel

- Full Next.js command center with live SSE and REST access to the API.
- FastAPI control-plane endpoints: projects, tasks, agents, messages, artifacts, events, approvals, usage, dashboard, metrics.
- One shared credential configuration; the deployed API runs in **mock mode** because no real key was provided.

## Vercel limitations (important)

Vercel serverless is a **best-effort API host only**:

- No long-running background tasks: `POST /api/projects` with `auto_start: true` can create the project, but agent orchestration will not survive the serverless response. Run the backend as a container for the autonomous workflow.
- No Docker sandbox, no Redis-backed live context, and SQLite lives in ephemeral `/tmp`, so persistence across function instances is not guaranteed.
- Human approvals and orchestration are fully functional in the containerized/Docker Compose deployment.
- For production, set `LLM_PROVIDER=openai-compatible` with your single `LLM_PROVIDER_API_KEY` and use PostgreSQL via `DATABASE_URL` on a container host (Railway/Render/Fly.io or your own server), then point the frontend's `NEXT_PUBLIC_API_URL` at it.

## Full production deployment

```bash
cp .env.example .env      # add the one LLM key and a Postgres DSN
docker compose up --build
# UI :3000, API :3001, Grafana :3002 (admin/admin)
```
