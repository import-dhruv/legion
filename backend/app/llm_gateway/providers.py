"""OpenAI-compatible provider and deterministic offline mock provider."""
from __future__ import annotations

import json
import time
from typing import Any, AsyncIterator

import httpx
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.llm_gateway.base import LLMRequest, LLMResponse
from app.llm_gateway.budgets import Pricing, estimate_tokens

MODEL_CAPABILITIES = {
    "gpt-4o": {"tools": True, "json": True, "vision": True, "context": 128000},
    "gpt-4o-mini": {"tools": True, "json": True, "vision": True, "context": 128000},
    "claude-sonnet-4": {"tools": True, "json": True, "vision": True, "context": 200000},
}


def capabilities(model: str) -> dict[str, Any]:
    for name, caps in MODEL_CAPABILITIES.items():
        if model.startswith(name):
            return caps
    return {"tools": True, "json": True, "vision": False, "context": 32000}


class OpenAICompatibleProvider:
    """Talks to any OpenAI-compatible endpoint using one shared API key."""

    def __init__(self, api_key: str, base_url: str, pricing: Pricing | None = None):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.pricing = pricing or Pricing()
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.llm_timeout_seconds),
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def complete(self, request: LLMRequest) -> LLMResponse:
        started = time.perf_counter()
        payload: dict[str, Any] = {
            "model": request.model or settings.llm_model,
            "messages": request.messages,
            "temperature": request.temperature if request.temperature is not None else settings.llm_temperature,
        }
        if request.max_tokens:
            payload["max_tokens"] = request.max_tokens
        if request.response_schema:
            payload["response_format"] = {"type": "json_object"}
        if request.tools:
            payload["tools"] = request.tools
        if settings.llm_enable_prompt_cache and capabilities(payload["model"]).get("json"):
            payload.setdefault("extra_body", {})["prompt_cache_hint"] = True

        last_error = ""
        async for attempt in AsyncRetrying(
            retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
            stop=stop_after_attempt(settings.llm_max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=15),
            reraise=True,
        ):
            with attempt:
                resp = await self._client.post(f"{self.base_url}/chat/completions", json=payload)
                if resp.status_code == 429 or resp.status_code >= 500:
                    raise httpx.HTTPStatusError(f"retryable {resp.status_code}", request=resp.request, response=resp)
                resp.raise_for_status()
                data = resp.json()
                choice = data["choices"][0]
                usage = data.get("usage") or {}
                pt, ct = usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
                return LLMResponse(
                    content=choice["message"].get("content") or "",
                    model=data.get("model", payload["model"]),
                    request_id=request.request_id,
                    prompt_tokens=pt,
                    completion_tokens=ct,
                    total_tokens=usage.get("total_tokens", pt + ct),
                    cost_usd=self.pricing.cost(payload["model"], pt, ct),
                    latency_ms=(time.perf_counter() - started) * 1000,
                    finish_reason=choice.get("finish_reason", "stop"),
                    tool_calls=choice["message"].get("tool_calls") or [],
                )
        return LLMResponse(content="", model=payload["model"], request_id=request.request_id,
                           success=False, error=last_error or "provider failed")

    async def stream(self, request: LLMRequest) -> AsyncIterator[str]:
        payload = {"model": request.model or settings.llm_model, "messages": request.messages,
                   "temperature": settings.llm_temperature, "stream": True}
        async with self._client.stream("POST", f"{self.base_url}/chat/completions", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                chunk = line[6:]
                if chunk == "[DONE]":
                    break
                try:
                    delta = json.loads(chunk)["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except (KeyError, IndexError, json.JSONDecodeError):
                    continue


class MockProvider:
    """Deterministic offline test double. Never selected unless LLM_PROVIDER=mock.

    Generates schema-valid JSON from the response schema supplied by the caller,
    which lets integration tests exercise the real orchestration, tools, DAG,
    persistence and approval paths without network access or real tokens.
    """

    def __init__(self, pricing: Pricing | None = None, responder=None):
        self.pricing = pricing or Pricing()
        self.responder = responder

    @staticmethod
    def _value(schema: dict[str, Any], context: str) -> Any:
        t = schema.get("type", "string")
        if "enum" in schema:
            return schema["enum"][0]
        if t == "object":
            return {k: MockProvider._value(v, context) for k, v in schema.get("properties", {}).items()}
        if t == "array":
            return [MockProvider._value(schema.get("items", {"type": "string"}), context)]
        if t == "integer":
            return 1
        if t == "number":
            return 1.0
        if t == "boolean":
            return True
        desc = schema.get("description", "")
        base = f"{desc or 'Generated content'} for {context[:80]}"
        return base[:500]

    async def complete(self, request: LLMRequest) -> LLMResponse:
        started = time.perf_counter()
        context = next((str(m.get("content", "")) for m in reversed(request.messages)
                        if m.get("role") == "user"), "")
        if self.responder:
            content = self.responder(request, context)
        elif request.response_schema:
            content = json.dumps(self._value(request.response_schema, context))
        else:
            content = f"Completed {request.agent_id} work item: {context[:120]}"
        pt = sum(estimate_tokens(str(m.get("content", ""))) for m in request.messages)
        ct = max(1, estimate_tokens(content))
        model = request.model or settings.llm_model
        return LLMResponse(
            content=content, model=model, request_id=request.request_id,
            prompt_tokens=pt, completion_tokens=ct, total_tokens=pt + ct,
            cost_usd=self.pricing.cost(model, pt, ct),
            latency_ms=(time.perf_counter() - started) * 1000,
        )

    async def stream(self, request: LLMRequest) -> AsyncIterator[str]:
        response = await self.complete(request)
        for word in response.content.split(" "):
            yield word + " "
