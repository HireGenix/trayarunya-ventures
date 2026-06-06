"""Background autonomy loop for the marketing-suite agents.

Sweeps every workspace and runs each module agent's ``run_cycle(db, ws_id)`` on a
fresh session. Real data only — each agent reads its own workspace rows, proposes
or auto-executes per its autonomy level, and emits its own automation events. One
agent (or one workspace) failing never breaks the sweep, and nothing is fabricated.
"""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models import Workspace

log = logging.getLogger("marketing_agents_loop")

MARKETING_AGENTS_INTERVAL_SECONDS = 21_600  # every 6 hours
INITIAL_DELAY_SECONDS = 180


def _agents() -> list[tuple[str, object]]:
    from app.agents import (
        email_agent,
        messaging_agent,
        social_inbox_agent,
        seo_agent,
        funnels_agent,
        forms_agent,
        leadscore_agent,
        referrals_agent,
        reputation_agent,
        budgetpacing_agent,
        influencers_agent,
        mmm_agent,
        guardrails_agent,
    )

    return [
        ("email", email_agent),
        ("messaging", messaging_agent),
        ("social_inbox", social_inbox_agent),
        ("seo", seo_agent),
        ("funnels", funnels_agent),
        ("forms", forms_agent),
        ("leadscore", leadscore_agent),
        ("referrals", referrals_agent),
        ("reputation", reputation_agent),
        ("budgetpacing", budgetpacing_agent),
        ("influencers", influencers_agent),
        ("mmm", mmm_agent),
        ("guardrails", guardrails_agent),
    ]


async def run_marketing_agents_cycle() -> int:
    """Run one cycle of every marketing agent across all workspaces."""
    total = 0
    async with AsyncSessionLocal() as db:
        workspace_ids = (await db.execute(select(Workspace.id))).scalars().all()

    agents = _agents()
    for workspace_id in workspace_ids:
        for name, agent in agents:
            run_cycle = getattr(agent, "run_cycle", None)
            if run_cycle is None:
                continue
            try:
                async with AsyncSessionLocal() as db:
                    await run_cycle(db, workspace_id)
                    total += 1
            except Exception:  # noqa: BLE001 — one agent must not break the sweep
                log.exception(
                    "marketing agent %s cycle failed for workspace %s",
                    name,
                    workspace_id,
                )
    return total


async def marketing_agents_loop(stop: asyncio.Event | None = None) -> None:
    """Background loop running all marketing agents every 6h."""
    log.info(
        "Marketing agents loop started (every %ss)",
        MARKETING_AGENTS_INTERVAL_SECONDS,
    )
    try:
        await asyncio.sleep(INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return
    while not (stop and stop.is_set()):
        try:
            n = await run_marketing_agents_cycle()
            if n:
                log.info("Marketing agents completed %s cycle(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Marketing agents sweep failed")
        try:
            await asyncio.sleep(MARKETING_AGENTS_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
