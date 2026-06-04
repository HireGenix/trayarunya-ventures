"""Revenue attribution API.

Workspace-scoped ingestion of :class:`RevenueEvent` rows plus attribution and
funnel analytics. Marketing touchpoints, leads, pipeline and closed deals are
recorded here (manually, via CRM sync, or import) and the engine attributes
revenue back to channels/campaigns using first-touch, last-touch and linear
models. Nothing is fabricated — analytics are computed from stored events.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.attribution import CHANNELS, STAGES, RevenueEvent
from app.services.attribution import compute_attribution

router = APIRouter(prefix="/attribution", tags=["attribution"])


class RevenueEventIn(BaseModel):
    contact_ref: str = Field(..., max_length=200)
    channel: str
    stage: str
    campaign: str | None = Field(default=None, max_length=200)
    value: float = 0.0
    cost: float = 0.0
    currency: str = Field(default="USD", max_length=8)
    external_id: str | None = Field(default=None, max_length=200)
    source: str | None = Field(default=None, max_length=60)
    occurred_at: datetime | None = None
    meta: dict | None = None

    def validated(self) -> "RevenueEventIn":
        if self.channel not in CHANNELS:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid channel '{self.channel}'. Allowed: {list(CHANNELS)}",
            )
        if self.stage not in STAGES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid stage '{self.stage}'. Allowed: {list(STAGES)}",
            )
        return self


class RevenueEventOut(BaseModel):
    id: uuid.UUID
    contact_ref: str
    channel: str
    campaign: str | None
    stage: str
    value: float
    cost: float
    currency: str
    occurred_at: datetime

    class Config:
        from_attributes = True


@router.post("/events", response_model=RevenueEventOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: RevenueEventIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> RevenueEvent:
    data.validated()
    event = RevenueEvent(
        workspace_id=ctx.workspace.id,
        contact_ref=data.contact_ref,
        channel=data.channel,
        campaign=data.campaign,
        stage=data.stage,
        value=data.value,
        cost=data.cost,
        currency=data.currency,
        external_id=data.external_id,
        source=data.source or "manual",
        meta=data.meta,
        occurred_at=data.occurred_at or datetime.now(timezone.utc),
    )
    db.add(event)
    await db.flush()
    return event


@router.post("/events/bulk", status_code=status.HTTP_201_CREATED)
async def create_events_bulk(
    items: list[RevenueEventIn],
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if len(items) > 1000:
        raise HTTPException(status_code=422, detail="Max 1000 events per request.")
    created = 0
    for data in items:
        data.validated()
        db.add(
            RevenueEvent(
                workspace_id=ctx.workspace.id,
                contact_ref=data.contact_ref,
                channel=data.channel,
                campaign=data.campaign,
                stage=data.stage,
                value=data.value,
                cost=data.cost,
                currency=data.currency,
                external_id=data.external_id,
                source=data.source or "import",
                meta=data.meta,
                occurred_at=data.occurred_at or datetime.now(timezone.utc),
            )
        )
        created += 1
    await db.flush()
    return {"created": created}


@router.get("/events", response_model=list[RevenueEventOut])
async def list_events(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
    channel: str | None = None,
    stage: str | None = None,
    limit: int = Query(default=200, le=1000),
) -> list[RevenueEvent]:
    q = select(RevenueEvent).where(RevenueEvent.workspace_id == ctx.workspace.id)
    if channel:
        q = q.where(RevenueEvent.channel == channel)
    if stage:
        q = q.where(RevenueEvent.stage == stage)
    q = q.order_by(RevenueEvent.occurred_at.desc()).limit(limit)
    rows = (await db.execute(q)).scalars().all()
    return list(rows)


@router.get("/summary")
async def attribution_summary(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
    since: datetime | None = None,
) -> dict:
    q = select(RevenueEvent).where(RevenueEvent.workspace_id == ctx.workspace.id)
    if since:
        q = q.where(RevenueEvent.occurred_at >= since)
    rows = (await db.execute(q)).scalars().all()
    return compute_attribution(list(rows))


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    row = (
        await db.execute(
            select(RevenueEvent).where(
                RevenueEvent.id == event_id,
                RevenueEvent.workspace_id == ctx.workspace.id,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.delete(row)
