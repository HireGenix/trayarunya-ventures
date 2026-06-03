"""Workspace routes: list + create workspaces for the caller's organizations."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Membership, Role, User, Workspace
from app.schemas import WorkspaceCreate, WorkspaceOut
from app.services.auth_service import slugify

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

    workspace = Workspace(
        organization_id=membership.organization_id,
        name=data.name,
        slug=slugify(data.name),
        website=data.website,
    )
    db.add(workspace)
    await db.flush()
    return WorkspaceOut.model_validate(workspace)
