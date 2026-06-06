"""Auth + identity routes: signup, login, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import get_current_user
from app.models import Membership, Organization, User, Workspace
from app.schemas import (
    CompleteSignupRequest,
    LoginRequest,
    MeResponse,
    OrganizationOut,
    SignupCheckoutRequest,
    SignupCheckoutResponse,
    SignupRequest,
    TokenResponse,
    UserOut,
    WorkspaceOut,
)
from app.services import auth_service
from app.config import settings
from app.security import hash_password
from app.services import stripe_billing
from sqlalchemy import select as _select
from app.models import User as _User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    # Free-tier signup: always allowed. Creates an account on the default
    # (free) plan with no payment. Paid plans go through /signup-checkout.
    user, token = await auth_service.signup(db, data)
    try:
        from app.services.emails import send_welcome_email

        await send_welcome_email(
            to=user.email,
            full_name=user.full_name,
            org_name=data.org_name,
            plan_name="Free",
        )
    except Exception:  # noqa: BLE001 — welcome email is best-effort
        pass
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/signup-checkout", response_model=SignupCheckoutResponse)
async def signup_checkout(
    data: SignupCheckoutRequest, db: AsyncSession = Depends(get_db)
) -> SignupCheckoutResponse:
    """Start a paid checkout for a new account. No account is created until paid."""
    stripe_billing.ensure_configured()

    email = data.email.lower()
    existing = (
        await db.execute(_select(_User).where(_User.email == email))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Email already registered. Please log in."
        )

    interval = "yearly" if data.interval == "yearly" else "monthly"
    url = await stripe_billing.create_signup_checkout(
        email=email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        org_name=data.org_name,
        org_type=data.org_type,
        interval=interval,
    )
    return SignupCheckoutResponse(url=url)


@router.post("/complete-signup", response_model=TokenResponse)
async def complete_signup(
    data: CompleteSignupRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Finalize a paid signup: provision the account and return an access token."""
    user, token = await stripe_billing.complete_signup(db, data.session_id)
    try:
        from app.services.emails import send_welcome_email

        membership = (
            await db.execute(
                select(Membership, Organization)
                .join(Organization, Membership.organization_id == Organization.id)
                .where(Membership.user_id == user.id)
            )
        ).first()
        org = membership[1] if membership else None
        await send_welcome_email(
            to=user.email,
            full_name=user.full_name,
            org_name=org.name if org else "your workspace",
            plan_name="Pro",
        )
    except Exception:  # noqa: BLE001 — welcome email is best-effort
        pass
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
