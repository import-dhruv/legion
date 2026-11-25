# AI-SE Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand control center for the autonomous engineering organization.

## Run

```bash
npm install
cp .env.example .env.local   # optional; defaults to http://localhost:3001
npm run dev                  # http://localhost:3000
```

The backend control plane must be running on `http://localhost:3001` (or set `NEXT_PUBLIC_API_URL`). No API keys are stored in the frontend.

## Checks

```bash
npx tsc --noEmit
npm run build
```

## Structure

- `app/` — dashboard, agents, projects list/new/workspace, global approvals
- `components/` — shell, sidebar, icons and reusable UI primitives
- `features/workspace/` — workspace tabs (overview, tasks, files, events, messages, approvals, git)
- `hooks/` — polling and SSE event stream hooks
- `lib/` — shared types, Zustand store, formatting helpers
- `services/api.ts` — typed API client
