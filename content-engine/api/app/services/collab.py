"""Workflow collaboration helpers: audit logging + version snapshots.

Thin helpers reused by ``app.routers.collab``. These functions ``add`` rows to
the session and ``flush`` so generated ids/defaults are available, but they do
**not** commit — the router owns the transaction (matching ``app.db.get_db``
which commits on a clean exit).
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import WorkspaceContext
from app.models import AuditLog, ContentItem, ContentVersion


def _actor_name(ctx: WorkspaceContext) -> str | None:
    user = ctx.user
    return getattr(user, "full_name", None) or getattr(user, "email", None)


async def record_audit(
    db: AsyncSession,
    ctx: WorkspaceContext,
    action: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    meta: dict[str, Any] | None = None,
) -> AuditLog:
    """Append an :class:`AuditLog` entry for the current workspace/actor."""
    entry = AuditLog(
        workspace_id=ctx.workspace.id,
        actor_id=ctx.user.id,
        actor_name=_actor_name(ctx),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        meta=meta,
    )
    db.add(entry)
    await db.flush()
    return entry


async def snapshot_version(
    db: AsyncSession,
    ws_id: uuid.UUID,
    item: ContentItem,
    note: str | None,
    author_name: str | None,
) -> ContentVersion:
    """Snapshot ``item``'s current title/body/variants into a new version.

    The version number auto-increments from the highest existing version for
    the content item (starting at 1).
    """
    last = (
        await db.execute(
            select(ContentVersion.version)
            .where(ContentVersion.content_item_id == item.id)
            .order_by(ContentVersion.version.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    next_version = (last or 0) + 1

    version = ContentVersion(
        workspace_id=ws_id,
        content_item_id=item.id,
        version=next_version,
        title=item.title,
        body=item.body,
        variants=item.variants,
        author_name=author_name,
        note=note,
    )
    db.add(version)
    await db.flush()
    return version
