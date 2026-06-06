"""Workspace routes: list + create workspaces for the caller's organizations."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Membership, Organization, Role, User, Workspace
from app.schemas import WorkspaceCreate, WorkspaceOut
from app.services.auth_service import slugify
from app.services.usage_guard import get_active_plan

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceOut])
async def list_workspaces(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[WorkspaceOut]:
    res = await db.execute(select(Membership).where(Membership.user_id == user.id))
    org_ids = {m.organization_id for m in res.scalars().all()}
    if not org_ids:
        return []
    wres = await db.execute(select(Workspace).where(Workspace.organization_id.in_(org_ids)))
    return [WorkspaceOut.model_validate(w) for w in wres.scalars().all()]


async def _effective_client_limit(db: AsyncSession, org: Organization) -> int | None:
    """The max workspaces (clients) for an org: per-org override, else plan limit."""
    if org.client_limit is not None:
        return org.client_limit
    # Resolve via any workspace of the org to read the plan's workspaces allowance.
    ws = (
        await db.execute(
            select(Workspace).where(Workspace.organization_id == org.id).limit(1)
        )
    ).scalar_one_or_none()
    if ws is None:
        return None
    plan = await get_active_plan(db, ws.id)
    if plan is None or not plan.limits:
        return None
    val = plan.limits.get("workspaces")
    try:
        return int(val) if val is not None else None
    except (TypeError, ValueError):
        return None


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    # Use the caller's first owner/admin membership to pick the org.
    res = await db.execute(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.role.in_([Role.owner, Role.admin]),
        )
    )
    membership = res.scalars().first()
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No organization to add a workspace to")

    org = await db.get(Organization, membership.organization_id)
    if org is not None:
        limit = await _effective_client_limit(db, org)
        if limit is not None:
            count = (
                await db.execute(
                    select(func.count(Workspace.id)).where(
                        Workspace.organization_id == org.id
                    )
                )
            ).scalar() or 0
            if count >= limit:
                raise HTTPException(
                    status.HTTP_402_PAYMENT_REQUIRED,
                    f"Client limit reached ({count}/{limit}). Contact your administrator to raise it.",
                )

    workspace = Workspace(
        organization_id=membership.organization_id,
        name=data.name,
        slug=slugify(data.name),
        website=data.website,
    )
    db.add(workspace)
    await db.flush()
    return WorkspaceOut.model_validate(workspace)
