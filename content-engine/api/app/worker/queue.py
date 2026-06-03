"""Redis-backed job queue. Enqueues research jobs for the crawl4ai worker.

A list (``ce:jobs``) is used as a simple reliable FIFO via BRPOPLPUSH semantics.
If Redis is unavailable, ``enqueue`` returns False so the caller can fall back to
running the job inline as a FastAPI background task.
"""
from __future__ import annotations

import json

import redis.asyncio as aioredis
from redis.exceptions import RedisError
from redis.exceptions import TimeoutError as RedisTimeoutError

from app.config import settings

JOBS_KEY = "ce:jobs"
PROCESSING_KEY = "ce:jobs:processing"

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        # socket_timeout must exceed the blocking-pop timeout so BRPOPLPUSH can
        # block server-side without the client raising a read timeout while idle.
        _redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_timeout=30,
            socket_keepalive=True,
            health_check_interval=30,
        )
    return _redis


async def enqueue(job_type: str, payload: dict) -> bool:
    try:
        r = get_redis()
        await r.lpush(JOBS_KEY, json.dumps({"type": job_type, "payload": payload}))
        return True
    except Exception:
        return False


async def reserve(timeout: int = 5) -> dict | None:
    r = get_redis()
    try:
        raw = await r.brpoplpush(JOBS_KEY, PROCESSING_KEY, timeout=timeout)
    except (RedisTimeoutError, RedisError):
        # Idle queue / transient connection blip — treat as "no job".
        return None
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None
