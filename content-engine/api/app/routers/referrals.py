"""Referrals API — referral / affiliate / loyalty programs, advocates,
conversions, leaderboard, overview, and the agentic program designer.

All endpoints are workspace-scoped via ``get_workspace_ctx`` and every query is
filtered by ``ctx.workspace.id``. Meaningful actions emit automation events
(``referral.conversion``, ``referral.payout.due``). Final paths are
``/api/v1/referrals/...``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import referrals_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.referrals import (
    ADVOCATE_STATUSES,
    PROGRAM_STATUSES,
    PROGRAM_TYPES,
    REWARD_TYPES,
)
from app.services import referrals as svc
from app.services import referrals_enterprise as enterprise_svc
from app.models.referrals import REWARD_STATUSES, FRAUD_FLAG_TYPES
from app.services.automation import emit_event

router = APIRouter(prefix="/referrals", tags=["referrals"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class ProgramOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    type: str
    reward_type: str
    reward_value: float
    status: str
    description: str | None = None
    terms: dict | None = None
    created_at: datetime


class ProgramCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: str = "referral"
    reward_type: str = "cash"
    reward_value: float = 0.0
    status: str = "active"
    description: str | None = None
    terms: dict | None = None


class ProgramDesignIn(BaseModel):
    brief: str = Field(min_length=1, max_length=2000)
    save: bool = False


class AdvocateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    program_id: uuid.UUID
    name: str
    email: str | None = None
    code: str
    clicks: int
    signups: int
    conversions: int
    earnings: float
    status: str
    created_at: datetime


class AdvocateCreate(BaseModel):
    program_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    email: str | None = None
    status: str = "active"


class ConversionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    advocate_id: uuid.UUID
    referred_email: str | None = None
    value: float
    reward: float
    status: str
    occurred_at: datetime


class ConversionCreate(BaseModel):
    advocate_id: uuid.UUID | None = None
    code: str | None = None
    referred_email: str | None = None
    value: float = 0.0


class OverviewOut(BaseModel):
    active_advocates: int
    active_programs: int
    conversions: int
    pending_conversions: int
    revenue_referred: float
    payouts_due: float


class RewardTierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    program_id: uuid.UUID
    name: str
    milestone: int
    reward_type: str
    reward_value: float
    status: str
    description: str | None = None
    created_at: datetime


class RewardTierCreate(BaseModel):
    program_id: uuid.UUID
    name: str = Field(min_length=1, max_length=200)
    milestone: int = Field(ge=1)
    reward_type: str = "cash"
    reward_value: float = 0.0
    description: str | None = None


class AdvocateRewardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    advocate_id: uuid.UUID
    tier_id: uuid.UUID | None = None
    reward_type: str
    reward_value: float
    status: str
    note: str | None = None
    created_at: datetime


class FraudFlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    advocate_id: uuid.UUID | None = None
    conversion_id: uuid.UUID | None = None
    flag_type: str
    risk_score: float
    details: dict | None = None
    resolved: bool
    resolved_by: str | None = None
    created_at: datetime


class ResolveBody(BaseModel):
    resolved_by: str = Field(min_length=1, max_length=200)


class RewardStatusBody(BaseModel):
    status: str


def _validate(value: str, allowed: tuple[str, ...], label: str) -> None:
    if value not in allowed:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid {label} '{value}'. Allowed: {', '.join(allowed)}",
        )


# --------------------------------------------------------------------------- #
# Programs
# --------------------------------------------------------------------------- #
@router.get("/programs", response_model=list[ProgramOut])
async def list_programs(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_programs(db, ctx.workspace.id)


@router.post("/programs", response_model=ProgramOut)
async def create_program(
    body: ProgramCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    _validate(body.type, PROGRAM_TYPES, "type")
    _validate(body.reward_type, REWARD_TYPES, "reward_type")
    _validate(body.status, PROGRAM_STATUSES, "status")
    program = await svc.create_program(
        db,
        ctx.workspace.id,
        name=body.name,
        type=body.type,
        reward_type=body.reward_type,
        reward_value=body.reward_value,
        status=body.status,
        description=body.description,
        terms=body.terms,
    )
    await db.commit()
    await db.refresh(program)
    return program


@router.get("/programs/{program_id}", response_model=ProgramOut)
async def get_program(
    program_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    program = await svc.get_program(db, ctx.workspace.id, program_id)
    if program is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
    return program


@router.post("/programs/design")
async def design_program(
    body: ProgramDesignIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    design = await agent.design_program(db, ctx.workspace.id, body.brief)
    saved: ProgramOut | None = None
    if body.save and design.get("name"):
        ptype = design.get("type") if design.get("type") in PROGRAM_TYPES else "referral"
        rtype = (
            design.get("reward_type")
            if design.get("reward_type") in REWARD_TYPES
            else "cash"
        )
        try:
            reward_value = float(design.get("reward_value") or 0.0)
        except (TypeError, ValueError):
            reward_value = 0.0
        program = await svc.create_program(
            db,
            ctx.workspace.id,
            name=str(design["name"])[:200],
            type=ptype,
            reward_type=rtype,
            reward_value=reward_value,
            status="active",
            description=(design.get("messaging") or {}).get("subhead")
            if isinstance(design.get("messaging"), dict)
            else None,
            terms=design.get("terms")
            if isinstance(design.get("terms"), dict)
            else None,
        )
        await db.commit()
        await db.refresh(program)
        saved = ProgramOut.model_validate(program)
    return {"design": design, "saved": saved}


# --------------------------------------------------------------------------- #
# Advocates
# --------------------------------------------------------------------------- #
@router.get("/advocates", response_model=list[AdvocateOut])
async def list_advocates(
    program_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_advocates(db, ctx.workspace.id, program_id)


@router.post("/advocates", response_model=AdvocateOut)
async def create_advocate(
    body: AdvocateCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    _validate(body.status, ADVOCATE_STATUSES, "status")
    program = await svc.get_program(db, ctx.workspace.id, body.program_id)
    if program is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
    advocate = await svc.create_advocate(
        db,
        ctx.workspace.id,
        program_id=body.program_id,
        name=body.name,
        email=body.email,
        status=body.status,
    )
    await db.commit()
    await db.refresh(advocate)
    return advocate


@router.post("/advocates/{advocate_id}/outreach")
async def advocate_outreach(
    advocate_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await agent.outreach_copy(db, ctx.workspace.id, advocate_id)
    if result.get("error") == "advocate_not_found":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Advocate not found")
    return result


# --------------------------------------------------------------------------- #
# Conversions
# --------------------------------------------------------------------------- #
@router.get("/conversions", response_model=list[ConversionOut])
async def list_conversions(
    conv_status: str | None = Query(default=None, alias="status"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_conversions(db, ctx.workspace.id, conv_status)


@router.post("/conversions", response_model=ConversionOut)
async def create_conversion(
    body: ConversionCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    advocate = None
    if body.advocate_id is not None:
        advocate = await svc.get_advocate(db, ctx.workspace.id, body.advocate_id)
    elif body.code:
        advocate = await svc.get_advocate_by_code(db, ctx.workspace.id, body.code)
    if advocate is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Advocate not found")

    program = await svc.get_program(db, ctx.workspace.id, advocate.program_id)
    conversion = await svc.record_conversion(
        db,
        ctx.workspace.id,
        advocate=advocate,
        program=program,
        referred_email=body.referred_email,
        value=body.value,
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "referral.conversion",
        {
            "conversion_id": str(conversion.id),
            "advocate_id": str(advocate.id),
            "code": advocate.code,
            "value": float(conversion.value or 0.0),
            "reward": float(conversion.reward or 0.0),
        },
    )
    await db.commit()
    await db.refresh(conversion)
    return conversion


@router.post("/conversions/{conversion_id}/approve", response_model=ConversionOut)
async def approve_conversion(
    conversion_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    conversion = await svc.get_conversion(db, ctx.workspace.id, conversion_id)
    if conversion is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversion not found")
    conversion = await svc.approve_conversion(db, ctx.workspace.id, conversion)
    if float(conversion.reward or 0.0) > 0:
        await emit_event(
            db,
            ctx.workspace.id,
            "referral.payout.due",
            {
                "conversion_id": str(conversion.id),
                "advocate_id": str(conversion.advocate_id),
                "reward": float(conversion.reward or 0.0),
            },
        )
    await db.commit()
    await db.refresh(conversion)
    return conversion


# --------------------------------------------------------------------------- #
# Leaderboard + overview + autonomy
# --------------------------------------------------------------------------- #
@router.get("/leaderboard", response_model=list[AdvocateOut])
async def leaderboard(
    limit: int = Query(default=25, ge=1, le=100),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.leaderboard(db, ctx.workspace.id, limit)


@router.get("/overview", response_model=OverviewOut)
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.overview(db, ctx.workspace.id)


@router.post("/agent/run")
async def agent_run(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await agent.run_cycle(db, ctx.workspace.id)


# --------------------------------------------------------------------------- #
# Enterprise: Viral metrics
# --------------------------------------------------------------------------- #
@router.get("/viral-metrics")
async def viral_metrics(
    days: int = Query(default=90, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await enterprise_svc.viral_metrics(db, ctx.workspace.id, days)


# --------------------------------------------------------------------------- #
# Enterprise: Reward tiers
# --------------------------------------------------------------------------- #
@router.get("/reward-tiers", response_model=list[RewardTierOut])
async def list_reward_tiers(
    program_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await enterprise_svc.list_reward_tiers(db, ctx.workspace.id, program_id)


@router.post("/reward-tiers", response_model=RewardTierOut)
async def create_reward_tier(
    body: RewardTierCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    _validate(body.reward_type, REWARD_TYPES, "reward_type")
    tier = await enterprise_svc.create_reward_tier(
        db,
        ctx.workspace.id,
        program_id=body.program_id,
        name=body.name,
        milestone=body.milestone,
        reward_type=body.reward_type,
        reward_value=body.reward_value,
        description=body.description,
    )
    await db.commit()
    await db.refresh(tier)
    return tier


# --------------------------------------------------------------------------- #
# Enterprise: Advocate rewards
# --------------------------------------------------------------------------- #
@router.get(
    "/advocates/{advocate_id}/rewards", response_model=list[AdvocateRewardOut]
)
async def list_advocate_rewards(
    advocate_id: uuid.UUID,
    reward_status: str | None = Query(default=None, alias="status"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await enterprise_svc.list_advocate_rewards(
        db, ctx.workspace.id, advocate_id, reward_status
    )


@router.post("/advocates/{advocate_id}/compute-rewards")
async def compute_advocate_rewards(
    advocate_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    rewards = await enterprise_svc.compute_advocate_rewards(
        db, ctx.workspace.id, advocate_id
    )
    await db.commit()
    return rewards


@router.patch("/rewards/{reward_id}/status", response_model=AdvocateRewardOut)
async def update_reward_status(
    reward_id: uuid.UUID,
    body: RewardStatusBody,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    _validate(body.status, REWARD_STATUSES, "status")
    reward = await enterprise_svc.update_reward_status(
        db, ctx.workspace.id, reward_id, body.status
    )
    if reward is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reward not found")
    await db.commit()
    await db.refresh(reward)
    return reward


# --------------------------------------------------------------------------- #
# Enterprise: Fraud detection
# --------------------------------------------------------------------------- #
@router.post("/fraud/scan")
async def fraud_scan(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    result = await enterprise_svc.run_fraud_detection(db, ctx.workspace.id)
    await db.commit()
    return result


@router.get("/fraud/flags", response_model=list[FraudFlagOut])
async def list_fraud_flags(
    resolved: bool | None = Query(default=None),
    advocate_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await enterprise_svc.list_fraud_flags(
        db, ctx.workspace.id, resolved, advocate_id
    )


@router.post("/fraud/flags/{flag_id}/resolve", response_model=FraudFlagOut)
async def resolve_fraud_flag(
    flag_id: uuid.UUID,
    body: ResolveBody,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    flag = await enterprise_svc.resolve_fraud_flag(
        db, ctx.workspace.id, flag_id, body.resolved_by
    )
    if flag is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fraud flag not found")
    await db.commit()
    await db.refresh(flag)
    return flag


# --------------------------------------------------------------------------- #
# Enterprise: Analytics
# --------------------------------------------------------------------------- #
@router.get("/advocates/{advocate_id}/analytics")
async def advocate_analytics(
    advocate_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await enterprise_svc.advocate_analytics(db, ctx.workspace.id, advocate_id)


@router.get("/leaderboard/extended")
async def leaderboard_extended(
    limit: int = Query(default=25, ge=1, le=100),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await enterprise_svc.leaderboard_extended(db, ctx.workspace.id, limit)
