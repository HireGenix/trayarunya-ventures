"""Worker entrypoint: drains the Redis job queue and runs research jobs.

Run with:  python -m app.worker.run_worker
In Azure this runs as a separate Container App (with Playwright/Chromium installed)
so crawl4ai deep crawls never block the API.
"""
from __future__ import annotations

import asyncio
import logging
import uuid

from app.services.research_runner import run_research_job
from app.worker.queue import reserve

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worker")


async def handle(job: dict) -> None:
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


async def main() -> None:
    log.info("Content Engine worker started; waiting for jobs…")
    while True:
        try:
            job = await reserve(timeout=5)
            if job is None:
                continue
            await handle(job)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Job failed")
            await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
