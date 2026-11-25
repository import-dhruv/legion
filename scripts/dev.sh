#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then cp .env.example .env; fi
echo "Start backend:  cd backend && uvicorn app.main:app --reload --port 3001"
echo "Start frontend: cd frontend && npm run dev"
echo "Docs: http://localhost:3001/docs | UI: http://localhost:3000"
