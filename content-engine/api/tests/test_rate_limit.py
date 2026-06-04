"""Rate limiting middleware tests (in-process fallback path)."""
from __future__ import annotations

import httpx
import pytest

from app.config import get_settings
from app.main import create_app


@pytest.fixture
def low_limit_app(monkeypatch):
    # Force a tiny default limit and ensure Redis path fails so the in-process
    # sliding window is exercised deterministically.
    settings = get_settings()
    monkeypatch.setattr(settings, "rate_limit_default_per_minute", 3)
    monkeypatch.setattr(settings, "rate_limit_enabled", True)

    import app.middleware as mw

    async def _boom():
        raise RuntimeError("redis down")

    monkeypatch.setattr(mw, "_AI_MARKERS", ())  # treat path as default bucket
    monkeypatch.setattr("app.worker.queue.get_redis", lambda: (_ for _ in ()).throw(RuntimeError("redis down")))
    return create_app()


async def test_rate_limit_triggers_429(low_limit_app):
    transport = httpx.ASGITransport(app=low_limit_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
        # /health is exempt; hit a real-but-unknown path that passes through.
        statuses = [(await c.get("/api/v1/ping-test")).status_code for _ in range(6)]
    assert 429 in statuses, f"expected a 429 after exceeding limit, got {statuses}"


async def test_health_is_exempt_from_rate_limit(low_limit_app):
    transport = httpx.ASGITransport(app=low_limit_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as c:
        statuses = [(await c.get("/health")).status_code for _ in range(10)]
    assert all(s == 200 for s in statuses)
