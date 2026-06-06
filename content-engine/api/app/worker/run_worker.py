"""Worker entrypoint: drains the Redis job queue and runs research jobs.

Run with:  python -m app.worker.run_worker
In Azure this runs as a separate Container App (with Playwright/Chromium installed)
so crawl4ai deep crawls never block the API.

Durability under KEDA scale-in:
  * Each running job is heartbeated every ``worker_heartbeat_interval_seconds`` so a
    background reaper can distinguish live long jobs from orphaned ones.
  * A reaper loop (on every replica) requeues jobs whose heartbeat went stale,
    reclaiming work abandoned when a replica is killed.
  * On SIGTERM/SIGINT we stop reserving, hand in-flight jobs straight back to the
    queue (so a sibling replica resumes them immediately), then exit — instead of
    being SIGKILLed with jobs stranded in the processing list.
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import signal
import uuid

from app.config import settings
from app.services.research_runner import run_research_job
from app.worker.queue import ack, heartbeat, reap, recover, requeue, reserve

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worker")


async def handle(raw: str) -> None:
    try:
        job = json.loads(raw)
    except json.JSONDecodeError:
        log.warning("Skipping malformed job payload: %r", raw[:200])
        return
    job_type = job.get("type")
    payload = job.get("payload", {})
    if job_type == "research":
        job_id = payload.get("job_id")
        if job_id:
            log.info("Running research job %s", job_id)
            await run_research_job(uuid.UUID(job_id))
            log.info("Finished research job %s", job_id)
    else:
        log.warning("Unknown job type: %s", job_type)


async def _heartbeat_loop(raw: str) -> None:
    """Refresh a job's heartbeat until cancelled (i.e. until the job finishes)."""
    interval = max(5, settings.worker_heartbeat_interval_seconds)
    try:
        while True:
            await asyncio.sleep(interval)
            await heartbeat(raw)
    except asyncio.CancelledError:
        pass


async def _run_one(raw: str) -> None:
    """Process a single reserved job, heartbeating it, and always ack when done."""
    hb = asyncio.create_task(_heartbeat_loop(raw))
    try:
        await handle(raw)
    except asyncio.CancelledError:
        # Shutdown hand-off: the main loop has already requeued this raw, so do
        # NOT ack it (that would delete it from the queue). Just stop.
        hb.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await hb
        raise
    except Exception:  # noqa: BLE001
        log.exception("Job failed")
    finally:
        if not hb.cancelled():
            hb.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await hb
    # Remove from the processing list whether the job succeeded or failed;
    # run_research_job already records failures in the DB.
    await ack(raw)


async def _reaper_loop(stop: asyncio.Event) -> None:
    """Periodically requeue jobs orphaned by a killed replica."""
    interval = max(10, settings.worker_reaper_interval_seconds)
    while not stop.is_set():
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            await reap()


async def main() -> None:
    concurrency = max(1, settings.worker_concurrency)
    log.info("Content Engine worker started; concurrency=%d; waiting for jobs…", concurrency)
    # Requeue anything left mid-flight by a previous (crashed) run — heartbeat-aware,
    # so it won't steal jobs a live sibling replica is still running.
    await recover()

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, stop.set)

    reaper = asyncio.create_task(_reaper_loop(stop))
    # A single reusable awaitable for "shutdown requested", so a full-capacity
    # wait wakes promptly on SIGTERM without recreating a future each iteration.
    stop_wait = asyncio.create_task(stop.wait())
    # Map each in-flight task to the raw payload it holds, so on shutdown we can
    # hand those exact items back to the queue.
    inflight: dict[asyncio.Task, str] = {}

    try:
        while not stop.is_set():
            if len(inflight) >= concurrency:
                await asyncio.wait(
                    set(inflight) | {stop_wait},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                continue

            raw = await reserve(timeout=5)
            if raw is None:
                if inflight:
                    await asyncio.wait(set(inflight), timeout=0.1)
                continue

            task = asyncio.create_task(_run_one(raw))
            inflight[task] = raw
            task.add_done_callback(inflight.pop)
    except asyncio.CancelledError:
        pass
    except Exception:  # noqa: BLE001
        log.exception("Worker loop error")

    # ---- graceful shutdown ----
    log.info("Shutdown signal received; handing %d in-flight job(s) back to queue", len(inflight))
    reaper.cancel()
    stop_wait.cancel()
    for t in (reaper, stop_wait):
        with contextlib.suppress(asyncio.CancelledError):
            await t

    # Requeue first so a sibling can start immediately, then cancel local tasks.
    for task, raw in list(inflight.items()):
        await requeue(raw)
    for task in list(inflight):
        task.cancel()
    if inflight:
        await asyncio.gather(*list(inflight), return_exceptions=True)
    log.info("Worker stopped cleanly")


if __name__ == "__main__":
    asyncio.run(main())
