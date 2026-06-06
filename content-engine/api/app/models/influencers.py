"""Influencer & UGC management models — creators CRM, outreach, campaigns, assets.

Enterprise columns on ``Creator``:
  avg_likes, avg_comments, avg_views — raw engagement metrics from platform data.
  quality_score   — transparent composite score (0-100) from engagement + fit.
  fraud_risk      — 0-100 fraud-risk score from deterministic heuristics.
  fraud_flags     — JSONB list of specific red-flag rule names that fired.
  tier            — nano / micro / mid / macro / mega, derived from follower bands.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# Vocabularies — kept as plain tuples so callers can validate without code edits.
PLATFORMS = ("instagram", "youtube", "tiktok", "x", "linkedin")
CREATOR_STAGES = ("prospect", "contacted", "negotiating", "active", "completed")
OUTREACH_CHANNELS = ("email", "dm")
OUTREACH_STATUSES = ("drafted", "sent", "replied")
CAMPAIGN_STATUSES = ("planning", "live", "done")
UGC_TYPES = ("image", "video")
UGC_RIGHTS = ("none", "requested", "granted")
UGC_STATUSES = ("pending", "approved")
CREATOR_TIERS = ("nano", "micro", "mid", "macro", "mega")


class Creator(Base, UUIDMixin, TimestampMixin):
    """A single influencer / content creator tracked in the workspace CRM."""

    __tablename__ = "influencer_creators"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    handle: Mapped[str] = mapped_column(String(200), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    platform: Mapped[str] = mapped_column(String(20), default="instagram", nullable=False)
    followers: Mapped[int | None] = mapped_column(Integer, nullable=True)
    engagement_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    niche: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    stage: Mapped[str] = mapped_column(String(20), default="prospect", nullable=False)
    rate_card: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Enterprise: raw engagement metrics
    avg_likes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_comments: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_views: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Enterprise: computed scores (service layer writes these)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    fraud_risk: Mapped[float | None] = mapped_column(Float, nullable=True)
    fraud_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    tier: Mapped[str | None] = mapped_column(String(10), nullable=True)


class Outreach(Base, UUIDMixin, TimestampMixin):
    """An outreach message (email / DM) sent or drafted to a creator."""

    __tablename__ = "influencer_outreach"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("influencer_creators.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    channel: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    subject: Mapped[str | None] = mapped_column(String(300), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="drafted", nullable=False)
    sent_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class InfluencerCampaign(Base, UUIDMixin, TimestampMixin):
    """A creator-led campaign with a brief, budget, deliverables and roster."""

    __tablename__ = "influencer_campaigns"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    brief: Mapped[str | None] = mapped_column(Text, nullable=True)
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="planning", nullable=False)
    deliverables: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    creator_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    # Enterprise: actual spend + outcome metrics for ROI tracking
    spend: Mapped[float | None] = mapped_column(Float, nullable=True)
    impressions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    clicks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    conversions: Mapped[int | None] = mapped_column(Integer, nullable=True)


class UGCAsset(Base, UUIDMixin, TimestampMixin):
    """A user-generated content asset with rights tracking."""

    __tablename__ = "influencer_ugc_assets"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    creator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("influencer_creators.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    type: Mapped[str] = mapped_column(String(20), default="image", nullable=False)
    usage_rights: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)
