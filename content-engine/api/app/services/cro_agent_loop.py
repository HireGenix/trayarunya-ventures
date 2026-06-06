"""Background CRO Agent loop.

Periodically runs :func:`app.agents.cro_agent.run_cycle` for every workspace that
has the CRO agent enabled, then emits a ``cro.leak_detected`` automation event for
notable leaks so user-defined workflows (Slack/email/task/webhook) can react.

Modeled on :mod:`app.services.ads_optimizer_loop`: real data only, one workspace
failing never breaks the sweep, and nothing is fabricated.
"""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.agents.cro_agent import run_cycle
from app.db import AsyncSessionLocal
from app.models import CROSettings, Workspace
from app.services.automation import emit_event

log = logging.getLogger("cro_agent_loop")

CRO_AGENT_INTERVAL_SECONDS = 21_600  # every 6 hours
INITIAL_DELAY_SECONDS = 120


async def run_cro_agent_cycle() -> int:
    """Run one agent cycle per enabled workspace. Returns experiments/actions count."""
    total = 0
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(CROSettings.workspace_id).where(CROSettings.enabled.is_(True))
            )
        ).scalars().all()
        # Also include workspaces with no settings row yet (default-enabled), so the
        # agent starts proposing instrumentation the moment a workspace exists.
        if not rows:
            rows = (await db.execute(select(Workspace.id))).scalars().all()

    for workspace_id in rows:
        try:
            async with AsyncSessionLocal() as db:
                summary = await run_cycle(db, workspace_id)
                created = summary.get("created_count", 0) or 0
                total += created
                leak = summary.get("biggest_leak")
                if leak and (leak.get("drop", 0) or 0) > 0 and not summary.get("status") == "low_data":
                    await emit_event(
                        db,
                        workspace_id,
                        "cro.leak_detected",
                        {
                            "from": leak.get("from"),
                            "to": leak.get("to"),
                            "drop": leak.get("drop"),
                            "drop_pct": leak.get("drop_pct"),
                            "revenue_left": summary.get("revenue_left_on_table"),
                        },
                        source="cro_agent",
                    )
                    await db.commit()
        except Exception:  # noqa: BLE001 — one workspace must not break the sweep
            log.exception("CRO agent cycle failed for workspace %s", workspace_id)
    return total


async def cro_agent_loop(stop: asyncio.Event | None = None) -> None:
    """Background loop running the CRO agent every 6h."""
    log.info("CRO agent loop started (every %ss)", CRO_AGENT_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return
    while not (stop and stop.is_set()):
        try:
            n = await run_cro_agent_cycle()
            if n:
                log.info("CRO agent created/refreshed %s recommendation(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("CRO agent cycle failed")
        try:
            await asyncio.sleep(CRO_AGENT_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
