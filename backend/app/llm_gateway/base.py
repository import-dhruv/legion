"""Provider-neutral request/response types for the single centralized LLM gateway."""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Protocol


@dataclass
class LLMRequest:
    messages: list[dict[str, Any]]
    agent_id: str = "unknown"
    project_id: str = ""
    task_id: str = ""
    phase: str = ""
    model: str | None = None
    tier: str = "standard"
    temperature: float | None = None
    max_tokens: int | None = None
    stream: bool = False
    response_schema: dict[str, Any] | None = None
    tools: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    request_id: str = field(default_factory=lambda: uuid.uuid4().hex)


@dataclass
class LLMResponse:
    content: str
    model: str
    request_id: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    latency_ms: float = 0.0
    finish_reason: str = "stop"
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    cached: bool = False
    error: str = ""
    success: bool = True


class Provider(Protocol):
    async def complete(self, request: LLMRequest) -> LLMResponse: ...

    async def stream(self, request: LLMRequest) -> AsyncIterator[str]: ...
