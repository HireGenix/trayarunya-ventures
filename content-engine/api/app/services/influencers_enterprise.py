"""Influencers enterprise scoring — engagement, fraud-detection, audience-fit, ROI.

Every score is computed from real creator / campaign metrics with transparent,
documented formulas.  Missing data → ``low_data`` / omission, never fabrication.

Formulas
--------
**Engagement rate** (when avg_likes, avg_comments and followers are present):

    ER = (avg_likes + avg_comments) / followers

If the creator already supplies an ``engagement_rate`` value AND raw metrics are
absent, we trust that user-supplied value.

**Quality score** (0-100):

    qs = 40 × norm_engagement + 30 × niche_match + 20 × data_completeness + 10 × stage_bonus

    - norm_engagement: ER clamped to [0, 0.15] then scaled → 0-1.
    - niche_match: keyword-overlap between creator niche/tags and workspace
      ICP keywords → 0-1.
    - data_completeness: fraction of {followers, avg_likes, avg_comments,
      avg_views, niche, email} that are non-null.
    - stage_bonus: active/completed = 1, negotiating = 0.5, else 0.

**Fraud risk** (0-100, higher = riskier) — deterministic red-flag rules:

    1. engagement_outlier_high: ER > 0.20 (unnaturally high).
    2. engagement_outlier_low: ER < 0.003 with followers ≥ 10 000.
    3. like_comment_ratio_anomaly: avg_likes / avg_comments > 200 (bot-like).
    4. views_followers_mismatch: avg_views < followers × 0.005 (ghost followers).
    5. zero_engagement: avg_likes + avg_comments == 0 with followers > 0.
    6. z_engagement_outlier: |z-score of ER| > 2.5 vs workspace cohort.

    Each flag that fires adds 15-20 points (capped at 100).  With < 2 datapoints
    the score is ``null`` and ``fraud_flags`` is ``["low_data"]``.

**Tier** (from follower count):

    nano     < 10 000
    micro    10 000 – 99 999
    mid      100 000 – 499 999
    macro    500 000 – 999 999
    mega     ≥ 1 000 000

**Campaign ROI**:

    CPE  = spend / engagements          (engagements = clicks or impressions×ER)
    CPM  = spend / impressions × 1000
    ROI% = (conversions × est_value – spend) / spend × 100   (labeled proxy)
"""
from __future__ import annotations

import logging
import math
import uuid
from typing import Any

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.influencers import (
    CREATOR_TIERS,
    Creator,
    InfluencerCampaign,
)

log = logging.getLogger("influencers_enterprise")

# ------------------------------------------------------------------ #
# Tier assignment
# ------------------------------------------------------------------ #
_TIER_BANDS: list[tuple[int, str]] = [
    (1_000_000, "mega"),
    (500_000, "macro"),
    (100_000, "mid"),
    (10_000, "micro"),
]


def compute_tier(followers: int | None) -> str | None:
    if followers is None:
        return None
    for threshold, label in _TIER_BANDS:
        if followers >= threshold:
            return label
    return "nano"


# ------------------------------------------------------------------ #
# Engagement rate
# ------------------------------------------------------------------ #
def compute_engagement_rate(
    followers: int | None,
    avg_likes: int | None,
    avg_comments: int | None,
    existing_er: float | None = None,
) -> float | None:
    """Return engagement rate from raw metrics if available, else fallback."""
    if followers and followers > 0 and avg_likes is not None and avg_comments is not None:
        return (avg_likes + avg_comments) / followers
    return existing_er


# ------------------------------------------------------------------ #
# Fraud detection
# ------------------------------------------------------------------ #
_FLAG_WEIGHTS: dict[str, int] = {
    "engagement_outlier_high": 20,
    "engagement_outlier_low": 15,
    "like_comment_ratio_anomaly": 20,
    "views_followers_mismatch": 15,
    "zero_engagement": 20,
    "z_engagement_outlier": 15,
}


