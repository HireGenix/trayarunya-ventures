"""Test fixtures. DB-backed tests are skipped automatically when no test
database is reachable, so the core suite runs anywhere (CI without Postgres)."""
from __future__ import annotations

import asyncio

import pytest


def _db_available() -> bool:
    try:
        from sqlalchemy import text

        from app.db import engine

        async def _ping() -> bool:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return True

        return asyncio.get_event_loop().run_until_complete(_ping())
    except Exception:
        return False


@pytest.fixture(scope="session")
def db_available() -> bool:
    return _db_available()


requires_db = pytest.mark.skipif(
    not _db_available(), reason="No test database reachable"
)
