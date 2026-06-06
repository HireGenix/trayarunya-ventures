"""Redis-backed job queue. Enqueues research jobs for the crawl4ai worker.

A list (``JOBS_KEY``) is the FIFO; reserved items are parked on ``PROCESSING_KEY``
via ``BRPOPLPUSH`` so a crash mid-job doesn't lose work. While a job runs, the
worker refreshes a per-job heartbeat in ``HEARTBEAT_KEY`` (a hash keyed by the raw
payload). A reaper (:func:`reap`) requeues any item whose heartbeat is older than a
visibility timeout — this reclaims jobs orphaned when KEDA scales a replica in
mid-flight, without stealing jobs that a live sibling replica is still working on.

Azure Cache for Redis runs in *cluster* mode, where multi-key commands like
``BRPOPLPUSH`` (and our Lua reaper, which touches all three keys) require every key
to live in the same hash slot. We use a shared ``{ce-queue}`` hash tag on all keys
so they always co-locate; without it the server raises ``CROSSSLOT`` and the queue
silently never drains.

If Redis is unavailable, ``enqueue`` returns False so the caller can fall back to
running the job inline as a FastAPI background task.
"""
from __future__ import annotations

import json
import logging
import time

import redis.asyncio as aioredis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisError
from redis.exceptions import TimeoutError as RedisTimeoutError

from app.config import settings

logger = logging.getLogger("worker.queue")

# The `{ce-queue}` hash tag forces all keys into the same cluster slot so the
# multi-key BRPOPLPUSH and the reaper's Lua script are legal on Azure Cache for
# Redis (cluster mode).
JOBS_KEY = "ce:{ce-queue}:jobs"
PROCESSING_KEY = "ce:{ce-queue}:processing"
HEARTBEAT_KEY = "ce:{ce-queue}:heartbeat"

# Atomic reaper. For every item parked in PROCESSING:
#   * if it has no heartbeat yet (freshly reserved, or reserved-then-crashed),
#     adopt it by stamping `now` — this both closes the reserve->heartbeat race
#     (a just-reserved job is never reaped on first sight) and starts the clock
#     for a genuinely orphaned job that never began heartbeating.
#   * if its heartbeat is older than the visibility timeout, the worker that held
#     it is gone — move it back onto JOBS and drop its heartbeat so another
#     replica retries it.
# KEYS: 1=jobs 2=processing 3=heartbeat   ARGV: 1=now 2=visibility_timeout
_REAP_LUA = """
local items = redis.call('LRANGE', KEYS[2], 0, -1)
local now = tonumber(ARGV[1])
local vis = tonumber(ARGV[2])
local moved = 0
for _, raw in ipairs(items) do
  local hb = redis.call('HGET', KEYS[3], raw)
  if not hb then
    redis.call('HSET', KEYS[3], raw, now)
  elseif (now - tonumber(hb)) > vis then
    if redis.call('LREM', KEYS[2], 1, raw) > 0 then
      redis.call('LPUSH', KEYS[1], raw)
      redis.call('HDEL', KEYS[3], raw)
      moved = moved + 1
    end
  end
end
return moved
"""

# Atomically move one specific item from PROCESSING back to JOBS (used for fast,
# voluntary hand-off on graceful shutdown).
# KEYS: 1=jobs 2=processing 3=heartbeat   ARGV: 1=raw
_REQUEUE_LUA = """
if redis.call('LREM', KEYS[2], 1, ARGV[1]) > 0 then
  redis.call('LPUSH', KEYS[1], ARGV[1])
  redis.call('HDEL', KEYS[3], ARGV[1])
  return 1
end
return 0
"""

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
    except Exception:  # noqa: BLE001
        logger.exception("Failed to enqueue %s job", job_type)
        return False


async def reserve(timeout: int = 5) -> str | None:
    """Block up to ``timeout`` seconds for the next job; park it on PROCESSING.

    Returns the raw JSON payload string (so the caller can :func:`ack` the exact
    value) or ``None`` when the queue is idle. On reserving a job we immediately
    stamp its heartbeat so the reaper treats it as live. Connection blips return
    ``None``; any other Redis error (e.g. a malformed command) is logged loudly
    rather than swallowed, because a silently-failing pop means the queue never
    drains.
    """
    r = get_redis()
    try:
        raw = await r.brpoplpush(JOBS_KEY, PROCESSING_KEY, timeout=timeout)
    except (RedisTimeoutError, RedisConnectionError):
        # Idle queue / transient connection blip — treat as "no job".
        return None
    except RedisError:
        logger.exception("reserve() failed on BRPOPLPUSH; queue not draining")
        return None
    if raw is not None:
        await heartbeat(raw)
    return raw


async def heartbeat(raw: str) -> None:
    """Stamp ``raw``'s heartbeat with the current time (best effort).

    Called on reserve and then periodically by the worker while the job runs, so
    the reaper can tell a live long-running job apart from an orphaned one.
    """
    try:
        r = get_redis()
        await r.hset(HEARTBEAT_KEY, raw, str(int(time.time())))
    except Exception:  # noqa: BLE001
        logger.warning("Failed to refresh heartbeat for a job", exc_info=True)


async def ack(raw: str) -> None:
    """Acknowledge a finished job: drop it from PROCESSING and its heartbeat."""
    try:
        r = get_redis()
        await r.lrem(PROCESSING_KEY, 1, raw)
        await r.hdel(HEARTBEAT_KEY, raw)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to ack job; it may be requeued on next restart")


async def requeue(raw: str) -> bool:
    """Atomically move one in-flight item back onto JOBS (graceful hand-off).

    Used on shutdown so a sibling replica can pick the job up immediately instead
    of waiting for the visibility timeout. Returns True if it was moved.
    """
    try:
        r = get_redis()
        moved = await r.eval(_REQUEUE_LUA, 3, JOBS_KEY, PROCESSING_KEY, HEARTBEAT_KEY, raw)
        return bool(moved)
    except Exception:  # noqa: BLE001
        logger.warning("Failed to requeue a job on shutdown; reaper will reclaim it", exc_info=True)
        return False


async def reap(visibility_timeout: int | None = None) -> int:
    """Requeue jobs whose heartbeat has gone stale (orphaned by a dead replica).

    Atomic so concurrent reapers across replicas can't double-move an item.
    Returns the number of jobs requeued.
    """
    vis = visibility_timeout or settings.worker_visibility_timeout_seconds
    try:
        r = get_redis()
        moved = await r.eval(
            _REAP_LUA, 3, JOBS_KEY, PROCESSING_KEY, HEARTBEAT_KEY, str(int(time.time())), str(vis)
        )
        moved = int(moved or 0)
        if moved:
            logger.info("Reaper requeued %d orphaned in-flight job(s)", moved)
        return moved
    except Exception:  # noqa: BLE001
        logger.exception("Reaper failed")
        return 0


async def recover() -> int:
    """Reclaim orphaned jobs at boot.

    Heartbeat-aware: delegates to :func:`reap` so a freshly-booted replica only
    requeues jobs whose heartbeat is stale, never ones a live sibling replica is
    actively working. (The old unconditional drain of PROCESSING would steal
    in-flight jobs from healthy replicas and run them twice.)
    """
    return await reap()
