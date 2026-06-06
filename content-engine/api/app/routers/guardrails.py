"""Guardrails API — brand-voice & compliance checking, policies, analytics.

All endpoints are workspace-scoped via the standard bearer + ``X-Workspace-Id``
path. Final paths become ``/api/v1/guardrails/...``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents import guardrails_agent as agent
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models.guardrails import POLICY_KINDS, SEVERITIES
from app.services import guardrails as svc
from app.services.automation import emit_event

router = APIRouter(prefix="/guardrails", tags=["guardrails"])


# --------------------------------------------------------------------------- #
# Schemas (inline, like routers/cro.py)
# --------------------------------------------------------------------------- #
class PolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    kind: str
    config: dict | None = None
    severity: str
    is_active: bool
    created_at: datetime


class PolicyIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: str = Field(default="voice")
    config: dict | None = None
    severity: str = Field(default="medium")
    is_active: bool = True


class PolicyPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    kind: str | None = None
    config: dict | None = None
    severity: str | None = None
    is_active: bool | None = None


class ViolationOut(BaseModel):
    policy: str
    severity: str
    span: list[int] | None = None
    message: str
    suggestion: str | None = None


class CheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    content_ref: str | None = None
    content_text: str
    policies_run: list | None = None
    score: int
    passed: bool
    violations: list | None = None
    status: str
    created_at: datetime


class CheckIn(BaseModel):
    content_text: str = Field(min_length=1)
    content_ref: str | None = Field(default=None, max_length=200)


class AutofixIn(BaseModel):
    content_text: str = Field(min_length=1)


class AutofixOut(BaseModel):
    fixed_text: str
    notes: str
    ai_used: bool


class OverviewOut(BaseModel):
    checks_run: int
    passed: int
    pass_rate: float
    avg_brand_fit: float
    open_violations: int
    active_policies: int
    top_violations: list[dict]


def _validate_kind_severity(kind: str | None, severity: str | None) -> None:
    if kind is not None and kind not in POLICY_KINDS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid kind '{kind}'")
    if severity is not None and severity not in SEVERITIES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid severity '{severity}'"
        )


# --------------------------------------------------------------------------- #
# Checking (AI)
# --------------------------------------------------------------------------- #
@router.post("/check", response_model=CheckOut)
async def run_check(
    body: CheckIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CheckOut:
    ws_id = ctx.workspace.id
    policies = await svc.active_policies(db, ws_id)
    result = await agent.evaluate(db, ws_id, body.content_text, policies)
    check = await svc.save_check(
        db,
        ws_id,
        content_text=body.content_text,
        content_ref=body.content_ref,
        policies_run=[p.name for p in policies],
        score=result["score"],
        passed=result["passed"],
        violations=result["violations"],
    )
    await emit_event(
        db,
        ws_id,
        "content.checked",
        {"check_id": str(check.id), "score": check.score, "passed": check.passed},
    )
    if not check.passed or check.violations:
        await emit_event(
            db,
            ws_id,
            "guardrail.violation",
            {
                "check_id": str(check.id),
                "score": check.score,
                "violations": len(check.violations or []),
            },
        )
    await db.commit()
    await db.refresh(check)
    return check


@router.get("/checks", response_model=list[CheckOut])
async def list_checks(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[CheckOut]:
    return await svc.list_checks(db, ctx.workspace.id)


@router.get("/checks/{check_id}", response_model=CheckOut)
async def get_check(
    check_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CheckOut:
    check = await svc.get_check(db, ctx.workspace.id, check_id)
    if check is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Check not found")
    return check


@router.post("/autofix", response_model=AutofixOut)
async def autofix(
    body: AutofixIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AutofixOut:
    result = await agent.autofix(db, ctx.workspace.id, body.content_text)
    await emit_event(
        db,
        ctx.workspace.id,
        "content.checked",
        {"action": "autofix", "ai_used": result["ai_used"]},
    )
    await db.commit()
    return AutofixOut(**result)


# --------------------------------------------------------------------------- #
# Policies
# --------------------------------------------------------------------------- #
@router.get("/policies", response_model=list[PolicyOut])
async def list_policies(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[PolicyOut]:
    return await svc.list_policies(db, ctx.workspace.id)


@router.post("/policies", response_model=PolicyOut)
async def create_policy(
    body: PolicyIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> PolicyOut:
    _validate_kind_severity(body.kind, body.severity)
    policy = await svc.create_policy(
        db,
        ctx.workspace.id,
        name=body.name,
        kind=body.kind,
        config=body.config,
        severity=body.severity,
        is_active=body.is_active,
    )
    await emit_event(
        db, ctx.workspace.id, "guardrail.policy_created", {"policy_id": str(policy.id)}
    )
    await db.commit()
    await db.refresh(policy)
    return policy


@router.patch("/policies/{policy_id}", response_model=PolicyOut)
async def update_policy(
    policy_id: uuid.UUID,
    body: PolicyPatch,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> PolicyOut:
    _validate_kind_severity(body.kind, body.severity)
    policy = await svc.get_policy(db, ctx.workspace.id, policy_id)
    if policy is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Policy not found")
    policy = await svc.update_policy(db, policy, body.model_dump(exclude_unset=True))
    await db.commit()
    await db.refresh(policy)
    return policy


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #
@router.get("/overview", response_model=OverviewOut)
async def overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> OverviewOut:
    data = await svc.overview(db, ctx.workspace.id)
    return OverviewOut(**data)
