"""FastAPI application factory for the Trayarunya Content Engine API."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware import RateLimitMiddleware, RequestContextMiddleware
from app.logging_config import configure_logging
from app.observability import init_sentry, register_exception_handlers

from app.config import settings
from app.routers import (
    abm,
    ads,
    analytics,
    attribution,
    auth,
    billing,
    billing_checkout,
    brand,
    calendar,
    campaign_plans,
    chat,
    decks,
    collab,
    content,
    creative_intel,
    cro,
    experiments,
    forecast,
    health,
    images,
    insight_actions,
    icp,
    insights,
    integrations,
    linkedin_growth,
    linkedin_platform,
    learning,
    next_moves,
    models as models_router,
    notifications,
    portal,
    automation,
    admin as admin_router,
    reports,
    research,
    social,
    strategy,
    videos,
    watchtower,
    workspaces,
    email as email_router,
    messaging as messaging_router,
    social_inbox,
    seo as seo_router,
    funnels,
    forms,
    leadscore,
    referrals,
    reputation,
    budgetpacing,
    influencers,
    mmm,
    guardrails,
    email_track,
    deck_shared,
    public_pages,
    content_optimize,
    messaging_webhook,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    # Production safety gate: refuse to start with unsafe configuration.
    safety_errors = settings.production_safety_errors()
    if safety_errors:
        joined = "\n  - ".join(safety_errors)
        raise RuntimeError(
            "Refusing to start in production with unsafe configuration:\n  - "
            + joined
        )

    # In production, schema is managed by Alembic migrations. For local/dev we
    # create tables on startup so the app is runnable without a migration step.
    if settings.environment == "development":
        from sqlalchemy import text

        from app.db import AsyncSessionLocal, engine
        from app.models import Base
        from app.services.billing import seed_plans

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # create_all won't ALTER existing tables — add new columns idempotently.
            for ddl in (
                "ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS countries JSONB",
                "ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS platforms JSONB",
                "ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS self_handle VARCHAR(300)",
                "ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS reasoning JSONB",
                "ALTER TABLE research_jobs ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION",
                "ALTER TABLE competitors ADD COLUMN IF NOT EXISTS country VARCHAR(80)",
                "ALTER TABLE competitors ADD COLUMN IF NOT EXISTS social_handles JSONB",
                "ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS connected BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'USD'",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recommendations JSONB",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS metrics_synced_at TIMESTAMPTZ",
                # reports table additions (create_all handles the table; these handle future columns)
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0",
                # insights → action: tagging + lifecycle status
                "ALTER TABLE insights ADD COLUMN IF NOT EXISTS tags JSONB",
                "ALTER TABLE insights ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'new'",
                # billing → Stripe checkout
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(120)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(120)",
                "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS client_limit INTEGER",
                "ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(120)",
                # report sharing → expiry / revoke / passcode
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS passcode VARCHAR(60)",
                # collaboration → assignee on content items
                "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS assignee_id UUID",
                "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'draft'",
                # Phase 2 CRO: generalize experiments beyond content surfaces.
                "ALTER TABLE experiments ADD COLUMN IF NOT EXISTS surface VARCHAR(30) NOT NULL DEFAULT 'content'",
                # Email enterprise: A/B test config + per-send variant/sequence refs.
                "ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS ab_test JSONB",
                "ALTER TABLE email_send_logs ADD COLUMN IF NOT EXISTS variant_key VARCHAR(40)",
                "ALTER TABLE email_send_logs ADD COLUMN IF NOT EXISTS sequence_id UUID",
                # Deck enterprise: public share viewer.
                "ALTER TABLE decks ADD COLUMN IF NOT EXISTS share_token VARCHAR(64)",
                "ALTER TABLE decks ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE decks ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
                # SEO enterprise: keyword research signals (estimated/proxy + metrics).
                "ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS difficulty INTEGER",
                "ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS volume_proxy INTEGER",
                "ALTER TABLE seo_keywords ADD COLUMN IF NOT EXISTS metrics JSONB",
                "ALTER TABLE abm_accounts ADD COLUMN IF NOT EXISTS fit_score FLOAT",
                "ALTER TABLE abm_accounts ADD COLUMN IF NOT EXISTS intent_score FLOAT",
                "ALTER TABLE abm_accounts ADD COLUMN IF NOT EXISTS fit_factors JSONB",
                "ALTER TABLE reputation_reviews ADD COLUMN IF NOT EXISTS sentiment_score DOUBLE PRECISION",
                "ALTER TABLE reputation_reviews ADD COLUMN IF NOT EXISTS themes JSONB",
                "ALTER TABLE influencer_creators ADD COLUMN IF NOT EXISTS avg_likes INTEGER",
                "ALTER TABLE influencer_creators ADD COLUMN IF NOT EXISTS avg_comments INTEGER",
                "ALTER TABLE influencer_creators ADD COLUMN IF NOT EXISTS avg_views INTEGER",
                "ALTER TABLE influencer_creators ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION",
                "ALTER TABLE influencer_creators ADD COLUMN IF NOT EXISTS fraud_risk DOUBLE PRECISION",
                "ALTER TABLE influencer_creators ADD COLUMN IF NOT EXISTS fraud_flags JSONB",
                "ALTER TABLE influencer_creators ADD COLUMN IF NOT EXISTS tier VARCHAR(10)",
                "ALTER TABLE influencer_campaigns ADD COLUMN IF NOT EXISTS spend DOUBLE PRECISION",
                "ALTER TABLE influencer_campaigns ADD COLUMN IF NOT EXISTS impressions INTEGER",
                "ALTER TABLE influencer_campaigns ADD COLUMN IF NOT EXISTS clicks INTEGER",
                "ALTER TABLE influencer_campaigns ADD COLUMN IF NOT EXISTS conversions INTEGER",
                "ALTER TABLE referral_advocates ADD COLUMN IF NOT EXISTS fraud_score FLOAT",
                "ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS fraud_flags JSONB",
                "ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)",
                "ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500)",
                "ALTER TABLE competitor_watches ADD COLUMN IF NOT EXISTS monitoring_status VARCHAR(40) DEFAULT 'idle'",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS launch_error TEXT",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platform_status VARCHAR(60)",
                "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS launched_at TIMESTAMPTZ",
                "ALTER TABLE schedules ADD COLUMN IF NOT EXISTS permalink VARCHAR(600)",
                "ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS to_phone VARCHAR(40)",
                "ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS body TEXT",
                "ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(120)",
                "ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ",
                "ALTER TABLE messaging_logs ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ",
                "ALTER TABLE social_inbox_items ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(300)",
                "ALTER TABLE social_inbox_items ADD COLUMN IF NOT EXISTS intent VARCHAR(40)",
                "ALTER TABLE social_inbox_items ADD COLUMN IF NOT EXISTS urgency VARCHAR(20)",
                "ALTER TABLE social_inbox_replies ADD COLUMN IF NOT EXISTS platform_reply_id VARCHAR(300)",
            ):
                await conn.execute(text(ddl))
        async with AsyncSessionLocal() as db:
            await seed_plans(db)

    # Seed the model registry from env/secrets and load the in-memory snapshot.
    # Runs in every environment (after migrations in prod, after create_all in
    # dev). Best-effort: a failure here must not block startup — the adapter
    # falls back to reading provider config straight from settings.
    try:
        from app.db import AsyncSessionLocal as _Session
        from app.services.model_registry import seed_from_env

        async with _Session() as db:
            await seed_from_env(db)
    except Exception:  # noqa: BLE001
        import logging

        logging.getLogger("model_registry").exception("model registry seed failed; using env fallback")

    # Ensure a platform superadmin exists when configured via env. Best-effort:
    # never block startup. Creates the account (with a personal org/workspace) on
    # first run, or promotes an existing user to superadmin.
    if settings.superadmin_email:
        try:
            from app.db import AsyncSessionLocal as _Session
            from app.services.admin_service import ensure_superadmin

            async with _Session() as db:
                await ensure_superadmin(db)
        except Exception:  # noqa: BLE001
            import logging

            logging.getLogger("admin").exception("superadmin bootstrap failed")

    # Background loops (scheduler, metrics, alerts, watchtower, ads optimizer).
    # A Redis leader-lock ensures only one process runs them across replicas;
    # fails open to local execution when Redis is unavailable. Disable on API
    # replicas via RUN_BACKGROUND_LOOPS=false and run `python -m app.worker.run_loops`.
    stop = asyncio.Event()
    supervisor_task: asyncio.Task | None = None
    if settings.run_background_loops:
        from app.worker.leader import run_background_supervisor

        supervisor_task = asyncio.create_task(run_background_supervisor(stop))
    try:
        yield
    finally:
        stop.set()
        if supervisor_task is not None:
            supervisor_task.cancel()
            try:
                await supervisor_task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass


def create_app() -> FastAPI:
    configure_logging()
    init_sentry()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )

    register_exception_handlers(app)

    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestContextMiddleware)

    app.include_router(health.router)
    p = settings.api_v1_prefix
    app.include_router(auth.router, prefix=p)
    app.include_router(workspaces.router, prefix=p)
    app.include_router(brand.router, prefix=p)
    app.include_router(icp.router, prefix=p)
    app.include_router(chat.router, prefix=p)
    app.include_router(decks.router, prefix=p)
    app.include_router(research.router, prefix=p)
    app.include_router(insights.router, prefix=p)
    app.include_router(strategy.router, prefix=p)
    app.include_router(content.router, prefix=p)
    app.include_router(calendar.router, prefix=p)
    app.include_router(images.router, prefix=p)
    app.include_router(videos.router, prefix=p)
    app.include_router(social.router, prefix=p)
    app.include_router(ads.router, prefix=p)
    app.include_router(analytics.router, prefix=p)
    app.include_router(next_moves.router, prefix=p)
    app.include_router(learning.router, prefix=p)
    app.include_router(insight_actions.router, prefix=p)
    app.include_router(notifications.router, prefix=p)
    app.include_router(reports.router, prefix=p)
    app.include_router(billing.router, prefix=p)
    app.include_router(billing_checkout.router, prefix=p)
    app.include_router(experiments.router, prefix=p)
    app.include_router(integrations.router, prefix=p)
    app.include_router(linkedin_growth.router, prefix=p)
    app.include_router(linkedin_platform.router, prefix=p)
    app.include_router(attribution.router, prefix=p)
    app.include_router(watchtower.router, prefix=p)
    app.include_router(abm.router, prefix=p)
    app.include_router(creative_intel.router, prefix=p)
    app.include_router(cro.router, prefix=p)
    app.include_router(campaign_plans.router, prefix=p)
    app.include_router(collab.router, prefix=p)
    app.include_router(forecast.router, prefix=p)
    app.include_router(portal.router, prefix=p)
    app.include_router(automation.router, prefix=p)
    app.include_router(models_router.router, prefix=p)
    app.include_router(models_router.admin_router, prefix=p)
    app.include_router(admin_router.router, prefix=p)
    app.include_router(email_router.router, prefix=p)
    app.include_router(messaging_router.router, prefix=p)
    app.include_router(social_inbox.router, prefix=p)
    app.include_router(seo_router.router, prefix=p)
    app.include_router(funnels.router, prefix=p)
    app.include_router(forms.router, prefix=p)
    app.include_router(leadscore.router, prefix=p)
    app.include_router(referrals.router, prefix=p)
    app.include_router(reputation.router, prefix=p)
    app.include_router(budgetpacing.router, prefix=p)
    app.include_router(influencers.router, prefix=p)
    app.include_router(mmm.router, prefix=p)
    app.include_router(guardrails.router, prefix=p)
    app.include_router(content_optimize.router, prefix=p)
    # Public (unauthenticated) runtime: email tracking, deck share viewer,
    # landing-page / variant-serving / form-submit. These are hit by anonymous
    # browsers and mail clients, so NO auth and NO workspace header.
    app.include_router(email_track.router)
    app.include_router(email_track.webhook_router)
    app.include_router(messaging_webhook.router)
    app.include_router(deck_shared.router)
    app.include_router(public_pages.router, prefix=p)

    @app.get("/")
    async def root() -> dict:
        return {"service": settings.app_name, "docs": "/docs", "health": "/health"}

    return app


app = create_app()
