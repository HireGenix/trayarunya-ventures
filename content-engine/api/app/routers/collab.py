"""Workflow collaboration routes: comments, approvals, version history, audit.

Thin router — audit logging and version snapshots live in
``app.services.collab``. The router owns the transaction (commit/refresh).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import (
    Approval,
    AuditLog,
    Comment,
    ContentItem,
    ContentVersion,
)
from app.services.collab import record_audit, snapshot_version

router = APIRouter(prefix="/collab", tags=["collab"])

_VALID_ENTITY_TYPES = {"content", "strategy", "campaign", "abm"}
_VALID_APPROVAL_STATUS = {"pending", "approved", "changes_requested", "rejected"}


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class CommentCreate(BaseModel):
    entity_type: str = Field(min_length=1, max_length=40)
    entity_id: uuid.UUID
    body: str = Field(min_length=1)


class CommentOut(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    author_id: uuid.UUID | None = None
    author_name: str | None = None
    body: str
    resolved: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApprovalCreate(BaseModel):
    entity_type: str = Field(min_length=1, max_length=40)
    entity_id: uuid.UUID
    status: str
    note: str | None = None
    assignee_id: uuid.UUID | None = None


class ApprovalOut(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    status: str
    reviewer_id: uuid.UUID | None = None
    reviewer_name: str | None = None
    assignee_id: uuid.UUID | None = None
    note: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApprovalState(BaseModel):
    current: ApprovalOut | None = None
    history: list[ApprovalOut]


class AssignRequest(BaseModel):
    assignee_id: uuid.UUID | None = None


class VersionCreate(BaseModel):
    note: str | None = None


class VersionOut(BaseModel):
    id: uuid.UUID
    content_item_id: uuid.UUID
    version: int
    title: str | None = None
    body: str | None = None
    variants: dict[str, Any] | None = None
    author_name: str | None = None
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditOut(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None = None
    actor_name: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    meta: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _validate_entity_type(entity_type: str) -> None:
    if entity_type not in _VALID_ENTITY_TYPES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid entity_type '{entity_type}'. "
            f"Expected one of {sorted(_VALID_ENTITY_TYPES)}",
        )


def _actor_name(ctx: WorkspaceContext) -> str | None:
    user = ctx.user
    return getattr(user, "full_name", None) or getattr(user, "email", None)


async def _get_comment(
    db: AsyncSession, ctx: WorkspaceContext, comment_id: uuid.UUID
) -> Comment:
    comment = await db.get(Comment, comment_id)
    if comment is None or comment.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    return comment


async def _get_content_item(
    db: AsyncSession, ctx: WorkspaceContext, content_item_id: uuid.UUID
) -> ContentItem:
    item = await db.get(ContentItem, content_item_id)
    if item is None or item.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content item not found")
    return item


# --------------------------------------------------------------------------- #
# Comments
# --------------------------------------------------------------------------- #
@router.get("/comments", response_model=list[CommentOut])
async def list_comments(
    entity_type: str = Query(...),
    entity_id: uuid.UUID = Query(...),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[CommentOut]:
    _validate_entity_type(entity_type)
    res = await db.execute(
        select(Comment)
        .where(
            Comment.workspace_id == ctx.workspace.id,
            Comment.entity_type == entity_type,
            Comment.entity_id == entity_id,
        )
        .order_by(Comment.created_at.asc())
    )
    return [CommentOut.model_validate(c) for c in res.scalars().all()]


@router.post("/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(
    payload: CommentCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    _validate_entity_type(payload.entity_type)
    comment = Comment(
        workspace_id=ctx.workspace.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        author_id=ctx.user.id,
        author_name=_actor_name(ctx),
        body=payload.body,
        resolved=False,
    )
    db.add(comment)
    await db.flush()
    await record_audit(
        db,
        ctx,
        action="comment.create",
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        meta={"comment_id": str(comment.id)},
    )
    await db.commit()
    await db.refresh(comment)
    return CommentOut.model_validate(comment)


@router.post("/comments/{comment_id}/resolve", response_model=CommentOut)
async def resolve_comment(
    comment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    comment = await _get_comment(db, ctx, comment_id)
    comment.resolved = not comment.resolved
    await db.flush()
    await record_audit(
        db,
        ctx,
        action="comment.resolve" if comment.resolved else "comment.reopen",
        entity_type=comment.entity_type,
        entity_id=comment.entity_id,
        meta={"comment_id": str(comment.id), "resolved": comment.resolved},
    )
    await db.commit()
    await db.refresh(comment)
    return CommentOut.model_validate(comment)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    comment = await _get_comment(db, ctx, comment_id)
    entity_type, entity_id, cid = comment.entity_type, comment.entity_id, comment.id
    await db.delete(comment)
    await record_audit(
        db,
        ctx,
        action="comment.delete",
        entity_type=entity_type,
        entity_id=entity_id,
        meta={"comment_id": str(cid)},
    )
    await db.commit()


# --------------------------------------------------------------------------- #
# Approvals
# --------------------------------------------------------------------------- #
@router.get("/approvals", response_model=ApprovalState)
async def get_approvals(
    entity_type: str = Query(...),
    entity_id: uuid.UUID = Query(...),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ApprovalState:
    _validate_entity_type(entity_type)
    res = await db.execute(
        select(Approval)
        .where(
            Approval.workspace_id == ctx.workspace.id,
            Approval.entity_type == entity_type,
            Approval.entity_id == entity_id,
        )
        .order_by(Approval.created_at.desc())
    )
    rows = res.scalars().all()
    history = [ApprovalOut.model_validate(a) for a in rows]
    current = history[0] if history else None
    return ApprovalState(current=current, history=history)


@router.post("/approvals", response_model=ApprovalOut, status_code=status.HTTP_201_CREATED)
async def create_approval(
    payload: ApprovalCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ApprovalOut:
    _validate_entity_type(payload.entity_type)
    if payload.status not in _VALID_APPROVAL_STATUS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid status '{payload.status}'. "
            f"Expected one of {sorted(_VALID_APPROVAL_STATUS)}",
        )

    approval = Approval(
        workspace_id=ctx.workspace.id,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        status=payload.status,
        reviewer_id=ctx.user.id,
        reviewer_name=_actor_name(ctx),
        assignee_id=payload.assignee_id,
        note=payload.note,
    )
    db.add(approval)
    await db.flush()

    if payload.entity_type == "content":
        item = await _get_content_item(db, ctx, payload.entity_id)
        if payload.assignee_id is not None:
            await db.execute(
                text(
                    "UPDATE content_items SET approval_status = :status, "
                    "assignee_id = :assignee WHERE id = :id"
                ),
                {
                    "status": payload.status,
                    "assignee": payload.assignee_id,
                    "id": item.id,
                },
            )
        else:
            await db.execute(
                text(
                    "UPDATE content_items SET approval_status = :status "
                    "WHERE id = :id"
                ),
                {"status": payload.status, "id": item.id},
            )

    await record_audit(
        db,
        ctx,
        action="approval.decision",
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        meta={"approval_id": str(approval.id), "status": payload.status},
    )
    await db.commit()
    await db.refresh(approval)
    return ApprovalOut.model_validate(approval)


# --------------------------------------------------------------------------- #
# Assignment
# --------------------------------------------------------------------------- #
@router.post("/content/{content_item_id}/assign", response_model=dict)
async def assign_content(
    content_item_id: uuid.UUID,
    payload: AssignRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    item = await _get_content_item(db, ctx, content_item_id)
    await db.execute(
        text("UPDATE content_items SET assignee_id = :assignee WHERE id = :id"),
        {"assignee": payload.assignee_id, "id": item.id},
    )
    await record_audit(
        db,
        ctx,
        action="content.assign",
        entity_type="content",
        entity_id=item.id,
        meta={
            "assignee_id": str(payload.assignee_id) if payload.assignee_id else None
        },
    )
    await db.commit()
    return {
        "content_item_id": str(item.id),
        "assignee_id": str(payload.assignee_id) if payload.assignee_id else None,
    }


# --------------------------------------------------------------------------- #
# Version history
# --------------------------------------------------------------------------- #
@router.get(
    "/content/{content_item_id}/versions", response_model=list[VersionOut]
)
async def list_versions(
    content_item_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[VersionOut]:
    item = await _get_content_item(db, ctx, content_item_id)
    res = await db.execute(
        select(ContentVersion)
        .where(ContentVersion.content_item_id == item.id)
        .order_by(ContentVersion.version.asc())
    )
    return [VersionOut.model_validate(v) for v in res.scalars().all()]


@router.post(
    "/content/{content_item_id}/versions",
    response_model=VersionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_version(
    content_item_id: uuid.UUID,
    payload: VersionCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> VersionOut:
    item = await _get_content_item(db, ctx, content_item_id)
    version = await snapshot_version(
        db,
        ws_id=ctx.workspace.id,
        item=item,
        note=payload.note,
        author_name=_actor_name(ctx),
    )
    await record_audit(
        db,
        ctx,
        action="content.version.snapshot",
        entity_type="content",
        entity_id=item.id,
        meta={"version_id": str(version.id), "version": version.version},
    )
    await db.commit()
    await db.refresh(version)
    return VersionOut.model_validate(version)


@router.post(
    "/content/{content_item_id}/versions/{version_id}/restore",
    response_model=VersionOut,
)
async def restore_version(
    content_item_id: uuid.UUID,
    version_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> VersionOut:
    item = await _get_content_item(db, ctx, content_item_id)
    target = await db.get(ContentVersion, version_id)
    if (
        target is None
        or target.workspace_id != ctx.workspace.id
        or target.content_item_id != item.id
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")

    # Snapshot the current state first so nothing is lost on restore.
    await snapshot_version(
        db,
        ws_id=ctx.workspace.id,
        item=item,
        note=f"Auto-snapshot before restoring v{target.version}",
        author_name=_actor_name(ctx),
    )

    item.title = target.title
    item.body = target.body or ""
    item.variants = target.variants
    await db.flush()

    new_version = await snapshot_version(
        db,
        ws_id=ctx.workspace.id,
        item=item,
        note=f"Restored from v{target.version}",
        author_name=_actor_name(ctx),
    )
    await record_audit(
        db,
        ctx,
        action="content.version.restore",
        entity_type="content",
        entity_id=item.id,
        meta={
            "restored_from": target.version,
            "new_version": new_version.version,
        },
    )
    await db.commit()
    await db.refresh(new_version)
    return VersionOut.model_validate(new_version)


# --------------------------------------------------------------------------- #
# Audit log
# --------------------------------------------------------------------------- #
@router.get("/audit", response_model=list[AuditOut])
async def list_audit(
    limit: int = Query(default=50, ge=1, le=200),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AuditOut]:
    res = await db.execute(
        select(AuditLog)
        .where(AuditLog.workspace_id == ctx.workspace.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return [AuditOut.model_validate(a) for a in res.scalars().all()]
