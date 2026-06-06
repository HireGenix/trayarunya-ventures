"""Marketing Mix Modeling & incrementality API.

Workspace-scoped endpoints to manage MMM models, ingest spend/revenue series
(manually or synced from real ads + revenue data), run the regression, fetch
results, record incrementality experiments, get an AI interpretation, optimise
budgets and run what-if scenarios. All analytics are computed from stored rows
in ``app.services.mmm`` — nothing fake.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import mmm_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.mmm import INCREMENTALITY_METHODS
from app.services import mmm as svc
from app.services.automation import emit_event

router = APIRouter(prefix="/mmm", tags=["mmm"])


# --------------------------------------------------------------------------- #
# Schemas (inline per module convention)
# --------------------------------------------------------------------------- #
class ModelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    period_start: date | None
    period_end: date | None
    channels: list | None
    status: str
    results: dict | None
    r_squared: float | None
    created_at: datetime


class ModelCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    period_start: date | None = None
    period_end: date | None = None
    channels: list[str] | None = None


class SpendRowIn(BaseModel):
    channel: str = Field(min_length=1, max_length=60)
    date: date
    spend: float = 0.0
    conversions: int | None = None
    revenue: float | None = None
    source: str | None = Field(default=None, max_length=40)


class SpendIngestIn(BaseModel):
    rows: list[SpendRowIn] = Field(min_length=1)


class IncrementalityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    channel: str
    method: str
    lift_pct: float | None
    confidence: float | None
    status: str
    detail: dict | None
    created_at: datetime


class IncrementalityCreateIn(BaseModel):
    channel: str = Field(min_length=1, max_length=60)
    method: str = "holdout"
    lift_pct: float | None = None
    confidence: float | None = None
    detail: dict | None = None


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
@router.get("/models", response_model=list[ModelOut])
async def list_models(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_models(db, ctx.workspace.id)


@router.post("/models", response_model=ModelOut)
async def create_model(
    body: ModelCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    model = await svc.create_model(
        db,
        ctx.workspace.id,
        name=body.name,
        period_start=body.period_start,
        period_end=body.period_end,
        channels=body.channels,
    )
    await emit_event(db, ctx.workspace.id, "mmm.model.created", {"id": str(model.id)})
    await db.commit()
    return model


@router.get("/models/{model_id}", response_model=ModelOut)
async def get_model(
    model_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    model = await svc.get_model(db, ctx.workspace.id, model_id)
    if model is None:
        raise HTTPException(404, "Model not found")
    return model


@router.post("/models/{model_id}/run", response_model=ModelOut)
async def run_model(
    model_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    model = await svc.get_model(db, ctx.workspace.id, model_id)
    if model is None:
        raise HTTPException(404, "Model not found")
    model.status = "running"
    await db.commit()
    model = await svc.fit_model(db, ctx.workspace.id, model)
    if model.status == "ready":
        await emit_event(
            db,
            ctx.workspace.id,
            "mmm.model.ready",
            {"id": str(model.id), "r_squared": model.r_squared},
        )
        await db.commit()
    return model


@router.post("/models/{model_id}/sync")
async def sync_model(
    model_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    model = await svc.get_model(db, ctx.workspace.id, model_id)
    if model is None:
        raise HTTPException(404, "Model not found")
    result = await svc.sync_from_platform(db, ctx.workspace.id)
    await emit_event(db, ctx.workspace.id, "mmm.data.synced", result)
    await db.commit()
    return result


@router.post("/models/{model_id}/interpret")
async def interpret_model(
    model_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.interpret(db, ctx.workspace.id, model_id)
    if result.get("error") == "model_not_found":
        raise HTTPException(404, "Model not found")
    return result


# --------------------------------------------------------------------------- #
# Spend ingestion
# --------------------------------------------------------------------------- #
@router.post("/spend")
async def ingest_spend(
    body: SpendIngestIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    rows = [r.model_dump() for r in body.rows]
    count = await svc.ingest_spend(db, ctx.workspace.id, rows)
    return {"ingested": count}


# --------------------------------------------------------------------------- #
# Incrementality
# --------------------------------------------------------------------------- #
@router.get("/incrementality", response_model=list[IncrementalityOut])
async def list_incrementality(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_incrementality(db, ctx.workspace.id)


@router.post("/incrementality", response_model=IncrementalityOut)
async def create_incrementality(
    body: IncrementalityCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    if body.method not in INCREMENTALITY_METHODS:
        raise HTTPException(422, f"Invalid method. Allowed: {list(INCREMENTALITY_METHODS)}")
    test = await svc.create_incrementality(
        db,
        ctx.workspace.id,
        channel=body.channel,
        method=body.method,
        lift_pct=body.lift_pct,
        confidence=body.confidence,
        detail=body.detail,
    )
    await emit_event(
        db, ctx.workspace.id, "mmm.incrementality.recorded", {"id": str(test.id), "channel": test.channel}
    )
    await db.commit()
    return test


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.overview(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Budget optimizer
# --------------------------------------------------------------------------- #
class BudgetOptimizeIn(BaseModel):
    model_id: uuid.UUID
    total_budget: float = Field(gt=0, description="Total budget to allocate across channels")


@router.post("/optimize")
async def optimize_budget(
    body: BudgetOptimizeIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    model = await svc.get_model(db, ctx.workspace.id, body.model_id)
    if model is None:
        raise HTTPException(404, "Model not found")
    if model.status != "ready" or not model.results:
        raise HTTPException(400, "Model must be fitted (status=ready) before optimising budget")
    return svc.optimize_budget(model.results, body.total_budget)


# --------------------------------------------------------------------------- #
# What-if simulator
# --------------------------------------------------------------------------- #
class WhatIfIn(BaseModel):
    model_id: uuid.UUID
    spend: dict[str, float] = Field(
        description="Per-channel spend to simulate, e.g. {'google_ads': 5000, 'meta_ads': 3000}"
    )


@router.post("/what-if")
async def what_if(
    body: WhatIfIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    model = await svc.get_model(db, ctx.workspace.id, body.model_id)
    if model is None:
        raise HTTPException(404, "Model not found")
    if model.status != "ready" or not model.results:
        raise HTTPException(400, "Model must be fitted (status=ready) before running what-if")
    return svc.what_if(model.results, body.spend)
