"""Automation API — workflows, runs, tasks, catalog, and inbound events.

All endpoints are workspace-scoped via :func:`get_workspace_ctx` (or
``require_role`` for mutations), so tenants are fully isolated. Workflow "test"
runs execute the *real* action pipeline against a sample payload and are flagged
``is_test=True`` so they're visible but distinguishable in run history.
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
    AutomationEvent,
    EventStatus,
    Role,
    Task,
    TaskStatus,
    Workflow,
    WorkflowRun,
)
from app.services.automation import (
    ACTION_CATALOG,
    TRIGGER_CATALOG,
    emit_event,
    execute_workflow,
    valid_action,
    valid_trigger,
)

router = APIRouter(prefix="/automation", tags=["automation"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #
class ConditionIn(BaseModel):
    field: str
    op: str = "eq"
    value: Any = None


class ActionIn(BaseModel):
    type: str
    config: dict[str, Any] = Field(default_factory=dict)


class WorkflowIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    trigger_type: str
    conditions: list[ConditionIn] = Field(default_factory=list)
    actions: list[ActionIn] = Field(default_factory=list)
    is_active: bool = True


class WorkflowPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = None
    trigger_type: str | None = None
    conditions: list[ConditionIn] | None = None
    actions: list[ActionIn] | None = None
    is_active: bool | None = None


class TestIn(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    priority: str = "normal"
    assignee: str | None = None
    due_at: datetime | None = None


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, max_length=300)
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee: str | None = None
    due_at: datetime | None = None


class EmitIn(BaseModel):
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Serializers
# --------------------------------------------------------------------------- #
def _wf_dict(wf: Workflow) -> dict[str, Any]:
    return {
        "id": str(wf.id),
        "name": wf.name,
        "description": wf.description,
        "trigger_type": wf.trigger_type,
        "conditions": wf.conditions or [],
        "actions": wf.actions or [],
        "is_active": wf.is_active,
        "run_count": wf.run_count or 0,
        "last_run_at": wf.last_run_at.isoformat() if wf.last_run_at else None,
        "created_by_name": wf.created_by_name,
        "created_at": wf.created_at.isoformat() if wf.created_at else None,
    }


def _run_dict(run: WorkflowRun) -> dict[str, Any]:
    return {
        "id": str(run.id),
        "workflow_id": str(run.workflow_id),
        "trigger_type": run.trigger_type,
        "status": run.status.value if hasattr(run.status, "value") else run.status,
        "steps": run.steps or [],
        "error": run.error,
        "is_test": run.is_test,
        "trigger_payload": run.trigger_payload or {},
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }


def _task_dict(t: Task) -> dict[str, Any]:
    return {
        "id": str(t.id),
        "title": t.title,
        "description": t.description,
        "status": t.status.value if hasattr(t.status, "value") else t.status,
        "priority": t.priority,
        "assignee": t.assignee,
        "due_at": t.due_at.isoformat() if t.due_at else None,
        "source": t.source,
        "workflow_id": str(t.workflow_id) if t.workflow_id else None,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _validate_spec(trigger_type: str, actions: list[ActionIn]) -> None:
    if not valid_trigger(trigger_type):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown trigger: {trigger_type}")
    for a in actions:
        if not valid_action(a.type):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown action: {a.type}")


# --------------------------------------------------------------------------- #
# Catalog
# --------------------------------------------------------------------------- #
@router.get("/catalog")
async def get_catalog(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> dict[str, Any]:
    """Triggers + actions metadata that powers the visual workflow builder."""
    return {"triggers": TRIGGER_CATALOG, "actions": ACTION_CATALOG}


# --------------------------------------------------------------------------- #
# Workflows CRUD
# --------------------------------------------------------------------------- #
@router.get("/workflows")
async def list_workflows(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(Workflow)
            .where(Workflow.workspace_id == ctx.workspace.id)
            .order_by(Workflow.created_at.desc())
        )
    ).scalars().all()
    return [_wf_dict(w) for w in rows]


@router.post("/workflows", status_code=status.HTTP_201_CREATED)
async def create_workflow(
    body: WorkflowIn,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    _validate_spec(body.trigger_type, body.actions)
    wf = Workflow(
        workspace_id=ctx.workspace.id,
        name=body.name.strip(),
        description=body.description,
        trigger_type=body.trigger_type,
        conditions=[c.model_dump() for c in body.conditions],
        actions=[a.model_dump() for a in body.actions],
        is_active=body.is_active,
        created_by_id=ctx.user.id,
        created_by_name=(ctx.user.full_name or ctx.user.email),
    )
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return _wf_dict(wf)


async def _get_wf(db: AsyncSession, ctx: WorkspaceContext, workflow_id: uuid.UUID) -> Workflow:
    wf = await db.get(Workflow, workflow_id)
    if wf is None or wf.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Workflow not found")
    return wf


@router.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    wf = await _get_wf(db, ctx, workflow_id)
    return _wf_dict(wf)


@router.patch("/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: uuid.UUID,
    body: WorkflowPatch,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    wf = await _get_wf(db, ctx, workflow_id)
    trigger = body.trigger_type if body.trigger_type is not None else wf.trigger_type
    actions = body.actions if body.actions is not None else None
    if body.trigger_type is not None or body.actions is not None:
        _validate_spec(trigger, actions or [ActionIn(type=a.get("type", ""), config=a.get("config", {})) for a in (wf.actions or [])])
    if body.name is not None:
        wf.name = body.name.strip()
    if body.description is not None:
        wf.description = body.description
    if body.trigger_type is not None:
        wf.trigger_type = body.trigger_type
    if body.conditions is not None:
        wf.conditions = [c.model_dump() for c in body.conditions]
    if body.actions is not None:
        wf.actions = [a.model_dump() for a in body.actions]
    if body.is_active is not None:
        wf.is_active = body.is_active
    await db.commit()
    await db.refresh(wf)
    return _wf_dict(wf)


@router.post("/workflows/{workflow_id}/toggle")
async def toggle_workflow(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    wf = await _get_wf(db, ctx, workflow_id)
    wf.is_active = not wf.is_active
    await db.commit()
    await db.refresh(wf)
    return _wf_dict(wf)


@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> None:
    wf = await _get_wf(db, ctx, workflow_id)
    await db.delete(wf)
    await db.commit()


@router.post("/workflows/{workflow_id}/test")
async def test_workflow(
    workflow_id: uuid.UUID,
    body: TestIn,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Execute the workflow's real actions against a sample payload."""
    wf = await _get_wf(db, ctx, workflow_id)
    run = await execute_workflow(db, wf, body.payload or {}, is_test=True)
    await db.commit()
    await db.refresh(run)
    return _run_dict(run)


