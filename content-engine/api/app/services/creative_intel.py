"""Creative Intelligence service.

Analyses *real* published-content performance for a workspace. The data path is:

    ContentItem (status=published) -> Schedule (content_item_id) -> Metric (ref_id=schedule.id)

``post_metrics`` upserts a daily ``Metric`` row per published schedule keyed by
``(workspace, source=platform, ref_id=schedule_id)``. We read the latest metric
row per schedule, compute engagement_rate / ctr, derive deterministic creative
attributes from the body text, and aggregate performance by attribute so the
router can surface winning patterns, fatigue signals and recommendations.

No external services are used for attribute extraction — everything is derived
from text the workspace already owns. If there are not enough real metric rows,
callers should honour the ``low_data`` flag rather than fabricating numbers.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ContentItem,
    ContentStatus,
    Metric,
    Schedule,
    ScheduleStatus,
    SocialAccount,
)

# Minimum number of measured posts before aggregates are considered meaningful.
MIN_POSTS_FOR_SIGNAL = 4
# Minimum posts inside a single attribute bucket before it can drive a rec.
MIN_BUCKET_SIZE = 2

_EMOJI_RE = re.compile(
    "[" "\U0001f300-\U0001faff" "\U00002600-\U000027bf" "\U0001f000-\U0001f0ff" "]",
    flags=re.UNICODE,
)
_HASHTAG_RE = re.compile(r"(?:^|\s)#(\w+)")
_NUMBER_RE = re.compile(r"\d")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def _first_text(content: ContentItem) -> str:
    """Best caption/body text for a content item.

    Prefers the plain ``body``; falls back to any string found in ``variants``
    (per-platform captions) so threads/carousels still yield a usable hook.
    """
    body = (content.body or "").strip()
    if body:
        return body
    variants = content.variants or {}
    if isinstance(variants, dict):
        for v in variants.values():
            if isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, dict):
                for key in ("body", "caption", "text", "content"):
                    cand = v.get(key)
                    if isinstance(cand, str) and cand.strip():
                        return cand.strip()
    return ""


def _length_bucket(n: int) -> str:
    if n < 280:
        return "short"
    if n < 1000:
        return "medium"
    return "long"


def _content_type_str(content: ContentItem) -> str:
    ct = content.content_type
    return ct.value if hasattr(ct, "value") else str(ct)


def extract_attributes(content: ContentItem) -> dict:
    """Derive deterministic creative attributes from a content item.

    Returns hook, format, length bucket and simple text heuristics. Pure text
    analysis — no external calls — so it is safe and repeatable.
    """
    text = _first_text(content)
    sentences = [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]
    first_line = text.splitlines()[0].strip() if text else ""
    hook = (sentences[0] if sentences else first_line)[:200]
    char_count = len(text)
    word_count = len(text.split())
    hashtags = _HASHTAG_RE.findall(text)

    return {
        "hook": hook,
        "format": _content_type_str(content),
        "length_bucket": _length_bucket(char_count),
        "char_count": char_count,
        "word_count": word_count,
        "has_question": "?" in text,
        "has_number": bool(_NUMBER_RE.search(text)),
        "has_emoji": bool(_EMOJI_RE.search(text)),
        "hashtag_count": len(hashtags),
        "has_hashtags": len(hashtags) > 0,
    }


def _platform_str(account: SocialAccount | None) -> str:
    if account is None:
        return "unknown"
    p = account.platform
    return p.value if hasattr(p, "value") else str(p)


async def load_post_performance(
    db: AsyncSession, workspace_id: uuid.UUID
) -> list[dict]:
    """Join published content -> schedules -> latest metric and compute rates.

    Returns one record per published schedule that has at least one metric row.
    Each record carries the real engagement numbers, the computed
    engagement_rate / ctr, derived creative attributes and the publish date.
    """
    schedules = (
        await db.execute(
            select(Schedule).where(
                Schedule.workspace_id == workspace_id,
                Schedule.status == ScheduleStatus.published,
            )
        )
    ).scalars().all()
    if not schedules:
        return []

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

    content_cache: dict[uuid.UUID, ContentItem | None] = {}
    account_cache: dict[uuid.UUID, SocialAccount | None] = {}

    perf: list[dict] = []
    for sched in schedules:
        m = latest_by_ref.get(sched.id)
        if m is None:
            continue  # only use real measured posts

        if sched.content_item_id not in content_cache:
            content_cache[sched.content_item_id] = await db.get(
                ContentItem, sched.content_item_id
            )
        content = content_cache[sched.content_item_id]
        if content is None or content.status != ContentStatus.published:
            continue

        if sched.social_account_id not in account_cache:
            account_cache[sched.social_account_id] = await db.get(
                SocialAccount, sched.social_account_id
            )
        account = account_cache[sched.social_account_id]

        impressions = int(m.impressions or 0)
        clicks = int(m.clicks or 0)
        engagements = int(m.engagements or 0)
        engagement_rate = (engagements / impressions) if impressions > 0 else 0.0
        ctr = (clicks / impressions) if impressions > 0 else 0.0

        published_at = sched.updated_at or sched.scheduled_at
        attrs = extract_attributes(content)

        perf.append(
            {
                "schedule_id": str(sched.id),
                "content_item_id": str(content.id),
                "title": content.title,
                "platform": _platform_str(account),
                "external_post_id": sched.external_post_id,
                "published_at": published_at,
                "impressions": impressions,
                "clicks": clicks,
                "engagements": engagements,
                "engagement_rate": round(engagement_rate, 4),
                "ctr": round(ctr, 4),
                "simulated": bool((m.extra or {}).get("simulated", False)),
                "attributes": attrs,
            }
        )

    perf.sort(key=lambda r: r["engagement_rate"], reverse=True)
    return perf


def _bucket_stats(records: list[dict]) -> dict:
    n = len(records)
    if n == 0:
        return {"count": 0, "avg_engagement_rate": 0.0, "avg_ctr": 0.0,
                "total_impressions": 0, "total_engagements": 0}
    return {
        "count": n,
        "avg_engagement_rate": round(
            sum(r["engagement_rate"] for r in records) / n, 4
        ),
        "avg_ctr": round(sum(r["ctr"] for r in records) / n, 4),
        "total_impressions": sum(r["impressions"] for r in records),
        "total_engagements": sum(r["engagements"] for r in records),
    }


def _breakdown(perf: list[dict], key_fn) -> dict[str, dict]:
    groups: dict[str, list[dict]] = {}
    for r in perf:
        key = key_fn(r)
        if key is None:
            continue
        groups.setdefault(str(key), []).append(r)
    return {k: _bucket_stats(v) for k, v in groups.items()}


def _detect_fatigue(perf: list[dict]) -> list[dict]:
    """Flag formats whose recent performance is declining vs earlier.

    Splits each format's posts by publish time into an older and a newer half
    and compares average engagement_rate. Only formats with enough posts in
    both halves are evaluated, so signals are grounded in real data.
    """
    by_format: dict[str, list[dict]] = {}
    for r in perf:
        if r["published_at"] is None:
            continue
        by_format.setdefault(r["attributes"]["format"], []).append(r)

    signals: list[dict] = []
    for fmt, records in by_format.items():
        dated = sorted(
            records,
            key=lambda r: _as_ts(r["published_at"]),
        )
        if len(dated) < MIN_BUCKET_SIZE * 2:
            continue
        mid = len(dated) // 2
        earlier = dated[:mid]
        recent = dated[mid:]
        early_avg = sum(r["engagement_rate"] for r in earlier) / len(earlier)
        recent_avg = sum(r["engagement_rate"] for r in recent) / len(recent)
        if early_avg <= 0:
            continue
        change = (recent_avg - early_avg) / early_avg
        if change <= -0.2:  # 20%+ decline
            signals.append(
                {
                    "attribute": "format",
                    "value": fmt,
                    "earlier_avg_engagement_rate": round(early_avg, 4),
                    "recent_avg_engagement_rate": round(recent_avg, 4),
                    "change_pct": round(change * 100, 1),
                    "sample_size": len(dated),
                }
            )
    signals.sort(key=lambda s: s["change_pct"])
    return signals


def _as_ts(value) -> float:
    if value is None:
        return 0.0
    if hasattr(value, "timestamp"):
        try:
            return value.timestamp()
        except (ValueError, OSError):
            return 0.0
    return 0.0


def aggregate(perf: list[dict]) -> dict:
    """Aggregate per-post performance into attribute breakdowns + signals."""
    n = len(perf)
    low_data = n < MIN_POSTS_FOR_SIGNAL
    overall = _bucket_stats(perf)

    breakdowns = {
        "by_format": _breakdown(perf, lambda r: r["attributes"]["format"]),
        "by_length_bucket": _breakdown(
            perf, lambda r: r["attributes"]["length_bucket"]
        ),
        "by_has_question": _breakdown(
            perf, lambda r: r["attributes"]["has_question"]
        ),
        "by_has_number": _breakdown(
            perf, lambda r: r["attributes"]["has_number"]
        ),
        "by_has_emoji": _breakdown(perf, lambda r: r["attributes"]["has_emoji"]),
        "by_has_hashtags": _breakdown(
            perf, lambda r: r["attributes"]["has_hashtags"]
        ),
        "by_platform": _breakdown(perf, lambda r: r["platform"]),
    }

    winning_patterns: list[dict] = []
    baseline = overall["avg_engagement_rate"]
    if not low_data and baseline > 0:
        for dim, buckets in breakdowns.items():
            for value, stats in buckets.items():
                if stats["count"] < MIN_BUCKET_SIZE:
                    continue
                lift = (stats["avg_engagement_rate"] - baseline) / baseline
                if lift >= 0.15:  # 15%+ above the workspace average
                    winning_patterns.append(
                        {
                            "attribute": dim.replace("by_", ""),
                            "value": value,
                            "avg_engagement_rate": stats["avg_engagement_rate"],
                            "lift_pct": round(lift * 100, 1),
                            "sample_size": stats["count"],
                        }
                    )
        winning_patterns.sort(key=lambda p: p["lift_pct"], reverse=True)

    fatigue = [] if low_data else _detect_fatigue(perf)

    return {
        "post_count": n,
        "low_data": low_data,
        "min_posts_for_signal": MIN_POSTS_FOR_SIGNAL,
        "overall": overall,
        "breakdowns": breakdowns,
        "winning_patterns": winning_patterns,
        "fatigue_signals": fatigue,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def build_recommendations(agg: dict) -> list[dict]:
    """Turn aggregates into prioritized, deterministic actions.

    Each action is {action, attribute, value, rationale, confidence, ...} where
    action is one of double_down | stop | test. Numbers come straight from the
    real aggregates; phrasing may be enriched by the LLM later but values stay.
    """
    if agg.get("low_data"):
        return [
            {
                "action": "test",
                "attribute": "data",
                "value": None,
                "rationale": (
                    "Not enough measured posts yet "
                    f"({agg.get('post_count', 0)} of "
                    f"{agg.get('min_posts_for_signal')} needed). Publish and "
                    "measure more posts before drawing creative conclusions."
                ),
                "confidence": "low",
            }
        ]

    recs: list[dict] = []

    def _confidence(sample: int) -> str:
        if sample >= 6:
            return "high"
        if sample >= 3:
            return "medium"
        return "low"

    for pat in agg.get("winning_patterns", []):
        recs.append(
            {
                "action": "double_down",
                "attribute": pat["attribute"],
                "value": pat["value"],
                "rationale": (
                    f"'{pat['value']}' ({pat['attribute']}) is averaging "
                    f"{pat['avg_engagement_rate']:.1%} engagement, "
                    f"{pat['lift_pct']}% above your baseline across "
                    f"{pat['sample_size']} posts. Produce more of it."
                ),
                "confidence": _confidence(pat["sample_size"]),
                "lift_pct": pat["lift_pct"],
                "avg_engagement_rate": pat["avg_engagement_rate"],
                "sample_size": pat["sample_size"],
            }
        )

    for sig in agg.get("fatigue_signals", []):
        recs.append(
            {
                "action": "stop",
                "attribute": sig["attribute"],
                "value": sig["value"],
                "rationale": (
                    f"'{sig['value']}' {sig['attribute']} engagement fell "
                    f"{abs(sig['change_pct'])}% recently "
                    f"({sig['earlier_avg_engagement_rate']:.1%} -> "
                    f"{sig['recent_avg_engagement_rate']:.1%}) over "
                    f"{sig['sample_size']} posts. Pause or refresh this approach."
                ),
                "confidence": _confidence(sig["sample_size"]),
                "change_pct": sig["change_pct"],
                "sample_size": sig["sample_size"],
            }
        )

    # Suggest tests for underused but not-yet-conclusive boolean attributes.
    baseline = agg.get("overall", {}).get("avg_engagement_rate", 0.0)
    for dim, label, true_key in (
        ("by_has_question", "questions", "True"),
        ("by_has_number", "numbers/stats", "True"),
        ("by_has_emoji", "emoji", "True"),
    ):
        buckets = agg.get("breakdowns", {}).get(dim, {})
        true_stats = buckets.get(true_key)
        if true_stats is None or true_stats["count"] >= MIN_BUCKET_SIZE:
            continue
        recs.append(
            {
                "action": "test",
                "attribute": dim.replace("by_", ""),
                "value": True,
                "rationale": (
                    f"You've barely used {label} ({true_stats['count']} post(s)). "
                    "Run a small test to learn whether it lifts engagement "
                    f"above your {baseline:.1%} baseline."
                ),
                "confidence": "low",
                "sample_size": true_stats["count"],
            }
        )

    priority = {"double_down": 0, "stop": 1, "test": 2}
    recs.sort(key=lambda r: (priority.get(r["action"], 3),
                             -float(r.get("lift_pct", 0) or 0)))
    return recs
