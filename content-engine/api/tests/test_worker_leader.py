"""Background-loop leader supervisor tests (fail-open path, no Redis)."""
from __future__ import annotations

import asyncio

import app.worker.leader as leader


async def test_supervisor_failopen_runs_and_stops(monkeypatch):
    started = {"n": 0}
    running = {"n": 0}

    async def fake_loop(stop: asyncio.Event):
        started["n"] += 1
        running["n"] += 1
        try:
            await stop.wait()
        finally:
            running["n"] -= 1

    monkeypatch.setattr(leader, "_loop_factories", lambda: [("a", fake_loop), ("b", fake_loop)])

    # Force Redis-down so the supervisor fails open and runs loops locally.
    async def _none(token, ttl):
        return None

    monkeypatch.setattr(leader, "_try_acquire", _none)

    stop = asyncio.Event()
    task = asyncio.create_task(leader.run_background_supervisor(stop))
    await asyncio.sleep(0.2)
    assert started["n"] == 2  # both loops launched
    assert running["n"] == 2

    stop.set()
    await asyncio.wait_for(task, timeout=5)
    assert running["n"] == 0  # cleanly stopped


async def test_supervisor_not_leader_does_not_start(monkeypatch):
    started = {"n": 0}

    async def fake_loop(stop: asyncio.Event):
        started["n"] += 1
        await stop.wait()

    monkeypatch.setattr(leader, "_loop_factories", lambda: [("a", fake_loop)])

    async def _not_leader(token, ttl):
        return False

    monkeypatch.setattr(leader, "_try_acquire", _not_leader)

    stop = asyncio.Event()
    task = asyncio.create_task(leader.run_background_supervisor(stop))
    await asyncio.sleep(0.2)
    assert started["n"] == 0  # never became leader

    stop.set()
    await asyncio.wait_for(task, timeout=5)
