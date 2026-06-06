"""SEO Suite models — rank tracking, on-page audits, AI content briefs.

Every table is workspace-scoped (FK CASCADE + index). Ranks are only ever
written from a real connector/snapshot — never fabricated. JSONB holds the
flexible blobs (audit issues, brief outline).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class SeoKeyword(Base, UUIDMixin, TimestampMixin):
    """A keyword we (optionally) track rankings for, in a country/device."""

    __tablename__ = "seo_keywords"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    term: Mapped[str] = mapped_column(String(300), nullable=False)
    country: Mapped[str] = mapped_column(String(8), default="US", nullable=False)
    device: Mapped[str] = mapped_column(String(10), default="desktop", nullable=False)  # desktop|mobile
    intent: Mapped[str | None] = mapped_column(String(40), nullable=True)
    current_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    previous_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    search_volume: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # SERP-derived signals (all transparent proxies — never real provider volume).
    difficulty: Mapped[int | None] = mapped_column(Integer, nullable=True)  # estimated 0-100
    volume_proxy: Mapped[int | None] = mapped_column(Integer, nullable=True)  # relative demand proxy 0-100
    metrics: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # flexible extra signals
    last_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_tracked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    serp_features: Mapped[list | None] = mapped_column(JSONB, nullable=True)


class RankSnapshot(Base, UUIDMixin, TimestampMixin):
    """A point-in-time rank reading for a keyword (real connector data only)."""

    __tablename__ = "seo_rank_snapshots"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    keyword_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("seo_keywords.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SeoAudit(Base, UUIDMixin, TimestampMixin):
    """An on-page audit run for a URL, scored with a list of issues."""

    __tablename__ = "seo_audits"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # list of {type, severity, detail}
    issues: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running", nullable=False)  # running|done


class SiteCrawlAudit(Base, UUIDMixin, TimestampMixin):
    """A full-site crawl audit: crawls up to ``max_pages`` and aggregates issues.

    Runs in the background (multi-page crawl). Issues are detected from real
    fetched HTML — missing titles, thin content, broken links, etc.
    """

    __tablename__ = "seo_site_crawl_audits"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    base_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    max_pages: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    pages_crawled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # aggregated list of {type, severity, detail, url}
    issues: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running", nullable=False)  # running|done|failed


class ContentBrief(Base, UUIDMixin, TimestampMixin):
    """An AI-generated, usable SEO content brief for a target keyword."""

    __tablename__ = "seo_content_briefs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_keyword: Mapped[str] = mapped_column(String(300), nullable=False)
    title: Mapped[str | None] = mapped_column(String(400), nullable=True)
    outline: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    word_count_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)  # draft|ready
    brief_md: Mapped[str | None] = mapped_column(Text, nullable=True)


class SeoSerpFeature(Base, UUIDMixin, TimestampMixin):
    """Which SERP features appear for a tracked keyword (featured snippet, PAA, etc.)."""

    __tablename__ = "seo_serp_features"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    keyword_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("seo_keywords.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # list of feature strings e.g. "featured_snippet", "paa", "video_pack"
    features: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SeoBacklink(Base, UUIDMixin, TimestampMixin):
    """A backlink uploaded from a GSC links export."""

    __tablename__ = "seo_backlinks"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    source_url: Mapped[str] = mapped_column(String(1000), nullable=False)  # page linking to us
    target_url: Mapped[str] = mapped_column(String(1000), nullable=False)  # our page being linked to
    anchor_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    referring_domain: Mapped[str] = mapped_column(String(300), nullable=False)
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_file: Mapped[str | None] = mapped_column(String(200), nullable=True)  # uploaded CSV filename


class SeoReferringDomain(Base, UUIDMixin, TimestampMixin):
    """Aggregated referring-domain data derived from backlinks."""

    __tablename__ = "seo_referring_domains"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    domain: Mapped[str] = mapped_column(String(300), nullable=False)
    backlink_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SiteLinkGraph(Base, UUIDMixin, TimestampMixin):
    """Internal link graph computed from a site crawl."""

    __tablename__ = "seo_link_graphs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    site_audit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("seo_site_crawl_audits.id", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    base_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    # {nodes: [{url, title}], edges: [{from_url, to_url, anchor_text}]}
    graph: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    orphan_pages: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # URLs with no inbound internal links
    suggestions: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # internal link opportunities
    status: Mapped[str] = mapped_column(String(20), default="running", nullable=False)


class SeoTopicCluster(Base, UUIDMixin, TimestampMixin):
    """Topical authority clustering for a group of keywords."""

    __tablename__ = "seo_topic_clusters"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    topic: Mapped[str] = mapped_column(String(200), nullable=False)
    keywords: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # keyword terms in this cluster
    keyword_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # keyword UUIDs
    coverage_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # % of cluster keywords we rank for
    authority_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0-100
    pillar_gaps: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # missing pillar content suggestions
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
