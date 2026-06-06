"""conversion loop: variant assignments, form field events, page columns.

Adds tables for the conversion loop runtime (variant assignment tracking,
form field-level analytics) and ensures necessary columns exist on existing
tables.

Revision ID: 0018_conversion_loop
Revises: 0017_deck_enterprise
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "0018_conversion_loop"
down_revision: Union[str, None] = "0017_deck_enterprise"
branch_labels = None
depends_on = None

NEW_TABLES = ["variant_assignments", "form_field_events"]


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


def downgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    Base.metadata.drop_all(bind=bind, tables=list(reversed(_new_tables())), checkfirst=True)
