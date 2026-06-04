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

    # --- Azure image generation (text-to-image for social graphics) ---
    azure_image_endpoint: str | None = None  # gpt-image base, e.g. https://<res>.cognitiveservices.azure.com
    azure_image_key: str | None = None
    azure_image_deployment: str = "gpt-image-2-1"
    azure_image_api_version: str = "2024-02-01"
    # Optional alternative image models (graceful fallback to gpt-image when unset/erroring)
    azure_mai_image_endpoint: str | None = None
    azure_mai_image_key: str | None = None
    azure_mai_image_deployment: str = "MAI-Image-2.5"
    azure_flux_endpoint: str | None = None  # full BFL provider URL incl ?api-version=preview
    azure_flux_key: str | None = None
    azure_flux_model: str = "flux-2-pro"

    # --- OAuth: social networks (native OAuth; you create the developer apps) ---
    oauth_redirect_base: str = Field(
        default="http://localhost:8099",
        description="Public base URL of THIS API; callbacks are <base>/api/v1/social/<net>/callback.",
    )
    linkedin_client_id: str | None = None
    linkedin_client_secret: str | None = None
    x_client_id: str | None = None
    x_client_secret: str | None = None
    meta_app_id: str | None = None
    meta_app_secret: str | None = None
    google_client_id: str | None = None
    google_client_secret: str | None = None

    # --- Google Ads (M5) ---
    google_ads_developer_token: str | None = None
    google_ads_login_customer_id: str | None = None

    # --- Meta (Facebook/Instagram) Ads ---
    meta_ads_access_token: str | None = None
    meta_ads_account_id: str | None = None

    # --- LinkedIn Ads ---
    linkedin_ads_access_token: str | None = None
    linkedin_ads_account_id: str | None = None

    # --- Stripe billing ---
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_success_url: str = Field(
        default="http://localhost:3100/dashboard/billing?checkout=success"
    )
    stripe_cancel_url: str = Field(
        default="http://localhost:3100/dashboard/billing?checkout=cancel"
    )

    @property
    def stripe_configured(self) -> bool:
        return bool(self.stripe_secret_key)

    # --- Security: token encryption at rest ---
    # Fernet key (urlsafe base64, 32 bytes). When unset, the crypto service
    # derives a dev key from jwt_secret so local dev still works.
    encryption_key: str | None = None

    # --- Outbound notifications: email (SMTP) + Slack ---
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = Field(default="alerts@trayarunya.com")
    slack_webhook_url: str | None = None

    @property
    def email_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def slack_configured(self) -> bool:
        return bool(self.slack_webhook_url)

    # --- External integrations (CRM / analytics / ecommerce) ---
    hubspot_client_id: str | None = None
    hubspot_client_secret: str | None = None
    ga4_property_id: str | None = None
    google_search_console_site: str | None = None
    shopify_api_key: str | None = None
    shopify_api_secret: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def google_ads_configured(self) -> bool:
        # OAuth-based connect: needs the Google OAuth app credentials. The Ads
        # developer token is only required for live reporting calls.
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def meta_ads_configured(self) -> bool:
        return bool(self.meta_app_id and self.meta_app_secret)

    @property
    def linkedin_ads_configured(self) -> bool:
        return bool(self.linkedin_client_id and self.linkedin_client_secret)

    def ads_platform_configured(self, platform: str) -> bool:
        return {
            "google_ads": self.google_ads_configured,
            "meta_ads": self.meta_ads_configured,
            "linkedin_ads": self.linkedin_ads_configured,
        }.get(platform, False)

    @property
    def gpt5_configured(self) -> bool:
        return bool(self.azure_gpt5_endpoint and self.azure_gpt5_key)

    @property
    def image_configured(self) -> bool:
        return bool(self.azure_image_endpoint and self.azure_image_key)

    @property
    def claude_configured(self) -> bool:
        return bool(self.azure_anthropic_endpoint and self.azure_anthropic_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
