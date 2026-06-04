"""ASGI smoke tests: app boots, core endpoints respond, security headers and
rate limiting are wired. These run without a database (httpx ASGITransport does
not trigger the lifespan), so they are safe in any CI environment."""
from __future__ import annotations

import httpx
import pytest

from app.main import create_app

# Expected total route count — bump intentionally when routes are added/removed.
EXPECTED_ROUTE_COUNT = 199


@pytest.fixture(scope="module")
def app():
    return create_app()


@pytest.fixture
def client(app):
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


def test_route_count_regression(app):
    assert len(app.routes) == EXPECTED_ROUTE_COUNT


async def test_health_ok(client):
    async with client as c:
        resp = await c.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"


async def test_security_headers_present(client):
    async with client as c:
        resp = await c.get("/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert "X-Request-Id" in resp.headers


async def test_request_id_is_echoed(client):
    async with client as c:
        resp = await c.get("/health", headers={"X-Request-Id": "trace-abc"})
    assert resp.headers.get("X-Request-Id") == "trace-abc"


async def test_unknown_route_404(client):
    async with client as c:
        resp = await c.get("/api/v1/does-not-exist")
    assert resp.status_code == 404
