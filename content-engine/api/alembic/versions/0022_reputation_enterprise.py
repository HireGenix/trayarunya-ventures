"""reputation enterprise: sentiment_score & themes on reviews.

Adds ``sentiment_score`` (Float, 0-1 numeric sentiment) and ``themes``
(JSONB, list of extracted topic strings) to ``reputation_reviews`` so the
enterprise analytics pipeline can store per-review sentiment scoring and
topic extraction results.

Revision ID: 0022_reputation_enterprise
Revises: 0021_abm_enterprise
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0022_reputation_enterprise"
down_revision: Union[str, None] = "0021_abm_enterprise"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "reputation_reviews", "sentiment_score"):
        op.add_column(
            "reputation_reviews",
            sa.Column("sentiment_score", sa.Float(), nullable=True),
        )
    if not _has_column(bind, "reputation_reviews", "themes"):
        op.add_column(
            "reputation_reviews",
            sa.Column("themes", JSONB(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("reputation_reviews", "themes")
    op.drop_column("reputation_reviews", "sentiment_score")
