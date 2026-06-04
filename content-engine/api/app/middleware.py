"""Production middleware: request IDs, security headers, structured access logs,
and Redis-backed (with in-process fallback) rate limiting.

These are intentionally dependency-light and fail-open: an internal error in the
middleware must never take down a request. Rate limiting degrades to allow when
its backing store is unavailable so a Redis blip cannot lock users out.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

access_logger = logging.getLogger("app.access")

# Routes that get tighter limits. Matched by path-contains on the request path.
_AI_MARKERS = (
    "/research",
    "/content/generate",
    "/ads/campaigns/generate",
    "/strategy",
    "/insights",
    "/creative-intel",
    "/forecast/narrative",
    "/abm/",
    "/campaign-plans/build",
    "/experiments",
)
_AUTH_MARKERS = ("/auth/login", "/auth/register", "/auth/token")
_PUBLIC_MARKERS = ("/reports/public", "/r/")


def _limit_for(path: str) -> tuple[str, int]:
    """Return (bucket, per_minute) for a request path."""
    if any(m in path for m in _AUTH_MARKERS):
        return "auth", settings.rate_limit_auth_per_minute
    if any(m in path for m in _PUBLIC_MARKERS):
        return "public", settings.rate_limit_public_per_minute
    if any(m in path for m in _AI_MARKERS):
        return "ai", settings.rate_limit_ai_per_minute
    return "default", settings.rate_limit_default_per_minute


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a request id, emit a structured access log, set security headers."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
        request.state.request_id = request_id
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:  # noqa: BLE001 — log then re-raise so handlers/500 fire
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            self._log(request, 500, duration_ms, request_id, error=True)
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-Id"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "0"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        self._log(request, response.status_code, duration_ms, request_id)
        return response

    @staticmethod
    def _log(request: Request, status: int, duration_ms: float, request_id: str, *, error: bool = False) -> None:
        client = request.client.host if request.client else "-"
        if settings.log_json:
            payload = {
                "ts": time.time(),
                "level": "error" if error or status >= 500 else "info",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": status,
                "duration_ms": duration_ms,
                "client": client,
            }
            access_logger.info(json.dumps(payload))
        else:
            access_logger.info(
                "%s %s -> %s (%.2fms) rid=%s",
                request.method,
                request.url.path,
                status,
                duration_ms,
                request_id,
            )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limit per client IP + route bucket.

    Uses Redis when available (shared across replicas); otherwise falls back to
    an in-process window so single-instance and local dev are still protected.
    Fail-open on any backend error.
    """

    def __init__(self, app):
        super().__init__(app)
        self._fallback: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if not settings.rate_limit_enabled or request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path in ("/health", "/ready", "/metrics"):
            return await call_next(request)

        bucket, per_minute = _limit_for(path)
        client = request.client.host if request.client else "anon"
        key = f"rl:{bucket}:{client}"

        allowed, remaining = await self._check(key, per_minute)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please slow down.",
                    "bucket": bucket,
                    "limit_per_minute": per_minute,
                },
                headers={"Retry-After": "10", "X-RateLimit-Limit": str(per_minute)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        return response

    async def _check(self, key: str, per_minute: int) -> tuple[bool, int]:
        # Try Redis first (atomic INCR + EXPIRE over a 60s window).
        try:
            from app.worker.queue import get_redis

            r = get_redis()
            window = int(time.time() // 60)
            rkey = f"{key}:{window}"
            count = await r.incr(rkey)
            if count == 1:
                await r.expire(rkey, 70)
            return (count <= per_minute, per_minute - count)
        except Exception:  # noqa: BLE001 — fall back to in-process
            pass

        now = time.time()
        dq = self._fallback[key]
        cutoff = now - 60
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= per_minute:
            return (False, 0)
        dq.append(now)
        return (True, per_minute - len(dq))
