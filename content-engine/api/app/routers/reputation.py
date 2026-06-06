"""Reputation API — reviews, review-requests, sources and the agentic brain.

Workspace-scoped (bearer + ``X-Workspace-Id``). Every aggregate comes from real
rows. Publishing a response back to the source and sending review requests over
SMS degrade gracefully to ``provider_not_configured`` when creds aren't set —
the data, AI and UI keep working regardless.

Enterprise additions: sentiment scoring, theme extraction, time-series trends,
AI response drafting, and analytics — all from real review data.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import reputation_agent as agent
from app.config import settings
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import reputation as svc
from app.services.automation import emit_event

try:  # graceful — email is optional infra
    from app.services.notify_channels import send_email
except Exception:  # noqa: BLE001
    send_email = None  # type: ignore[assignment]

router = APIRouter(prefix="/reputation", tags=["reputation"])


# --------------------------------------------------------------------------- #
# Schemas (inline, like routers/cro.py)
# --------------------------------------------------------------------------- #
class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    source: str
    author: str | None
    rating: int
    title: str | None
    body: str | None
    sentiment: str | None
    sentiment_score: float | None = None
    themes: list[str] | dict | None = None
    status: str
    response_text: str | None
    responded_at: datetime | None
    external_id: str | None
    review_date: datetime | None
    meta: dict | None
    created_at: datetime


class ReviewCreateIn(BaseModel):
    source: str = Field(default="manual", max_length=40)
    author: str | None = Field(default=None, max_length=200)
    rating: int = Field(ge=1, le=5)
    title: str | None = Field(default=None, max_length=300)
    body: str | None = None
    external_id: str | None = Field(default=None, max_length=200)
    review_date: datetime | None = None
    meta: dict | None = None


class RespondIn(BaseModel):
    response_text: str = Field(min_length=1)
    publish: bool = False


class RespondOut(BaseModel):
    review: ReviewOut
    published: bool
    publish_status: str


class DraftIn(BaseModel):
    tone: str = Field(default="professional", max_length=40)


class DraftOut(BaseModel):
    review_id: uuid.UUID
    rating: int
    sentiment: str
    tone: str
    draft: str


class RequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    customer_email: str | None
    phone: str | None
    channel: str
    status: str
    sent_at: datetime | None
    created_at: datetime


class RequestCreateIn(BaseModel):
    channel: str = Field(default="email", max_length=20)
    customer_email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=40)
    meta: dict | None = None


class SendOut(BaseModel):
    request: RequestOut
    delivery_status: str


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    source: str
    profile_url: str | None
    avg_rating: float | None
    total_reviews: int | None
    is_connected: bool
    created_at: datetime


class SourceCreateIn(BaseModel):
    source: str = Field(max_length=40)
    profile_url: str | None = Field(default=None, max_length=1000)
    avg_rating: float | None = Field(default=None, ge=0, le=5)
    total_reviews: int | None = Field(default=None, ge=0)
    is_connected: bool = False


class OverviewOut(BaseModel):
    total_reviews: int
    avg_rating: float
    distribution: dict
    sentiment_split: dict
    responded: int
    unanswered: int
    response_rate: float


class CycleIn(BaseModel):
    autonomy: str = Field(default="suggest", max_length=20)


# --------------------------------------------------------------------------- #
# Reviews
# --------------------------------------------------------------------------- #
@router.get("/reviews", response_model=list[ReviewOut])
async def list_reviews(
    status_filter: str | None = Query(default=None, alias="status"),
    source: str | None = Query(default=None),
    sentiment: str | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_reviews(
        db, ctx.workspace.id, status=status_filter, source=source, sentiment=sentiment,
    )


@router.post("/reviews", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
async def create_review(
    body: ReviewCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    review = await svc.ingest_review(
        db,
        ctx.workspace.id,
        source=body.source,
        rating=body.rating,
        author=body.author,
        title=body.title,
        body=body.body,
        external_id=body.external_id,
        review_date=body.review_date,
        meta=body.meta,
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "review.received",
        {"id": str(review.id), "rating": review.rating, "source": review.source},
    )
    if review.rating <= 2:
        await emit_event(
            db,
            ctx.workspace.id,
            "review.low_rating",
            {"id": str(review.id), "rating": review.rating, "source": review.source},
        )
    await db.commit()
    await db.refresh(review)
    return review


@router.get("/reviews/{review_id}", response_model=ReviewOut)
async def get_review(
    review_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    review = await svc.get_review(db, ctx.workspace.id, review_id)
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")
    return review


@router.post("/reviews/{review_id}/respond", response_model=RespondOut)
async def respond_review(
    review_id: uuid.UUID,
    body: RespondIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    review = await svc.get_review(db, ctx.workspace.id, review_id)
    if review is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")

    await svc.respond_to_review(db, review, body.response_text)

    published = False
    publish_status = "stored"
    if body.publish:
        publish_status = "provider_not_configured"

    await emit_event(
        db,
        ctx.workspace.id,
        "review.responded",
        {"id": str(review.id), "published": published},
    )
    await db.commit()
    await db.refresh(review)
    return RespondOut(review=review, published=published, publish_status=publish_status)


@router.post("/reviews/{review_id}/draft", response_model=DraftOut)
async def draft_review_response(
    review_id: uuid.UUID,
    body: DraftIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.draft_response(db, ctx.workspace.id, review_id, body.tone)
    if result.get("error") == "not_found":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Review not found")
    return DraftOut(**result)


# --------------------------------------------------------------------------- #
# Analytics — enterprise endpoints
# --------------------------------------------------------------------------- #
@router.get("/analytics")
async def get_analytics(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Full enterprise analytics: overview + trends + themes from real data."""
    return await svc.analytics(db, ctx.workspace.id)


