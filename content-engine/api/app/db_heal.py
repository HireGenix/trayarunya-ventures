"""Idempotent, additive-only schema reconciliation ("auto-heal").

Why this exists
---------------
The baseline migration (``0001_baseline``) builds the *entire* current schema via
``Base.metadata.create_all``. Later migrations (0002+) *also* ``create_table`` /
``add_column`` the same objects. That means an existing database stamped at an
old alembic revision cannot ``alembic upgrade head`` cleanly — the first
``CREATE TABLE`` for an already-existing table raises ``DuplicateTable`` and the
whole upgrade aborts, so genuinely new ``ADD COLUMN`` migrations further down the
chain never run. The symptom is production 500s from queries referencing columns
that exist in the ORM models but not in the drifted database.

This module reconciles such drift safely:

* It compares ``Base.metadata`` (the source of truth = current ORM models)
  against the live database.
* It **creates any missing tables** (``checkfirst=True``) and **adds any missing
  columns** (``ADD COLUMN IF NOT EXISTS``, always nullable so it never fails on
  populated tables).
* It is strictly **additive** — it never drops or alters existing tables/columns,
  so it is safe to run on every startup.

Run standalone with ``python -m app.db_heal``.
"""
from __future__ import annotations

import asyncio

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

import app.models  # noqa: F401 — register every model on Base.metadata
from app.db import engine
from app.models.base import Base


def _column_ddl(table_name: str, column, dialect) -> str:
    """Build an additive, populated-table-safe ``ADD COLUMN`` statement."""
    col_type = column.type.compile(dialect=dialect)
    ddl = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{column.name}" {col_type}'

    server_default = column.server_default
    if server_default is not None and getattr(server_default, "arg", None) is not None:
        arg = server_default.arg
        default_sql = arg.text if hasattr(arg, "text") else str(arg)
        ddl += f" DEFAULT {default_sql}"

    # Intentionally left NULLable even when the model marks the column NOT NULL:
    # adding a NOT NULL column without a default to a table that already has rows
    # would fail. Existence is what prevents the runtime 500s; nullability drift
    # is acceptable and can be tightened by a real migration later.
    return ddl


def _sync_heal(conn: Connection) -> list[str]:
    changes: list[str] = []
    dialect = conn.dialect

    inspector = inspect(conn)
    existing_tables = set(inspector.get_table_names())

    # 1) Create any missing tables (additive; checkfirst guards races).
    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            table.create(bind=conn, checkfirst=True)
            changes.append(f"created table {table.name}")

    # 2) Add any missing columns on tables that exist.
    inspector = inspect(conn)  # refresh after table creation
    existing_tables = set(inspector.get_table_names())
    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue
        existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing_cols:
                continue
            conn.execute(text(_column_ddl(table.name, column, dialect)))
            changes.append(f"added column {table.name}.{column.name}")

    return changes


async def heal() -> list[str]:
    """Reconcile schema drift. Returns the list of changes applied."""
    async with engine.begin() as conn:
        changes = await conn.run_sync(_sync_heal)
    return changes


def main() -> None:
    changes = asyncio.run(heal())
    if changes:
        print(f"[db-heal] applied {len(changes)} schema fix(es):")
        for change in changes:
            print(f"[db-heal]   - {change}")
    else:
        print("[db-heal] schema already in sync — no changes.")


if __name__ == "__main__":
    main()
