"""Enterprise watchtower tables: real multi-target competitor monitoring.

Where the original ``CompetitorWatch`` / ``WatchEvent`` pair models a competitor
and a hand-curated change feed, these tables power the enterprise upgrade with
true page-level monitoring:

- ``WatchTarget``   — an individual URL/page tracked for a competitor watch.
- ``WatchSnapshot`` — a captured snapshot of a target's content at a point in time.
- ``WatchDiff``     — a classified diff between two consecutive snapshots.

Each target is re-fetched on its own interval; every fetch yields a snapshot,
and consecutive snapshots are diffed and classified (price/content/seo/etc.) so
changes can be surfaced with real evidence. All tables are workspace-scoped
(multi-tenant) and use the shared UUID + timestamp mixins.
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
# Watch targets
# --------------------------------------------------------------------------- #
class WatchTarget(Base, UUIDMixin, TimestampMixin):
    """An individual URL/page monitored for changes under a competitor watch."""

    __tablename__ = "watch_targets"

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
    url: Mapped[str] = mapped_column(String(1000), nullable=False)
    label: Mapped[str | None] = mapped_column(String(300), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # how often to re-check, in seconds (default: daily)
    check_interval_seconds: Mapped[int] = mapped_column(Integer, default=86400, nullable=False)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # awaiting_baseline | ok | fetch_failed
    status: Mapped[str] = mapped_column(String(40), default="awaiting_baseline", nullable=False)
    # SHA-256 hash of normalized page text
    last_content_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)


# --------------------------------------------------------------------------- #
# Watch snapshots
# --------------------------------------------------------------------------- #
class WatchSnapshot(Base, UUIDMixin, TimestampMixin):
    """A captured snapshot of a target's page content at a point in time."""

    __tablename__ = "watch_snapshots"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("watch_targets.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # SHA-256 of normalized text
    content_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # list of H1 headings
    h1s: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # first ~600 chars of normalized page text
    headline: Mapped[str | None] = mapped_column(Text, nullable=True)
    # detected pricing keywords
    pricing_signals: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # length of normalized text
    raw_text_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# --------------------------------------------------------------------------- #
# Watch diffs
# --------------------------------------------------------------------------- #
class WatchDiff(Base, UUIDMixin, TimestampMixin):
    """A classified diff between two consecutive snapshots of a target."""

    __tablename__ = "watch_diffs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("watch_targets.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    old_snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("watch_snapshots.id", ondelete="SET NULL"),
        nullable=True,
    )
    new_snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("watch_snapshots.id", ondelete="SET NULL"),
        nullable=True,
    )
    # price_change | content_change | new_page | structure_change | seo_change
    classification: Mapped[str] = mapped_column(String(40), default="content_change", nullable=False)
    # LLM or deterministic summary of what changed
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    # structured diff details (added/removed h1s, title diff, etc.)
    detail: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # low | medium | high
    importance: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
