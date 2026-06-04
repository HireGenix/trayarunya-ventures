"""Scheduled ads optimizer loop.

Periodically refreshes optimization recommendations for active campaigns using
only **real** ``Metric`` rows — campaigns without performance data are skipped
and nothing is ever fabricated. Recommendations are produced by the
:mod:`app.agents.ads_optimizer` agent (LLM when configured, deterministic
heuristic otherwise) and persisted onto ``Campaign.recommendations``. When a
notable recommendation appears, a workspace notification is raised (de-duped per
campaign per day). Modeled on :mod:`app.services.alerts_loop`.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ads_optimizer import optimize_campaign
from app.db import AsyncSessionLocal
from app.models import AdAccount, Campaign, CampaignStatus, Metric
from app.services.ads_metrics import derive_kpis
from app.services.notifications import notify

log = logging.getLogger("ads_optimizer_loop")

OPTIMIZER_INTERVAL_SECONDS = 21_600  # every 6 hours
INITIAL_DELAY_SECONDS = 90
METRICS_WINDOW_DAYS = 30
_METRIC_KEYS = ("impressions", "clicks", "engagements", "conversions", "spend")
# Health verdicts that warrant pinging the workspace.
_NOTABLE_HEALTH = {"underperforming", "needs_attention"}


def _platform_value(account: AdAccount | None) -> str:
    platform = getattr(account, "platform", None) if account else None
    if platform is None:
        return "google_ads"
    return platform.value if hasattr(platform, "value") else str(platform)


async def _campaign_totals(
    db: AsyncSession, campaign: Campaign, since: date
) -> dict[str, float] | None:
    """Sum real Metric rows for a campaign. Returns ``None`` when there is no data."""
    metrics = (
        await db.execute(
            select(Metric).where(
                Metric.workspace_id == campaign.workspace_id,
                Metric.ref_id == campaign.id,
                Metric.metric_date >= since,
            )
        )
    ).scalars().all()
    if not metrics:
        return None

    totals = {k: 0.0 for k in _METRIC_KEYS}
    for m in metrics:
        for k in _METRIC_KEYS:
            totals[k] += float(getattr(m, k))
    return totals


def _top_action(recs: dict) -> dict | None:
    actions = recs.get("actions") if isinstance(recs, dict) else None
    if not isinstance(actions, list) or not actions:
        return None
    for action in actions:
        if isinstance(action, dict) and action.get("priority") == "high":
            return action
    first = actions[0]
    return first if isinstance(first, dict) else None


async def _optimize_one(db: AsyncSession, campaign: Campaign, since: date) -> bool:
    """Refresh recommendations for a single campaign. Returns True if a notable
    recommendation triggered a notification."""
    totals = await _campaign_totals(db, campaign, since)
    if totals is None:
        # No real metrics — never fabricate; skip.
        return False

    account = await db.get(AdAccount, campaign.ad_account_id)
    platform = _platform_value(account)
    kpis = derive_kpis(totals)

    recommendations = await optimize_campaign(
        platform=platform,
        campaign_name=campaign.name,
        objective=campaign.objective,
        plan=campaign.plan,
        kpis=kpis,
        totals=totals,
        days=METRICS_WINDOW_DAYS,
    )

    recommendations = dict(recommendations)
    recommendations["generated_at"] = datetime.now(timezone.utc).isoformat()
    campaign.recommendations = recommendations
    await db.flush()

    health = str(recommendations.get("health", "")).lower()
    top = _top_action(recommendations)
    notable = health in _NOTABLE_HEALTH or (top is not None and top.get("priority") == "high")
    if not notable:
        return False

    title = f"Optimization actions for “{campaign.name}”"
    summary = recommendations.get("summary") or ""
    action_text = top.get("action") if top else ""
    body = " ".join(part for part in (summary, action_text) if part).strip() or None

    note = await notify(
        db,
        campaign.workspace_id,
        level="warning" if health == "underperforming" else "info",
        category="ads",
        title=title,
        body=body,
        link="/dashboard/ads",
        dedupe_key=f"ads-optimize:{campaign.id}:{date.today().isoformat()}",
    )
    return note is not None


async def run_optimizer_cycle() -> int:
    """Run one optimization sweep across all active campaigns.

    Returns the number of notable recommendations that raised a notification.
    """
    since = date.today() - timedelta(days=METRICS_WINDOW_DAYS - 1)
    raised = 0

    async with AsyncSessionLocal() as db:
        campaigns = (
            await db.execute(
                select(Campaign).where(Campaign.status == CampaignStatus.active)
            )
        ).scalars().all()

        for campaign in campaigns:
            try:
                if await _optimize_one(db, campaign, since):
                    raised += 1
            except Exception:  # noqa: BLE001 — one campaign must not break the sweep
                log.exception("Optimizer failed for campaign %s", campaign.id)
                await db.rollback()

    return raised


async def ads_optimizer_loop(stop: asyncio.Event | None = None) -> None:
    """Background loop that refreshes ad optimization recommendations every 6h."""
    log.info("Ads optimizer loop started (every %ss)", OPTIMIZER_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(INITIAL_DELAY_SECONDS)  # let the first metrics sweep land
    except asyncio.CancelledError:
        return
    while not (stop and stop.is_set()):
        try:
            n = await run_optimizer_cycle()
            if n:
                log.info("Ads optimizer raised %s notification(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Ads optimizer cycle failed")
        try:
            await asyncio.sleep(OPTIMIZER_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
