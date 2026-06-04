"""Closed feedback loop: turn REAL published-post performance into learning
signals (winners / losers / patterns) and refine a strategy from them.

The signal generation is fully deterministic and derived from real ``Metric``
rows attached to published ``Schedule`` rows (the same per-post stats source the
analytics ``/analytics/posts`` route exposes). The refinement step asks the LLM
to synthesise a concrete plan, with a deterministic fallback when the LLM is
unavailable so the loop always returns something actionable.
"""
from __future__ import annotations

import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models import (
    ContentItem,
    LearningSignal,
    Metric,
    Schedule,
    ScheduleStatus,
    SocialAccount,
    Strategy,
)

log = logging.getLogger("learning_loop")

# How far back to look for published posts when analysing performance.
LOOKBACK_DAYS = 90
# Minimum posts with measurable engagement before we trust ranked winners/losers.
MIN_POSTS_FOR_RANKING = 3


def _platform_str(account: SocialAccount | None) -> str:
    if account is None:
        return "unknown"
    return (
        account.platform.value
        if hasattr(account.platform, "value")
        else str(account.platform)
    )


def _content_type_str(item: ContentItem | None) -> str:
    if item is None or item.content_type is None:
        return "unknown"
    ct = item.content_type
    return ct.value if hasattr(ct, "value") else str(ct)


async def _collect_post_stats(db: AsyncSession, workspace_id: uuid.UUID) -> list[dict]:
    """Per-post real engagement for published posts in the lookback window.

    Mirrors ``/analytics/posts``: latest ``Metric`` row keyed by schedule id,
    joined with the schedule's platform and content type.
    """
    since = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    schedules = (
        await db.execute(
            select(Schedule)
            .where(
                Schedule.workspace_id == workspace_id,
                Schedule.status == ScheduleStatus.published,
                Schedule.external_post_id.is_not(None),
            )
            .order_by(Schedule.scheduled_at.desc())
        )
    ).scalars().all()

    metric_rows = (
        await db.execute(
            select(Metric).where(
                Metric.workspace_id == workspace_id,
                Metric.ref_id.is_not(None),
            )
        )
    ).scalars().all()
    latest_by_ref: dict[uuid.UUID, Metric] = {}
    for m in metric_rows:
        prev = latest_by_ref.get(m.ref_id)
        if prev is None or m.metric_date >= prev.metric_date:
            latest_by_ref[m.ref_id] = m

    stats: list[dict] = []
    for sched in schedules:
        published_at = sched.updated_at or sched.scheduled_at
        if published_at is not None and published_at < since:
            continue
        account = await db.get(SocialAccount, sched.social_account_id)
        item = await db.get(ContentItem, sched.content_item_id)
        m = latest_by_ref.get(sched.id)
        extra = (m.extra or {}) if m else {}
        impressions = int(m.impressions) if m else 0
        engagements = int(m.engagements) if m else 0
        clicks = int(m.clicks) if m else 0
        eng_rate = (engagements / impressions) if impressions > 0 else 0.0
        hour = None
        if published_at is not None and hasattr(published_at, "hour"):
            hour = int(published_at.hour)
        stats.append(
            {
                "schedule_id": str(sched.id),
                "content_item_id": str(sched.content_item_id),
                "title": item.title if item else None,
                "platform": _platform_str(account),
                "content_type": _content_type_str(item),
                "published_at": published_at,
                "hour": hour,
                "impressions": impressions,
                "clicks": clicks,
                "engagements": engagements,
                "likes": int(extra.get("likes", 0) or 0),
                "comments": int(extra.get("comments", 0) or 0),
                "shares": int(extra.get("shares", 0) or 0),
                "engagement_rate": round(eng_rate, 4),
                "simulated": bool(extra.get("simulated", False)),
            }
        )
    return stats


def _score(s: dict) -> float:
    """Rank posts primarily by raw engagement, breaking ties on engagement rate."""
    return float(s["engagements"]) + float(s["engagement_rate"])


def _best_by(stats: list[dict], key: str) -> tuple[str, dict] | None:
    """Average engagement grouped by a key (platform / content_type / hour)."""
    buckets: dict[str, list[dict]] = defaultdict(list)
    for s in stats:
        val = s.get(key)
        if val is None or val == "unknown":
            continue
        buckets[str(val)].append(s)
    if not buckets:
        return None
    scored: dict[str, float] = {}
    for val, items in buckets.items():
        total_eng = sum(i["engagements"] for i in items)
        scored[val] = total_eng / len(items)
    best = max(scored.items(), key=lambda kv: kv[1])
    return best[0], {
        "avg_engagement": round(best[1], 2),
        "samples": len(buckets[best[0]]),
        "groups": {k: round(v, 2) for k, v in scored.items()},
    }


