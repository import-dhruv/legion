"""Central configuration. All secrets are read from the environment only."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    # Application
    app_name: str = "AI Software Engineering Organization"
    environment: str = "development"
    log_level: str = "INFO"
    debug: bool = False

    # Database / cache
    database_url: str = f"sqlite:///{ROOT / 'data' / 'aise.db'}"
    redis_url: str = "redis://localhost:6379/0"
    redis_enabled: bool = True

    # Centralized LLM gateway -- exactly ONE credential for the whole org
    llm_provider: Literal["openai-compatible", "mock"] = "openai-compatible"
    llm_provider_api_key: SecretStr = SecretStr("")
    llm_provider_base_url: str = "https://api.openai.com/v1"
    llm_auth_header: Literal["authorization", "api-subscription-key"] = "authorization"
    llm_model: str = "gpt-4o-mini"
    llm_fallback_model: str = "gpt-4o"
    llm_strong_model: str = "gpt-4o"
    llm_cheap_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 90.0
    llm_max_concurrency: int = 8
    llm_requests_per_minute: int = 120
    llm_max_retries: int = 3
    llm_temperature: float = 0.2
    llm_enable_prompt_cache: bool = True
    llm_enable_result_cache: bool = True

    # Budgets
    max_tokens_per_task: int = 24000
    max_tokens_per_agent_per_project: int = 120000
    max_project_tokens: int = 1_000_000
    max_tool_iterations: int = 8
    max_review_iterations: int = 2

    # Execution
    workspace_root: Path = ROOT / "data" / "workspaces"
    sandbox_mode: Literal["docker", "local", "auto"] = "auto"
    sandbox_image: str = "python:3.12-slim"
    sandbox_memory_mb: int = 1024
    sandbox_cpu_quota: int = 1
    command_timeout_seconds: int = 120
    max_command_output_chars: int = 40000
    project_concurrency: int = 3
    enable_browser: bool = True

    # Safety
    control_plane_token: SecretStr = SecretStr("")
    require_deployment_approval: bool = True
    require_architecture_approval: bool = False
    secrets_encryption_key: SecretStr = SecretStr("")
    approval_timeout_seconds: int = 86400

    # API
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def has_llm_key(self) -> bool:
        return bool(self.llm_provider_api_key.get_secret_value()) or self.llm_provider == "mock"

    def model_for_tier(self, tier: str) -> str:
        return {
            "cheap": self.llm_cheap_model,
            "standard": self.llm_model,
            "strong": self.llm_strong_model,
        }.get(tier, self.llm_model)

    def validate_runtime(self) -> None:
        if self.llm_provider == "openai-compatible" and not self.has_llm_key:
            raise RuntimeError(
                "LLM_PROVIDER_API_KEY is not set. Set it in .env, or use "
                "LLM_PROVIDER=mock for deterministic offline development/tests."
            )
        Path(self.database_url.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)
        Path(self.workspace_root).mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
