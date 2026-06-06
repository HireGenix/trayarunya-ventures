"""deck enterprise: charts, themes, collaboration, async generation.

Adds DeckComment, DeckVersion tables and share columns on decks.

Revision ID: 0017_deck_enterprise
Revises: 0016_content_optimization
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017_deck_enterprise"
down_revision: Union[str, None] = "0016"
branch_labels = None
depends_on = None

NEW_TABLES = ["deck_comments", "deck_versions"]


def _new_tables() -> list:
    import app.models  # noqa: F401
    from app.models.base import Base

    return [
        Base.metadata.tables[name]
        for name in NEW_TABLES
        if name in Base.metadata.tables
    ]


def upgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    Base.metadata.create_all(bind=bind, tables=_new_tables(), checkfirst=True)

    # Share columns on existing decks table
    with op.batch_alter_table("decks") as batch_op:
        batch_op.add_column(sa.Column("share_token", sa.String(64), unique=True, nullable=True, index=True))
        batch_op.add_column(sa.Column("share_enabled", sa.Boolean(), server_default="false", nullable=False))
        batch_op.add_column(sa.Column("expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    with op.batch_alter_table("decks") as batch_op:
        batch_op.drop_column("share_token")
        batch_op.drop_column("share_enabled")
        batch_op.drop_column("expires_at")

    Base.metadata.drop_all(bind=bind, tables=list(reversed(_new_tables())), checkfirst=True)
