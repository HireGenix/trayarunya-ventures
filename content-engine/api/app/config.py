"""Application settings, loaded from environment variables.

All secrets come from the environment (Azure Container Apps secrets / local .env).
Mirrors the model wiring used by the main Trayarunya site (Azure OpenAI GPT-5.5 +
Azure Anthropic Claude Opus) so both products share one Azure AI resource.
"""
from __future__ import annotations

from functools import lru_cache
from typing import ClassVar

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    app_name: str = "Trayarunya Content Engine API"
    environment: str = Field(default="development")
    debug: bool = Field(default=False)
    api_v1_prefix: str = "/api/v1"
    public_api_url: str = Field(
        default="http://localhost:8099",
        description="Public base URL of this API, used for email tracking pixels and click links.",
    )

    # --- Rate limiting (per client IP, sliding window in Redis; falls back to
    # in-process when Redis is unavailable) ---
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_auth_per_minute: int = Field(default=10)
    rate_limit_ai_per_minute: int = Field(default=30)
    rate_limit_public_per_minute: int = Field(default=60)
    rate_limit_default_per_minute: int = Field(default=240)

    # --- Observability ---
    sentry_dsn: str | None = None
    log_json: bool = Field(default=True)

    # --- Background loops ---
    # When True the API process may run the scheduler/metrics/alerts/watchtower/
    # ads loops. A Redis leader-lock ensures only ONE process runs them even if
    # multiple replicas have this enabled. Set False on API replicas and run a
    # dedicated process (python -m app.worker.run_loops) for clean separation.
    run_background_loops: bool = Field(default=True)
    leader_lock_ttl_seconds: int = Field(default=30)

    # Max research jobs a single worker processes concurrently. Each in-flight
    # deep-research job may spawn a Chromium crawl, so keep this in line with the
    # worker container's memory (≈1–1.5 GB headroom per concurrent job).
    worker_concurrency: int = Field(default=3, ge=1, le=20)

    # Deep-research depth controls. Each reflect-driven pass re-runs search+crawl,
    # so fewer iterations / a wall-clock budget keeps jobs from appearing "stuck"
    # at the reflect phase (88% in the UI) for several minutes.
    research_max_iterations: int = Field(default=2, ge=1, le=5)
    research_time_budget_seconds: int = Field(default=360, ge=60, le=1800)

    # Queue durability under KEDA scale-in. A running worker refreshes a per-job
    # heartbeat every `worker_heartbeat_interval_seconds`; a reaper (running on
    # every replica) requeues any in-flight job whose heartbeat is older than
    # `worker_visibility_timeout_seconds`, so a job orphaned by a killed replica
    # is retried instead of stranded in the processing list. The timeout must sit
    # safely above the heartbeat interval so a healthy long job is never reaped.
    worker_heartbeat_interval_seconds: int = Field(default=30, ge=5, le=300)
    worker_visibility_timeout_seconds: int = Field(default=180, ge=30, le=3600)
    worker_reaper_interval_seconds: int = Field(default=60, ge=10, le=600)

    # LLM provider for the research pipeline. GPT-5.5 is markedly faster than
    # Claude Opus for the many sequential reasoning calls a research run makes,
    # so it is the default; set to "claude-opus" to prioritise depth over speed.
    research_llm_provider: str = Field(default="gpt-5.5")

    # --- Web search providers (keys loaded from env/secrets; never hard-coded) ---
    # Tried in order; DuckDuckGo's keyless HTML scrape is always the final
    # fallback. Adding any of these makes search reliable when DDG rate-limits
    # (HTTP 403), which is the usual cause of a research run stalling at "search".
    # SearXNG (self-hosted, free) is tried FIRST when configured; if it is slow
    # (> searxng_timeout_seconds) or errors, we fall back to the keyed providers.
    searxng_url: str | None = None
    searxng_timeout_seconds: float = Field(default=5.0, ge=1.0, le=15.0)
    tavily_api_key: str | None = None
    brave_search_api_key: str | None = None
    langsearch_api_key: str | None = None

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

    # --- Azure OpenAI (gpt-chat-latest, Responses API) ---
    # Conversational chat model used for the team assistant / chat surfaces.
    # Falls back to the GPT-5.5 endpoint+key when its own values are unset so a
    # single Azure OpenAI resource can power both.
    azure_gptchat_endpoint: str | None = None
    azure_gptchat_key: str | None = None
    azure_gptchat_deployment: str = "gpt-chat-latest"
    azure_gptchat_api_version: str = "2025-04-01-preview"

    # --- Azure Anthropic (Claude Opus + Sonnet, Messages API) ---
    azure_anthropic_endpoint: str = (
        "https://hiregenix-resource.services.ai.azure.com/anthropic/v1/messages"
    )
    azure_anthropic_key: str | None = None
    azure_anthropic_model: str = "claude-opus-4-7"
    # Claude Sonnet 4.6 shares the same Anthropic endpoint + key; only the model
    # name differs. Used as a faster/cheaper alternative to Opus.
    azure_anthropic_sonnet_model: str = "claude-sonnet-4-6"

    # --- Azure AI model inference (Grok, chat/completions API) ---
    # Falls back to the Anthropic resource key when its own key is unset (same
    # Azure AI resource hosts the model-inference endpoint).
    azure_grok_endpoint: str | None = None
    azure_grok_key: str | None = None
    azure_grok_model: str = "grok-4.3"
    azure_grok_api_version: str = "2024-05-01-preview"

    # --- Azure Blob (asset storage) ---
    azure_blob_connection_string: str | None = None
    azure_blob_container: str = "content-assets"

    # --- Azure image generation (text-to-image for social graphics) ---
    azure_image_endpoint: str | None = None  # gpt-image base, e.g. https://<res>.cognitiveservices.azure.com
    azure_image_key: str | None = None
    azure_image_deployment: str = "gpt-image-2-1"
    azure_image_15_deployment: str = "gpt-image-1.5"  # shares same endpoint + key
    azure_image_api_version: str = "2024-02-01"
    image_rpm: int = 10       # gpt-image 2.1 requests/minute limit
    image_15_rpm: int = 60    # gpt-image-1.5 requests/minute limit
    # MAI-Image-2.5 — text-free, on-brand imagery (graceful fallback to gpt-image
    # when unset/erroring). One of the four supported image models.
    azure_mai_image_endpoint: str | None = None
    azure_mai_image_key: str | None = None
    azure_mai_image_deployment: str = "MAI-Image-2.5"
    mai_image_rpm: int = 10   # MAI-Image-2.5 requests/minute limit
    # Default image provider for social posts / content-calendar / deck imagery.
    default_post_image_provider: str = "mai"
    azure_flux_endpoint: str | None = None  # full BFL provider URL incl ?api-version=preview
    azure_flux_key: str | None = None
    azure_flux_model: str = "flux-2-pro"
    flux_rpm: int = 4         # FLUX.2 Pro requests/minute limit

    # --- AI video (Content Studio): voiceover + captions + Pexels b-roll ---
    # Voiceover via Azure OpenAI gpt-4o-mini-tts (steerable TTS). Falls back to
    # the gpt-5 Azure resource endpoint/key when the dedicated TTS values are
    # unset, so a single Azure OpenAI resource powers text + image + audio.
    azure_tts_endpoint: str | None = None
    azure_tts_key: str | None = None
    azure_tts_deployment: str = "gpt-4o-mini-tts"
    azure_tts_api_version: str = "2025-03-01-preview"
    azure_tts_voice: str = "alloy"  # alloy|echo|fable|onyx|nova|shimmer|coral|sage
    # Caption word-timing via Azure OpenAI Whisper transcription (verbose_json).
    azure_whisper_endpoint: str | None = None
    azure_whisper_key: str | None = None
    azure_whisper_deployment: str = "whisper"
    azure_whisper_api_version: str = "2024-06-01"
    # Pexels stock footage (b-roll). Get a free key at https://www.pexels.com/api/
    pexels_api_key: str | None = None
    # Local fallback storage for rendered videos when Azure Blob is unconfigured.
    media_root: str = "media"

    # --- Social profile auditing (public Instagram reads) ---------------------
    # Instagram blocks anonymous reads from cloud/datacenter IPs (Azure/AWS/GCP),
    # so the research audit works locally but returns "found: false" in prod.
    # Provide either of the following to make it work from the cloud:
    #   1. social_proxy_url  – an outbound residential/rotating proxy URL, e.g.
    #      http://user:pass@host:port (all social scraping routes through it).
    #   2. ig_sessionid      – the `sessionid` cookie from a logged-in instagram
    #      browser session; makes public reads succeed from datacenter IPs.
    social_proxy_url: str | None = None
    ig_sessionid: str | None = None
    # Free cookie pool: comma-separated list of instagram `sessionid` cookies
    # (your own throwaway accounts). The self-hosted scraper rotates across them
    # so no single account/IP gets rate-limited — this is how we scale reads
    # from the cloud without any paid provider.
    ig_sessionids: str | None = None
    # Audit cache TTL (seconds). At scale we serve repeat audits from Redis
    # instead of hitting Instagram every time. 0 disables caching.
    social_audit_cache_ttl: int = Field(default=21600)  # 6 hours

    @property
    def tts_endpoint(self) -> str | None:
        return self.azure_tts_endpoint or self.azure_gpt5_endpoint

    @property
    def tts_key(self) -> str | None:
        return self.azure_tts_key or self.azure_gpt5_key

    @property
    def whisper_endpoint(self) -> str | None:
        return self.azure_whisper_endpoint or self.azure_gpt5_endpoint

    @property
    def whisper_key(self) -> str | None:
        return self.azure_whisper_key or self.azure_gpt5_key

    @property
    def video_configured(self) -> bool:
        return bool(self.pexels_api_key and self.tts_endpoint and self.tts_key)

    # --- OAuth: social networks (native OAuth; you create the developer apps) ---
    oauth_redirect_base: str = Field(
        default="http://localhost:8099",
        description="Public base URL of THIS API; callbacks are <base>/api/v1/social/<net>/callback.",
    )
    linkedin_client_id: str | None = None
    linkedin_client_secret: str | None = None
    # Only request company-page (organization) posting scopes when the LinkedIn app
    # is approved for the Community Management API. Otherwise authorization fails
    # with unauthorized_scope_error. Set to true once approved.
    linkedin_org_posting: bool = False
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
    # Public web origin used to build payment-first signup success/cancel URLs.
    public_web_url: str = Field(default="http://localhost:3100")
    # Single-seat plan pricing (USD). Yearly bills at a 25% discount.
    pro_price_monthly_usd: int = Field(default=499)

    @property
    def pro_price_yearly_usd(self) -> int:
        """Annual total for the Pro seat with a 25% discount applied."""
        return round(self.pro_price_monthly_usd * 12 * 0.75)

    @property
    def stripe_configured(self) -> bool:
        return bool(self.stripe_secret_key)

    # --- Platform superadmin bootstrap ---
    # When set, the app ensures a superadmin user exists on startup. If the user
    # does not yet exist, it is created with ``superadmin_password`` (+ a personal
    # org/workspace) so the admin can log in immediately; if it already exists it
    # is promoted to ``is_superuser=True``. This is the ONLY way a superadmin is
    # minted, so paying customers can never self-elevate.
    superadmin_email: str | None = None
    superadmin_password: str | None = None
    superadmin_name: str = Field(default="Platform Admin")

    # --- Security: token encryption at rest ---
    # Fernet key (urlsafe base64, 32 bytes). When unset, the crypto service
    # derives a dev key from jwt_secret so local dev still works.
    encryption_key: str | None = None

    # --- Messaging: SMS (Twilio) + WhatsApp (Meta Cloud API) ---
    twilio_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None
    whatsapp_token: str | None = None
    whatsapp_phone_id: str | None = None
    whatsapp_verify_token: str | None = None

    @property
    def twilio_configured(self) -> bool:
        return bool(self.twilio_sid and self.twilio_auth_token and self.twilio_from_number)

    @property
    def whatsapp_configured(self) -> bool:
        return bool(self.whatsapp_token and self.whatsapp_phone_id)

    # --- Outbound notifications: email (ACS / SMTP) + Slack ---
    # Azure Communication Services email (preferred). When set, email is sent
    # via ACS; SMTP is used only as a fallback.
    acs_connection_string: str | None = None
    # Sender address; for ACS this must belong to a verified/linked domain,
    # e.g. "DoNotReply@<guid>.azurecomm.net".
    email_from: str | None = None
    email_from_name: str = Field(default="MarketiQ AI")
    email_reply_to: str | None = None

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = Field(default="alerts@trayarunya.com")
    slack_webhook_url: str | None = None

    @property
    def acs_email_configured(self) -> bool:
        return bool(self.acs_connection_string and self.email_sender)

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)

    @property
    def email_sender(self) -> str | None:
        """Effective from-address (ACS sender takes precedence over SMTP from)."""
        return self.email_from or self.smtp_from

    @property
    def email_configured(self) -> bool:
        return self.acs_email_configured or self.smtp_configured

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
    def gptchat_endpoint(self) -> str | None:
        return self.azure_gptchat_endpoint or self.azure_gpt5_endpoint

    @property
    def gptchat_key(self) -> str | None:
        return self.azure_gptchat_key or self.azure_gpt5_key

    @property
    def gptchat_configured(self) -> bool:
        return bool(self.gptchat_endpoint and self.gptchat_key)

    @property
    def grok_key(self) -> str | None:
        return self.azure_grok_key or self.azure_anthropic_key

    @property
    def grok_configured(self) -> bool:
        return bool(self.azure_grok_endpoint and self.grok_key)

    @property
    def claude_sonnet_configured(self) -> bool:
        return bool(self.azure_anthropic_endpoint and self.azure_anthropic_key)

    @property
    def image_configured(self) -> bool:
        return bool(self.azure_image_endpoint and self.azure_image_key)

    @property
    def mai_image_configured(self) -> bool:
        """True when the MAI-Image-2.5 endpoint is usable."""
        return bool(self.azure_mai_image_endpoint and self.azure_mai_image_key)

    @property
    def claude_configured(self) -> bool:
        return bool(self.azure_anthropic_endpoint and self.azure_anthropic_key)

    # --- Production safety ---
    _UNSAFE_JWT_SECRETS: ClassVar[set[str]] = {"dev-insecure-change-me", "", "changeme", "secret"}

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    def production_safety_errors(self) -> list[str]:
        """Return a list of misconfigurations that must block production startup.

        Empty list means the configuration is safe to run in production. This is
        only enforced when ``environment`` is production/prod, so local and
        staging keep working with dev-friendly defaults.
        """
        errors: list[str] = []
        if not self.is_production:
            return errors

        if self.jwt_secret in self._UNSAFE_JWT_SECRETS or len(self.jwt_secret) < 32:
            errors.append(
                "JWT_SECRET is unset/weak — set a random value of at least 32 chars."
            )
        if not self.encryption_key:
            errors.append(
                "ENCRYPTION_KEY is unset — token encryption would fall back to a "
                "key derived from JWT_SECRET. Set a stable Fernet key in production."
            )
        if "postgres:postgres@localhost" in self.database_url or "@localhost" in self.database_url:
            errors.append(
                "DATABASE_URL points at a local/default database — set the managed "
                "Postgres URL."
            )
        if self.debug:
            errors.append("DEBUG must be false in production.")
        insecure_origins = [
            o for o in self.cors_origin_list if o.startswith("http://") and "localhost" not in o
        ]
        if not self.cors_origin_list:
            errors.append("CORS_ORIGINS is empty — set the public web origin(s).")
        if insecure_origins:
            errors.append(
                f"CORS_ORIGINS contains insecure non-localhost http origins: {insecure_origins}"
            )
        if self.oauth_redirect_base.startswith("http://") and "localhost" not in self.oauth_redirect_base:
            errors.append("OAUTH_REDIRECT_BASE must be https in production.")
        return errors


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
