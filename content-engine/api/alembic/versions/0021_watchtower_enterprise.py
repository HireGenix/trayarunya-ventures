"""watchtower enterprise: multi-target competitor monitoring with snapshot/diff tracking.

Adds three workspace-scoped tables (``watch_targets``, ``watch_snapshots``,
``watch_diffs``) that power the enterprise watchtower: each competitor watch can
track many target URLs, capture point-in-time content snapshots, and record
classified diffs between consecutive snapshots. Also adds a ``monitoring_status``
column to ``competitor_watches`` to surface the overall monitoring state. All
data stored here is derived from real fetched page content — never fabricated.

Revision ID: 0021_watchtower_enterprise
Revises: 0020_seo_god_tier
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0021_watchtower_enterprise"
down_revision: Union[str, None] = "0024_referral_enterprise"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    op.create_table(
        "watch_targets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("watch_id", UUID(as_uuid=True), nullable=False),
        sa.Column("url", sa.String(length=1000), nullable=False),
        sa.Column("label", sa.String(length=300), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("check_interval_seconds", sa.Integer(), nullable=False, server_default="86400"),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="'awaiting_baseline'"),
        sa.Column("last_content_hash", sa.String(length=128), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["watch_id"], ["competitor_watches.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_watch_targets_workspace_id", "watch_targets", ["workspace_id"])
    op.create_index("ix_watch_targets_watch_id", "watch_targets", ["watch_id"])

    op.create_table(
        "watch_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("content_hash", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("meta_description", sa.Text(), nullable=True),
        sa.Column("h1s", JSONB(), nullable=True),
        sa.Column("headline", sa.Text(), nullable=True),
        sa.Column("pricing_signals", JSONB(), nullable=True),
        sa.Column("raw_text_length", sa.Integer(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["watch_targets.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_watch_snapshots_workspace_id", "watch_snapshots", ["workspace_id"])
    op.create_index("ix_watch_snapshots_target_id", "watch_snapshots", ["target_id"])

    op.create_table(
        "watch_diffs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("target_id", UUID(as_uuid=True), nullable=False),
        sa.Column("old_snapshot_id", UUID(as_uuid=True), nullable=True),
        sa.Column("new_snapshot_id", UUID(as_uuid=True), nullable=True),
        sa.Column("classification", sa.String(length=40), nullable=False, server_default="'content_change'"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("detail", JSONB(), nullable=True),
        sa.Column("importance", sa.String(length=20), nullable=False, server_default="'medium'"),
        sa.Column("detected_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_id"], ["watch_targets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["old_snapshot_id"], ["watch_snapshots.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["new_snapshot_id"], ["watch_snapshots.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_watch_diffs_workspace_id", "watch_diffs", ["workspace_id"])
    op.create_index("ix_watch_diffs_target_id", "watch_diffs", ["target_id"])

    if not _has_column(bind, "competitor_watches", "monitoring_status"):
        op.add_column(
            "competitor_watches",
            sa.Column("monitoring_status", sa.String(length=40), nullable=True, server_default="'idle'"),
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column(bind, "competitor_watches", "monitoring_status"):
        op.drop_column("competitor_watches", "monitoring_status")

    op.drop_index("ix_watch_diffs_target_id", table_name="watch_diffs")
    op.drop_index("ix_watch_diffs_workspace_id", table_name="watch_diffs")
    op.drop_table("watch_diffs")

    op.drop_index("ix_watch_snapshots_target_id", table_name="watch_snapshots")
    op.drop_index("ix_watch_snapshots_workspace_id", table_name="watch_snapshots")
    op.drop_table("watch_snapshots")

    op.drop_index("ix_watch_targets_watch_id", table_name="watch_targets")
    op.drop_index("ix_watch_targets_workspace_id", table_name="watch_targets")
    op.drop_table("watch_targets")
