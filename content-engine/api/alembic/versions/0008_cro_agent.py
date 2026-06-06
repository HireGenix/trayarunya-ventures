"""CRO agent tables + experiment surface (Phase 2/3)

Revision ID: 0008_cro_agent
Revises: 0007_conversion_events
Create Date: 2026-06-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0008_cro_agent"
down_revision: Union[str, None] = "0007_conversion_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Generalize experiments beyond content.
    op.add_column(
        "experiments",
        sa.Column("surface", sa.String(length=30), nullable=False, server_default="content"),
    )
    op.create_index("ix_experiments_surface", "experiments", ["surface"])

    op.create_table(
        "cro_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("autonomy", sa.String(length=20), nullable=False, server_default="suggest"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("min_visitors", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("max_active_experiments", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("workspace_id", name="uq_cro_settings_workspace"),
    )
    op.create_index("ix_cro_settings_workspace_id", "cro_settings", ["workspace_id"])

    op.create_table(
        "cro_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(length=30), nullable=False, server_default="insight"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="suggested"),
        sa.Column("priority", sa.String(length=10), nullable=False, server_default="medium"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("expected_lift_pct", sa.Float(), nullable=True),
        sa.Column("expected_revenue", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("target_stage", sa.String(length=60), nullable=True),
        sa.Column("experiment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("dedupe_key", sa.String(length=200), nullable=True),
        sa.Column("auto_executed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("meta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("acted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_cro_actions_workspace_id", "cro_actions", ["workspace_id"])
    op.create_index("ix_cro_actions_status", "cro_actions", ["status"])
    op.create_index("ix_cro_actions_experiment_id", "cro_actions", ["experiment_id"])
    op.create_index("ix_cro_actions_dedupe_key", "cro_actions", ["dedupe_key"])


def downgrade() -> None:
    op.drop_table("cro_actions")
    op.drop_table("cro_settings")
    op.drop_index("ix_experiments_surface", table_name="experiments")
    op.drop_column("experiments", "surface")
