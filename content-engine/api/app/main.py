"""FastAPI application factory for the Trayarunya Content Engine API."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, health, research, strategy, workspaces

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # In production, schema is managed by Alembic migrations. For local/dev we
    # create tables on startup so the app is runnable without a migration step.
    if settings.environment == "development":
        from app.db import engine
        from app.models import Base

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


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
    app.include_router(research.router, prefix=p)
    app.include_router(strategy.router, prefix=p)

    @app.get("/")
    async def root() -> dict:
        return {"service": settings.app_name, "docs": "/docs", "health": "/health"}

    return app


app = create_app()