def compute_fraud_flags(
    er: float | None,
    followers: int | None,
    avg_likes: int | None,
    avg_comments: int | None,
    avg_views: int | None,
    cohort_ers: list[float] | None = None,
) -> tuple[float | None, list[str]]:
    """Return (fraud_risk 0-100, list of fired flag names).

    Returns (None, ["low_data"]) when fewer than 2 useful metrics are present.
    """
    available = sum(x is not None for x in (er, followers, avg_likes, avg_comments))
    if available < 2:
        return None, ["low_data"]

    flags: list[str] = []

    if er is not None:
        if er > 0.20:
            flags.append("engagement_outlier_high")
        if er < 0.003 and (followers or 0) >= 10_000:
            flags.append("engagement_outlier_low")

    if avg_likes is not None and avg_comments is not None and avg_comments > 0:
        ratio = avg_likes / avg_comments
        if ratio > 200:
            flags.append("like_comment_ratio_anomaly")

    if avg_views is not None and followers is not None and followers > 0:
        if avg_views < followers * 0.005:
            flags.append("views_followers_mismatch")

    if (
        followers is not None
        and followers > 0
        and avg_likes is not None
        and avg_comments is not None
        and avg_likes + avg_comments == 0
    ):
        flags.append("zero_engagement")

    # Z-score outlier within the workspace cohort
    if er is not None and cohort_ers and len(cohort_ers) >= 3:
        arr = np.array(cohort_ers, dtype=float)
        mu = float(np.mean(arr))
        sigma = float(np.std(arr))
        if sigma > 0:
            z = abs(er - mu) / sigma
            if z > 2.5:
                flags.append("z_engagement_outlier")

    score = min(100, sum(_FLAG_WEIGHTS.get(f, 15) for f in flags))
    return score, flags


# ------------------------------------------------------------------ #
# Quality / fit score
# ------------------------------------------------------------------ #
def _keyword_overlap(
    niche: str | None, tags: list | None, icp_keywords: list | None
) -> float:
    """Fraction of ICP keywords that appear in creator niche or tags (0-1)."""
    if not icp_keywords:
        return 0.0
    creator_text = " ".join(
        [str(niche or "")]
        + [str(t) for t in (tags or [])]
    ).lower()
    if not creator_text.strip():
        return 0.0
    hits = sum(1 for kw in icp_keywords if str(kw).lower() in creator_text)
    return hits / len(icp_keywords)


def compute_quality_score(
    er: float | None,
    niche: str | None,
    tags: list | None,
    followers: int | None,
    avg_likes: int | None,
    avg_comments: int | None,
    avg_views: int | None,
    email: str | None,
    stage: str,
    icp_keywords: list | None = None,
) -> float:
    """0-100 quality composite.  See module docstring for weights."""
    # Engagement component (40%)
    norm_er = min((er or 0.0) / 0.15, 1.0)
    engagement_part = 40 * norm_er

    # Niche match (30%)
    niche_part = 30 * _keyword_overlap(niche, tags, icp_keywords)

    # Data completeness (20%)
    fields = [followers, avg_likes, avg_comments, avg_views, niche, email]
    completeness = sum(1 for f in fields if f is not None and f != "") / len(fields)
    data_part = 20 * completeness

    # Stage bonus (10%)
    stage_map = {"active": 1.0, "completed": 1.0, "negotiating": 0.5}
    stage_part = 10 * stage_map.get(stage, 0.0)

    return round(engagement_part + niche_part + data_part + stage_part, 1)


# ------------------------------------------------------------------ #
# Audience fit ranking
# ------------------------------------------------------------------ #
def compute_fit_rank(quality_score: float, er: float | None) -> float:
    """Combined ranking metric: quality × engagement for sorting."""
    return quality_score * (er or 0.0)


