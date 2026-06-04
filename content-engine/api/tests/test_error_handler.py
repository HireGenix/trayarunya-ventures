"""Global exception handler tests: structured JSON errors carry request_id."""
from __future__ import annotations

import httpx
import pytest
from fastapi import FastAPI

from app.middleware import RequestContextMiddleware
from app.observability import register_exception_handlers


@pytest.fixture
def app():
    app = FastAPI()
    register_exception_handlers(app)
    app.add_middleware(RequestContextMiddleware)

    @app.get("/boom")
    async def boom():
        raise RuntimeError("kaboom")

    @app.get("/ok")
    async def ok():
        return {"ok": True}

    return app


async def test_unhandled_error_returns_structured_500(app):
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.get("/boom", headers={"X-Request-Id": "rid-xyz"})
    assert resp.status_code == 500
    body = resp.json()
    assert body["detail"] == "Internal server error"
    assert body["request_id"] == "rid-xyz"
    assert resp.headers.get("X-Request-Id") == "rid-xyz"


async def test_404_is_structured(app):
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        resp = await c.get("/nope")
    assert resp.status_code == 404
    body = resp.json()
    assert "request_id" in body
