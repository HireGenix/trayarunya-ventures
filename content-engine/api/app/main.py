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
    auth,
    billing,
    billing_checkout,
    brand,
    calendar,
    campaign_plans,
    collab,
    content,
    creative_intel,
    experiments,
    forecast,
    health,
    images,
    insight_actions,
    insights,
    integrations,
    learning,
    next_moves,
    notifications,
    reports,
    research,
    social,
    strategy,
    watchtower,
    workspaces,
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
                "ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(120)",
                # report sharing → expiry / revoke / passcode
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE reports ADD COLUMN IF NOT EXISTS passcode VARCHAR(60)",
                # collaboration → assignee on content items
                "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS assignee_id UUID",
                "ALTER TABLE content_items ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) NOT NULL DEFAULT 'draft'",
            ):
                await conn.execute(text(ddl))
        async with AsyncSessionLocal() as db:
            await seed_plans(db)

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
    app.include_router(research.router, prefix=p)
    app.include_router(insights.router, prefix=p)
    app.include_router(strategy.router, prefix=p)
    app.include_router(content.router, prefix=p)
    app.include_router(calendar.router, prefix=p)
    app.include_router(images.router, prefix=p)
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
    app.include_router(watchtower.router, prefix=p)
    app.include_router(abm.router, prefix=p)
    app.include_router(creative_intel.router, prefix=p)
    app.include_router(campaign_plans.router, prefix=p)
    app.include_router(collab.router, prefix=p)
    app.include_router(forecast.router, prefix=p)

    @app.get("/")
    async def root() -> dict:
        return {"service": settings.app_name, "docs": "/docs", "health": "/health"}

    return app


app = create_app()
