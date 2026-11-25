"""Vercel Python serverless entry point for the FastAPI control plane.

IMPORTANT: Vercel serverless is a best-effort host for the API only. Long-running
agent orchestration, Docker sandboxes, Redis-backed live context and persistent
local filesystems are NOT available there. Run the backend as a container for the
full autonomous workflow. This adapter serves the read/write REST control-plane
endpoints and keeps the UI functional for demos.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Serverless-safe defaults: no local Postgres/Redis/Docker available on Vercel.
os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/aise-legion.db")
os.environ.setdefault("WORKSPACE_ROOT", "/tmp/aise-legion-workspaces")
os.environ.setdefault("REDIS_ENABLED", "false")
os.environ.setdefault("SANDBOX_MODE", "local")
os.environ.setdefault("LLM_PROVIDER", "mock")

from mangum import Mangum  # noqa: E402

from app.main import app  # noqa: E402

handler = Mangum(app, lifespan="auto")
