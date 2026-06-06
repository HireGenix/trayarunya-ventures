"""Influencer & UGC service — real DB-backed CRM, outreach, campaigns, assets.

All aggregation (pipeline counts, estimated reach) is computed from real rows
this module writes. No mocks, no random demo data.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.influencers import (
    CAMPAIGN_STATUSES,
    CREATOR_STAGES,
    CREATOR_TIERS,
    OUTREACH_CHANNELS,
    OUTREACH_STATUSES,
    PLATFORMS,
    UGC_RIGHTS,
    UGC_STATUSES,
    UGC_TYPES,
    Creator,
    InfluencerCampaign,
    Outreach,
    UGCAsset,
)
from app.services.influencers_enterprise import (
    compute_engagement_rate,
    compute_fraud_flags,
    compute_quality_score,
    compute_tier,
)


def _norm(value: str | None, allowed: tuple[str, ...], default: str) -> str:
    v = (value or "").strip().lower()
    return v if v in allowed else default


def _apply_scores(creator: Creator, icp_keywords: list | None = None) -> None:
    """Recompute engagement_rate, tier, fraud, quality on a Creator instance."""
    creator.engagement_rate = compute_engagement_rate(
        creator.followers, creator.avg_likes, creator.avg_comments, creator.engagement_rate
    )
    creator.tier = compute_tier(creator.followers)
    fraud_score, flags = compute_fraud_flags(
        creator.engagement_rate, creator.followers,
        creator.avg_likes, creator.avg_comments, creator.avg_views,
    )
    creator.fraud_risk = fraud_score
    creator.fraud_flags = flags
    creator.quality_score = compute_quality_score(
        creator.engagement_rate, creator.niche, creator.tags,
        creator.followers, creator.avg_likes, creator.avg_comments,
        creator.avg_views, creator.email, creator.stage,
        icp_keywords=icp_keywords,
    )


# --------------------------------------------------------------------------- #
# Creator CRM
# --------------------------------------------------------------------------- #
async def list_creators(
    db: AsyncSession, ws_id: uuid.UUID, *, stage: str | None = None, tier: str | None = None,
) -> list[Creator]:
    stmt = select(Creator).where(Creator.workspace_id == ws_id)
    if stage:
        stmt = stmt.where(Creator.stage == stage)
    if tier:
        stmt = stmt.where(Creator.tier == tier)
    stmt = stmt.order_by(Creator.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_creator(
    db: AsyncSession, ws_id: uuid.UUID, creator_id: uuid.UUID
) -> Creator | None:
    res = await db.execute(
        select(Creator).where(
            Creator.workspace_id == ws_id, Creator.id == creator_id
        )
    )
    return res.scalar_one_or_none()


async def create_creator(db: AsyncSession, ws_id: uuid.UUID, data: dict) -> Creator:
    creator = Creator(
        workspace_id=ws_id,
        handle=str(data["handle"]).strip()[:200],
        name=str(data.get("name") or data["handle"]).strip()[:200],
        platform=_norm(data.get("platform"), PLATFORMS, "instagram"),
        followers=data.get("followers"),
        engagement_rate=data.get("engagement_rate"),
        niche=(data.get("niche") or None),
        email=(data.get("email") or None),
        stage=_norm(data.get("stage"), CREATOR_STAGES, "prospect"),
        rate_card=data.get("rate_card"),
        notes=(data.get("notes") or None),
        tags=data.get("tags") or [],
        avg_likes=data.get("avg_likes"),
        avg_comments=data.get("avg_comments"),
        avg_views=data.get("avg_views"),
    )
    _apply_scores(creator)
    db.add(creator)
    await db.flush()
    return creator


async def update_creator(
    db: AsyncSession, creator: Creator, data: dict
) -> Creator:
    if "handle" in data and data["handle"]:
        creator.handle = str(data["handle"]).strip()[:200]
    if "name" in data and data["name"]:
        creator.name = str(data["name"]).strip()[:200]
    if "platform" in data and data["platform"]:
        creator.platform = _norm(data.get("platform"), PLATFORMS, creator.platform)
    if "followers" in data:
        creator.followers = data["followers"]
    if "engagement_rate" in data:
        creator.engagement_rate = data["engagement_rate"]
    if "niche" in data:
        creator.niche = data["niche"] or None
    if "email" in data:
        creator.email = data["email"] or None
    if "stage" in data and data["stage"]:
        creator.stage = _norm(data.get("stage"), CREATOR_STAGES, creator.stage)
    if "rate_card" in data:
        creator.rate_card = data["rate_card"]
    if "notes" in data:
        creator.notes = data["notes"] or None
    if "tags" in data and data["tags"] is not None:
        creator.tags = data["tags"]
    if "avg_likes" in data:
        creator.avg_likes = data["avg_likes"]
    if "avg_comments" in data:
        creator.avg_comments = data["avg_comments"]
    if "avg_views" in data:
        creator.avg_views = data["avg_views"]
    _apply_scores(creator)
    await db.flush()
    return creator


# --------------------------------------------------------------------------- #
# Outreach
# --------------------------------------------------------------------------- #
async def list_outreach(
    db: AsyncSession, ws_id: uuid.UUID, *, creator_id: uuid.UUID | None = None
) -> list[Outreach]:
    stmt = select(Outreach).where(Outreach.workspace_id == ws_id)
    if creator_id:
        stmt = stmt.where(Outreach.creator_id == creator_id)
    stmt = stmt.order_by(Outreach.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def create_outreach(
    db: AsyncSession,
    ws_id: uuid.UUID,
    creator_id: uuid.UUID,
    *,
    channel: str,
    body: str,
    subject: str | None = None,
    status: str = "drafted",
) -> Outreach:
    row = Outreach(
        workspace_id=ws_id,
        creator_id=creator_id,
        channel=_norm(channel, OUTREACH_CHANNELS, "email"),
        subject=(subject or None),
        body=body,
        status=_norm(status, OUTREACH_STATUSES, "drafted"),
    )
    db.add(row)
    await db.flush()
    return row


async def mark_outreach_sent(db: AsyncSession, row: Outreach) -> Outreach:
    row.status = "sent"
    row.sent_at = datetime.now(timezone.utc).isoformat()
    await db.flush()
    return row


# --------------------------------------------------------------------------- #
# Campaigns
# --------------------------------------------------------------------------- #
async def list_campaigns(db: AsyncSession, ws_id: uuid.UUID) -> list[InfluencerCampaign]:
    res = await db.execute(
        select(InfluencerCampaign)
        .where(InfluencerCampaign.workspace_id == ws_id)
        .order_by(InfluencerCampaign.created_at.desc())
    )
    return list(res.scalars().all())


async def create_campaign(
    db: AsyncSession, ws_id: uuid.UUID, data: dict
) -> InfluencerCampaign:
    creator_ids = [str(c) for c in (data.get("creator_ids") or [])]
    camp = InfluencerCampaign(
        workspace_id=ws_id,
        name=str(data["name"]).strip()[:200],
        brief=(data.get("brief") or None),
        budget=data.get("budget"),
        status=_norm(data.get("status"), CAMPAIGN_STATUSES, "planning"),
        deliverables=data.get("deliverables") or [],
        creator_ids=creator_ids,
        spend=data.get("spend"),
        impressions=data.get("impressions"),
        clicks=data.get("clicks"),
        conversions=data.get("conversions"),
    )
    db.add(camp)
    await db.flush()
    return camp


# --------------------------------------------------------------------------- #
# UGC assets + rights
# --------------------------------------------------------------------------- #
async def list_ugc(db: AsyncSession, ws_id: uuid.UUID) -> list[UGCAsset]:
    res = await db.execute(
        select(UGCAsset)
        .where(UGCAsset.workspace_id == ws_id)
        .order_by(UGCAsset.created_at.desc())
    )
    return list(res.scalars().all())


async def get_ugc(
    db: AsyncSession, ws_id: uuid.UUID, asset_id: uuid.UUID
) -> UGCAsset | None:
    res = await db.execute(
        select(UGCAsset).where(
            UGCAsset.workspace_id == ws_id, UGCAsset.id == asset_id
        )
    )
    return res.scalar_one_or_none()


async def create_ugc(db: AsyncSession, ws_id: uuid.UUID, data: dict) -> UGCAsset:
    creator_id = data.get("creator_id")
    asset = UGCAsset(
        workspace_id=ws_id,
        creator_id=creator_id,
        url=str(data["url"]).strip()[:1000],
        type=_norm(data.get("type"), UGC_TYPES, "image"),
        usage_rights=_norm(data.get("usage_rights"), UGC_RIGHTS, "none"),
        status=_norm(data.get("status"), UGC_STATUSES, "pending"),
        source=(data.get("source") or None),
    )
    db.add(asset)
    await db.flush()
    return asset


async def set_ugc_rights(
    db: AsyncSession, asset: UGCAsset, rights: str
) -> UGCAsset:
    asset.usage_rights = _norm(rights, UGC_RIGHTS, asset.usage_rights)
    # Granting full rights approves the asset for use.
    if asset.usage_rights == "granted":
        asset.status = "approved"
    await db.flush()
    return asset


# --------------------------------------------------------------------------- #
# Real aggregation — pipeline counts + estimated reach
# --------------------------------------------------------------------------- #
async def compute_overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    # Creators grouped by stage.
    stage_rows = (
        await db.execute(
            select(Creator.stage, func.count(Creator.id))
            .where(Creator.workspace_id == ws_id)
            .group_by(Creator.stage)
        )
    ).all()
    by_stage = {s: 0 for s in CREATOR_STAGES}
    for stage, count in stage_rows:
        by_stage[stage] = int(count)
    total_creators = sum(by_stage.values())
    active_creators = by_stage.get("active", 0)

    # Estimated reach = sum of followers across active creators (real rows).
    reach = (
        await db.execute(
            select(func.coalesce(func.sum(Creator.followers), 0)).where(
                Creator.workspace_id == ws_id,
                Creator.stage == "active",
                Creator.followers.isnot(None),
            )
        )
    ).scalar_one()

    # Campaign status rollup.
    camp_rows = (
        await db.execute(
            select(InfluencerCampaign.status, func.count(InfluencerCampaign.id))
            .where(InfluencerCampaign.workspace_id == ws_id)
            .group_by(InfluencerCampaign.status)
        )
    ).all()
    campaigns_by_status = {s: 0 for s in CAMPAIGN_STATUSES}
    for status, count in camp_rows:
        campaigns_by_status[status] = int(count)
    live_campaigns = campaigns_by_status.get("live", 0)

    # UGC rollup.
    ugc_rows = (
        await db.execute(
            select(UGCAsset.status, func.count(UGCAsset.id))
            .where(UGCAsset.workspace_id == ws_id)
            .group_by(UGCAsset.status)
        )
    ).all()
    ugc_by_status = {s: 0 for s in UGC_STATUSES}
    for status, count in ugc_rows:
        ugc_by_status[status] = int(count)

    rights_pending = (
        await db.execute(
            select(func.count(UGCAsset.id)).where(
                UGCAsset.workspace_id == ws_id,
                UGCAsset.usage_rights.in_(("none", "requested")),
            )
        )
    ).scalar_one()

    outreach_sent = (
        await db.execute(
            select(func.count(Outreach.id)).where(
                Outreach.workspace_id == ws_id, Outreach.status == "sent"
            )
        )
    ).scalar_one()

    # Tier distribution
    tier_rows = (
        await db.execute(
            select(Creator.tier, func.count(Creator.id))
            .where(Creator.workspace_id == ws_id, Creator.tier.isnot(None))
            .group_by(Creator.tier)
        )
    ).all()
    tier_dist = {t: 0 for t in CREATOR_TIERS}
    for tier, count in tier_rows:
        if tier in tier_dist:
            tier_dist[tier] = int(count)

    # Avg engagement, avg quality, avg fraud risk across all creators
    score_aggs = (
        await db.execute(
            select(
                func.avg(Creator.engagement_rate),
                func.avg(Creator.quality_score),
                func.avg(Creator.fraud_risk),
            ).where(Creator.workspace_id == ws_id)
        )
    ).one()
    avg_er = round(float(score_aggs[0] or 0), 4)
    avg_quality = round(float(score_aggs[1] or 0), 1)
    avg_fraud = round(float(score_aggs[2] or 0), 1)

    return {
        "creators_by_stage": by_stage,
        "total_creators": total_creators,
        "active_creators": active_creators,
        "estimated_reach": int(reach or 0),
        "campaigns_by_status": campaigns_by_status,
        "live_campaigns": live_campaigns,
        "ugc_by_status": ugc_by_status,
        "ugc_approved": ugc_by_status.get("approved", 0),
        "ugc_rights_pending": int(rights_pending or 0),
        "outreach_sent": int(outreach_sent or 0),
        "tier_distribution": tier_dist,
        "avg_engagement_rate": avg_er,
        "avg_quality_score": avg_quality,
        "avg_fraud_risk": avg_fraud,
    }
