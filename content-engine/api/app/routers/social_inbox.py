"""Social Inbox + Listening API.

Workspace-scoped endpoints for the unified social inbox: list/get items, reply
(draft or send), change status, AI-draft a reply, manage listening keywords and
view hits, run a sync, and read the KPI overview. All Pydantic schemas are
declared inline per house style.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import social_inbox_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import social_inbox as svc
from app.services.automation import emit_event

router = APIRouter(prefix="/social-inbox", tags=["social-inbox"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class InboxItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    platform: str
    kind: str
    author_handle: str | None = None
    author_name: str | None = None
    text: str
    permalink: str | None = None
    sentiment: str | None = None
    status: str
    assignee_user_id: uuid.UUID | None = None
    external_id: str | None = None
    received_at: datetime | None = None
    created_at: datetime
    meta: dict | None = None


class ReplyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    inbox_item_id: uuid.UUID
    body: str
    status: str
    sent_at: datetime | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime
    meta: dict | None = None


class ItemDetailOut(BaseModel):
    item: InboxItemOut
    replies: list[ReplyOut]


class ReplyIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    send: bool = False


class ReplyResult(BaseModel):
    reply: ReplyOut
    delivery: str


class StatusIn(BaseModel):
    status: str = Field(pattern="^(unread|open|replied|archived)$")
    assignee_user_id: uuid.UUID | None = None


class DraftReplyIn(BaseModel):
    tone: str | None = Field(default=None, max_length=200)


class DraftReplyOut(BaseModel):
    body: str
    source: str


class KeywordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    term: str
    platform: str | None = None
    is_active: bool
    created_at: datetime


class KeywordIn(BaseModel):
    term: str = Field(min_length=1, max_length=200)
    platform: str | None = Field(default=None, max_length=40)
    is_active: bool = True


class HitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    keyword_id: uuid.UUID
    platform: str | None = None
    author: str | None = None
    text: str
    url: str | None = None
    sentiment: str | None = None
    found_at: datetime | None = None
    created_at: datetime


class SyncOut(BaseModel):
    fetched: int
    connected_accounts: int
    platforms: list[dict]
    existing_items: int


class ChannelStatusOut(BaseModel):
    platform: str
    connected: bool
    account_id: str | None = None
    display_name: str | None = None
    reason: str | None = None


class OverviewOut(BaseModel):
    total: int
    unread: int
    open: int
    replied: int
    archived: int
    analyzed: int
    positive: int
    negative: int
    neutral: int
    positive_pct: float
    by_sentiment: dict
    by_platform: dict
    mentions_today: int
    avg_response_minutes: float | None = None


class CycleIn(BaseModel):
    autonomy: str = Field(default="suggest", pattern="^(suggest|approve|auto)$")


class CycleOut(BaseModel):
    autonomy: str
    classified: int
    drafted: int
    high_urgency_items: list[str]
    scanned: int


# --------------------------------------------------------------------------- #
# Inbox items
# --------------------------------------------------------------------------- #
@router.get("/items", response_model=list[InboxItemOut])
async def list_items(
    platform: str | None = Query(default=None),
    kind: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    sentiment: str | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_items(
        db,
        ctx.workspace.id,
        platform=platform,
        kind=kind,
        status=status_filter,
        sentiment=sentiment,
    )


@router.get("/items/{item_id}", response_model=ItemDetailOut)
async def get_item(
    item_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    item = await svc.get_item(db, ctx.workspace.id, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inbox item not found")
    replies = await svc.list_replies(db, ctx.workspace.id, item_id)
    return {"item": item, "replies": replies}


@router.post("/items/{item_id}/reply", response_model=ReplyResult)
async def reply_to_item(
    item_id: uuid.UUID,
    body: ReplyIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    item = await svc.get_item(db, ctx.workspace.id, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inbox item not found")

    # Sending to the platform requires a connected account with credentials.
    delivery = "draft"
    reply_status = "draft"
    platform_reply_id = None
    if body.send:
        delivery_result = await svc.reply_via_platform(db, ctx.workspace.id, item, body.body)
        if delivery_result["sent"]:
            reply_status = "sent"
            delivery = "sent"
            platform_reply_id = delivery_result.get("platform_reply_id")
        else:
            delivery = delivery_result["status"]

    reply = await svc.add_reply(
        db,
        ctx.workspace.id,
        item_id,
        body.body,
        status=reply_status,
        created_by=ctx.user.id,
        meta={"delivery": delivery, "platform_reply_id": platform_reply_id},
    )
    if platform_reply_id:
        reply.platform_reply_id = platform_reply_id
    if reply_status == "sent":
        await svc.set_status(db, item, "replied")
        await emit_event(
            db,
            ctx.workspace.id,
            "social.reply.sent",
            {
                "item_id": str(item.id),
                "reply_id": str(reply.id),
                "platform": item.platform,
                "delivery": delivery,
            },
        )
    await db.commit()
    await db.refresh(reply)
    return {"reply": reply, "delivery": delivery}


@router.post("/items/{item_id}/status", response_model=InboxItemOut)
async def update_status(
    item_id: uuid.UUID,
    body: StatusIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    item = await svc.get_item(db, ctx.workspace.id, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inbox item not found")
    await svc.set_status(db, item, body.status)
    if body.assignee_user_id is not None:
        await svc.assign(db, item, body.assignee_user_id)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/items/{item_id}/draft-reply", response_model=DraftReplyOut)
async def draft_reply(
    item_id: uuid.UUID,
    body: DraftReplyIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    item = await svc.get_item(db, ctx.workspace.id, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inbox item not found")
    result = await agent.draft_reply(db, ctx.workspace.id, item_id, body.tone)
    # Persist the AI suggestion as a draft so it is recoverable.
    if result.get("body"):
        await svc.add_reply(
            db,
            ctx.workspace.id,
            item_id,
            result["body"],
            status="draft",
            created_by=ctx.user.id,
            meta={"source": "agent", "ai_source": result.get("source")},
        )
        await db.commit()
    return result


# --------------------------------------------------------------------------- #
# Listening keywords + hits
# --------------------------------------------------------------------------- #
@router.get("/keywords", response_model=list[KeywordOut])
async def list_keywords(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_keywords(db, ctx.workspace.id)


@router.post("/keywords", response_model=KeywordOut)
async def create_keyword(
    body: KeywordIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    kw = await svc.create_keyword(
        db,
        ctx.workspace.id,
        body.term.strip(),
        platform=body.platform,
        is_active=body.is_active,
    )
    await db.commit()
    await db.refresh(kw)
    return kw


@router.get("/listening", response_model=list[HitOut])
async def listening_hits(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_hits(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Sync + overview + agent
# --------------------------------------------------------------------------- #
@router.post("/sync", response_model=SyncOut)
async def sync(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await svc.sync_inbox(db, ctx.workspace.id)
    if result.get("fetched"):
        await emit_event(
            db,
            ctx.workspace.id,
            "social.mention.detected",
            {"fetched": result["fetched"]},
        )
        await db.commit()
    return result


@router.get("/channels", response_model=list[ChannelStatusOut])
async def channel_status(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Per-channel connected/not status for this workspace.

    Merges statuses from SocialAccount rows and the integrations catalog
    (provider ``meta`` covers facebook/instagram channels).
    """
    results = await svc.get_channel_statuses(db, ctx.workspace.id)

    # Fallback: if facebook/instagram report not-connected, check the
    # integrations catalog for a connected "meta" provider row.
    from app.models import Integration as _Integration
    from sqlalchemy import select as sa_select

    not_connected = {
        r.platform for r in results
        if not r.connected and r.platform in ("facebook", "instagram")
    }
    if not_connected:
        meta_row = (
            await db.execute(
                sa_select(_Integration).where(
                    _Integration.workspace_id == ctx.workspace.id,
                    _Integration.provider == "meta",
                    _Integration.status == "connected",
                )
            )
        ).scalar_one_or_none()
        if meta_row is not None:
            results = [
                ChannelStatusOut(
                    platform=r.platform,
                    connected=True,
                    display_name=r.display_name or "Meta (catalog)",
                )
                if r.platform in not_connected
                else r
                for r in results
            ]
    return results


@router.get("/overview", response_model=OverviewOut)
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.overview(db, ctx.workspace.id)


@router.post("/agent/run", response_model=CycleOut)
async def run_agent(
    body: CycleIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.run_cycle(db, ctx.workspace.id, autonomy=body.autonomy)
    await db.commit()
    return result
