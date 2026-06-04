"""LinkedIn Growth Copilot routes.

Policy-safe human-in-the-loop workflow:
- users define objective + ICP,
- open LinkedIn in a separate human-controlled window,
- paste/profile-snapshot visible text or screenshot notes,
- AI returns score, rewrites and manual action items.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import LinkedInActionItem, LinkedInGrowthProfile, LinkedInProfileAudit
from app.services.linkedin_growth import OBJECTIVES, POLICY_GUARDRAILS, audit_profile, browser_session, normalize_objective

router = APIRouter(prefix="/linkedin-growth", tags=["linkedin-growth"])

_ACTION_STATUSES = {"open", "in_progress", "done", "dismissed"}


class ProfileIn(BaseModel):
    account_label: str = Field(min_length=1, max_length=200)
    profile_url: str | None = Field(default=None, max_length=600)
    objective: str | None = None
    icp: dict[str, Any] | None = None
    offer: str | None = None
    voice: str | None = None


class ProfilePatch(BaseModel):
    account_label: str | None = Field(default=None, min_length=1, max_length=200)
    profile_url: str | None = Field(default=None, max_length=600)
    objective: str | None = None
    icp: dict[str, Any] | None = None
    offer: str | None = None
    voice: str | None = None
    status: str | None = None


class ProfileOut(BaseModel):
    id: uuid.UUID
    account_label: str
    profile_url: str | None
    objective: str
    icp: dict[str, Any] | None
    offer: str | None
    voice: str | None
    status: str
    latest_score: float | None
    latest_grade: str | None
    latest_audit: dict[str, Any] | None
    latest_audit_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class SnapshotIn(BaseModel):
    headline: str | None = None
    banner_notes: str | None = None
    about: str | None = None
    featured: str | None = None
    experience: str | None = None
    proof: str | None = None
    recent_posts: str | None = None
    cta: str | None = None
    profile_image_notes: str | None = None
    vision_notes: str | None = None
    screenshot_notes: str | None = None


class AuditOut(BaseModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    snapshot: dict[str, Any]
    objective_context: dict[str, Any]
    score: float
    grade: str
    findings: dict[str, Any]
    recommendations: list[Any]
    drafts: dict[str, Any]
    compliance: dict[str, Any]
    created_by_name: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class ActionOut(BaseModel):
    id: uuid.UUID
    profile_id: uuid.UUID
    audit_id: uuid.UUID | None
    section: str
    title: str
    detail: str | None
    priority: str
    status: str
    suggested_copy: str | None
    policy_note: str | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class ActionPatch(BaseModel):
    status: str


class BrowserSessionIn(BaseModel):
    profile_url: str | None = None


async def _get_profile(db: AsyncSession, ctx: WorkspaceContext, profile_id: uuid.UUID) -> LinkedInGrowthProfile:
    profile = await db.get(LinkedInGrowthProfile, profile_id)
    if profile is None or profile.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "LinkedIn profile not found")
    return profile


def _objective_context(profile: LinkedInGrowthProfile) -> dict[str, Any]:
    return {
        "objective": profile.objective,
        "icp": profile.icp or {},
        "offer": profile.offer,
        "voice": profile.voice,
        "account_label": profile.account_label,
        "profile_url": profile.profile_url,
    }


@router.get("/playbook")
async def playbook() -> dict[str, Any]:
    return {
        "objectives": OBJECTIVES,
        "guardrails": POLICY_GUARDRAILS,
        "sections": ["headline", "banner", "about", "featured", "experience", "proof", "content", "cta"],
        "policy_safe_mode": "human_in_the_loop",
        "browser_note": "LinkedIn blocks iframe embedding. Open it in a separate human-controlled window; AI guides only.",
    }


@router.get("/profiles", response_model=list[ProfileOut])
async def list_profiles(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ProfileOut]:
    res = await db.execute(
        select(LinkedInGrowthProfile)
        .where(LinkedInGrowthProfile.workspace_id == ctx.workspace.id)
        .order_by(LinkedInGrowthProfile.updated_at.desc())
    )
    return [ProfileOut.model_validate(p) for p in res.scalars().all()]


@router.post("/profiles", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(
    data: ProfileIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    profile = LinkedInGrowthProfile(
        workspace_id=ctx.workspace.id,
        owner_id=ctx.user.id,
        account_label=data.account_label,
        profile_url=data.profile_url,
        objective=normalize_objective(data.objective),
        icp=data.icp or {},
        offer=data.offer,
        voice=data.voice,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.get("/profiles/{profile_id}", response_model=ProfileOut)
async def get_profile(
    profile_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    return ProfileOut.model_validate(await _get_profile(db, ctx, profile_id))


@router.patch("/profiles/{profile_id}", response_model=ProfileOut)
async def update_profile(
    profile_id: uuid.UUID,
    data: ProfilePatch,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ProfileOut:
    profile = await _get_profile(db, ctx, profile_id)
    payload = data.model_dump(exclude_unset=True)
    if "objective" in payload and payload["objective"] is not None:
        payload["objective"] = normalize_objective(payload["objective"])
    for field, value in payload.items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.delete("/profiles/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    profile = await _get_profile(db, ctx, profile_id)
    await db.delete(profile)
    await db.commit()


@router.post("/profiles/{profile_id}/audit", response_model=AuditOut, status_code=status.HTTP_201_CREATED)
async def run_audit(
    profile_id: uuid.UUID,
    snapshot: SnapshotIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AuditOut:
    profile = await _get_profile(db, ctx, profile_id)
    snap = snapshot.model_dump(exclude_none=True)
    objective = _objective_context(profile)
    result = await audit_profile(snap, objective)
    audit = LinkedInProfileAudit(
        workspace_id=ctx.workspace.id,
        profile_id=profile.id,
        created_by_id=ctx.user.id,
        created_by_name=ctx.user.full_name or ctx.user.email,
        snapshot=snap,
        objective_context=objective,
        score=float(result["score"]),
        grade=result["grade"],
        findings=result["findings"],
        recommendations=result["recommendations"],
        drafts=result["drafts"],
        compliance=result["compliance"],
    )
    db.add(audit)
    await db.flush()
    for rec in result["recommendations"]:
        if not isinstance(rec, dict):
            continue
        db.add(
            LinkedInActionItem(
                workspace_id=ctx.workspace.id,
                profile_id=profile.id,
                audit_id=audit.id,
                section=str(rec.get("section") or "profile")[:80],
                title=str(rec.get("title") or "Improve LinkedIn profile")[:240],
                detail=rec.get("detail"),
                priority=str(rec.get("priority") or "medium"),
                suggested_copy=rec.get("suggested_copy"),
                policy_note=rec.get("policy_note") or "Manual human-reviewed action only.",
            )
        )
    profile.latest_score = audit.score
    profile.latest_grade = audit.grade
    profile.latest_audit = {
        "findings": audit.findings,
        "recommendations": audit.recommendations,
        "drafts": audit.drafts,
        "compliance": audit.compliance,
    }
    profile.latest_audit_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(audit)
    return AuditOut.model_validate(audit)


@router.get("/profiles/{profile_id}/audits", response_model=list[AuditOut])
async def list_audits(
    profile_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AuditOut]:
    profile = await _get_profile(db, ctx, profile_id)
    res = await db.execute(
        select(LinkedInProfileAudit)
        .where(LinkedInProfileAudit.workspace_id == ctx.workspace.id, LinkedInProfileAudit.profile_id == profile.id)
        .order_by(LinkedInProfileAudit.created_at.desc())
    )
    return [AuditOut.model_validate(a) for a in res.scalars().all()]


@router.get("/profiles/{profile_id}/actions", response_model=list[ActionOut])
async def list_actions(
    profile_id: uuid.UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ActionOut]:
    profile = await _get_profile(db, ctx, profile_id)
    stmt = select(LinkedInActionItem).where(
        LinkedInActionItem.workspace_id == ctx.workspace.id,
        LinkedInActionItem.profile_id == profile.id,
    )
    if status_filter:
        if status_filter not in _ACTION_STATUSES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid action status")
        stmt = stmt.where(LinkedInActionItem.status == status_filter)
    stmt = stmt.order_by(LinkedInActionItem.created_at.desc())
    res = await db.execute(stmt)
    return [ActionOut.model_validate(a) for a in res.scalars().all()]


@router.patch("/actions/{action_id}", response_model=ActionOut)
async def update_action(
    action_id: uuid.UUID,
    data: ActionPatch,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ActionOut:
    if data.status not in _ACTION_STATUSES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid action status")
    action = await db.get(LinkedInActionItem, action_id)
    if action is None or action.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action not found")
    action.status = data.status
    await db.commit()
    await db.refresh(action)
    return ActionOut.model_validate(action)


@router.post("/browser-session")
async def start_browser_session(data: BrowserSessionIn) -> dict[str, Any]:
    return browser_session(data.profile_url)
