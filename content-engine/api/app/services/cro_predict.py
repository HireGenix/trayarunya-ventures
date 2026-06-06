"""Predictive lift scoring — grade an asset BEFORE you publish it (Phase 4).

Grounds a pre-publish prediction in the workspace's **own** historical post
performance (the same real ``Metric``-backed records the creative-intel engine
uses). It extracts the draft's creative attributes, compares each against how
that attribute has historically performed for this brand, and predicts an
expected engagement rate plus a 0-100 score and concrete, data-backed tweaks.

When history is too thin to be trustworthy it returns ``low_data=True`` and a
neutral score rather than a confident guess — we never fabricate a forecast.
"""
from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.creative_intel import load_post_performance

MIN_HISTORY_FOR_SIGNAL = 8

_HASHTAG_RE = re.compile(r"#\w+")
_NUMBER_RE = re.compile(r"\d")
_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]"
)
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def _length_bucket(n: int) -> str:
    if n <= 120:
        return "short"
    if n <= 400:
        return "medium"
    return "long"


def extract_draft_attributes(text: str, fmt: str | None = None) -> dict[str, Any]:
    text = text or ""
    hashtags = _HASHTAG_RE.findall(text)
    char_count = len(text)
    return {
        "format": (fmt or "post"),
        "length_bucket": _length_bucket(char_count),
        "char_count": char_count,
        "has_question": "?" in text,
        "has_number": bool(_NUMBER_RE.search(text)),
        "has_emoji": bool(_EMOJI_RE.search(text)),
        "has_hashtags": len(hashtags) > 0,
        "hashtag_count": len(hashtags),
    }


# Binary attributes we score, with a human label for suggestions.
_BINARY_ATTRS = {
    "has_question": "a question",
    "has_number": "a number / statistic",
    "has_emoji": "an emoji",
    "has_hashtags": "hashtags",
}


def _avg(records: list[dict]) -> float:
    if not records:
        return 0.0
    return sum(r["engagement_rate"] for r in records) / len(records)


async def predict_lift(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    text: str,
    fmt: str | None = None,
    platform: str | None = None,
) -> dict[str, Any]:
    """Predict pre-publish engagement for a draft, grounded in real history."""
    perf = await load_post_performance(db, workspace_id)
    if platform:
        perf = [r for r in perf if r.get("platform") == platform] or perf

    draft = extract_draft_attributes(text, fmt)

    if len(perf) < MIN_HISTORY_FOR_SIGNAL:
        return {
            "low_data": True,
            "history_size": len(perf),
            "min_history": MIN_HISTORY_FOR_SIGNAL,
            "score": 50,
            "predicted_engagement_rate": None,
            "baseline_engagement_rate": round(_avg(perf) * 100.0, 3) if perf else None,
            "draft_attributes": draft,
            "suggestions": [
                "Publish a few more posts so the predictor can learn this brand's "
                "winning patterns from real engagement."
            ],
            "drivers": [],
        }

    baseline = _avg(perf)  # fraction (engagement_rate stored as fraction)
    rates = sorted(r["engagement_rate"] for r in perf)

    # Multiplicative effect of each of the draft's attributes vs baseline.
    drivers: list[dict[str, Any]] = []
    multiplier = 1.0

    def _effect(records_with: list[dict]) -> float | None:
        if len(records_with) < 3:
            return None
        avg_with = _avg(records_with)
        if baseline <= 0:
            return None
        return avg_with / baseline

    # Binary attributes.
    for attr, label in _BINARY_ATTRS.items():
        draft_has = bool(draft.get(attr))
        matching = [r for r in perf if bool(r["attributes"].get(attr)) == draft_has]
        eff = _effect(matching)
        if eff is None:
            continue
        multiplier *= eff
        drivers.append(
            {
                "attribute": attr,
                "label": label,
                "draft_has": draft_has,
                "effect_pct": round((eff - 1.0) * 100.0, 1),
            }
        )

    # Length bucket effect.
    lb = draft["length_bucket"]
    matching_len = [r for r in perf if r["attributes"].get("length_bucket") == lb]
    eff_len = _effect(matching_len)
    if eff_len is not None:
        multiplier *= eff_len
        drivers.append(
            {
                "attribute": "length_bucket",
                "label": f"{lb} length",
                "draft_has": True,
                "effect_pct": round((eff_len - 1.0) * 100.0, 1),
            }
        )

    # Dampen compounded multipliers so we stay realistic.
    multiplier = max(0.4, min(2.2, multiplier))
    predicted = baseline * multiplier

    # Percentile of the prediction within the real historical distribution.
    below = sum(1 for r in rates if r <= predicted)
    percentile = round(below / len(rates) * 100.0)
    score = max(0, min(100, percentile))

    # Suggestions: flip the draft attributes whose *opposite* historically wins.
    suggestions: list[str] = []
    for attr, label in _BINARY_ATTRS.items():
        draft_has = bool(draft.get(attr))
        opp = [r for r in perf if bool(r["attributes"].get(attr)) != draft_has]
        eff_opp = _effect(opp)
        if eff_opp is not None and eff_opp > 1.08:
            verb = "Remove" if draft_has else "Add"
            suggestions.append(
                f"{verb} {label}: posts with the opposite choice averaged "
                f"{(eff_opp - 1.0) * 100:.0f}% higher engagement for this brand."
            )
    if not suggestions:
        suggestions.append(
            "This draft aligns with your historically strong patterns — ship it."
        )

    return {
        "low_data": False,
        "history_size": len(perf),
        "score": score,
        "percentile": percentile,
        "predicted_engagement_rate": round(predicted * 100.0, 3),
        "baseline_engagement_rate": round(baseline * 100.0, 3),
        "lift_vs_baseline_pct": round((multiplier - 1.0) * 100.0, 1),
        "draft_attributes": draft,
        "drivers": sorted(drivers, key=lambda d: abs(d["effect_pct"]), reverse=True),
        "suggestions": suggestions[:3],
    }
