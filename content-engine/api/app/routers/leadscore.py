"""Lead Scoring & Nurture API — leads, activities, scoring rules, agent + overview.

All queries are workspace-scoped. Scores are recomputed from real rules +
activities (never random). Meaningful actions emit automation events, reusing
the existing ``revenue.mql`` / ``revenue.sql`` triggers plus ``lead.score.changed``.
Final paths become ``/api/v1/leadscore/...``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import leadscore_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.leadscore import ACTIVITY_KINDS, LEAD_STAGES
from app.services import leadscore as svc
from app.services.automation import emit_event

router = APIRouter(prefix="/leadscore", tags=["leadscore"])


# --------------------------------------------------------------------------- #
# Schemas (inline, per HARD RULES)
# --------------------------------------------------------------------------- #
class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    name: str | None = None
    company: str | None = None
    source: str | None = None
    stage: str
    score: int
    grade: str
    attributes: dict | None = None
    last_activity_at: datetime | None = None
    created_at: datetime


class LeadCreateIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    name: str | None = Field(default=None, max_length=200)
    company: str | None = Field(default=None, max_length=200)
    source: str | None = Field(default=None, max_length=80)
    stage: str | None = None
    attributes: dict | None = None


class ActivityIn(BaseModel):
    kind: str
    weight: int = Field(default=1, ge=0, le=1000)
    occurred_at: datetime | None = None
    meta: dict | None = None


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    lead_id: uuid.UUID
    kind: str
    weight: int
    occurred_at: datetime
    meta: dict | None = None


class RuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    condition: dict
    points: int
    is_active: bool
    created_at: datetime


class RuleCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    condition: dict
    points: int = Field(ge=-1000, le=1000)
    is_active: bool = True


class RecomputeOut(BaseModel):
    lead_id: uuid.UUID
    old_score: int
    score: int
    grade: str


# --------------------------------------------------------------------------- #
# Leads
# --------------------------------------------------------------------------- #
@router.get("/leads", response_model=list[LeadOut])
async def list_leads(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_leads(db, ctx.workspace.id)


@router.post("/leads", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    body: LeadCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lead = await svc.create_lead(
        db,
        ctx.workspace.id,
        email=body.email,
        name=body.name,
        company=body.company,
        source=body.source,
        stage=body.stage,
        attributes=body.attributes,
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "revenue.lead",
        {
            "contact_ref": lead.email,
            "stage": lead.stage,
            "channel": lead.source or "other",
            "value": 0.0,
            "lead_id": str(lead.id),
        },
        source="leadscore",
    )
    await db.commit()
    await db.refresh(lead)
    return lead


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lead = await svc.get_lead(db, ctx.workspace.id, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    activities = await svc.list_activities(db, ctx.workspace.id, lead_id)
    return {
        "lead": LeadOut.model_validate(lead).model_dump(),
        "activities": [ActivityOut.model_validate(a).model_dump() for a in activities],
    }


@router.post("/leads/{lead_id}/activity", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
async def add_activity(
    lead_id: uuid.UUID,
    body: ActivityIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lead = await svc.get_lead(db, ctx.workspace.id, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    act = await svc.record_activity(
        db,
        ctx.workspace.id,
        lead,
        kind=body.kind,
        weight=body.weight,
        occurred_at=body.occurred_at,
        meta=body.meta,
    )
    # Real activity changes intent — recompute the score immediately.
    new_score, new_grade, old_score = await svc.recompute_score(db, ctx.workspace.id, lead)
    if new_score != old_score:
        await emit_event(
            db,
            ctx.workspace.id,
            "lead.score.changed",
            {
                "lead_id": str(lead.id),
                "email": lead.email,
                "old_score": old_score,
                "new_score": new_score,
                "grade": new_grade,
            },
            source="leadscore",
        )
    await db.commit()
    await db.refresh(act)
    return act


@router.post("/leads/{lead_id}/recompute", response_model=RecomputeOut)
async def recompute_lead(
    lead_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lead = await svc.get_lead(db, ctx.workspace.id, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    new_score, new_grade, old_score = await svc.recompute_score(db, ctx.workspace.id, lead)
    if new_score != old_score:
        await emit_event(
            db,
            ctx.workspace.id,
            "lead.score.changed",
            {
                "lead_id": str(lead.id),
                "email": lead.email,
                "old_score": old_score,
                "new_score": new_score,
                "grade": new_grade,
            },
            source="leadscore",
        )
    await db.commit()
    return RecomputeOut(lead_id=lead.id, old_score=old_score, score=new_score, grade=new_grade)


# --------------------------------------------------------------------------- #
# Scoring rules
# --------------------------------------------------------------------------- #
@router.get("/rules", response_model=list[RuleOut])
async def list_rules(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_rules(db, ctx.workspace.id)


@router.post("/rules", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(
    body: RuleCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    rule = svc.ScoringRule(
        workspace_id=ctx.workspace.id,
        name=body.name,
        condition=body.condition,
        points=body.points,
        is_active=body.is_active,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


# --------------------------------------------------------------------------- #
# Agent endpoints
# --------------------------------------------------------------------------- #
class SuggestRulesIn(BaseModel):
    persist: bool = False


@router.post("/rules/suggest")
async def suggest_rules(
    body: SuggestRulesIn | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.suggest_rules(db, ctx.workspace.id)
    created: list[dict] = []
    if body and body.persist:
        for r in result.get("rules", []):
            rule = svc.ScoringRule(
                workspace_id=ctx.workspace.id,
                name=str(r.get("name") or "Scoring rule")[:200],
                condition=r.get("condition") or {},
                points=int(r.get("points") or 0),
                is_active=bool(r.get("is_active", True)),
            )
            db.add(rule)
            created.append({"name": rule.name, "points": rule.points})
        await db.commit()
    return {**result, "persisted": bool(body and body.persist), "created": created}


@router.post("/leads/{lead_id}/next-action")
async def next_action(
    lead_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    lead = await svc.get_lead(db, ctx.workspace.id, lead_id)
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return await agent.next_best_action(db, ctx.workspace.id, lead_id)


class RunCycleIn(BaseModel):
    autonomy: str = "suggest"


@router.post("/agent/run")
async def run_agent_cycle(
    body: RunCycleIn | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    level = (body.autonomy if body else "suggest")
    result = await agent.run_cycle(db, ctx.workspace.id, autonomy=level)
    await db.commit()
    return result


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    data = await svc.overview(db, ctx.workspace.id)
    return {
        **data,
        "stages": list(LEAD_STAGES),
        "activity_kinds": list(ACTIVITY_KINDS),
    }
