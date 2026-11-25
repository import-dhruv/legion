"""One shared credential, provider abstraction, accounting and budgets."""
import httpx
import pytest

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.models import LLMUsage
from app.llm_gateway.base import LLMRequest
from app.llm_gateway.budgets import BudgetExceeded
from app.llm_gateway.gateway import LLMGateway, RateLimiter
from app.llm_gateway.providers import OpenAICompatibleProvider


def test_single_shared_key_is_sent_by_provider_only():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization")
        return httpx.Response(200, json={
            "id": "chatcmpl-1", "model": "gpt-4o-mini",
            "choices": [{"message": {"role": "assistant", "content": '{"ok":true}'},
                         "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        })

    provider = OpenAICompatibleProvider(
        settings.llm_provider_api_key.get_secret_value(), settings.llm_provider_base_url)
    headers = dict(provider._client.headers)
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler), headers=headers)
    response = __import__("asyncio").run(provider.complete(LLMRequest(
        messages=[{"role": "user", "content": "hello"}], agent_id="backend_engineer")))
    assert seen["auth"] == "Bearer test-only-placeholder-key"
    assert response.total_tokens == 15
    assert response.cost_usd > 0
    __import__("asyncio").run(provider.close())


@pytest.mark.asyncio
async def test_usage_is_persisted_and_cost_tracked():
    gateway = LLMGateway()
    r = await gateway.complete(LLMRequest(messages=[{"role": "user", "content": "x"}],
                                          agent_id="qa_engineer", project_id="p1", task_id="t1"))
    assert r.success
    with SessionLocal() as db:
        rows = db.query(LLMUsage).filter(LLMUsage.task_id == "t1").all()
    assert len(rows) == 1
    assert rows[0].total_tokens > 0
    assert rows[0].cost_usd > 0
    assert gateway.usage_summary()["total_tokens"] > 0


@pytest.mark.asyncio
async def test_budget_ceiling_is_enforced():
    gateway = LLMGateway()
    settings.max_tokens_per_task = 2
    try:
        with pytest.raises(BudgetExceeded):
            await gateway.complete(LLMRequest(messages=[{"role": "user", "content": "a long prompt"}],
                                              task_id="over-budget"))
    finally:
        settings.max_tokens_per_task = 24000


@pytest.mark.asyncio
async def test_rate_limiter_allows_burst_then_throttles():
    limiter = RateLimiter(120)
    for _ in range(5):
        await limiter.acquire()
    assert limiter._tokens < limiter.capacity


def test_model_tiers_route_to_different_models():
    assert settings.model_for_tier("cheap") == settings.llm_cheap_model
    assert settings.model_for_tier("strong") == settings.llm_strong_model
    assert settings.model_for_tier("standard") == settings.llm_model
