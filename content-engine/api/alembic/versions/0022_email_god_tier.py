"""email god tier: templates, segments, suppressions + campaign/log/subscriber columns.

Adds the enterprise email marketing surface:

* ``email_templates`` — reusable, block-based designs (starter gallery + owned).
* ``email_segments`` — saved, rule-driven audiences resolved at send time.
* ``email_suppressions`` — global do-not-send list (bounces, complaints, blocks).

Plus new columns on existing tables:

* ``email_campaigns.segment_id`` — optional dynamic audience (FK SET NULL).
* ``email_send_logs.clicked_url`` — the specific URL a recipient clicked.
* ``email_subscribers.confirm_token`` — double opt-in confirmation token.

The ``email_subscribers.status`` vocabulary now also allows ``"pending"`` for
double opt-in; the column itself is unchanged (the model default still applies),
so no ALTER DEFAULT is performed here.

Revision ID: 0022_email_god_tier
Revises: 0021_content_god_tier
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0022_email_god_tier"
down_revision: Union[str, None] = "0021_content_god_tier"
branch_labels = None
depends_on = None

NEW_TABLES = ["email_templates", "email_segments", "email_suppressions"]


def _new_tables() -> list:
    import app.models  # noqa: F401
    from app.models.base import Base

    return [
        Base.metadata.tables[name]
        for name in NEW_TABLES
        if name in Base.metadata.tables
    ]


def _has_column(bind, table: str, column: str) -> bool:
    insp = sa.inspect(bind)
    return column in {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    Base.metadata.create_all(bind=bind, tables=_new_tables(), checkfirst=True)

    if not _has_column(bind, "email_campaigns", "segment_id"):
        op.add_column(
            "email_campaigns",
            sa.Column("segment_id", UUID(as_uuid=True), nullable=True),
        )
        op.create_index(
            "ix_email_campaigns_segment_id", "email_campaigns", ["segment_id"]
        )
        op.create_foreign_key(
            "fk_email_campaigns_segment_id",
            "email_campaigns",
            "email_segments",
            ["segment_id"],
            ["id"],
            ondelete="SET NULL",
        )

    if not _has_column(bind, "email_send_logs", "clicked_url"):
        op.add_column(
            "email_send_logs",
            sa.Column("clicked_url", sa.String(length=2000), nullable=True),
        )

    if not _has_column(bind, "email_subscribers", "confirm_token"):
        op.add_column(
            "email_subscribers",
            sa.Column("confirm_token", sa.String(length=200), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    if _has_column(bind, "email_subscribers", "confirm_token"):
        op.drop_column("email_subscribers", "confirm_token")

    if _has_column(bind, "email_send_logs", "clicked_url"):
        op.drop_column("email_send_logs", "clicked_url")

    if _has_column(bind, "email_campaigns", "segment_id"):
        op.drop_constraint(
            "fk_email_campaigns_segment_id", "email_campaigns", type_="foreignkey"
        )
        op.drop_index("ix_email_campaigns_segment_id", table_name="email_campaigns")
        op.drop_column("email_campaigns", "segment_id")

    Base.metadata.drop_all(bind=bind, tables=list(reversed(_new_tables())), checkfirst=True)
