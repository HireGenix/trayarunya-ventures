"""Platform expansion models: the data backbone for the next wave of features.

Grouped here so every new capability shares one migration surface:
- ``Experiment``        — experimentation engine (hypothesis -> variants -> result).
- ``Integration``       — external CRM/analytics connections (tokens encrypted).
- ``CompetitorWatch`` / ``WatchEvent`` — always-on competitor monitoring.
- ``AbmAccount``        — B2B account-based marketing target accounts.
- ``CampaignPlan``      — full campaign packs built from an insight/strategy.
- ``Comment`` / ``Approval`` / ``ContentVersion`` — collaboration + version history.
- ``AuditLog``          — record of key mutating actions.
- ``Benchmark``         — anonymous cross-account aggregates.

All tables are workspace-scoped (multi-tenant) and use the shared UUID +
timestamp mixins. Tokens are stored already-encrypted by the crypto service.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


# --------------------------------------------------------------------------- #
# Experimentation engine
# --------------------------------------------------------------------------- #
class Experiment(Base, UUIDMixin, TimestampMixin):
    """A structured marketing experiment: hypothesis -> variants -> result -> learning."""

    __tablename__ = "experiments"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    hypothesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    # channel/audience/offer context
    context: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # the metric we judge success by: engagement_rate | ctr | conversions | impressions
    success_metric: Mapped[str] = mapped_column(String(40), default="engagement_rate", nullable=False)
    # list of {key, label, content_item_id?, notes?}
    variants: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # draft | running | completed | archived
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True)
    winner_key: Mapped[str | None] = mapped_column(String(80), nullable=True)
    # frozen result payload: per-variant metrics + lift
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    learning: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# --------------------------------------------------------------------------- #
# External integrations (CRM / analytics / ecommerce)
# --------------------------------------------------------------------------- #
class Integration(Base, UUIDMixin, TimestampMixin):
    """A connection to an external system (HubSpot, GA4, Search Console, Shopify…)."""

    __tablename__ = "integrations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # hubspot | salesforce | pipedrive | ga4 | search_console | shopify | woocommerce | klaviyo
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(30), default="crm", nullable=False)  # crm|analytics|ecommerce|email
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # disconnected | connected | error | expired
    status: Mapped[str] = mapped_column(String(20), default="connected", nullable=False)
    # encrypted token blobs (never plaintext)
    access_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    # provider-specific ids/config (account id, property id, store domain…)
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)


# --------------------------------------------------------------------------- #
# Competitor watchtower
# --------------------------------------------------------------------------- #
class CompetitorWatch(Base, UUIDMixin, TimestampMixin):
    """A competitor we continuously monitor for changes."""

    __tablename__ = "competitor_watches"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    social_handles: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # last fetched signal snapshot used for diffing
    last_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class WatchEvent(Base, UUIDMixin, TimestampMixin):
    """A detected change for a watched competitor."""

    __tablename__ = "watch_events"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    watch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competitor_watches.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # messaging | pricing | content | launch | seo | hiring | other
    kind: Mapped[str] = mapped_column(String(40), default="other", nullable=False)
    title: Mapped[str] = mapped_column(String(400), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    importance: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)  # low|medium|high


# --------------------------------------------------------------------------- #
# Account-based marketing (B2B)
# --------------------------------------------------------------------------- #
class AbmAccount(Base, UUIDMixin, TimestampMixin):
    """A target account for B2B account-based marketing."""

    __tablename__ = "abm_accounts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    company: Mapped[str] = mapped_column(String(300), nullable=False)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(160), nullable=True)
    tier: Mapped[str] = mapped_column(String(20), default="tier_2", nullable=False)  # tier_1|tier_2|tier_3
    # new | researching | engaging | opportunity | won | lost
    stage: Mapped[str] = mapped_column(String(30), default="new", nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    firmographics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # buying committee personas + pains generated by LLM
    personas: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # generated assets: {battlecards, sequences, content} references
    assets: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


# --------------------------------------------------------------------------- #
# Campaign builder
# --------------------------------------------------------------------------- #
class CampaignPlan(Base, UUIDMixin, TimestampMixin):
    """A full campaign pack assembled from an insight/strategy."""

    __tablename__ = "campaign_plans"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    audience: Mapped[str | None] = mapped_column(Text, nullable=True)
    offer: Mapped[str | None] = mapped_column(Text, nullable=True)
    channels: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # full structured plan: timeline, assets, budget split, measurement plan
    plan: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    source_insight_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    source_strategy_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    # draft | active | completed | archived
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False, index=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# --------------------------------------------------------------------------- #
# Collaboration + versioning
# --------------------------------------------------------------------------- #
class Comment(Base, UUIDMixin, TimestampMixin):
    """A comment thread entry on any entity (content item, strategy, campaign…)."""

    __tablename__ = "comments"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)  # content|strategy|campaign|abm
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    author_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Approval(Base, UUIDMixin, TimestampMixin):
    """An approval decision on an entity (content item, campaign…)."""

    __tablename__ = "approvals"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    # pending | approved | changes_requested | rejected
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class ContentVersion(Base, UUIDMixin, TimestampMixin):
    """An immutable snapshot of a content item's body/variants for version history."""

    __tablename__ = "content_versions"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    content_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("content_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    title: Mapped[str | None] = mapped_column(String(400), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    variants: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    author_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    note: Mapped[str | None] = mapped_column(String(400), nullable=True)


class AuditLog(Base, UUIDMixin, TimestampMixin):
    """A record of a key mutating action for governance/traceability."""

    __tablename__ = "audit_logs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)  # e.g. content.publish
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


# --------------------------------------------------------------------------- #
# Benchmarks (anonymous aggregates)
# --------------------------------------------------------------------------- #
class Benchmark(Base, UUIDMixin, TimestampMixin):
    """An anonymous aggregate metric bucket for cross-account benchmarking."""

    __tablename__ = "benchmarks"

    # industry/channel/company-size/objective bucket
    industry: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    channel: Mapped[str | None] = mapped_column(String(60), index=True, nullable=True)
    metric: Mapped[str] = mapped_column(String(60), nullable=False)  # engagement_rate|ctr|...
    p50: Mapped[float | None] = mapped_column(Float, nullable=True)
    p75: Mapped[float | None] = mapped_column(Float, nullable=True)
    p90: Mapped[float | None] = mapped_column(Float, nullable=True)
    sample_size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