# ------------------------------------------------------------------ #
# Campaign ROI
# ------------------------------------------------------------------ #
def compute_campaign_roi(
    spend: float | None,
    impressions: int | None,
    clicks: int | None,
    conversions: int | None,
    avg_conversion_value: float = 50.0,
) -> dict[str, Any]:
    """Compute CPE, CPM, estimated ROI.  All labeled when proxied."""
    result: dict[str, Any] = {"data_quality": "low_data"}
    if not spend or spend <= 0:
        return result

    result["spend"] = spend
    engagements = clicks or 0
    if impressions and impressions > 0:
        result["cpm"] = round(spend / impressions * 1000, 2)
        result["impressions"] = impressions
        result["data_quality"] = "partial"

    if engagements > 0:
        result["cpe"] = round(spend / engagements, 2)
        result["clicks"] = engagements
        result["data_quality"] = "good"

    if conversions is not None and conversions > 0:
        revenue_proxy = conversions * avg_conversion_value
        result["conversions"] = conversions
        result["roi_pct"] = round((revenue_proxy - spend) / spend * 100, 1)
        result["roi_label"] = "proxy (est. conversion value)"
        result["data_quality"] = "good"

    return result


# ------------------------------------------------------------------ #
# Batch score all creators in workspace
# ------------------------------------------------------------------ #
async def score_all_creators(
    db: AsyncSession, ws_id: uuid.UUID, icp_keywords: list | None = None,
) -> list[Creator]:
    """Recompute engagement_rate, quality_score, fraud_risk, tier for every
    creator in the workspace.  Writes to the DB (caller must commit)."""
    rows = list(
        (
            await db.execute(
                select(Creator).where(Creator.workspace_id == ws_id)
            )
        ).scalars().all()
    )
    if not rows:
        return rows

    # Build cohort ER list for z-score computation
    cohort_ers: list[float] = []
    for c in rows:
        er = compute_engagement_rate(c.followers, c.avg_likes, c.avg_comments, c.engagement_rate)
        if er is not None:
            cohort_ers.append(er)

    for c in rows:
        er = compute_engagement_rate(c.followers, c.avg_likes, c.avg_comments, c.engagement_rate)
        c.engagement_rate = er
        c.tier = compute_tier(c.followers)

        fraud_score, flags = compute_fraud_flags(
            er, c.followers, c.avg_likes, c.avg_comments, c.avg_views,
            cohort_ers=cohort_ers,
        )
        c.fraud_risk = fraud_score
        c.fraud_flags = flags

        c.quality_score = compute_quality_score(
            er, c.niche, c.tags, c.followers, c.avg_likes,
            c.avg_comments, c.avg_views, c.email, c.stage,
            icp_keywords=icp_keywords,
        )

    await db.flush()
    return rows


async def get_campaign_roi(
    db: AsyncSession, ws_id: uuid.UUID, campaign_id: uuid.UUID,
) -> dict[str, Any]:
    """Compute ROI metrics for a single campaign."""
    camp = (
        await db.execute(
            select(InfluencerCampaign).where(
                InfluencerCampaign.workspace_id == ws_id,
                InfluencerCampaign.id == campaign_id,
            )
        )
    ).scalar_one_or_none()
    if camp is None:
        return {"error": "campaign_not_found"}
    return compute_campaign_roi(
        camp.spend, camp.impressions, camp.clicks, camp.conversions,
    )


async def get_all_campaigns_roi(
    db: AsyncSession, ws_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """ROI summary for every campaign in the workspace."""
    camps = list(
        (
            await db.execute(
                select(InfluencerCampaign).where(
                    InfluencerCampaign.workspace_id == ws_id
                ).order_by(InfluencerCampaign.created_at.desc())
            )
        ).scalars().all()
    )
    results = []
    for c in camps:
        roi = compute_campaign_roi(c.spend, c.impressions, c.clicks, c.conversions)
        roi["campaign_id"] = str(c.id)
        roi["campaign_name"] = c.name
        roi["status"] = c.status
        results.append(roi)
    return results
