"""FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.bootstrap import init_db
from app.core.config import settings
from app.observability.events import logger
from app.observability.tracing import setup_tracing


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime()
    setup_tracing(settings.app_name)
    init_db()
    logger.info("AI-SE control plane ready (provider=%s)", settings.llm_provider)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def control_plane_auth(request: Request, call_next):
    """Protect the publicly exposed control plane with one shared token.

    Health and metrics stay public for monitoring. The browser never holds this
    token: a server-side Vercel proxy injects it on every request.
    """
    token = settings.control_plane_token.get_secret_value()
    public_paths = {"/api/health", "/api/metrics"}
    if (token and request.url.path.startswith("/api/")
            and request.url.path not in public_paths
            and request.headers.get("x-control-plane-token") != token):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.get("/")
async def root():
    return {"name": settings.app_name, "docs": "/docs", "api": "/api"}
