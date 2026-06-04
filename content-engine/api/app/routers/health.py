"""Health + readiness probes."""
from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.db import engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": settings.app_name, "env": settings.environment}


@router.get("/ready")
async def ready() -> dict:
    db_ok = True
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    redis_ok: bool | None = None
    try:
        from app.worker.queue import get_redis

        await get_redis().ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    safety_errors = settings.production_safety_errors()
    status = "ok" if (db_ok and not safety_errors) else "degraded"
    return {
        "status": status,
        "environment": settings.environment,
        "database": db_ok,
        "redis": redis_ok,
        "gpt5_configured": settings.gpt5_configured,
        "claude_configured": settings.claude_configured,
        "stripe_configured": settings.stripe_configured,
        "production_safe": not safety_errors,
        "production_safety_errors": safety_errors,
    }
