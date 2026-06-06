"""Forms API — forms / quizzes / surveys / polls with real submission storage.

Workspace-scoped CRUD, publish, AI form generation & response insights, plus a
workspace-scoped submit endpoint that records real ``FormSubmission`` rows and
increments counters. Emits automation events for submissions and publishes.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.services import forms as svc
from app.agents import forms_agent as agent
from app.services.automation import emit_event

router = APIRouter(prefix="/forms", tags=["forms"])


# --------------------------------------------------------------------------- #
# Schemas (inline, like cro.py)
# --------------------------------------------------------------------------- #
class FormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    kind: str
    fields: list | None = None
    settings: dict | None = None
    status: str
    slug: str | None = None
    description: str | None = None
    views: int
    submissions: int
    published_at: datetime | None = None
    created_at: datetime


class FormDetailOut(FormOut):
    completion_rate: float = 0.0


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    form_id: uuid.UUID
    data: dict | None = None
    contact_email: str | None = None
    score: float | None = None
    anon_id: str | None = None
    submitted_at: datetime


class CreateFormIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: str = Field(default="form")
    fields: list | None = None
    settings: dict | None = None
    description: str | None = None


class UpdateFormIn(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    kind: str | None = None
    fields: list | None = None
    settings: dict | None = None
    description: str | None = None
    status: str | None = None


class GenerateIn(BaseModel):
    brief: str = Field(min_length=1, max_length=2000)
    kind: str = Field(default="form")


class SubmitIn(BaseModel):
    data: dict = Field(default_factory=dict)
    contact_email: str | None = None
    anon_id: str | None = None


# --------------------------------------------------------------------------- #
# Serialization helper
# --------------------------------------------------------------------------- #
def _detail(form) -> FormDetailOut:
    out = FormDetailOut.model_validate(form)
    out.completion_rate = svc.completion_rate(form)
    return out


# --------------------------------------------------------------------------- #
# CRUD
# --------------------------------------------------------------------------- #
@router.get("/forms", response_model=list[FormDetailOut])
async def list_forms(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    forms = await svc.list_forms(db, ctx.workspace.id)
    return [_detail(f) for f in forms]


@router.post("/forms", response_model=FormDetailOut, status_code=status.HTTP_201_CREATED)
async def create_form(
    body: CreateFormIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    form = await svc.create_form(
        db,
        ctx.workspace.id,
        name=body.name,
        kind=body.kind,
        fields=body.fields,
        settings=body.settings,
        description=body.description,
    )
    await db.commit()
    await db.refresh(form)
    return _detail(form)


@router.get("/forms/{form_id}", response_model=FormDetailOut)
async def get_form(
    form_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    form = await svc.get_form(db, ctx.workspace.id, form_id)
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    return _detail(form)


@router.patch("/forms/{form_id}", response_model=FormDetailOut)
async def update_form(
    form_id: uuid.UUID,
    body: UpdateFormIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    form = await svc.get_form(db, ctx.workspace.id, form_id)
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    form = await svc.update_form(
        db,
        form,
        name=body.name,
        kind=body.kind,
        fields=body.fields,
        settings=body.settings,
        description=body.description,
        status=body.status,
    )
    await db.commit()
    await db.refresh(form)
    return _detail(form)


@router.post("/forms/{form_id}/publish", response_model=FormDetailOut)
async def publish_form(
    form_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    form = await svc.get_form(db, ctx.workspace.id, form_id)
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    form = await svc.publish_form(db, form)
    await emit_event(
        db,
        ctx.workspace.id,
        "form.published",
        {"form_id": str(form.id), "name": form.name, "slug": form.slug, "kind": form.kind},
    )
    await db.commit()
    await db.refresh(form)
    return _detail(form)


# --------------------------------------------------------------------------- #
# AI: generate fields
# --------------------------------------------------------------------------- #
@router.post("/forms/generate")
async def generate_form(
    body: GenerateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await agent.generate_form(db, ctx.workspace.id, body.brief, body.kind)


# --------------------------------------------------------------------------- #
# Submissions
# --------------------------------------------------------------------------- #
@router.get("/forms/{form_id}/submissions", response_model=list[SubmissionOut])
async def list_submissions(
    form_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    form = await svc.get_form(db, ctx.workspace.id, form_id)
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    return await svc.list_submissions(db, ctx.workspace.id, form_id)


@router.post(
    "/forms/{form_id}/submit",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_form(
    form_id: uuid.UUID,
    body: SubmitIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    form = await svc.get_form(db, ctx.workspace.id, form_id)
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    sub = await svc.record_submission(
        db,
        form,
        data=body.data,
        contact_email=body.contact_email,
        anon_id=body.anon_id,
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "form.submitted",
        {
            "form_id": str(form.id),
            "submission_id": str(sub.id),
            "kind": form.kind,
            "contact_email": sub.contact_email,
            "score": sub.score,
        },
    )
    await db.commit()
    await db.refresh(sub)
    return sub


# --------------------------------------------------------------------------- #
# AI: response insights
# --------------------------------------------------------------------------- #
@router.get("/forms/{form_id}/insights")
async def form_insights(
    form_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    form = await svc.get_form(db, ctx.workspace.id, form_id)
    if form is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    return await agent.summarize_responses(db, ctx.workspace.id, form_id)


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #
@router.get("/overview")
async def forms_overview(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    return await svc.overview(db, ctx.workspace.id)