@router.post("/backfill")
async def backfill(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    """Backfill sentiment scores and themes for existing reviews."""
    count = await svc.backfill_sentiment(db, ctx.workspace.id)
    await db.commit()
    return {"backfilled": count}


# --------------------------------------------------------------------------- #
# Review requests
# --------------------------------------------------------------------------- #
@router.get("/requests", response_model=list[RequestOut])
async def list_requests(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_requests(db, ctx.workspace.id)


@router.post("/requests", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    body: RequestCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    if not (body.customer_email or body.phone):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "customer_email or phone is required"
        )
    req = await svc.create_request(
        db,
        ctx.workspace.id,
        channel=body.channel,
        customer_email=body.customer_email,
        phone=body.phone,
        meta=body.meta,
    )
    await db.commit()
    await db.refresh(req)
    return req


@router.post("/requests/{request_id}/send", response_model=SendOut)
async def send_request(
    request_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    req = await svc.get_request(db, ctx.workspace.id, request_id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")

    delivery_status = "queued"
    base = getattr(settings, "public_web_url", "") or ""
    review_link = f"{base.rstrip('/')}/r/{req.token}" if base else f"/r/{req.token}"

    if req.channel == "email" and req.customer_email and send_email is not None:
        subject = "We'd love your feedback"
        text = (
            "Hi,\n\nThanks for choosing us. Would you mind leaving a quick review? "
            f"It only takes a moment:\n{review_link}\n\nThank you."
        )
        ok = False
        try:
            ok = await send_email(req.customer_email, subject, text)
        except Exception:  # noqa: BLE001
            ok = False
        delivery_status = "sent" if ok else "provider_not_configured"
        if ok:
            svc.mark_request_sent(req)
    elif req.channel == "sms":
        delivery_status = "provider_not_configured"
    else:
        delivery_status = "provider_not_configured"

    if req.status == "queued" and delivery_status != "sent":
        req.status = "queued"

    await emit_event(
        db,
        ctx.workspace.id,
        "review_request.sent",
        {"id": str(req.id), "channel": req.channel, "status": delivery_status},
    )
    await db.commit()
    await db.refresh(req)
    return SendOut(request=req, delivery_status=delivery_status)


# --------------------------------------------------------------------------- #
# Sources
# --------------------------------------------------------------------------- #
@router.get("/sources", response_model=list[SourceOut])
async def list_sources(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_sources(db, ctx.workspace.id)


@router.post("/sources", response_model=SourceOut, status_code=status.HTTP_201_CREATED)
async def create_source(
    body: SourceCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    row = await svc.upsert_source(
        db,
        ctx.workspace.id,
        source=body.source,
        profile_url=body.profile_url,
        avg_rating=body.avg_rating,
        total_reviews=body.total_reviews,
        is_connected=body.is_connected,
    )
    await db.commit()
    await db.refresh(row)
    return row


# --------------------------------------------------------------------------- #
# Overview + agent
# --------------------------------------------------------------------------- #
@router.get("/overview", response_model=OverviewOut)
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.aggregate(db, ctx.workspace.id)


@router.post("/agent/run")
async def run_agent(
    body: CycleIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.run_cycle(db, ctx.workspace.id, body.autonomy)
    await db.commit()
    return result
