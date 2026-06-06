"""influencers enterprise: scoring, fraud, ROI columns.

Adds enterprise columns to ``influencer_creators`` (avg_likes, avg_comments,
avg_views, quality_score, fraud_risk, fraud_flags, tier) and ROI tracking
columns to ``influencer_campaigns`` (spend, impressions, clicks, conversions).

Revision ID: 0023_influencers_enterprise
Revises: 0022_reputation_enterprise
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0023_influencers_enterprise"
down_revision: Union[str, None] = "0022_reputation_enterprise"
branch_labels = None
depends_on = None


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    # Creator enterprise columns
    for col_name, col_type in (
        ("avg_likes", sa.Integer()),
        ("avg_comments", sa.Integer()),
        ("avg_views", sa.Integer()),
        ("quality_score", sa.Float()),
        ("fraud_risk", sa.Float()),
        ("fraud_flags", JSONB()),
        ("tier", sa.String(10)),
    ):
        if not _has_column(bind, "influencer_creators", col_name):
            op.add_column("influencer_creators", sa.Column(col_name, col_type, nullable=True))

    # Campaign ROI columns
    for col_name, col_type in (
        ("spend", sa.Float()),
        ("impressions", sa.Integer()),
        ("clicks", sa.Integer()),
        ("conversions", sa.Integer()),
    ):
        if not _has_column(bind, "influencer_campaigns", col_name):
            op.add_column("influencer_campaigns", sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    for col in ("avg_likes", "avg_comments", "avg_views", "quality_score", "fraud_risk", "fraud_flags", "tier"):
        op.drop_column("influencer_creators", col)
    for col in ("spend", "impressions", "clicks", "conversions"):
        op.drop_column("influencer_campaigns", col)
