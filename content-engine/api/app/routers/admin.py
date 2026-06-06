"""Platform admin routes (superuser only).

Everything here is guarded by :func:`app.deps.require_superuser`. It exposes the
global control surface for the platform owner: managing users, their plans and
agency client caps, terminating subscriptions, and curating the plan catalogue
(including custom plans).
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import require_superuser
from app.models import User
from app.schemas import (
    AdminOrgOut,
    AdminOrgUpdate,
    AdminPlanCreate,
    AdminPlanOut,
    AdminPlanUpdate,
    AdminUserCreate,
    AdminUserOut,
    AdminUserUpdate,
)
from app.services import admin_service as svc

router = APIRouter(prefix="/admin", tags=["admin"])


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> list[AdminUserOut]:
    return await svc.list_users(db)


@router.post("/users", response_model=AdminUserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminUserCreate,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    return await svc.create_user(db, data)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    actor: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    return await svc.update_user(db, user_id, data, actor)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_user(
    user_id: uuid.UUID,
    actor: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> None:
    await svc.delete_user(db, user_id, actor)


# --------------------------------------------------------------------------- #
# Organizations
# --------------------------------------------------------------------------- #
@router.patch("/orgs/{org_id}", response_model=AdminOrgOut)
async def update_org(
    org_id: uuid.UUID,
    data: AdminOrgUpdate,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> AdminOrgOut:
    return await svc.update_org(db, org_id, data)


@router.post("/orgs/{org_id}/terminate", response_model=AdminOrgOut)
async def terminate_org(
    org_id: uuid.UUID,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> AdminOrgOut:
    return await svc.terminate_org(db, org_id)


# --------------------------------------------------------------------------- #
# Plans (catalogue + custom plans)
# --------------------------------------------------------------------------- #
def _plan_out(plan, in_use: int) -> AdminPlanOut:
    out = AdminPlanOut.model_validate(plan)
    out.in_use = in_use
    return out


@router.get("/plans", response_model=list[AdminPlanOut])
async def list_plans(
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> list[AdminPlanOut]:
    plans = await svc.list_plans(db)
    out: list[AdminPlanOut] = []
    for p in plans:
        out.append(_plan_out(p, await svc.plan_usage(db, p.code)))
    return out


@router.post("/plans", response_model=AdminPlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(
    data: AdminPlanCreate,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> AdminPlanOut:
    plan = await svc.create_plan(db, data)
    return _plan_out(plan, 0)


@router.patch("/plans/{plan_id}", response_model=AdminPlanOut)
async def update_plan(
    plan_id: uuid.UUID,
    data: AdminPlanUpdate,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> AdminPlanOut:
    plan = await svc.update_plan(db, plan_id, data)
    return _plan_out(plan, await svc.plan_usage(db, plan.code))


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_plan(
    plan_id: uuid.UUID,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
) -> None:
    await svc.delete_plan(db, plan_id)
