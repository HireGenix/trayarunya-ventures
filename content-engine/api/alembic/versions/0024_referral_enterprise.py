"""referral enterprise: reward tiers, advocate rewards, fraud flags + fraud columns.

Adds three new workspace-scoped referral tables (``referral_reward_tiers``,
``referral_advocate_rewards``, ``referral_fraud_flags``) plus a fraud-score
column on ``referral_advocates`` and fraud / request-metadata columns on
``referral_conversions``.

Revision ID: 0024_referral_enterprise
Revises: 0023_influencers_enterprise
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0024_referral_enterprise"
down_revision: Union[str, None] = "0023_influencers_enterprise"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    op.create_table(
        "referral_reward_tiers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("program_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("milestone", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reward_type", sa.String(length=40), nullable=False, server_default="cash"),
        sa.Column("reward_value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="active"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["program_id"], ["referral_programs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_referral_reward_tiers_workspace_id", "referral_reward_tiers", ["workspace_id"])
    op.create_index("ix_referral_reward_tiers_program_id", "referral_reward_tiers", ["program_id"])

    op.create_table(
        "referral_advocate_rewards",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("advocate_id", UUID(as_uuid=True), nullable=False),
        sa.Column("tier_id", UUID(as_uuid=True), nullable=True),
        sa.Column("reward_type", sa.String(length=40), nullable=False, server_default="cash"),
        sa.Column("reward_value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="pending"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["advocate_id"], ["referral_advocates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tier_id"], ["referral_reward_tiers.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_referral_advocate_rewards_workspace_id", "referral_advocate_rewards", ["workspace_id"])
    op.create_index("ix_referral_advocate_rewards_advocate_id", "referral_advocate_rewards", ["advocate_id"])
    op.create_index("ix_referral_advocate_rewards_tier_id", "referral_advocate_rewards", ["tier_id"])

    op.create_table(
        "referral_fraud_flags",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", UUID(as_uuid=True), nullable=False),
        sa.Column("advocate_id", UUID(as_uuid=True), nullable=True),
        sa.Column("conversion_id", UUID(as_uuid=True), nullable=True),
        sa.Column("flag_type", sa.String(length=60), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("details", JSONB(), nullable=True),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("resolved_by", sa.String(length=200), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["advocate_id"], ["referral_advocates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversion_id"], ["referral_conversions.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_referral_fraud_flags_workspace_id", "referral_fraud_flags", ["workspace_id"])
    op.create_index("ix_referral_fraud_flags_advocate_id", "referral_fraud_flags", ["advocate_id"])
    op.create_index("ix_referral_fraud_flags_conversion_id", "referral_fraud_flags", ["conversion_id"])

    if not _has_column(bind, "referral_advocates", "fraud_score"):
        op.add_column("referral_advocates", sa.Column("fraud_score", sa.Float(), nullable=True))

    if not _has_column(bind, "referral_conversions", "fraud_flags"):
        op.add_column("referral_conversions", sa.Column("fraud_flags", JSONB(), nullable=True))

    if not _has_column(bind, "referral_conversions", "ip_address"):
        op.add_column("referral_conversions", sa.Column("ip_address", sa.String(length=45), nullable=True))

    if not _has_column(bind, "referral_conversions", "user_agent"):
        op.add_column("referral_conversions", sa.Column("user_agent", sa.String(length=500), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column(bind, "referral_conversions", "user_agent"):
        op.drop_column("referral_conversions", "user_agent")

    if _has_column(bind, "referral_conversions", "ip_address"):
        op.drop_column("referral_conversions", "ip_address")

    if _has_column(bind, "referral_conversions", "fraud_flags"):
        op.drop_column("referral_conversions", "fraud_flags")

    if _has_column(bind, "referral_advocates", "fraud_score"):
        op.drop_column("referral_advocates", "fraud_score")

    op.drop_index("ix_referral_fraud_flags_conversion_id", table_name="referral_fraud_flags")
    op.drop_index("ix_referral_fraud_flags_advocate_id", table_name="referral_fraud_flags")
    op.drop_index("ix_referral_fraud_flags_workspace_id", table_name="referral_fraud_flags")
    op.drop_table("referral_fraud_flags")

    op.drop_index("ix_referral_advocate_rewards_tier_id", table_name="referral_advocate_rewards")
    op.drop_index("ix_referral_advocate_rewards_advocate_id", table_name="referral_advocate_rewards")
    op.drop_index("ix_referral_advocate_rewards_workspace_id", table_name="referral_advocate_rewards")
    op.drop_table("referral_advocate_rewards")

    op.drop_index("ix_referral_reward_tiers_program_id", table_name="referral_reward_tiers")
    op.drop_index("ix_referral_reward_tiers_workspace_id", table_name="referral_reward_tiers")
    op.drop_table("referral_reward_tiers")
