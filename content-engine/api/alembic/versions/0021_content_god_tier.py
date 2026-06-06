"""content god tier: scheduled_at column on content_items.

Adds a nullable ``scheduled_at`` (timezone-aware DateTime) column to
``content_items`` so creation-studio content can carry a first-class publish
time. The ``meta`` JSONB column already exists and continues to hold the
slug/visibility/exclusive/allow_likes settings — no schema change needed there.

Revision ID: 0021_content_god_tier
Revises: 0020_seo_god_tier
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021_content_god_tier"
down_revision: Union[str, None] = "0020_seo_god_tier"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "content_items", "scheduled_at"):
        op.add_column(
            "content_items",
            sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column(bind, "content_items", "scheduled_at"):
        op.drop_column("content_items", "scheduled_at")
