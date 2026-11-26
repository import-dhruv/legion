"""The single centralized LLM gateway. Every agent uses this; no agent holds credentials."""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
from datetime import datetime, timezone

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.models import LLMUsage
from app.llm_gateway.base import LLMRequest, LLMResponse
from app.llm_gateway.budgets import (BudgetExceeded, BudgetManager, Pricing,
                                     estimate_tokens, request_token_estimate)
from app.llm_gateway.providers import MockProvider, OpenAICompatibleProvider, capabilities
from app.observability.events import audit, logger


class RateLimiter:
    """Simple async token bucket for provider RPM limits."""

    def __init__(self, rate_per_minute: int):
        self.capacity = max(1, rate_per_minute)
        self._tokens = float(self.capacity)
        self._updated = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            self._tokens = min(self.capacity, self._tokens + (now - self._updated) * self.capacity / 60)
            self._updated = now
            if self._tokens < 1:
                await asyncio.sleep((1 - self._tokens) * 60 / self.capacity)
                self._tokens = 1
            self._tokens -= 1


class LLMGateway:
    def __init__(self, provider=None, fallback_provider=None):
        self.pricing = Pricing()
        self.budgets = BudgetManager(self.pricing)
        self.provider = provider or (
            MockProvider(self.pricing) if settings.llm_provider == "mock"
            else OpenAICompatibleProvider(
                settings.llm_provider_api_key.get_secret_value(),
                settings.llm_provider_base_url,
                self.pricing,
                settings.llm_auth_header,
            )
        )
        self.fallback = fallback_provider
        self._semaphore = asyncio.Semaphore(settings.llm_max_concurrency)
        self._limiter = RateLimiter(settings.llm_requests_per_minute)
        self._cache: dict[str, LLMResponse] = {}
        self._usage_lock = asyncio.Lock()

    @property
    def uses_mock(self) -> bool:
        return isinstance(self.provider, MockProvider)

    @staticmethod
    def compress_context(request: LLMRequest) -> LLMRequest:
        """Trim oldest non-system messages when estimated input exceeds model context."""
        limit = capabilities(request.model or settings.llm_model)["context"]
        budget = int(limit * 0.7)
        msg_tokens = request_token_estimate(request)
        if msg_tokens <= budget:
            return request
        kept = [request.messages[0]] if request.messages and request.messages[0]["role"] == "system" else []
        used = sum(estimate_tokens(str(m.get("content", ""))) for m in kept)
        for msg in reversed(request.messages[len(kept):]):
            t = estimate_tokens(str(msg.get("content", "")))
            if used + t > budget:
                break
            kept.append(msg)
            used += t
        kept.reverse()
        summary = {"role": "system", "content": f"[Earlier context compressed: {msg_tokens - used} tokens omitted.]"}
        out = request
        out.messages = kept + [summary] + [m for m in request.messages if m["role"] == "user"][-1:]
        return out

    async def complete(self, request: LLMRequest) -> LLMResponse:
        request.model = request.model or settings.model_for_tier(request.tier)
        await self.budgets.check(request, request_token_estimate(request))
        request = self.compress_context(request)

        cache_key = ""
        if settings.llm_enable_result_cache and request.temperature in (None, 0, 0.0):
            cache_key = hashlib.sha256(
                json.dumps({"m": request.model, "messages": request.messages}, sort_keys=True).encode()
            ).hexdigest()
            if cache_key in self._cache:
                hit = self._cache[cache_key]
                hit.cached = True
                await self._record(request, hit)
                return hit

        async with self._semaphore:
            await self._limiter.acquire()
            response = await self.provider.complete(request)
            if not response.success and self.fallback:
                logger.warning("Primary model failed, using fallback: %s", response.error[:200])
                request.model = settings.llm_fallback_model
                response = await self.fallback.complete(request)

        if cache_key and response.success:
            self._cache[cache_key] = response
        await self._record(request, response)
        if not response.success:
            audit("gateway", "llm_failure", request.agent_id, {"error": response.error[:500]})
        return response

    async def stream(self, request: LLMRequest):
        request.model = request.model or settings.model_for_tier(request.tier)
        await self.budgets.check(request, request_token_estimate(request))
        async with self._semaphore:
            await self._limiter.acquire()
            buffer = ""
            async for chunk in self.provider.stream(request):
                buffer += chunk
                yield chunk
        synthetic = LLMRequest(**{**request.__dict__, "messages": request.messages})
        await self._record(synthetic, LLMResponse(
            content=buffer, model=request.model, request_id=request.request_id,
            prompt_tokens=estimate_tokens(json.dumps(request.messages)),
            completion_tokens=estimate_tokens(buffer),
            total_tokens=estimate_tokens(json.dumps(request.messages)) + estimate_tokens(buffer),
        ))

    async def _record(self, request: LLMRequest, response: LLMResponse) -> None:
        async with self._usage_lock:
            try:
                with SessionLocal() as db:
                    db.add(LLMUsage(
                        project_id=request.project_id, agent_id=request.agent_id, task_id=request.task_id,
                        request_id=response.request_id, model=response.model,
                        prompt_tokens=response.prompt_tokens, completion_tokens=response.completion_tokens,
                        total_tokens=response.total_tokens, cost_usd=response.cost_usd,
                        latency_ms=response.latency_ms, success=response.success, cached=response.cached,
                        error=response.error[:1000],
                    ))
                    db.commit()
            except Exception:
                logger.exception("Failed to persist LLM usage")
        await self.budgets.record(request, {"total_tokens": response.total_tokens})

    def usage_summary(self) -> dict:
        try:
            with SessionLocal() as db:
                rows = db.query(LLMUsage).all()
                return {
                    "requests": len(rows),
                    "total_tokens": sum(r.total_tokens for r in rows),
                    "prompt_tokens": sum(r.prompt_tokens for r in rows),
                    "completion_tokens": sum(r.completion_tokens for r in rows),
                    "estimated_cost_usd": round(sum(r.cost_usd for r in rows), 6),
                    "failures": sum(1 for r in rows if not r.success),
                    "cached_requests": sum(1 for r in rows if r.cached),
                    "budgets": self.budgets.snapshot(),
                }
        except Exception:
            return {"requests": 0, "total_tokens": 0, "estimated_cost_usd": 0.0}


_gateway: LLMGateway | None = None


def get_gateway() -> LLMGateway:
    global _gateway
    if _gateway is None:
        _gateway = LLMGateway()
    return _gateway


def set_gateway(gateway: LLMGateway | None) -> None:
    global _gateway
    _gateway = gateway
