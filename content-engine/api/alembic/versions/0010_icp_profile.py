"""icp_profiles table

Per-workspace Ideal Customer Profile captured via the discovery chat and used to
ground research, strategy and calendar generation.

Revision ID: 0010_icp_profile
Revises: 0009_model_registry
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0010_icp_profile"
down_revision: Union[str, None] = "0009_model_registry"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "icp_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("segment", sa.String(length=10), nullable=True),
        sa.Column("industry", sa.String(length=200), nullable=True),
        sa.Column("company_name", sa.String(length=300), nullable=True),
        sa.Column("website", sa.String(length=500), nullable=True),
        sa.Column("company_summary", sa.Text(), nullable=True),
        sa.Column("value_prop", sa.Text(), nullable=True),
        sa.Column("offer", sa.Text(), nullable=True),
        sa.Column("target_customer", sa.Text(), nullable=True),
        sa.Column("brand_voice", sa.Text(), nullable=True),
        sa.Column("personas", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("pains", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("goals", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("geographies", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("channels", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("keywords", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("competitors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("b2b", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("completeness", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("raw", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("workspace_id", name="uq_icp_profiles_workspace"),
    )
    op.create_index("ix_icp_profiles_workspace_id", "icp_profiles", ["workspace_id"])


def downgrade() -> None:
    op.drop_index("ix_icp_profiles_workspace_id", table_name="icp_profiles")
    op.drop_table("icp_profiles")
