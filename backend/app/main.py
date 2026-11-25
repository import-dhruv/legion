"""FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.get("/")
async def root():
    return {"name": settings.app_name, "docs": "/docs", "api": "/api"}
