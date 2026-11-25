"""Structured logging, persisted events, and live SSE fan-out."""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.models import AuditLog, Event

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("aise")


class EventHub:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, project_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        async with self._lock:
            self._subscribers[project_id].add(q)
        return q

    async def unsubscribe(self, project_id: str, q: asyncio.Queue) -> None:
        async with self._lock:
            self._subscribers[project_id].discard(q)

    async def publish(
        self,
        project_id: str,
        event_type: str,
        message: str,
        agent_id: str = "orchestrator",
        task_id: str = "",
        data: dict[str, Any] | None = None,
    ) -> None:
        payload = {
            "event_type": event_type,
            "message": message,
            "agent_id": agent_id,
            "task_id": task_id,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        try:
            with SessionLocal() as db:
                db.add(Event(project_id=project_id, agent_id=agent_id, task_id=task_id,
                             event_type=event_type, message=message, data=data or {}))
                db.commit()
        except Exception:  # event logging must never break execution
            logger.exception("Failed to persist event")
        async with self._lock:
            for q in list(self._subscribers.get(project_id, set())):
                try:
                    q.put_nowait(payload)
                except asyncio.QueueFull:
                    pass
        logger.info("[%s] %s: %s", project_id[:8], agent_id, message)


hub = EventHub()


def audit(actor: str, action: str, target: str = "", detail: dict | None = None) -> None:
    try:
        with SessionLocal() as db:
            db.add(AuditLog(actor=actor, action=action, target=target, detail=detail or {}))
            db.commit()
    except Exception:
        logger.exception("Failed to write audit log")


class EventEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)
