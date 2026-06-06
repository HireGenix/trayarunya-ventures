"""ABM (account-based marketing) routes: target accounts + AI-generated assets.

Thin router — persona/asset generation lives in ``app.services.abm``,
enterprise scoring/plays in ``app.services.abm_enterprise`` and
``app.agents.abm_agent``.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import AbmAccount, BrandBrain, Strategy
from app.models.abm_play import AbmPlay, AbmPlayEnrollment, AbmPlayStep
from app.services.abm import generate_assets, generate_personas
from app.services import abm_enterprise as abm_svc
from app.agents import abm_agent

router = APIRouter(prefix="/abm", tags=["abm"])

_VALID_TIERS = {"tier_1", "tier_2", "tier_3"}
_VALID_STAGES = {"new", "researching", "engaging", "opportunity", "won", "lost"}


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class AccountCreate(BaseModel):
    company: str = Field(min_length=1, max_length=300)
    website: str | None = Field(default=None, max_length=500)
    industry: str | None = Field(default=None, max_length=160)
    tier: str | None = Field(default=None)
    notes: str | None = None


class AccountBulkCreate(BaseModel):
    accounts: list[AccountCreate] = Field(min_length=1)


class AccountUpdate(BaseModel):
    stage: str | None = None
    tier: str | None = None
    notes: str | None = None
    firmographics: dict[str, Any] | None = None


class AccountOut(BaseModel):
    id: uuid.UUID
    company: str
    website: str | None = None
    industry: str | None = None
    tier: str
    stage: str
    notes: str | None = None
    firmographics: dict[str, Any] | None = None
    personas: list[Any] | None = None
    assets: dict[str, Any] | None = None
    fit_score: float | None = None
    intent_score: float | None = None
    fit_factors: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


class PlayStepIn(BaseModel):
    channel: str = Field(max_length=40)
    subject: str | None = Field(default=None, max_length=400)
    body: str | None = None
    delay_days: int = 0
    config: dict[str, Any] | None = None


class PlayCreate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    description: str | None = None
    steps: list[PlayStepIn] | None = None


class PlayUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class PlayStepOut(BaseModel):
    id: uuid.UUID
    ordinal: int
    channel: str
    subject: str | None = None
    body: str | None = None
    delay_days: int = 0
    config: dict[str, Any] | None = None
    model_config = {"from_attributes": True}


class PlayOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    status: str
    step_summary: list[Any] | None = None
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class EnrollmentOut(BaseModel):
    id: uuid.UUID
    play_id: uuid.UUID
    account_id: uuid.UUID
    status: str
    current_step: int = 0
    started_at: datetime | None = None
    completed_at: datetime | None = None
    model_config = {"from_attributes": True}


class EnrollRequest(BaseModel):
    account_id: uuid.UUID


class AdvanceRequest(BaseModel):
    action: str = "advance"


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _validate_tier(tier: str | None) -> None:
    if tier is not None and tier not in _VALID_TIERS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid tier '{tier}'. Expected one of {sorted(_VALID_TIERS)}",
        )


def _validate_stage(stage: str | None) -> None:
    if stage is not None and stage not in _VALID_STAGES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Invalid stage '{stage}'. Expected one of {sorted(_VALID_STAGES)}",
        )


async def _get_account(
    db: AsyncSession, ctx: WorkspaceContext, account_id: uuid.UUID
) -> AbmAccount:
    account = await db.get(AbmAccount, account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    return account


async def _load_brand(db: AsyncSession, ctx: WorkspaceContext) -> dict[str, Any] | None:
    brand_row = (
        await db.execute(
            select(BrandBrain).where(BrandBrain.workspace_id == ctx.workspace.id)
        )
    ).scalar_one_or_none()
    if brand_row is None:
        return None
    brand: dict[str, Any] = {
        "value_prop": brand_row.value_prop,
        "mission": brand_row.mission,
        "voice": brand_row.voice,
        "audience": brand_row.audience,
        "keywords": brand_row.keywords,
    }
    strategy_row = (
        await db.execute(
            select(Strategy)
            .where(Strategy.workspace_id == ctx.workspace.id)
            .order_by(Strategy.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if strategy_row is not None:
        brand["positioning"] = strategy_row.positioning
    return brand


# --------------------------------------------------------------------------- #
# CRUD
# --------------------------------------------------------------------------- #
@router.get("/accounts", response_model=list[AccountOut])
async def list_accounts(
    stage: str | None = Query(default=None),
    tier: str | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AccountOut]:
    _validate_stage(stage)
    _validate_tier(tier)
    stmt = select(AbmAccount).where(AbmAccount.workspace_id == ctx.workspace.id)
    if stage:
        stmt = stmt.where(AbmAccount.stage == stage)
    if tier:
        stmt = stmt.where(AbmAccount.tier == tier)
    stmt = stmt.order_by(AbmAccount.created_at.desc())
    res = await db.execute(stmt)
    return [AccountOut.model_validate(a) for a in res.scalars().all()]


@router.post(
    "/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED
)
async def create_account(
    data: AccountCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    _validate_tier(data.tier)
    account = AbmAccount(
        workspace_id=ctx.workspace.id,
        company=data.company,
        website=data.website,
        industry=data.industry,
        tier=data.tier or "tier_2",
        notes=data.notes,
    )
    db.add(account)
    await db.flush()
    return AccountOut.model_validate(account)


@router.post(
    "/accounts/bulk",
    response_model=list[AccountOut],
    status_code=status.HTTP_201_CREATED,
)
async def bulk_create_accounts(
    data: AccountBulkCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AccountOut]:
    created: list[AbmAccount] = []
    for item in data.accounts:
        _validate_tier(item.tier)
        account = AbmAccount(
            workspace_id=ctx.workspace.id,
            company=item.company,
            website=item.website,
            industry=item.industry,
            tier=item.tier or "tier_2",
            notes=item.notes,
        )
        db.add(account)
        created.append(account)
    await db.flush()
    return [AccountOut.model_validate(a) for a in created]


@router.get("/accounts/{account_id}", response_model=AccountOut)
async def get_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    account = await _get_account(db, ctx, account_id)
    return AccountOut.model_validate(account)


@router.patch("/accounts/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    account = await _get_account(db, ctx, account_id)
    _validate_stage(data.stage)
    _validate_tier(data.tier)
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(account, field, value)
    await db.flush()
    return AccountOut.model_validate(account)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    account = await _get_account(db, ctx, account_id)
    await db.delete(account)


# --------------------------------------------------------------------------- #
# AI generation
# --------------------------------------------------------------------------- #
@router.post("/accounts/{account_id}/personas", response_model=list[Any])
async def generate_account_personas(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[Any]:
    account = await _get_account(db, ctx, account_id)
    brand = await _load_brand(db, ctx)
    personas = await generate_personas(
        company=account.company,
        industry=account.industry,
        tier=account.tier,
        firmographics=account.firmographics,
        notes=account.notes,
        brand=brand,
    )
    account.personas = personas
    await db.flush()
    return personas


@router.post("/accounts/{account_id}/assets", response_model=dict)
async def generate_account_assets(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    account = await _get_account(db, ctx, account_id)
    brand = await _load_brand(db, ctx)
    assets = await generate_assets(
        company=account.company,
        industry=account.industry,
        tier=account.tier,
        firmographics=account.firmographics,
        notes=account.notes,
        personas=account.personas,
        brand=brand,
    )
    account.assets = assets
    await db.flush()
    return assets


# --------------------------------------------------------------------------- #
# Scoring & tiering
# --------------------------------------------------------------------------- #
@router.post("/accounts/score-all", response_model=dict)
async def score_all(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Batch recompute fit + intent + tier for every account."""
    return await abm_agent.score_accounts(db, ctx.workspace.id)


