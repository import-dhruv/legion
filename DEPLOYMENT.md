# Deployment (free tier, no local machine required)

## Live (public, $0)

- GitHub: https://github.com/import-dhruv/legion
- Command center (Vercel free): https://legion-blue.vercel.app
- Control-plane API (Render free): https://legion-api-mcc0.onrender.com
- Render dashboard: https://dashboard.render.com/web/srv-dc3i1jmq1p3s738tg7bg

## Architecture

```
Browser → https://legion-blue.vercel.app
        → /api/proxy/* (Next.js server route, injects CONTROL_PLANE_TOKEN)
        → https://legion-api-mcc0.onrender.com/api/*
        → FastAPI (Docker on Render free web service)
```

The token is stored only in Vercel server-side env vars and Render env vars. It is never shipped to the browser, committed, or logged. `GET /api/health` and `/api/metrics` remain public for uptime checks; every other `/api/*` route returns **401** without `x-control-plane-token`.

## Render service

Created from `render.yaml` / `backend/Dockerfile` with the free plan:

- root directory: `backend`, runtime Docker, region Oregon
- health check: `/api/health`
- env: `LLM_PROVIDER=mock`, ephemeral SQLite in `/tmp`, `REDIS_ENABLED=false`, `SANDBOX_MODE=local`, `CONTROL_PLANE_TOKEN=<secret>`

## Free-tier limitations (important)

- Render free web services **spin down after inactivity**; the first request after idle can take ~30–60 seconds to wake.
- The filesystem is ephemeral: SQLite data and generated workspaces reset on redeploy/restart. Use a real Postgres/Redis when you upgrade.
- No Docker-in-Docker on Render: `SANDBOX_MODE=local` uses the restricted subprocess runner (allowlists, timeouts, secret-free env) instead of a container sandbox.
- Background orchestration started with `asyncio.create_task` lives only as long as the web process. For reliable long-running work, add a Render background worker from the same image and a Redis job queue.
- The deployed API runs in explicit mock mode because no real LLM key was provided. Set `LLM_PROVIDER=openai-compatible` and `LLM_PROVIDER_API_KEY` in Render to use the single shared key.

## Why not Railway

Railway was attempted first, but the account's trial has expired and Railway requires selecting a paid plan before creating a project. No payment information was added.

## Full-fidelity local/container deployment

```bash
cp .env.example .env      # add the one LLM key and a Postgres DSN
docker compose up --build
# UI :3000, API :3001, Grafana :3002 (admin/admin)
```

This enables Postgres, Redis, Docker sandbox, durable state and human approvals.
