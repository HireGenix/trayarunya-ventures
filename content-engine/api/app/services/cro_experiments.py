"""CRO experiment measurement — variants judged by REAL conversion events.

Phase 2 generalizes the Experiment Hub beyond social ``Metric`` rows. A CRO
experiment tests a *surface* (landing page, CTA, headline, offer…) and is judged
by on-site conversions captured in :class:`ConversionEvent`. The pixel tags every
beacon with ``experiment_id`` + ``variant_id`` (the variant ``key``), so we can
compute, per variant:

* **exposures** — unique visitors (``anon_id``) who saw the variant, and
* **conversions** — unique visitors who reached the convert stage.

From those two integers we get a real conversion rate and, crucially, a
**two-proportion z-test** so the winner is only declared when the difference is
statistically significant — never on noise. We refuse to invent numbers: a
variant with no exposures reports zeros and ``has_data=False``.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversion import FUNNEL_STAGES, ConversionEvent

# Event types that count as a "conversion" for an experiment (the deepest stage).
_CONVERT_EVENTS: frozenset[str] = frozenset(FUNNEL_STAGES[-1][2])
# Minimum exposures per arm before significance is even attempted.
MIN_EXPOSURES_PER_ARM = 30
# Two-sided z critical values for common confidence levels.
_Z_95 = 1.96
_Z_99 = 2.576


def _coerce_uuid(value: Any) -> uuid.UUID | None:
    if value is None:
        return None
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return None


def _norm_cdf(z: float) -> float:
    """Standard normal CDF via the error function (no scipy dependency)."""
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def two_proportion_z(
    conv_a: int, exp_a: int, conv_b: int, exp_b: int
) -> dict[str, Any]:
    """Two-proportion z-test (B = variant vs A = control).

    Returns the z statistic, two-sided p-value, confidence (1-p), the absolute
    and relative lift of B over A, and a verdict. Pure integers in → real stats
    out; guards every division so it never raises.
    """
    if exp_a <= 0 or exp_b <= 0:
        return {
            "z": None,
            "p_value": None,
            "confidence": 0.0,
            "significant": False,
            "abs_lift": None,
            "rel_lift_pct": None,
            "verdict": "needs_more_data",
        }

    p_a = conv_a / exp_a
    p_b = conv_b / exp_b
    pooled = (conv_a + conv_b) / (exp_a + exp_b)
    se = math.sqrt(pooled * (1.0 - pooled) * (1.0 / exp_a + 1.0 / exp_b))

    if se == 0:
        z = 0.0
        p_value = 1.0
    else:
        z = (p_b - p_a) / se
        p_value = 2.0 * (1.0 - _norm_cdf(abs(z)))

    confidence = max(0.0, min(1.0, 1.0 - p_value))
    abs_lift = (p_b - p_a) * 100.0
    rel_lift = ((p_b - p_a) / p_a * 100.0) if p_a > 0 else None

    enough = exp_a >= MIN_EXPOSURES_PER_ARM and exp_b >= MIN_EXPOSURES_PER_ARM
    significant = bool(enough and p_value < 0.05)
    if not enough:
        verdict = "needs_more_data"
    elif significant:
        verdict = "significant"
    else:
        verdict = "inconclusive"

    return {
        "z": round(z, 3),
        "p_value": round(p_value, 4),
        "confidence": round(confidence, 4),
        "significant": significant,
        "abs_lift": round(abs_lift, 3),
        "rel_lift_pct": round(rel_lift, 2) if rel_lift is not None else None,
        "verdict": verdict,
    }


async def compute_conversion_variants(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    experiment_id: uuid.UUID,
    variants: list[dict[str, Any]],
    since: datetime | None = None,
) -> list[dict[str, Any]]:
    """Per-variant exposures / conversions / revenue from real ConversionEvents.

    Counts unique visitors (``anon_id``) per ``variant_id``. A visitor is an
    *exposure* the moment they emit any event for the variant, and a *conversion*
    once they emit a convert-stage event. Revenue sums ``value`` on those events.
    """
    conds = [
        ConversionEvent.workspace_id == workspace_id,
        ConversionEvent.experiment_id == experiment_id,
    ]
    if since is not None:
        conds.append(ConversionEvent.occurred_at >= since)

    res = await db.execute(
        select(
            ConversionEvent.variant_id,
            ConversionEvent.anon_id,
            ConversionEvent.event_type,
            ConversionEvent.value,
        ).where(*conds)
    )
    rows = res.all()

    # variant_key -> {exposed:set, converted:set, revenue:float}
    agg: dict[str, dict[str, Any]] = {}
    for variant_id, anon_id, event_type, value in rows:
        key = str(variant_id) if variant_id is not None else None
        if not key or not anon_id:
            continue
        bucket = agg.setdefault(
            key, {"exposed": set(), "converted": set(), "revenue": 0.0}
        )
        bucket["exposed"].add(anon_id)
        if event_type in _CONVERT_EVENTS:
            bucket["converted"].add(anon_id)
            bucket["revenue"] += float(value or 0.0)

    out: list[dict[str, Any]] = []
    for variant in variants or []:
        if not isinstance(variant, dict):
            continue
        key = str(variant.get("key") or "").strip()
        if not key:
            continue
        bucket = agg.get(key, {"exposed": set(), "converted": set(), "revenue": 0.0})
        exposures = len(bucket["exposed"])
        conversions = len(bucket["converted"])
        cvr = (conversions / exposures * 100.0) if exposures > 0 else 0.0
        out.append(
            {
                "key": key,
                "label": str(variant.get("label") or key),
                "payload": variant.get("payload"),
                "is_control": bool(variant.get("is_control")),
                "exposures": exposures,
                "conversions": conversions,
                "conversion_rate": round(cvr, 3),
                "revenue": round(bucket["revenue"], 2),
                "has_data": exposures > 0,
            }
        )
    return out


def evaluate_conversion_experiment(
    variant_results: list[dict[str, Any]],
) -> dict[str, Any]:
    """Pick the control, rank challengers by significance, declare a winner.

    The control is the variant flagged ``is_control`` (else the first). Each other
    variant is z-tested against it. A winner is only declared when a challenger is
    *significantly* better; otherwise the result is inconclusive / needs more data.
    """
    with_data = [v for v in variant_results if v.get("has_data")]
    total_exposures = sum(v["exposures"] for v in variant_results)

    if len(with_data) < 2:
        return {
            "status": "insufficient_data",
            "winner_key": None,
            "verdict": "needs_more_data",
            "total_exposures": total_exposures,
            "variants": variant_results,
            "message": (
                "Need at least two variants with live traffic. Install the pixel "
                "with the experiment id + variant id and let visitors flow."
            ),
        }

    control = next((v for v in with_data if v.get("is_control")), with_data[0])
    comparisons: list[dict[str, Any]] = []
    best = None  # significantly-better challenger with the highest lift

    for v in with_data:
        if v["key"] == control["key"]:
            continue
        stat = two_proportion_z(
            control["conversions"], control["exposures"],
            v["conversions"], v["exposures"],
        )
        entry = {"key": v["key"], "label": v["label"], **stat}
        comparisons.append(entry)
        if stat["significant"] and (stat["abs_lift"] or 0) > 0:
            if best is None or (stat["abs_lift"] or 0) > (best["abs_lift"] or 0):
                best = entry

    # Could the control itself be the strongest? Only crown a challenger when it
    # significantly beats control; otherwise control holds (incumbent wins ties).
    if best is not None:
        winner_key = best["key"]
        verdict = "significant"
        status = "completed"
    else:
        # Anyone reach the sample floor yet?
        enough = all(
            v["exposures"] >= MIN_EXPOSURES_PER_ARM for v in with_data
        )
        winner_key = control["key"] if enough else None
        verdict = "inconclusive" if enough else "needs_more_data"
        status = "completed" if enough else "insufficient_data"

    winner = next((v for v in with_data if v["key"] == winner_key), None)
    return {
        "status": status,
        "winner_key": winner_key,
        "winner_label": winner["label"] if winner else None,
        "winner_cvr": winner["conversion_rate"] if winner else None,
        "verdict": verdict,
        "control_key": control["key"],
        "min_exposures_per_arm": MIN_EXPOSURES_PER_ARM,
        "total_exposures": total_exposures,
        "comparisons": comparisons,
        "variants": variant_results,
    }


def recommend_allocation(
    variant_results: list[dict[str, Any]], *, explore_floor: float = 0.10
) -> list[dict[str, Any]]:
    """Multi-armed-bandit traffic split via Beta-posterior means.

    Each arm's conversion posterior is ``Beta(1 + conversions, 1 + non-converters)``;
    we allocate traffic proportional to the posterior mean, then mix with a uniform
    floor so under-explored arms keep getting tried. Deterministic (posterior mean,
    not a random Thompson draw) so the recommendation is stable and explainable.
    """
    arms = [v for v in variant_results if isinstance(v, dict) and v.get("key")]
    if not arms:
        return []
    n = len(arms)
    means: list[float] = []
    for v in arms:
        conv = int(v.get("conversions", 0) or 0)
        exp = int(v.get("exposures", 0) or 0)
        non_conv = max(0, exp - conv)
        means.append((1.0 + conv) / (2.0 + conv + non_conv))  # Beta posterior mean

    total_mean = sum(means) or 1.0
    out: list[dict[str, Any]] = []
    for v, mean in zip(arms, means):
        exploit = mean / total_mean
        weight = explore_floor / n + (1.0 - explore_floor) * exploit
        out.append(
            {
                "key": v["key"],
                "label": v.get("label", v["key"]),
                "posterior_mean_cvr": round(mean * 100.0, 3),
                "allocation_pct": round(weight * 100.0, 1),
            }
        )
    # Normalize rounding drift onto the largest arm.
    drift = round(100.0 - sum(o["allocation_pct"] for o in out), 1)
    if out and abs(drift) >= 0.1:
        top = max(out, key=lambda o: o["allocation_pct"])
        top["allocation_pct"] = round(top["allocation_pct"] + drift, 1)
    return out
