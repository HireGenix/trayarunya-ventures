"""ABM enterprise: fit/intent scoring, play orchestration, enrollment.

Adds three new tables (``abm_plays``, ``abm_play_steps``,
``abm_play_enrollments``) and three new columns on ``abm_accounts``
(``fit_score``, ``intent_score``, ``fit_factors``).

All scores are deterministic: ICP-fit from real account attributes vs
workspace ICP, intent from real conversion/email/funnel signals.

Revision ID: 0021_abm_enterprise
Revises: 0020_seo_god_tier
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0021_abm_enterprise"
down_revision: Union[str, None] = "0022_email_god_tier"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    # ── New columns on abm_accounts ──────────────────────────────────────
    if not _has_column(bind, "abm_accounts", "fit_score"):
        op.add_column("abm_accounts", sa.Column("fit_score", sa.Float(), nullable=True))
    if not _has_column(bind, "abm_accounts", "intent_score"):
        op.add_column("abm_accounts", sa.Column("intent_score", sa.Float(), nullable=True))
    if not _has_column(bind, "abm_accounts", "fit_factors"):
        op.add_column("abm_accounts", sa.Column("fit_factors", JSONB(), nullable=True))

    # ── abm_plays ────────────────────────────────────────────────────────
    op.create_table(
        "abm_plays",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("step_summary", JSONB(), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_abm_plays_workspace_id", "abm_plays", ["workspace_id"])
    op.create_index("ix_abm_plays_status", "abm_plays", ["status"])

    # ── abm_play_steps ───────────────────────────────────────────────────
    op.create_table(
        "abm_play_steps",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("play_id", UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("ordinal", sa.Integer(), server_default="0", nullable=False),
        sa.Column("channel", sa.String(40), nullable=False),
        sa.Column("subject", sa.String(400), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("delay_days", sa.Integer(), server_default="0", nullable=False),
        sa.Column("config", JSONB(), nullable=True),
        sa.ForeignKeyConstraint(["play_id"], ["abm_plays.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_abm_play_steps_play_id", "abm_play_steps", ["play_id"])
    op.create_index("ix_abm_play_steps_workspace_id", "abm_play_steps", ["workspace_id"])

    # ── abm_play_enrollments ─────────────────────────────────────────────
    op.create_table(
        "abm_play_enrollments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("play_id", UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", UUID(as_uuid=True), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("current_step", sa.Integer(), server_default="0", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta", JSONB(), nullable=True),
        sa.ForeignKeyConstraint(["play_id"], ["abm_plays.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["abm_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_abm_play_enrollments_play_id", "abm_play_enrollments", ["play_id"])
    op.create_index("ix_abm_play_enrollments_account_id", "abm_play_enrollments", ["account_id"])
    op.create_index("ix_abm_play_enrollments_workspace_id", "abm_play_enrollments", ["workspace_id"])
    op.create_index("ix_abm_play_enrollments_status", "abm_play_enrollments", ["status"])


def downgrade() -> None:
    op.drop_table("abm_play_enrollments")
    op.drop_table("abm_play_steps")
    op.drop_table("abm_plays")
    op.drop_column("abm_accounts", "fit_factors")
    op.drop_column("abm_accounts", "intent_score")
    op.drop_column("abm_accounts", "fit_score")
