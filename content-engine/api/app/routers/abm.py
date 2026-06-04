"""ABM (account-based marketing) routes: target accounts + AI-generated assets.

Thin router — persona/asset generation lives in ``app.services.abm``.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import AbmAccount, BrandBrain, Strategy
from app.services.abm import generate_assets, generate_personas

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

    model_config = {"from_attributes": True}


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


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
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
