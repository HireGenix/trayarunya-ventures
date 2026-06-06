"""ads write: launch columns on campaigns table.

Adds ``launch_error``, ``platform_status`` and ``launched_at`` columns to the
``campaigns`` table to track real platform launch state.

Revision ID: 0025_ads_write
Revises: 0021_watchtower_enterprise
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0025_ads_write"
down_revision: Union[str, None] = "0021_watchtower_enterprise"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "campaigns", "launch_error"):
        op.add_column("campaigns", sa.Column("launch_error", sa.Text(), nullable=True))

    if not _has_column(bind, "campaigns", "platform_status"):
        op.add_column("campaigns", sa.Column("platform_status", sa.String(60), nullable=True))

    if not _has_column(bind, "campaigns", "launched_at"):
        op.add_column(
            "campaigns",
            sa.Column("launched_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("campaigns", "launched_at")
    op.drop_column("campaigns", "platform_status")
    op.drop_column("campaigns", "launch_error")
