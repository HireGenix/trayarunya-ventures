"""Application settings, loaded from environment variables.

All secrets come from the environment (Azure Container Apps secrets / local .env).
Mirrors the model wiring used by the main Trayarunya site (Azure OpenAI GPT-5.5 +
Azure Anthropic Claude Opus) so both products share one Azure AI resource.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    app_name: str = "Trayarunya Content Engine API"
    environment: str = Field(default="development")
    debug: bool = Field(default=True)
    api_v1_prefix: str = "/api/v1"

    # --- CORS ---
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:3100",
        description="Comma-separated list of allowed web origins.",
    )

    # --- Database ---
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/content_engine",
        description="Async SQLAlchemy URL for Azure Database for PostgreSQL.",
    )

    # --- Redis (Azure Cache for Redis) ---
    redis_url: str = Field(default="redis://localhost:6379/0")

    # --- Auth ---
    jwt_secret: str = Field(default="dev-insecure-change-me")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # --- Azure OpenAI (GPT-5.5, Responses API) ---
    azure_gpt5_endpoint: str | None = None
    azure_gpt5_key: str | None = None
    azure_gpt5_deployment: str = "gpt-5.5"
    azure_gpt5_api_version: str = "2025-04-01-preview"

    # --- Azure Anthropic (Claude Opus, Messages API) ---
    azure_anthropic_endpoint: str = (
        "https://hiregenix-resource.services.ai.azure.com/anthropic/v1/messages"
    )
    azure_anthropic_key: str | None = None
    azure_anthropic_model: str = "claude-opus-4-7"

    # --- Azure Blob (asset storage) ---
    azure_blob_connection_string: str | None = None
    azure_blob_container: str = "content-assets"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def gpt5_configured(self) -> bool:
        return bool(self.azure_gpt5_endpoint and self.azure_gpt5_key)

    @property
    def claude_configured(self) -> bool:
        return bool(self.azure_anthropic_endpoint and self.azure_anthropic_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
