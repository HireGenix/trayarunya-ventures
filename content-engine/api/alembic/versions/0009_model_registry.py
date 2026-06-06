"""model registry table

Adds the ``model_registry`` table — the single source of truth for every LLM the
platform can use. Seeded from env on startup and manageable by a superadmin.

Revision ID: 0009_model_registry
Revises: 0008_cro_agent
Create Date: 2026-06-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009_model_registry"
down_revision: Union[str, None] = "0008_cro_agent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "model_registry",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.String(length=30), nullable=False),
        sa.Column("endpoint", sa.String(length=1000), nullable=True),
        sa.Column("api_key_encrypted", sa.Text(), nullable=True),
        sa.Column("model_name", sa.String(length=120), nullable=False),
        sa.Column("api_version", sa.String(length=40), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
        sa.UniqueConstraint("key", name="uq_model_registry_key"),
    )
    op.create_index("ix_model_registry_key", "model_registry", ["key"])


def downgrade() -> None:
    op.drop_index("ix_model_registry_key", table_name="model_registry")
    op.drop_table("model_registry")
