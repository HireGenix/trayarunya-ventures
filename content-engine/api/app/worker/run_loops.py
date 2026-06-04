"""Dedicated background-loops entrypoint.

Run a single process that owns the scheduler/metrics/alerts/watchtower/ads loops
so the API replicas can be stateless (set RUN_BACKGROUND_LOOPS=false on them):

    python -m app.worker.run_loops

Uses the same Redis leader-lock as the in-API supervisor, so running this
alongside an API that still has loops enabled is safe — only one wins.
"""
from __future__ import annotations

import asyncio
import logging
import signal

from app.logging_config import configure_logging
from app.worker.leader import run_background_supervisor

configure_logging()
log = logging.getLogger("app.loops")


async def main() -> None:
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:  # pragma: no cover — non-Unix
            pass

    log.info("Background-loops process started; electing leader…")
    await run_background_supervisor(stop)
    log.info("Background-loops process stopped")


if __name__ == "__main__":
    asyncio.run(main())
