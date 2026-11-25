"""Three-layer shared engineering memory with scoped retrieval and summarization."""
from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from app.core.db import SessionLocal
from app.core.models import Artifact, MemoryItem, new_id
from app.llm_gateway.base import LLMRequest
from app.llm_gateway.gateway import LLMGateway, get_gateway

TOKEN_RE = re.compile(r"[a-zA-Z_][a-zA-Z0-9_\-]{2,}")


class ShortTermMemory:
    """Redis-backed (or in-process fallback) current execution context."""

    def __init__(self, redis_url: str | None = None, enabled: bool = True):
        self.enabled = enabled
        self._local: dict[str, tuple[str, float]] = {}
        self._redis = None
        if enabled:
            try:
                import redis as redis_lib
                from app.core.config import settings
                self._redis = redis_lib.Redis.from_url(redis_url or settings.redis_url, socket_connect_timeout=0.5)
                self._redis.ping()
            except Exception:
                self._redis = None

    def set(self, key: str, value: str, ttl: int = 3600) -> None:
        if self._redis:
            try:
                self._redis.setex(key, ttl, value)
                return
            except Exception:
                pass
        import time
        self._local[key] = (value, time.time() + ttl)

    def get(self, key: str) -> str:
        if self._redis:
            try:
                return self._redis.get(key) or ""
            except Exception:
                pass
        import time
        value = self._local.get(key)
        if not value or value[1] < time.time():
            return ""
        return value[0]


class MemoryManager:
    def __init__(self, gateway: LLMGateway | None = None):
        self.short = ShortTermMemory()
        self.gateway = gateway

    def remember(self, content: str, key: str, project_id: str = "", scope: str = "project",
                 tags: list[str] | None = None) -> None:
        with SessionLocal() as db:
            existing = db.query(MemoryItem).filter(MemoryItem.project_id == project_id,
                                                   MemoryItem.scope == scope,
                                                   MemoryItem.key == key).first()
            if existing:
                existing.content = content
                existing.tags = tags or existing.tags
                existing.version += 1
            else:
                db.add(MemoryItem(id=new_id("mem_"), project_id=project_id, scope=scope, key=key,
                                  content=content, tags=tags or []))
            db.commit()
        self.short.set(f"memory:{project_id}:{key}", content[:4000])

    def store_artifact(self, project_id: str, name: str, content: str, kind: str = "document",
                       task_id: str = "", path: str = "", metadata: dict | None = None) -> dict:
        with SessionLocal() as db:
            prev = db.query(Artifact).filter(Artifact.project_id == project_id,
                                             Artifact.name == name).order_by(Artifact.version.desc()).first()
            art = Artifact(id=new_id("art_"), project_id=project_id, task_id=task_id, name=name,
                           kind=kind, content=content, path=path, meta=metadata or {},
                           version=(prev.version + 1) if prev else 1)
            db.add(art)
            db.commit()
            out = {"artifact_id": art.id, "name": art.name, "version": art.version}
        self.remember(content, f"artifact:{name}", project_id, "project", [kind, name])
        return out

    def artifacts(self, project_id: str, name: str | None = None) -> list[dict]:
        with SessionLocal() as db:
            q = db.query(Artifact).filter(Artifact.project_id == project_id)
            if name:
                q = q.filter(Artifact.name == name)
            rows = q.order_by(Artifact.version.desc()).limit(50).all()
            return [{"id": r.id, "name": r.name, "content": r.content, "kind": r.kind,
                     "path": r.path, "version": r.version, "metadata": r.meta,
                     "created_at": r.created_at.isoformat()} for r in rows]

    def latest(self, project_id: str, name: str) -> str:
        items = self.artifacts(project_id, name)
        return items[0]["content"] if items else ""

    def recall(self, project_id: str, query: str, scope: str | None = None, limit: int = 5) -> list[dict]:
        """Scoped lexical retrieval with tag boosts; pgvector can be layered on when available."""
        q_tokens = set(TOKEN_RE.findall(query.lower()))
        with SessionLocal() as db:
            q = db.query(MemoryItem)
            if project_id:
                q = q.filter((MemoryItem.project_id == project_id) | (MemoryItem.scope == "organization"))
            if scope:
                q = q.filter(MemoryItem.scope == scope)
            rows = q.limit(500).all()
        scored = []
        for r in rows:
            text = f"{r.key} {r.content} {' '.join(r.tags or [])}".lower()
            tokens = set(TOKEN_RE.findall(text))
            score = len(q_tokens & tokens) / max(1, len(q_tokens))
            score += 0.1 * len(set(r.tags or []) & q_tokens)
            if score > 0:
                scored.append((score, {"key": r.key, "content": r.content[:2500],
                                       "scope": r.scope, "version": r.version, "score": round(score, 3)}))
        scored.sort(key=lambda x: -x[0])
        return [s[1] for s in scored[:limit]]

    async def summarize(self, project_id: str, text: str, max_chars: int = 1200) -> str:
        if len(text) <= max_chars:
            return text
        gateway = self.gateway or get_gateway()
        try:
            response = await gateway.complete(LLMRequest(
                messages=[{"role": "system", "content": "Compress the following project context into a dense factual summary. Keep decisions, constraints and file paths. No markdown."},
                          {"role": "user", "content": text[:20000]}],
                agent_id="memory", project_id=project_id, tier="cheap", temperature=0))
            if response.success:
                return response.content[:max_chars]
        except Exception:
            pass
        return text[:max_chars]

    def context_for(self, project_id: str, query: str, names: list[str] | None = None,
                    max_chars: int = 6000) -> str:
        parts: list[str] = []
        for name in names or []:
            content = self.latest(project_id, name)
            if content:
                parts.append(f"## {name}\n{content[:2500]}")
        for item in self.recall(project_id, query, limit=4):
            parts.append(f"## memory:{item['key']}\n{item['content'][:1000]}")
        return "\n\n".join(parts)[:max_chars]