async def analyze_workspace(
    db: AsyncSession, workspace_id: uuid.UUID
) -> list[LearningSignal]:
    """Derive learning signals from real post performance and persist them.

    Idempotent: deletes prior non-applied signals, then inserts a fresh set.
    Caller owns the commit.
    """
    stats = await _collect_post_stats(db, workspace_id)

    # Replace previous auto (non-applied) signals so repeated runs stay clean.
    await db.execute(
        delete(LearningSignal).where(
            LearningSignal.workspace_id == workspace_id,
            LearningSignal.applied.is_(False),
        )
    )

    signals: list[LearningSignal] = []
    measured = [s for s in stats if s["impressions"] > 0 or s["engagements"] > 0]

    if len(measured) < MIN_POSTS_FOR_RANKING:
        sig = LearningSignal(
            workspace_id=workspace_id,
            kind="pattern",
            title="More performance data needed",
            detail=(
                f"Only {len(measured)} published post(s) have measurable engagement "
                f"in the last {LOOKBACK_DAYS} days (need at least "
                f"{MIN_POSTS_FOR_RANKING}). Publish and let metrics accrue, then "
                "re-run the analysis to unlock winners, losers and patterns."
            ),
            recommendation=(
                "Publish a few more posts and refresh analytics so the loop can "
                "rank top performers and detect what's working."
            ),
            metric={
                "measured_posts": len(measured),
                "total_posts": len(stats),
                "threshold": MIN_POSTS_FOR_RANKING,
                "lookback_days": LOOKBACK_DAYS,
            },
            applied=False,
        )
        db.add(sig)
        signals.append(sig)
        await db.flush()
        return signals

    ranked = sorted(measured, key=_score, reverse=True)
    top = ranked[0]
    bottom = ranked[-1]

    signals.append(
        LearningSignal(
            workspace_id=workspace_id,
            kind="top_performer",
            title=f"Top post: {top['title'] or 'Untitled'}",
            detail=(
                f"This {top['content_type']} on {top['platform']} earned "
                f"{top['engagements']} engagements ({top['likes']} likes, "
                f"{top['comments']} comments, {top['shares']} shares) on "
                f"{top['impressions']} impressions "
                f"({round(top['engagement_rate'] * 100, 1)}% engagement rate)."
            ),
            recommendation=(
                f"Create more {top['content_type']} content for {top['platform']} "
                "and reuse this post's hook/angle in upcoming pieces."
            ),
            metric={
                "schedule_id": top["schedule_id"],
                "content_item_id": top["content_item_id"],
                "platform": top["platform"],
                "content_type": top["content_type"],
                "engagements": top["engagements"],
                "impressions": top["impressions"],
                "engagement_rate": top["engagement_rate"],
            },
            applied=False,
        )
    )

    signals.append(
        LearningSignal(
            workspace_id=workspace_id,
            kind="underperformer",
            title=f"Underperformer: {bottom['title'] or 'Untitled'}",
            detail=(
                f"This {bottom['content_type']} on {bottom['platform']} earned only "
                f"{bottom['engagements']} engagements on {bottom['impressions']} "
                f"impressions ({round(bottom['engagement_rate'] * 100, 1)}% "
                "engagement rate) — the weakest in the window."
            ),
            recommendation=(
                f"Rework or reduce {bottom['content_type']} posts on "
                f"{bottom['platform']}; test a stronger hook or different format."
            ),
            metric={
                "schedule_id": bottom["schedule_id"],
                "content_item_id": bottom["content_item_id"],
                "platform": bottom["platform"],
                "content_type": bottom["content_type"],
                "engagements": bottom["engagements"],
                "impressions": bottom["impressions"],
                "engagement_rate": bottom["engagement_rate"],
            },
            applied=False,
        )
    )

    best_platform = _best_by(measured, "platform")
    if best_platform is not None:
        name, info = best_platform
        signals.append(
            LearningSignal(
                workspace_id=workspace_id,
                kind="pattern",
                title=f"Best platform: {name}",
                detail=(
                    f"{name} averages {info['avg_engagement']} engagements per post, "
                    "the highest of your active channels."
                ),
                recommendation=f"Prioritise {name} and increase its posting cadence.",
                metric={"platform": name, **info},
                applied=False,
            )
        )

    best_type = _best_by(measured, "content_type")
    if best_type is not None:
        name, info = best_type
        signals.append(
            LearningSignal(
                workspace_id=workspace_id,
                kind="pattern",
                title=f"Best format: {name}",
                detail=(
                    f"{name} content averages {info['avg_engagement']} engagements per "
                    "post — your most effective format."
                ),
                recommendation=f"Shift the content mix toward more {name} pieces.",
                metric={"content_type": name, **info},
                applied=False,
            )
        )

    best_hour = _best_by(measured, "hour")
    if best_hour is not None:
        name, info = best_hour
        signals.append(
            LearningSignal(
                workspace_id=workspace_id,
                kind="pattern",
                title=f"Best posting hour: {name}:00 UTC",
                detail=(
                    f"Posts published around {name}:00 UTC average "
                    f"{info['avg_engagement']} engagements."
                ),
                recommendation=(
                    f"Schedule key posts near {name}:00 UTC to maximise reach."
                ),
                metric={"hour": name, **info},
                applied=False,
            )
        )

    for sig in signals:
        db.add(sig)
    await db.flush()
    return signals


