"""conversion telemetry events table (CRO foundation)

Revision ID: 0007_conversion_events
Revises: 0006_linkedin_platform
Create Date: 2026-06-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007_conversion_events"
down_revision: Union[str, None] = "0006_linkedin_platform"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversion_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("anon_id", sa.String(length=120), nullable=False),
        sa.Column("contact_ref", sa.String(length=200), nullable=True),
        sa.Column("session_id", sa.String(length=120), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("step", sa.String(length=60), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("referrer", sa.Text(), nullable=True),
        sa.Column("device", sa.String(length=40), nullable=True),
        sa.Column("experiment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("variant_id", sa.String(length=120), nullable=True),
        sa.Column("campaign", sa.String(length=200), nullable=True),
        sa.Column("utm_source", sa.String(length=120), nullable=True),
        sa.Column("utm_medium", sa.String(length=120), nullable=True),
        sa.Column("value", sa.Float(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column("source", sa.String(length=60), nullable=True),
        sa.Column("meta", postgresql.JSONB(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_conversion_events_workspace_id", "conversion_events", ["workspace_id"])
    op.create_index("ix_conversion_events_anon_id", "conversion_events", ["anon_id"])
    op.create_index("ix_conversion_events_contact_ref", "conversion_events", ["contact_ref"])
    op.create_index("ix_conversion_events_session_id", "conversion_events", ["session_id"])
    op.create_index("ix_conversion_events_event_type", "conversion_events", ["event_type"])
    op.create_index("ix_conversion_events_experiment_id", "conversion_events", ["experiment_id"])
    op.create_index("ix_conversion_events_variant_id", "conversion_events", ["variant_id"])
    op.create_index("ix_conversion_events_campaign", "conversion_events", ["campaign"])
    op.create_index("ix_conversion_events_occurred_at", "conversion_events", ["occurred_at"])


def downgrade() -> None:
    op.drop_table("conversion_events")
