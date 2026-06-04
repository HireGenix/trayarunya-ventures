"""Billing checkout routes: Stripe Checkout, billing portal, and webhook.

Separate from ``billing.py`` (which serves GET /plans and GET /summary). These
routes power real Stripe subscriptions and degrade to HTTP 503 when Stripe keys
are not configured.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import Organization, Plan
from app.services import stripe_billing

router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    plan_code: str


class CheckoutResponse(BaseModel):
    url: str


class PortalResponse(BaseModel):
    url: str


class CheckoutStatus(BaseModel):
    configured: bool


class WebhookAck(BaseModel):
    received: bool


@router.get("/status", response_model=CheckoutStatus)
async def checkout_status() -> CheckoutStatus:
    return CheckoutStatus(configured=settings.stripe_configured)


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    stripe_billing.ensure_configured()

    plan = (
        await db.execute(select(Plan).where(Plan.code == body.plan_code))
    ).scalar_one_or_none()
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    if plan.code == "free" or plan.price_monthly == 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Cannot checkout for the free plan"
        )

    org = await db.get(Organization, ctx.workspace.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    url = await stripe_billing.create_checkout_session(db, org, plan)
    return CheckoutResponse(url=url)


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> PortalResponse:
    stripe_billing.ensure_configured()

    org = await db.get(Organization, ctx.workspace.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")

    url = await stripe_billing.create_portal_session(org)
    return PortalResponse(url=url)


@router.post("/webhook", response_model=WebhookAck)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WebhookAck:
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    await stripe_billing.handle_webhook_event(db, payload, sig_header)
    return WebhookAck(received=True)
