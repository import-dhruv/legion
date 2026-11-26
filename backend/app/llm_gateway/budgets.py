"""Token accounting, budgets and cost estimation."""
from __future__ import annotations

import asyncio
from datetime import date

from app.core.config import settings

# USD per 1M tokens; override with PRICING_JSON for self-hosted / other providers.
DEFAULT_PRICING: dict[str, tuple[float, float]] = {
    "gpt-4o": (2.5, 10.0),
    "gpt-4o-mini": (0.15, 0.6),
    "gpt-4.1": (2.0, 8.0),
    "gpt-4.1-mini": (0.4, 1.6),
    "claude-sonnet-4": (3.0, 15.0),
    "claude-haiku-3.5": (0.8, 4.0),
    # Sarvam AI, ₹10 input / ₹25 output per 1M tokens (~₹83/USD).
    "sarvam-105b": (0.12, 0.30),
    "sarvam-105b-conversations": (0.12, 0.30),
    "sarvam-prism": (0.05, 0.0),
}


class Pricing:
    def __init__(self, overrides: dict | None = None):
        self.table = dict(DEFAULT_PRICING)
        self.table.update(overrides or {})

    def cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        p, c = self.table.get(model, (1.0, 3.0))
        return (prompt_tokens * p + completion_tokens * c) / 1_000_000


class BudgetManager:
    """Enforces per-task, per-agent/project and global daily token ceilings."""

    def __init__(self, pricing: Pricing | None = None):
        self.pricing = pricing or Pricing()
        self.task_usage: dict[str, int] = {}
        self.agent_usage: dict[tuple[str, str], int] = {}
        self.daily_usage: int = 0
        self._day = date.today()
        self._lock = asyncio.Lock()

    def _roll_day(self) -> None:
        today = date.today()
        if today != self._day:
            self._day, self.daily_usage = today, 0

    async def check(self, request, estimated_tokens: int) -> None:
        async with self._lock:
            self._roll_day()
            tid = request.task_id or request.request_id
            used = self.task_usage.get(tid, 0)
            if used + estimated_tokens > settings.max_tokens_per_task:
                raise BudgetExceeded(f"Task {tid} exceeded {settings.max_tokens_per_task} tokens")
            key = (request.project_id, request.agent_id)
            agent_used = self.agent_usage.get(key, 0)
            if agent_used + estimated_tokens > settings.max_tokens_per_agent_per_project:
                raise BudgetExceeded(f"Agent {request.agent_id} exceeded its project token budget")
            if self.daily_usage + estimated_tokens > settings.max_project_tokens:
                raise BudgetExceeded("Global daily token budget exhausted")

    async def record(self, request, usage: dict) -> None:
        async with self._lock:
            self._roll_day()
            total = usage.get("total_tokens", 0)
            self.task_usage[request.task_id or request.request_id] = (
                self.task_usage.get(request.task_id or request.request_id, 0) + total
            )
            key = (request.project_id, request.agent_id)
            self.agent_usage[key] = self.agent_usage.get(key, 0) + total
            self.daily_usage += total

    def snapshot(self) -> dict:
        self._roll_day()
        return {
            "tasks_tracked": len(self.task_usage),
            "agent_totals": {f"{p}:{a}": v for (p, a), v in self.agent_usage.items()},
            "daily_tokens": self.daily_usage,
            "daily_limit": settings.max_project_tokens,
        }


class BudgetExceeded(Exception):
    pass


def estimate_tokens(text: str) -> int:
    return max(1, int(len(text) / 4) + 1)


def request_token_estimate(request) -> int:
    return sum(estimate_tokens(str(m.get("content", ""))) for m in request.messages) + (
        estimate_tokens(str(request.response_schema)) if request.response_schema else 0
    )
