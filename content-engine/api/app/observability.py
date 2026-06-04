"""Observability: optional Sentry error tracking + a structured global exception
handler. Both degrade gracefully: Sentry is only enabled when SENTRY_DSN is set
and the SDK is installed; the exception handler always returns a clean JSON error
carrying the request id for support correlation.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.config import settings

log = logging.getLogger("app.error")

_sentry_enabled = False


def init_sentry() -> bool:
    """Initialise Sentry if a DSN is configured and the SDK is available."""
    global _sentry_enabled
    if not settings.sentry_dsn:
        return False
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
        _sentry_enabled = True
        log.info("Sentry initialised")
    except Exception:  # noqa: BLE001 — never let monitoring break startup
        log.warning("SENTRY_DSN set but sentry-sdk init failed; continuing without it")
        _sentry_enabled = False
    return _sentry_enabled


def _capture(exc: Exception) -> None:
    if not _sentry_enabled:
        return
    try:
        import sentry_sdk

        sentry_sdk.capture_exception(exc)
    except Exception:  # noqa: BLE001
        pass


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def _http_exc(request: Request, exc: StarletteHTTPException):
        rid = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "request_id": rid},
            headers={"X-Request-Id": rid} if rid else None,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_exc(request: Request, exc: RequestValidationError):
        rid = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "request_id": rid},
            headers={"X-Request-Id": rid} if rid else None,
        )

    @app.exception_handler(Exception)
    async def _unhandled_exc(request: Request, exc: Exception):
        rid = getattr(request.state, "request_id", None)
        log.exception("Unhandled error rid=%s path=%s", rid, request.url.path)
        _capture(exc)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": rid,
            },
            headers={"X-Request-Id": rid} if rid else None,
        )
