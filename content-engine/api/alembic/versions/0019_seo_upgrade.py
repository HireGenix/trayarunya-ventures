"""seo upgrade: site crawl audits table + keyword SERP signal columns.

Adds the ``seo_site_crawl_audits`` table (full-site background audits) and the
new SERP-derived signal columns on ``seo_keywords`` (difficulty, volume_proxy,
metrics). All numbers stored here are transparent proxies computed from real
SERP/crawl data — never fabricated provider metrics.

Revision ID: 0019_seo_upgrade
Revises: 0018_conversion_loop
"""
from __future__ import annotations

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0019_seo_upgrade"
down_revision: Union[str, None] = "0018_conversion_loop"
branch_labels = None
depends_on = None

NEW_TABLES = ["seo_site_crawl_audits"]

# New columns on the existing seo_keywords table (name -> type factory).
_KEYWORD_COLUMNS = {
    "difficulty": lambda: sa.Integer(),
    "volume_proxy": lambda: sa.Integer(),
    "metrics": lambda: JSONB(),
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

    for name, type_factory in _KEYWORD_COLUMNS.items():
        if not _has_column(bind, "seo_keywords", name):
            op.add_column("seo_keywords", sa.Column(name, type_factory(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    from app.models.base import Base

    for name in _KEYWORD_COLUMNS:
        if _has_column(bind, "seo_keywords", name):
            op.drop_column("seo_keywords", name)

    Base.metadata.drop_all(bind=bind, tables=list(reversed(_new_tables())), checkfirst=True)
