"""LinkedIn platform routes — accounts, leads, pipeline, observations, tasks, outreach.

Backs the AI-guided, human-operated LinkedIn Copilot desktop app. Strictly
human-in-the-loop and policy-safe: the API stores leads/observations and returns
AI suggestions; it never performs LinkedIn actions and never stores credentials.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx, require_role
from app.models import (
    LeadObservation,
    LeadStageEvent,
    LeadTask,
    LinkedInAccount,
    LinkedInLead,
    OutreachSequence,
    OutreachStep,
    Role,
)
from app.services import linkedin_platform as svc

router = APIRouter(prefix="/linkedin", tags=["linkedin-platform"])

_MUTATE = (Role.owner, Role.admin, Role.manager, Role.editor)
_TASK_STATUSES = {"pending", "snoozed", "done", "skipped"}


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class AccountIn(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    profile_url: str | None = Field(default=None, max_length=600)
    objective: str | None = None
    icp: dict[str, Any] | None = None
    offer: str | None = None
    voice: str | None = None
    session_partition: str | None = Field(default=None, max_length=120)
    proxy_url: str | None = Field(default=None, max_length=400)
    daily_connect_cap: int | None = Field(default=None, ge=0, le=100)
    daily_message_cap: int | None = Field(default=None, ge=0, le=200)


class AccountPatch(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=200)
    profile_url: str | None = Field(default=None, max_length=600)
    objective: str | None = None
    icp: dict[str, Any] | None = None
    offer: str | None = None
    voice: str | None = None
    session_partition: str | None = Field(default=None, max_length=120)
    proxy_url: str | None = Field(default=None, max_length=400)
    status: str | None = None
    daily_connect_cap: int | None = Field(default=None, ge=0, le=100)
    daily_message_cap: int | None = Field(default=None, ge=0, le=200)


class AccountOut(BaseModel):
    id: uuid.UUID
    label: str
    profile_url: str | None
    objective: str
    icp: dict[str, Any] | None
    offer: str | None
    voice: str | None
    session_partition: str | None
    proxy_url: str | None
    status: str
    daily_connect_cap: int
    daily_message_cap: int
    last_active_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class LeadIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=240)
    headline: str | None = Field(default=None, max_length=600)
    company: str | None = Field(default=None, max_length=240)
    role_title: str | None = Field(default=None, max_length=240)
    location: str | None = Field(default=None, max_length=240)
    profile_url: str | None = Field(default=None, max_length=600)
    email: str | None = Field(default=None, max_length=320)
    account_id: uuid.UUID | None = None
    stage: str | None = None
    priority: str | None = None
    tags: list[str] | None = None
    enrichment: dict[str, Any] | None = None
    notes: str | None = None
    source: str | None = Field(default=None, max_length=80)


class LeadPatch(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=240)
    headline: str | None = Field(default=None, max_length=600)
    company: str | None = Field(default=None, max_length=240)
    role_title: str | None = Field(default=None, max_length=240)
    location: str | None = Field(default=None, max_length=240)
    profile_url: str | None = Field(default=None, max_length=600)
    email: str | None = Field(default=None, max_length=320)
    account_id: uuid.UUID | None = None
    priority: str | None = None
    tags: list[str] | None = None
    enrichment: dict[str, Any] | None = None
    notes: str | None = None
    score: float | None = None


class LeadOut(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID | None
    full_name: str
    headline: str | None
    company: str | None
    role_title: str | None
    location: str | None
    profile_url: str | None
    email: str | None
    stage: str
    score: float | None
    priority: str
    tags: list[Any] | None
    enrichment: dict[str, Any] | None
    notes: str | None
    source: str | None
    connect_count: int
    message_count: int
    last_action_at: datetime | None
    next_action_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class LeadImportIn(BaseModel):
    csv_content: str = Field(min_length=1)
    account_id: uuid.UUID | None = None
    source: str | None = "csv_import"


class StageIn(BaseModel):
    to_stage: str
    reason: str | None = None
    override: bool = False


class NextActionIn(BaseModel):
    use_llm: bool = True
    create_task: bool = False


class ObserveIn(BaseModel):
    images: list[str] | None = None
    dom_text: str | None = None
    persist: bool = True


class TaskIn(BaseModel):
    task_type: str = "research"
    title: str = Field(min_length=1, max_length=240)
    detail: str | None = None
    suggested_copy: str | None = None
    policy_note: str | None = None
    priority: str | None = "medium"
    sequence_step_id: uuid.UUID | None = None
    due_date: str | None = None


class TaskPatch(BaseModel):
    status: str | None = None
    title: str | None = Field(default=None, max_length=240)
    detail: str | None = None
    suggested_copy: str | None = None
    priority: str | None = None
    due_date: str | None = None


class TaskOut(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    account_id: uuid.UUID | None
    sequence_step_id: uuid.UUID | None
    task_type: str
    title: str
    detail: str | None
    suggested_copy: str | None
    policy_note: str | None
    priority: str
    status: str
    due_date: Any | None
    completed_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class StepIn(BaseModel):
    step_order: int = 0
    channel: str = "linkedin"
    action_type: str = "message"
    day_offset: int = 0
    template: str | None = None
    notes: str | None = None


class SequenceIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    objective: str | None = None
    account_id: uuid.UUID | None = None
    is_active: bool = True
    steps: list[StepIn] = Field(default_factory=list)


class SequencePatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = None
    objective: str | None = None
    is_active: bool | None = None
    steps: list[StepIn] | None = None


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _parse_due(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


async def _get_account(db: AsyncSession, ctx: WorkspaceContext, account_id: uuid.UUID) -> LinkedInAccount:
    acc = await db.get(LinkedInAccount, account_id)
    if acc is None or acc.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "LinkedIn account not found")
    return acc


async def _get_lead(db: AsyncSession, ctx: WorkspaceContext, lead_id: uuid.UUID) -> LinkedInLead:
    lead = await db.get(LinkedInLead, lead_id)
    if lead is None or lead.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return lead


def _lead_dict(lead: LinkedInLead) -> dict[str, Any]:
    return {
        "id": str(lead.id),
        "full_name": lead.full_name,
        "headline": lead.headline,
        "company": lead.company,
        "role_title": lead.role_title,
        "location": lead.location,
        "profile_url": lead.profile_url,
        "stage": lead.stage,
        "priority": lead.priority,
        "tags": lead.tags,
        "enrichment": lead.enrichment,
        "notes": lead.notes,
    }


def _account_dict(acc: LinkedInAccount | None) -> dict[str, Any]:
    if acc is None:
        return {}
    return {
        "label": acc.label,
        "objective": acc.objective,
        "icp": acc.icp,
        "offer": acc.offer,
        "voice": acc.voice,
    }


async def _cadence_usage(db: AsyncSession, ctx: WorkspaceContext, account_id: uuid.UUID | None) -> dict[str, int]:
    """Count connect/message tasks completed today for an account (human-paced caps)."""
    start = datetime.combine(svc.today(), datetime.min.time(), tzinfo=timezone.utc)
    stmt = select(LeadTask.task_type, func.count()).where(
        LeadTask.workspace_id == ctx.workspace.id,
        LeadTask.status == "done",
        LeadTask.completed_at >= start,
    )
    if account_id is not None:
        stmt = stmt.where(LeadTask.account_id == account_id)
    stmt = stmt.group_by(LeadTask.task_type)
    res = await db.execute(stmt)
    counts = {row[0]: row[1] for row in res.all()}
    return {
        "connect": int(counts.get("connect", 0)),
        "message": int(counts.get("message", 0)) + int(counts.get("follow_up", 0)),
    }


# --------------------------------------------------------------------------- #
# Playbook + overview
# --------------------------------------------------------------------------- #
@router.get("/playbook")
async def playbook() -> dict[str, Any]:
    return svc.playbook()


@router.get("/overview")
async def overview(
    account_id: uuid.UUID | None = Query(default=None),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    stage_stmt = select(LinkedInLead.stage, func.count()).where(LinkedInLead.workspace_id == ctx.workspace.id)
    if account_id is not None:
        stage_stmt = stage_stmt.where(LinkedInLead.account_id == account_id)
    stage_stmt = stage_stmt.group_by(LinkedInLead.stage)
    res = await db.execute(stage_stmt)
    by_stage = {row[0]: row[1] for row in res.all()}

    task_stmt = select(func.count()).where(
        LinkedInLead.workspace_id == ctx.workspace.id,
        LeadTask.workspace_id == ctx.workspace.id,
        LeadTask.status == "pending",
    )
    pending_tasks = (await db.execute(
        select(func.count()).select_from(LeadTask).where(
            LeadTask.workspace_id == ctx.workspace.id, LeadTask.status == "pending"
        )
    )).scalar_one()

    usage = await _cadence_usage(db, ctx, account_id)
    total = (await db.execute(
        select(func.count()).select_from(LinkedInLead).where(LinkedInLead.workspace_id == ctx.workspace.id)
    )).scalar_one()
    return {
        "total_leads": int(total),
        "by_stage": by_stage,
        "pending_tasks": int(pending_tasks),
        "cadence_today": usage,
    }


# --------------------------------------------------------------------------- #
# Accounts
# --------------------------------------------------------------------------- #
@router.get("/accounts", response_model=list[AccountOut])
async def list_accounts(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[AccountOut]:
    res = await db.execute(
        select(LinkedInAccount)
        .where(LinkedInAccount.workspace_id == ctx.workspace.id)
        .order_by(LinkedInAccount.created_at.desc())
    )
    return [AccountOut.model_validate(a) for a in res.scalars().all()]


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountIn,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    acc = LinkedInAccount(
        workspace_id=ctx.workspace.id,
        owner_id=ctx.user.id,
        label=data.label,
        profile_url=data.profile_url,
        objective=data.objective or "high_ticket_leads",
        icp=data.icp,
        offer=data.offer,
        voice=data.voice,
        session_partition=data.session_partition or f"lh-{uuid.uuid4().hex[:12]}",
        proxy_url=data.proxy_url,
    )
    if data.daily_connect_cap is not None:
        acc.daily_connect_cap = data.daily_connect_cap
    if data.daily_message_cap is not None:
        acc.daily_message_cap = data.daily_message_cap
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    return AccountOut.model_validate(acc)


@router.get("/accounts/{account_id}", response_model=AccountOut)
async def get_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    return AccountOut.model_validate(await _get_account(db, ctx, account_id))


@router.patch("/accounts/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: uuid.UUID,
    data: AccountPatch,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    acc = await _get_account(db, ctx, account_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(acc, field, value)
    await db.commit()
    await db.refresh(acc)
    return AccountOut.model_validate(acc)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> None:
    acc = await _get_account(db, ctx, account_id)
    await db.delete(acc)
    await db.commit()


@router.post("/accounts/{account_id}/touch", response_model=AccountOut)
async def touch_account(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> AccountOut:
    """Record that the desktop opened/used this account window (no credentials)."""
    acc = await _get_account(db, ctx, account_id)
    acc.last_active_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(acc)
    return AccountOut.model_validate(acc)


@router.get("/accounts/{account_id}/cadence")
async def account_cadence(
    account_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    acc = await _get_account(db, ctx, account_id)
    usage = await _cadence_usage(db, ctx, account_id)
    return {
        "account_id": str(acc.id),
        "connect": svc.cadence_check("connect", usage["connect"], acc.daily_connect_cap),
        "message": svc.cadence_check("message", usage["message"], acc.daily_message_cap),
    }


# --------------------------------------------------------------------------- #
# Leads
# --------------------------------------------------------------------------- #
@router.get("/leads", response_model=list[LeadOut])
async def list_leads(
    stage: str | None = Query(default=None),
    account_id: uuid.UUID | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[LeadOut]:
    stmt = select(LinkedInLead).where(LinkedInLead.workspace_id == ctx.workspace.id)
    if stage:
        if stage not in svc.STAGES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid stage")
        stmt = stmt.where(LinkedInLead.stage == stage)
    if account_id is not None:
        stmt = stmt.where(LinkedInLead.account_id == account_id)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(LinkedInLead.full_name).like(like)
            | func.lower(func.coalesce(LinkedInLead.company, "")).like(like)
            | func.lower(func.coalesce(LinkedInLead.headline, "")).like(like)
        )
    stmt = stmt.order_by(LinkedInLead.updated_at.desc()).limit(limit).offset(offset)
    res = await db.execute(stmt)
    return [LeadOut.model_validate(p) for p in res.scalars().all()]


@router.post("/leads", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: LeadIn,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> LeadOut:
    if data.account_id is not None:
        await _get_account(db, ctx, data.account_id)
    stage = data.stage if data.stage in svc.STAGES else "new"
    lead = LinkedInLead(
        workspace_id=ctx.workspace.id,
        account_id=data.account_id,
        full_name=data.full_name,
        headline=data.headline,
        company=data.company,
        role_title=data.role_title,
        location=data.location,
        profile_url=data.profile_url,
        email=data.email,
        stage=stage,
        priority=data.priority or "medium",
        tags=data.tags,
        enrichment=data.enrichment,
        notes=data.notes,
        source=data.source,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return LeadOut.model_validate(lead)


@router.post("/leads/import")
async def import_leads(
    data: LeadImportIn,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if data.account_id is not None:
        await _get_account(db, ctx, data.account_id)
    parsed = svc.parse_leads_csv(data.csv_content)
    created = 0
    skipped = 0
    # Dedupe within workspace by profile_url when present.
    existing_urls = set()
    res = await db.execute(
        select(LinkedInLead.profile_url).where(
            LinkedInLead.workspace_id == ctx.workspace.id, LinkedInLead.profile_url.is_not(None)
        )
    )
    existing_urls = {u for (u,) in res.all() if u}
    for row in parsed:
        url = row.get("profile_url")
        if url and url in existing_urls:
            skipped += 1
            continue
        lead = LinkedInLead(
            workspace_id=ctx.workspace.id,
            account_id=data.account_id,
            full_name=row["full_name"],
            headline=row.get("headline"),
            company=row.get("company"),
            role_title=row.get("role_title"),
            location=row.get("location"),
            profile_url=url,
            email=row.get("email"),
            enrichment=row.get("enrichment"),
            source=data.source,
        )
        db.add(lead)
        created += 1
        if url:
            existing_urls.add(url)
    await db.commit()
    return {"created": created, "skipped": skipped, "parsed": len(parsed)}


@router.get("/leads/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> LeadOut:
    return LeadOut.model_validate(await _get_lead(db, ctx, lead_id))


@router.patch("/leads/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: uuid.UUID,
    data: LeadPatch,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> LeadOut:
    lead = await _get_lead(db, ctx, lead_id)
    payload = data.model_dump(exclude_unset=True)
    if "account_id" in payload and payload["account_id"] is not None:
        await _get_account(db, ctx, payload["account_id"])
    for field, value in payload.items():
        setattr(lead, field, value)
    await db.commit()
    await db.refresh(lead)
    return LeadOut.model_validate(lead)


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> None:
    lead = await _get_lead(db, ctx, lead_id)
    await db.delete(lead)
    await db.commit()


@router.post("/leads/{lead_id}/stage", response_model=LeadOut)
async def move_stage(
    lead_id: uuid.UUID,
    data: StageIn,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> LeadOut:
    lead = await _get_lead(db, ctx, lead_id)
    if data.to_stage not in svc.STAGES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid stage")
    if not data.override and not svc.can_transition(lead.stage, data.to_stage):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Transition {lead.stage} -> {data.to_stage} is not allowed. Pass override=true to force.",
        )
    from_stage = lead.stage
    lead.stage = data.to_stage
    lead.last_action_at = datetime.now(timezone.utc)
    db.add(
        LeadStageEvent(
            workspace_id=ctx.workspace.id,
            lead_id=lead.id,
            from_stage=from_stage,
            to_stage=data.to_stage,
            reason=data.reason,
            actor_id=ctx.user.id,
            actor_name=ctx.user.full_name or ctx.user.email,
        )
    )
    await db.commit()
    await db.refresh(lead)
    return LeadOut.model_validate(lead)


@router.get("/leads/{lead_id}/events")
async def lead_events(
    lead_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    lead = await _get_lead(db, ctx, lead_id)
    res = await db.execute(
        select(LeadStageEvent)
        .where(LeadStageEvent.lead_id == lead.id)
        .order_by(LeadStageEvent.created_at.desc())
    )
    return [
        {
            "id": str(e.id),
            "from_stage": e.from_stage,
            "to_stage": e.to_stage,
            "reason": e.reason,
            "actor_name": e.actor_name,
            "created_at": e.created_at,
        }
        for e in res.scalars().all()
    ]


@router.post("/leads/{lead_id}/next-action")
async def next_action(
    lead_id: uuid.UUID,
    data: NextActionIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    lead = await _get_lead(db, ctx, lead_id)
    account = await db.get(LinkedInAccount, lead.account_id) if lead.account_id else None
    if data.use_llm:
        suggestion = await svc.ai_next_action(_lead_dict(lead), _account_dict(account))
    else:
        suggestion = svc.deterministic_next_action(_lead_dict(lead), _account_dict(account))

    created_task = None
    if data.create_task:
        task = LeadTask(
            workspace_id=ctx.workspace.id,
            lead_id=lead.id,
            account_id=lead.account_id,
            task_type=suggestion.get("task_type", "research"),
            title=suggestion.get("title", "Next action"),
            detail=suggestion.get("detail"),
            suggested_copy=suggestion.get("suggested_copy"),
            policy_note=suggestion.get("policy_note"),
            priority=suggestion.get("priority", "medium"),
            due_date=svc.today(),
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        created_task = TaskOut.model_validate(task).model_dump()
    return {"suggestion": suggestion, "task": created_task}


@router.post("/leads/{lead_id}/observe")
async def observe_lead(
    lead_id: uuid.UUID,
    data: ObserveIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Analyze a live LinkedIn view (screenshots + DOM text) and guide the human."""
    lead = await _get_lead(db, ctx, lead_id)
    account = await db.get(LinkedInAccount, lead.account_id) if lead.account_id else None
    result = await svc.analyze_live_view(
        _lead_dict(lead),
        images=data.images,
        dom_text=data.dom_text,
        account=_account_dict(account),
    )
    observation_id = None
    if data.persist:
        obs = LeadObservation(
            workspace_id=ctx.workspace.id,
            lead_id=lead.id,
            account_id=lead.account_id,
            source="vision" if data.images else "dom",
            snapshot={"dom_text": (data.dom_text or "")[:8000], "image_count": len(data.images or [])},
            ai_summary=result.get("summary"),
            signals=result.get("signals"),
            recommended_action=result.get("recommended_action"),
            created_by_id=ctx.user.id,
        )
        db.add(obs)
        lead.last_action_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(obs)
        observation_id = str(obs.id)
    return {"observation_id": observation_id, "result": result}


