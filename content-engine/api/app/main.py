"""FastAPI application factory for the Trayarunya Content Engine API."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    ads,
    analytics,
    auth,
    billing,
    brand,
    calendar,
    content,
    health,
    images,
    insights,
    research,
    social,
    strategy,
    workspaces,
)

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

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
            ):
                await conn.execute(text(ddl))
        async with AsyncSessionLocal() as db:
            await seed_plans(db)

    # Start the publishing scheduler: fires due, approved/scheduled posts.
    # Plus the results loop: pulls real engagement back from published posts.
    from app.services.scheduler import metrics_refresh_loop, scheduler_loop

    stop = asyncio.Event()
    scheduler_task = asyncio.create_task(scheduler_loop(stop))
    metrics_task = asyncio.create_task(metrics_refresh_loop(stop))
    try:
        yield
    finally:
        stop.set()
        scheduler_task.cancel()
        metrics_task.cancel()
        for task in (scheduler_task, metrics_task):
            try:
                await task
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
    app.include_router(billing.router, prefix=p)

    @app.get("/")
    async def root() -> dict:
        return {"service": settings.app_name, "docs": "/docs", "health": "/health"}

    return app


app = create_app()
