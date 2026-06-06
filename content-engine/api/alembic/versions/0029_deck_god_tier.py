"""deck god tier: share analytics, lead capture, presenter notes.

Adds:
* ``deck_views`` — per-session analytics from the public share beacon.
* ``deck_slide_views`` — per-slide engagement from heartbeat beacon.
* ``decks.require_email`` — gate shared decks behind email capture.
* ``decks.password_hash`` — optional password protection on shared links.

All analytics are from REAL recorded beacon events — never fabricated.

Revision ID: 0029_deck_god_tier
Revises: 0028_social_inbox
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0029_deck_god_tier"
down_revision: Union[str, None] = "0028_social_inbox"
branch_labels = None
depends_on = None

NEW_TABLES = ["deck_views", "deck_slide_views"]

_DECK_COLUMNS = {
    "require_email": lambda: sa.Boolean(),
    "password_hash": lambda: sa.String(128),
}


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

    for name, type_factory in _DECK_COLUMNS.items():
        if not _has_column(bind, "decks", name):
            op.add_column("decks", sa.Column(name, type_factory(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    for name in _DECK_COLUMNS:
        if _has_column(bind, "decks", name):
            op.drop_column("decks", name)

    Base.metadata.drop_all(bind=bind, tables=list(reversed(_new_tables())), checkfirst=True)
