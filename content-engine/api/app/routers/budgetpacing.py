"""Budget pacing API (prefix /budget-pacing): cross-channel budget pacing and an
agentic spend optimizer. Every query is workspace-scoped. Pydantic schemas are
defined inline per the module recipe."""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import budgetpacing_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import budgetpacing as svc
from app.services.automation import emit_event

router = APIRouter(prefix="/budget-pacing", tags=["budget-pacing"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    period: str
    total_amount: float
    start_date: date
    end_date: date
    channels: dict[str, float] | None = None
    status: str


class BudgetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    period: str = Field(default="monthly")
    total_amount: float = Field(ge=0)
    start_date: date
    end_date: date
    channels: dict[str, float] | None = None


class BudgetDetailOut(BaseModel):
    budget: BudgetOut
    pacing: dict
    efficiency: dict


class SpendIn(BaseModel):
    channel: str = Field(default="other")
    amount: float = Field(ge=0)
    date: date
    budget_id: uuid.UUID | None = None


class SpendOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    channel: str
    amount: float
    date: date
    source: str
    budget_id: uuid.UUID | None = None


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    budget_id: uuid.UUID | None = None
    kind: str
    detail: str | None = None
    severity: str
    status: str


class ProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    budget_id: uuid.UUID | None = None
    moves: list[dict] | None = None
    projected_lift: float | None = None
    status: str
    rationale: str | None = None


class ReallocateIn(BaseModel):
    autonomy: str = Field(default="suggest")


# --------------------------------------------------------------------------- #
# Budgets
# --------------------------------------------------------------------------- #
@router.get("/budgets", response_model=list[BudgetOut])
async def list_budgets(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_budgets(db, ctx.workspace.id)


@router.post("/budgets", response_model=BudgetOut)
async def create_budget(
    body: BudgetCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    if body.end_date < body.start_date:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "end_date before start_date")
    obj = await svc.create_budget(
        db,
        ctx.workspace.id,
        name=body.name,
        period=body.period,
        total_amount=body.total_amount,
        start_date=body.start_date,
        end_date=body.end_date,
        channels=body.channels,
    )
    await emit_event(
        db, ctx.workspace.id, "budget.created", {"id": str(obj.id), "name": obj.name}
    )
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/budgets/{budget_id}", response_model=BudgetDetailOut)
async def get_budget(
    budget_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    budget = await svc.get_budget(db, ctx.workspace.id, budget_id)
    if budget is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget not found")
    pacing = await svc.compute_pacing(db, ctx.workspace.id, budget)
    efficiency = await svc.channel_efficiency(db, ctx.workspace.id, budget)
    return BudgetDetailOut(
        budget=BudgetOut.model_validate(budget),
        pacing=pacing,
        efficiency=efficiency,
    )


# --------------------------------------------------------------------------- #
# Spend
# --------------------------------------------------------------------------- #
@router.post("/spend", response_model=SpendOut)
async def add_spend(
    body: SpendIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    if body.budget_id is not None:
        budget = await svc.get_budget(db, ctx.workspace.id, body.budget_id)
        if budget is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget not found")
    rec = await svc.add_manual_spend(
        db,
        ctx.workspace.id,
        channel=body.channel,
        amount=body.amount,
        on_date=body.date,
        budget_id=body.budget_id,
    )
    await db.commit()
    await db.refresh(rec)
    return rec


@router.post("/budgets/{budget_id}/sync")
async def sync_budget(
    budget_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    budget = await svc.get_budget(db, ctx.workspace.id, budget_id)
    if budget is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget not found")
    result = await svc.sync_ads_spend(db, ctx.workspace.id, budget)
    await db.commit()
    return result


# --------------------------------------------------------------------------- #
# Reallocation (agentic)
# --------------------------------------------------------------------------- #
@router.post("/budgets/{budget_id}/reallocate", response_model=ProposalOut)
async def reallocate(
    budget_id: uuid.UUID,
    body: ReallocateIn | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    budget = await svc.get_budget(db, ctx.workspace.id, budget_id)
    if budget is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Budget not found")
    autonomy = (body.autonomy if body else "suggest") or "suggest"
    data = await agent.recommend_reallocation(db, ctx.workspace.id, budget_id)
    proposal = await agent._persist_proposal(
        db, ctx.workspace.id, budget, data, autonomy=autonomy
    )
    if proposal is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "No reallocation moves could be derived from current data",
        )
    await emit_event(
        db,
        ctx.workspace.id,
        "budget.reallocated",
        {
            "budget_id": str(budget_id),
            "proposal_id": str(proposal.id),
            "projected_lift": proposal.projected_lift,
        },
    )
    await db.commit()
    await db.refresh(proposal)
    return proposal


@router.post("/proposals/{proposal_id}/apply", response_model=ProposalOut)
async def apply_proposal(
    proposal_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    proposal = await svc.get_proposal(db, ctx.workspace.id, proposal_id)
    if proposal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Proposal not found")
    await svc.apply_proposal(db, ctx.workspace.id, proposal)
    await emit_event(
        db,
        ctx.workspace.id,
        "budget.reallocated",
        {"proposal_id": str(proposal.id), "applied": True},
    )
    await db.commit()
    await db.refresh(proposal)
    return proposal


# --------------------------------------------------------------------------- #
# Alerts & overview
# --------------------------------------------------------------------------- #
@router.get("/alerts", response_model=list[AlertOut])
async def list_alerts(
    status_filter: str | None = Query(default=None, alias="status"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_alerts(db, ctx.workspace.id, status=status_filter)


@router.get("/proposals", response_model=list[ProposalOut])
async def list_proposals(
    budget_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_proposals(db, ctx.workspace.id, budget_id=budget_id)


@router.get("/overview")
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    data = await svc.overview(db, ctx.workspace.id)
    # Emit an overspend signal when the rolled-up projection breaches the budget.
    if data["projected_variance"] > 0 and data["total_budget"] > 0:
        await emit_event(
            db,
            ctx.workspace.id,
            "budget.overspend",
            {
                "projected_variance": data["projected_variance"],
                "total_budget": data["total_budget"],
            },
        )
        await db.commit()
    return data


@router.post("/agent/run")
async def agent_run(
    body: ReallocateIn | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    autonomy = (body.autonomy if body else "suggest") or "suggest"
    result = await agent.run_cycle(db, ctx.workspace.id, autonomy=autonomy)
    await db.commit()
    return result