# --------------------------------------------------------------------------- #
# Runs
# --------------------------------------------------------------------------- #
@router.get("/runs")
async def list_runs(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(WorkflowRun)
            .where(WorkflowRun.workspace_id == ctx.workspace.id)
            .order_by(WorkflowRun.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [_run_dict(r) for r in rows]


@router.get("/workflows/{workflow_id}/runs")
async def list_workflow_runs(
    workflow_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    await _get_wf(db, ctx, workflow_id)
    rows = (
        await db.execute(
            select(WorkflowRun)
            .where(
                WorkflowRun.workspace_id == ctx.workspace.id,
                WorkflowRun.workflow_id == workflow_id,
            )
            .order_by(WorkflowRun.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [_run_dict(r) for r in rows]


# --------------------------------------------------------------------------- #
# Tasks
# --------------------------------------------------------------------------- #
@router.get("/tasks")
async def list_tasks(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
) -> list[dict[str, Any]]:
    q = select(Task).where(Task.workspace_id == ctx.workspace.id)
    if status_filter in ("open", "in_progress", "done"):
        q = q.where(Task.status == status_filter)
    q = q.order_by(Task.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [_task_dict(t) for t in rows]


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    priority = body.priority if body.priority in ("low", "normal", "high") else "normal"
    task = Task(
        workspace_id=ctx.workspace.id,
        title=body.title.strip(),
        description=body.description,
        priority=priority,
        assignee=body.assignee,
        due_at=body.due_at,
        source="manual",
        status=TaskStatus.open,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _task_dict(task)


@router.patch("/tasks/{task_id}")
async def update_task(
    task_id: uuid.UUID,
    body: TaskPatch,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    task = await db.get(Task, task_id)
    if task is None or task.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    if body.title is not None:
        task.title = body.title.strip()
    if body.description is not None:
        task.description = body.description
    if body.priority is not None and body.priority in ("low", "normal", "high"):
        task.priority = body.priority
    if body.assignee is not None:
        task.assignee = body.assignee
    if body.due_at is not None:
        task.due_at = body.due_at
    if body.status is not None and body.status in ("open", "in_progress", "done"):
        task.status = body.status
        task.completed_at = datetime.now(timezone.utc) if body.status == "done" else None
    await db.commit()
    await db.refresh(task)
    return _task_dict(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    task = await db.get(Task, task_id)
    if task is None or task.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    await db.delete(task)
    await db.commit()


# --------------------------------------------------------------------------- #
# Inbound events (external systems / manual fire)
# --------------------------------------------------------------------------- #
@router.post("/events/emit", status_code=status.HTTP_202_ACCEPTED)
async def emit_inbound_event(
    body: EmitIn,
    ctx: WorkspaceContext = Depends(require_role(Role.owner, Role.admin, Role.manager)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Record an external signal for processing by the automation loop."""
    if not valid_trigger(body.event_type):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown event type: {body.event_type}")
    event = await emit_event(
        db, ctx.workspace.id, body.event_type, body.payload, source="inbound"
    )
    await db.commit()
    return {"accepted": True, "event_id": str(event.id) if event else None}


@router.get("/events")
async def list_events(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(AutomationEvent)
            .where(AutomationEvent.workspace_id == ctx.workspace.id)
            .order_by(AutomationEvent.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "status": e.status.value if hasattr(e.status, "value") else e.status,
            "attempts": e.attempts,
            "source": e.source,
            "error": e.error,
            "processed_at": e.processed_at.isoformat() if e.processed_at else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in rows
    ]
