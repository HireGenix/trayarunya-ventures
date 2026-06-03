"""Auth + identity routes: signup, login, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Membership, Organization, User, Workspace
from app.schemas import (
    LoginRequest,
    MeResponse,
    OrganizationOut,
    SignupRequest,
    TokenResponse,
    UserOut,
    WorkspaceOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user, token = await auth_service.signup(db, data)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user, token = await auth_service.login(db, data)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=MeResponse)
async def me(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MeResponse:
    res = await db.execute(select(Membership).where(Membership.user_id == user.id))
    memberships = res.scalars().all()
    org_ids = {m.organization_id for m in memberships}

    orgs: list[Organization] = []
    workspaces: list[Workspace] = []
    if org_ids:
        ores = await db.execute(select(Organization).where(Organization.id.in_(org_ids)))
        orgs = list(ores.scalars().all())
        wres = await db.execute(select(Workspace).where(Workspace.organization_id.in_(org_ids)))
        workspaces = list(wres.scalars().all())

    return MeResponse(
        user=UserOut.model_validate(user),
        organizations=[OrganizationOut.model_validate(o) for o in orgs],
        workspaces=[WorkspaceOut.model_validate(w) for w in workspaces],
    )