def _signal_payload(signals: list[LearningSignal]) -> list[dict]:
    return [
        {
            "kind": s.kind,
            "title": s.title,
            "detail": s.detail,
            "recommendation": s.recommendation,
            "metric": s.metric or {},
        }
        for s in signals
    ]


def _fallback_refinement(strategy: Strategy, signals: list[LearningSignal]) -> dict:
    """Deterministic synthesis used when the LLM is unavailable or returns junk."""
    keep: list[str] = []
    stop: list[str] = []
    double_down: list[str] = []
    pillar_changes: list[str] = []

    for s in signals:
        rec = s.recommendation or s.title
        if s.kind == "top_performer":
            double_down.append(rec)
        elif s.kind == "underperformer":
            stop.append(rec)
        else:
            keep.append(rec)

    pillars = list(strategy.pillars or [])
    if double_down:
        pillar_changes.append(
            "Emphasise pillars aligned with top performers; "
            + "; ".join(double_down[:2])
        )
    if stop:
        pillar_changes.append("De-prioritise themes tied to underperformers.")

    summary = (
        f"Based on {len(signals)} real performance signal(s), keep what's working, "
        "stop the weakest formats, and double down on proven winners."
    )
    return {
        "summary": summary,
        "keep": keep or ["Maintain current cadence while gathering more data."],
        "stop": stop or [],
        "double_down": double_down or ["Reinforce your strongest channel."],
        "pillar_changes": pillar_changes or [],
        "updated_pillars": pillars,
    }


def _coerce_str_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


async def refine_strategy(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    strategy: Strategy,
    signals: list[LearningSignal],
) -> dict:
    """Ask the LLM for a concrete refinement from real signals; fallback safely."""
    fallback = _fallback_refinement(strategy, signals)

    system = (
        "You are a senior content strategist running a closed feedback loop. "
        "You refine a content strategy using ONLY the real performance signals and "
        "current strategy provided. Be concrete and actionable. Respond with STRICT "
        "JSON only, no prose, matching exactly this shape: "
        '{"summary": str, "keep": [str], "stop": [str], "double_down": [str], '
        '"pillar_changes": [str], "updated_pillars": [...]}. '
        "updated_pillars MUST keep the same item shape as the provided pillars."
    )
    user = {
        "current_strategy": {
            "title": strategy.title,
            "positioning": strategy.positioning,
            "pillars": strategy.pillars or [],
            "channel_plan": strategy.channel_plan or {},
        },
        "learning_signals": _signal_payload(signals),
        "instructions": (
            "Propose what to keep, stop and double down on. Update the pillars list "
            "(same shape) to reflect the winners and drop weak themes."
        ),
    }

    try:
        import json

        data = await complete_json(
            messages=[{"role": "user", "content": json.dumps(user)}],
            system=system,
        )
    except Exception:  # noqa: BLE001 — LLM failures must not break the loop
        log.warning("refine_strategy LLM call failed; using fallback", exc_info=True)
        return fallback

    if not isinstance(data, dict) or data.get("_parse_error"):
        return fallback

    updated_pillars = data.get("updated_pillars")
    if not isinstance(updated_pillars, list) or not updated_pillars:
        updated_pillars = list(strategy.pillars or [])

    return {
        "summary": str(data.get("summary") or fallback["summary"]),
        "keep": _coerce_str_list(data.get("keep")) or fallback["keep"],
        "stop": _coerce_str_list(data.get("stop")),
        "double_down": _coerce_str_list(data.get("double_down")) or fallback["double_down"],
        "pillar_changes": _coerce_str_list(data.get("pillar_changes")),
        "updated_pillars": updated_pillars,
    }
