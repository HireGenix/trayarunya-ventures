"""Background SEO rank loop.

Every 6 hours, for each workspace with tracked keywords and NO connected ranking
provider (Google Search Console), checks ranks for free by scraping the SERP and
recording a :class:`app.models.seo.RankSnapshot` per keyword. Positions are real
(the workspace domain's index in the SERP) or ``None`` — never fabricated.

Modeled on :mod:`app.services.cro_agent_loop`: real data only, one workspace
failing never breaks the sweep, rate-limited so we stay polite to search engines.
"""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.agents.seo_agent import _resolve_workspace_domain
from app.db import AsyncSessionLocal
from app.models.seo import SeoKeyword
from app.services import seo as svc
from app.services.automation import emit_event

log = logging.getLogger("seo_rank_loop")

SEO_RANK_INTERVAL_SECONDS = 21_600  # every 6 hours
INITIAL_DELAY_SECONDS = 180
MAX_KEYWORDS_PER_WORKSPACE = 10
DELAY_BETWEEN_CHECKS_SECONDS = 2


async def run_seo_rank_cycle() -> int:
    """Run one SERP rank-check sweep across eligible workspaces.

    Returns the total number of RankSnapshots written.
    """
    total = 0
    async with AsyncSessionLocal() as db:
        ws_ids = (
            await db.execute(
                select(SeoKeyword.workspace_id)
                .where(SeoKeyword.is_tracked.is_(True))
                .distinct()
            )
        ).scalars().all()

    for workspace_id in ws_ids:
        try:
            async with AsyncSessionLocal() as db:
                # Skip workspaces that already have a real ranking connector.
                if await svc.has_rank_connector(db, workspace_id):
                    continue
                domain = await _resolve_workspace_domain(db, workspace_id)
                if not domain:
                    continue

                keywords = await svc.list_keywords(db, workspace_id)
                tracked = [k for k in keywords if k.is_tracked][:MAX_KEYWORDS_PER_WORKSPACE]
                for kw in tracked:
                    prev = kw.previous_rank
                    try:
                        result = await svc.check_keyword_serp(db, workspace_id, kw, domain)
                    except Exception:  # noqa: BLE001 — one keyword must not break the sweep
                        log.exception("SERP rank check failed for keyword %s", kw.id)
                        continue
                    if result.get("status") in ("recorded", "not_found"):
                        total += 1
                    # Emit a rank-drop signal when a real reading worsened.
                    if result.get("status") == "recorded":
                        delta = result.get("delta")
                        if delta is not None and delta < 0:
                            await emit_event(
                                db,
                                workspace_id,
                                "seo.rank.drop",
                                {
                                    "keyword_id": str(kw.id),
                                    "term": kw.term,
                                    "current_rank": kw.current_rank,
                                    "previous_rank": prev,
                                    "drop": abs(delta),
                                },
                                source="seo_rank_loop",
                            )
                    await db.commit()
                    try:
                        await asyncio.sleep(DELAY_BETWEEN_CHECKS_SECONDS)
                    except asyncio.CancelledError:
                        raise
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 — one workspace must not break the sweep
            log.exception("SEO rank cycle failed for workspace %s", workspace_id)
    return total


async def seo_rank_loop(stop: asyncio.Event | None = None) -> None:
    """Background loop running SERP-based rank checks every 6h."""
    log.info("SEO rank loop started (every %ss)", SEO_RANK_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return
    while not (stop and stop.is_set()):
        try:
            n = await run_seo_rank_cycle()
            if n:
                log.info("SEO rank loop recorded %s snapshot(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("SEO rank cycle failed")
        try:
            await asyncio.sleep(SEO_RANK_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