@router.get("/leads/{lead_id}/observations")
async def list_observations(
    lead_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    lead = await _get_lead(db, ctx, lead_id)
    res = await db.execute(
        select(LeadObservation)
        .where(LeadObservation.lead_id == lead.id)
        .order_by(LeadObservation.created_at.desc())
        .limit(50)
    )
    return [
        {
            "id": str(o.id),
            "source": o.source,
            "ai_summary": o.ai_summary,
            "signals": o.signals,
            "recommended_action": o.recommended_action,
            "created_at": o.created_at,
        }
        for o in res.scalars().all()
    ]


@router.post("/leads/{lead_id}/enrich", response_model=LeadOut)
async def enrich_lead(
    lead_id: uuid.UUID,
    data: dict[str, Any],
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> LeadOut:
    """Merge human/manually-gathered enrichment data into the lead."""
    lead = await _get_lead(db, ctx, lead_id)
    merged = dict(lead.enrichment or {})
    merged.update({k: v for k, v in data.items() if v is not None})
    lead.enrichment = merged
    await db.commit()
    await db.refresh(lead)
    return LeadOut.model_validate(lead)


# --------------------------------------------------------------------------- #
# Tasks / daily work-queue
# --------------------------------------------------------------------------- #
@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(
    status_filter: str | None = Query(default="pending", alias="status"),
    account_id: uuid.UUID | None = Query(default=None),
    lead_id: uuid.UUID | None = Query(default=None),
    due_today: bool = Query(default=False),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[TaskOut]:
    stmt = select(LeadTask).where(LeadTask.workspace_id == ctx.workspace.id)
    if status_filter:
        if status_filter not in _TASK_STATUSES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid task status")
        stmt = stmt.where(LeadTask.status == status_filter)
    if account_id is not None:
        stmt = stmt.where(LeadTask.account_id == account_id)
    if lead_id is not None:
        stmt = stmt.where(LeadTask.lead_id == lead_id)
    if due_today:
        stmt = stmt.where(LeadTask.due_date <= svc.today())
    stmt = stmt.order_by(LeadTask.priority.desc(), LeadTask.created_at.asc())
    res = await db.execute(stmt)
    return [TaskOut.model_validate(t) for t in res.scalars().all()]


@router.post("/leads/{lead_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    lead_id: uuid.UUID,
    data: TaskIn,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    lead = await _get_lead(db, ctx, lead_id)
    task = LeadTask(
        workspace_id=ctx.workspace.id,
        lead_id=lead.id,
        account_id=lead.account_id,
        sequence_step_id=data.sequence_step_id,
        task_type=data.task_type,
        title=data.title,
        detail=data.detail,
        suggested_copy=data.suggested_copy,
        policy_note=data.policy_note or "Manual action only. AI suggests; the human performs it.",
        priority=data.priority or "medium",
        due_date=_parse_due(data.due_date) or svc.today(),
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: uuid.UUID,
    data: TaskPatch,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> TaskOut:
    task = await db.get(LeadTask, task_id)
    if task is None or task.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    payload = data.model_dump(exclude_unset=True)
    if "status" in payload and payload["status"] is not None:
        if payload["status"] not in _TASK_STATUSES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid task status")
        if payload["status"] == "done" and task.status != "done":
            task.completed_at = datetime.now(timezone.utc)
            # Update lead activity counters for cadence accounting.
            lead = await db.get(LinkedInLead, task.lead_id)
            if lead is not None:
                lead.last_action_at = datetime.now(timezone.utc)
                if task.task_type == "connect":
                    lead.connect_count = (lead.connect_count or 0) + 1
                elif task.task_type in ("message", "follow_up"):
                    lead.message_count = (lead.message_count or 0) + 1
    if "due_date" in payload:
        payload["due_date"] = _parse_due(payload["due_date"])
    for field, value in payload.items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return TaskOut.model_validate(task)


# --------------------------------------------------------------------------- #
# Outreach sequences
# --------------------------------------------------------------------------- #
def _sequence_out(seq: OutreachSequence, steps: list[OutreachStep]) -> dict[str, Any]:
    return {
        "id": str(seq.id),
        "name": seq.name,
        "description": seq.description,
        "objective": seq.objective,
        "account_id": str(seq.account_id) if seq.account_id else None,
        "is_active": seq.is_active,
        "created_at": seq.created_at,
        "steps": [
            {
                "id": str(s.id),
                "step_order": s.step_order,
                "channel": s.channel,
                "action_type": s.action_type,
                "day_offset": s.day_offset,
                "template": s.template,
                "notes": s.notes,
            }
            for s in sorted(steps, key=lambda x: (x.step_order, x.day_offset))
        ],
    }


@router.get("/sequences")
async def list_sequences(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    res = await db.execute(
        select(OutreachSequence)
        .where(OutreachSequence.workspace_id == ctx.workspace.id)
        .order_by(OutreachSequence.created_at.desc())
    )
    sequences = res.scalars().all()
    out: list[dict[str, Any]] = []
    for seq in sequences:
        steps = (await db.execute(
            select(OutreachStep).where(OutreachStep.sequence_id == seq.id)
        )).scalars().all()
        out.append(_sequence_out(seq, list(steps)))
    return out


@router.post("/sequences", status_code=status.HTTP_201_CREATED)
async def create_sequence(
    data: SequenceIn,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if data.account_id is not None:
        await _get_account(db, ctx, data.account_id)
    seq = OutreachSequence(
        workspace_id=ctx.workspace.id,
        account_id=data.account_id,
        name=data.name,
        description=data.description,
        objective=data.objective,
        is_active=data.is_active,
    )
    db.add(seq)
    await db.flush()
    steps: list[OutreachStep] = []
    for st in data.steps:
        step = OutreachStep(
            workspace_id=ctx.workspace.id,
            sequence_id=seq.id,
            step_order=st.step_order,
            channel=st.channel,
            action_type=st.action_type,
            day_offset=st.day_offset,
            template=st.template,
            notes=st.notes,
        )
        db.add(step)
        steps.append(step)
    await db.commit()
    await db.refresh(seq)
    return _sequence_out(seq, steps)


@router.get("/sequences/{sequence_id}")
async def get_sequence(
    sequence_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    seq = await db.get(OutreachSequence, sequence_id)
    if seq is None or seq.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sequence not found")
    steps = (await db.execute(
        select(OutreachStep).where(OutreachStep.sequence_id == seq.id)
    )).scalars().all()
    return _sequence_out(seq, list(steps))


@router.patch("/sequences/{sequence_id}")
async def update_sequence(
    sequence_id: uuid.UUID,
    data: SequencePatch,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    seq = await db.get(OutreachSequence, sequence_id)
    if seq is None or seq.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sequence not found")
    payload = data.model_dump(exclude_unset=True)
    new_steps = payload.pop("steps", None)
    for field, value in payload.items():
        setattr(seq, field, value)
    if new_steps is not None:
        existing = (await db.execute(
            select(OutreachStep).where(OutreachStep.sequence_id == seq.id)
        )).scalars().all()
        for s in existing:
            await db.delete(s)
        for st in new_steps:
            db.add(
                OutreachStep(
                    workspace_id=ctx.workspace.id,
                    sequence_id=seq.id,
                    step_order=st.get("step_order", 0),
                    channel=st.get("channel", "linkedin"),
                    action_type=st.get("action_type", "message"),
                    day_offset=st.get("day_offset", 0),
                    template=st.get("template"),
                    notes=st.get("notes"),
                )
            )
    await db.commit()
    await db.refresh(seq)
    steps = (await db.execute(
        select(OutreachStep).where(OutreachStep.sequence_id == seq.id)
    )).scalars().all()
    return _sequence_out(seq, list(steps))


@router.delete("/sequences/{sequence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sequence(
    sequence_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(*_MUTATE)),
    db: AsyncSession = Depends(get_db),
) -> None:
    seq = await db.get(OutreachSequence, sequence_id)
    if seq is None or seq.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sequence not found")
    await db.delete(seq)
    await db.commit()