@router.get("/accounts/{account_id}/score", response_model=dict)
async def get_account_score(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Get detailed fit + intent score breakdown for one account."""
    from app.models.icp import ICPProfile

    account = await _get_account(db, ctx, account_id)
    icp = (
        await db.execute(
            select(ICPProfile).where(ICPProfile.workspace_id == ctx.workspace.id)
        )
    ).scalar_one_or_none()
    result = await abm_svc.score_and_tier_account(db, ctx.workspace.id, account, icp)
    await db.flush()
    return result


@router.get("/priority-matrix", response_model=list)
async def priority_matrix(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return all accounts with fit/intent coordinates for the scatter chart."""
    stmt = (
        select(AbmAccount)
        .where(AbmAccount.workspace_id == ctx.workspace.id)
        .order_by(AbmAccount.created_at.desc())
    )
    accounts = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(a.id),
            "company": a.company,
            "tier": a.tier,
            "stage": a.stage,
            "fit_score": a.fit_score or 0,
            "intent_score": a.intent_score or 0,
        }
        for a in accounts
    ]


# --------------------------------------------------------------------------- #
# Play copy recommendation
# --------------------------------------------------------------------------- #
@router.post("/accounts/{account_id}/recommend-play", response_model=dict)
async def recommend_play(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await abm_agent.recommend_play_copy(db, ctx.workspace.id, account_id)


@router.post("/suggest-play", response_model=dict)
async def suggest_play_template(
    tier: str = Query(default="tier_2"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await abm_agent.suggest_play(db, ctx.workspace.id, tier)


# --------------------------------------------------------------------------- #
# Play CRUD
# --------------------------------------------------------------------------- #
@router.post("/plays", response_model=PlayOut, status_code=status.HTTP_201_CREATED)
async def create_play(
    data: PlayCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> PlayOut:
    steps = [s.model_dump() for s in data.steps] if data.steps else None
    play = await abm_svc.create_play(
        db, ctx.workspace.id, data.name, data.description, steps
    )
    return PlayOut.model_validate(play)


@router.get("/plays", response_model=list[PlayOut])
async def list_plays(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[PlayOut]:
    plays = await abm_svc.list_plays(db, ctx.workspace.id)
    return [PlayOut.model_validate(p) for p in plays]


@router.get("/plays/{play_id}", response_model=PlayOut)
async def get_play(
    play_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> PlayOut:
    play = await abm_svc.get_play(db, ctx.workspace.id, play_id)
    if play is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Play not found")
    return PlayOut.model_validate(play)


@router.patch("/plays/{play_id}", response_model=PlayOut)
async def update_play(
    play_id: uuid.UUID,
    data: PlayUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> PlayOut:
    play = await abm_svc.get_play(db, ctx.workspace.id, play_id)
    if play is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Play not found")
    play = await abm_svc.update_play(db, play, **data.model_dump(exclude_unset=True))
    return PlayOut.model_validate(play)


@router.delete("/plays/{play_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_play_endpoint(
    play_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    play = await abm_svc.get_play(db, ctx.workspace.id, play_id)
    if play is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Play not found")
    await abm_svc.delete_play(db, play)


@router.get("/plays/{play_id}/steps", response_model=list[PlayStepOut])
async def get_play_steps(
    play_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[PlayStepOut]:
    play = await abm_svc.get_play(db, ctx.workspace.id, play_id)
    if play is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Play not found")
    steps = await abm_svc.get_play_steps(db, play_id)
    return [PlayStepOut.model_validate(s) for s in steps]


# --------------------------------------------------------------------------- #
# Enrollment
# --------------------------------------------------------------------------- #
@router.post(
    "/plays/{play_id}/enroll",
    response_model=EnrollmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def enroll_account(
    play_id: uuid.UUID,
    data: EnrollRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> EnrollmentOut:
    play = await abm_svc.get_play(db, ctx.workspace.id, play_id)
    if play is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Play not found")
    account = await db.get(AbmAccount, data.account_id)
    if account is None or account.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
    enrollment = await abm_svc.enroll_account(
        db, ctx.workspace.id, play_id, data.account_id
    )
    return EnrollmentOut.model_validate(enrollment)


@router.get("/plays/{play_id}/enrollments", response_model=list[EnrollmentOut])
async def list_play_enrollments(
    play_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[EnrollmentOut]:
    enrollments = await abm_svc.list_enrollments(
        db, ctx.workspace.id, play_id=play_id
    )
    return [EnrollmentOut.model_validate(e) for e in enrollments]


@router.get("/accounts/{account_id}/enrollments", response_model=list[EnrollmentOut])
async def list_account_enrollments(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[EnrollmentOut]:
    enrollments = await abm_svc.list_enrollments(
        db, ctx.workspace.id, account_id=account_id
    )
    return [EnrollmentOut.model_validate(e) for e in enrollments]


@router.patch(
    "/enrollments/{enrollment_id}",
    response_model=EnrollmentOut,
)
async def advance_enrollment(
    enrollment_id: uuid.UUID,
    data: AdvanceRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> EnrollmentOut:
    enrollment = await db.get(AbmPlayEnrollment, enrollment_id)
    if enrollment is None or enrollment.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrollment not found")
    enrollment = await abm_svc.advance_enrollment(db, enrollment, data.action)
    return EnrollmentOut.model_validate(enrollment)
