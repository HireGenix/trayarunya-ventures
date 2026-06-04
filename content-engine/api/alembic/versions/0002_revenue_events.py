"""revenue attribution events table

Revision ID: 0002_revenue_events
Revises: 0001_baseline
Create Date: 2025-06-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_revenue_events"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "revenue_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_ref", sa.String(length=200), nullable=False),
        sa.Column("channel", sa.String(length=30), nullable=False),
        sa.Column("campaign", sa.String(length=200), nullable=True),
        sa.Column("stage", sa.String(length=20), nullable=False),
        sa.Column("value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cost", sa.Float(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("external_id", sa.String(length=200), nullable=True),
        sa.Column("source", sa.String(length=60), nullable=True),
        sa.Column("meta", postgresql.JSONB(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_revenue_events_workspace_id", "revenue_events", ["workspace_id"])
    op.create_index("ix_revenue_events_contact_ref", "revenue_events", ["contact_ref"])
    op.create_index("ix_revenue_events_channel", "revenue_events", ["channel"])
    op.create_index("ix_revenue_events_campaign", "revenue_events", ["campaign"])
    op.create_index("ix_revenue_events_stage", "revenue_events", ["stage"])
    op.create_index("ix_revenue_events_occurred_at", "revenue_events", ["occurred_at"])


def downgrade() -> None:
    op.drop_table("revenue_events")
