"""linkedin growth copilot

Revision ID: 0005_linkedin_growth
Revises: 0004_automation
Create Date: 2026-06-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005_linkedin_growth"
down_revision: Union[str, None] = "0004_automation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _ts_cols() -> list:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "linkedin_growth_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("account_label", sa.String(length=200), nullable=False),
        sa.Column("profile_url", sa.String(length=600), nullable=True),
        sa.Column("objective", sa.String(length=120), nullable=False, server_default="high_ticket_leads"),
        sa.Column("icp", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("offer", sa.Text(), nullable=True),
        sa.Column("voice", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("latest_score", sa.Float(), nullable=True),
        sa.Column("latest_grade", sa.String(length=20), nullable=True),
        sa.Column("latest_audit", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("latest_audit_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_growth_profiles_workspace_id", "linkedin_growth_profiles", ["workspace_id"])
    op.create_index("ix_linkedin_growth_profiles_status", "linkedin_growth_profiles", ["status"])

    op.create_table(
        "linkedin_profile_audits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_name", sa.String(length=200), nullable=True),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("objective_context", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("grade", sa.String(length=20), nullable=False, server_default="needs_work"),
        sa.Column("findings", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("recommendations", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("drafts", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("compliance", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profile_id"], ["linkedin_growth_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_profile_audits_workspace_id", "linkedin_profile_audits", ["workspace_id"])
    op.create_index("ix_linkedin_profile_audits_profile_id", "linkedin_profile_audits", ["profile_id"])

    op.create_table(
        "linkedin_action_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        *_ts_cols(),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("audit_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("section", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("suggested_copy", sa.Text(), nullable=True),
        sa.Column("policy_note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["profile_id"], ["linkedin_growth_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["audit_id"], ["linkedin_profile_audits.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_linkedin_action_items_workspace_id", "linkedin_action_items", ["workspace_id"])
    op.create_index("ix_linkedin_action_items_profile_id", "linkedin_action_items", ["profile_id"])
    op.create_index("ix_linkedin_action_items_audit_id", "linkedin_action_items", ["audit_id"])
    op.create_index("ix_linkedin_action_items_section", "linkedin_action_items", ["section"])
    op.create_index("ix_linkedin_action_items_priority", "linkedin_action_items", ["priority"])
    op.create_index("ix_linkedin_action_items_status", "linkedin_action_items", ["status"])


def downgrade() -> None:
    op.drop_table("linkedin_action_items")
    op.drop_table("linkedin_profile_audits")
    op.drop_table("linkedin_growth_profiles")
