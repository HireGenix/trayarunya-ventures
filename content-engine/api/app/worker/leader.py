"""Single-leader supervisor for background loops.

In a multi-replica deployment every API process would otherwise start its own
copy of the scheduler/metrics/alerts/watchtower/ads loops, causing duplicate
work and races. This module elects ONE leader via a renewable Redis lock and
runs the loops only on the leader. If Redis is unavailable (local/dev, single
instance) it fails open and runs the loops locally, preserving current behaviour.

The supervised loops each accept a ``stop: asyncio.Event`` and run until set, so
losing leadership cleanly stops them and a new leader picks them up.
"""
from __future__ import annotations

import asyncio
import logging
import socket
import uuid
from collections.abc import Awaitable, Callable

from app.config import settings

log = logging.getLogger("app.loops")

LEADER_KEY = "ce:loops:leader"

# Each loop is a coroutine factory taking a stop Event.
LoopFactory = Callable[[asyncio.Event], Awaitable[None]]


def _loop_factories() -> list[tuple[str, LoopFactory]]:
    from app.services.scheduler import metrics_refresh_loop, scheduler_loop
    from app.services.alerts_loop import alerts_loop
    from app.services.watchtower import watchtower_loop
    from app.services.ads_optimizer_loop import ads_optimizer_loop
    from app.services.automation import automation_loop

    return [
        ("scheduler", scheduler_loop),
        ("metrics", metrics_refresh_loop),
        ("alerts", alerts_loop),
        ("watchtower", watchtower_loop),
        ("ads_optimizer", ads_optimizer_loop),
        ("automation", automation_loop),
    ]


async def _try_acquire(token: str, ttl: int) -> bool | None:
    """Acquire/renew leadership. Returns True/False, or None if Redis is down
    (caller treats None as fail-open => run locally)."""
    try:
        from app.worker.queue import get_redis

        r = get_redis()
        current = await r.get(token_key())
        current = current.decode() if isinstance(current, bytes) else current
        if current is None:
            got = await r.set(LEADER_KEY, token, nx=True, ex=ttl)
            return bool(got)
        if current == token:
            await r.set(LEADER_KEY, token, ex=ttl)  # renew
            return True
        return False
    except Exception:  # noqa: BLE001 — Redis unavailable
        return None


def token_key() -> str:
    return LEADER_KEY


async def run_background_supervisor(stop: asyncio.Event) -> None:
    token = f"{socket.gethostname()}:{uuid.uuid4().hex[:8]}"
    ttl = max(5, settings.leader_lock_ttl_seconds)
    renew_every = max(2, ttl // 2)

    inner_stop = asyncio.Event()
    tasks: list[asyncio.Task] = []
    is_leader = False

    def start_loops() -> None:
        nonlocal tasks
        inner_stop.clear()
        tasks = [
            asyncio.create_task(factory(inner_stop), name=f"loop:{name}")
            for name, factory in _loop_factories()
        ]
        log.info("Background loops started (leader token=%s)", token)

    async def stop_loops() -> None:
        nonlocal tasks
        inner_stop.set()
        for t in tasks:
            t.cancel()
        for t in tasks:
            try:
                await t
            except (asyncio.CancelledError, Exception):  # noqa: BLE001
                pass
        tasks = []
        log.info("Background loops stopped")

    try:
        while not stop.is_set():
            acquired = await _try_acquire(token, ttl)
            want_leader = acquired is True or acquired is None  # fail-open
            if want_leader and not is_leader:
                is_leader = True
                if acquired is None:
                    log.warning("Redis unavailable — running loops locally (fail-open)")
                start_loops()
            elif not want_leader and is_leader:
                is_leader = False
                await stop_loops()

            try:
                await asyncio.wait_for(stop.wait(), timeout=renew_every)
            except asyncio.TimeoutError:
                pass
    finally:
        await stop_loops()
        # Best-effort release so a standby can take over immediately.
        if is_leader:
            try:
                from app.worker.queue import get_redis

                r = get_redis()
                current = await r.get(LEADER_KEY)
                current = current.decode() if isinstance(current, bytes) else current
                if current == token:
                    await r.delete(LEADER_KEY)
            except Exception:  # noqa: BLE001
                pass
