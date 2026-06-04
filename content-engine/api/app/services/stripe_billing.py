"""Stripe billing service: customers, checkout, portal, and webhook handling.

Real Stripe integration that works in Stripe test mode when keys are configured
and degrades gracefully (HTTP 503) when they are not. ``stripe`` is imported
lazily inside functions so the module can be imported even if the package or the
keys are absent.
"""
from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Organization, Plan


def ensure_configured() -> None:
    """Raise 503 unless a Stripe secret key is configured."""
    if not settings.stripe_configured:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Stripe not configured"
        )


def _client():
    """Lazily import ``stripe`` and set the API key."""
    import stripe

    stripe.api_key = settings.stripe_secret_key
    return stripe


async def get_or_create_customer(db: AsyncSession, org: Organization) -> str:
    """Return the org's Stripe customer id, creating the customer if needed."""
    ensure_configured()
    if org.stripe_customer_id:
        return org.stripe_customer_id

    stripe = _client()
    customer = stripe.Customer.create(
        name=org.name,
        metadata={"organization_id": str(org.id)},
    )
    org.stripe_customer_id = customer.id
    await db.commit()
    await db.refresh(org)
    return customer.id


async def _ensure_price_id(db: AsyncSession, plan: Plan) -> str:
    """Return the plan's Stripe price id, creating a recurring price on the fly."""
    if plan.stripe_price_id:
        return plan.stripe_price_id

    stripe = _client()
    price = stripe.Price.create(
        currency="usd",
        unit_amount=int(plan.price_monthly) * 100,
        recurring={"interval": "month"},
        product_data={"name": plan.name},
    )
    plan.stripe_price_id = price.id
    await db.commit()
    await db.refresh(plan)
    return price.id


async def create_checkout_session(
    db: AsyncSession, org: Organization, plan: Plan
) -> str:
    """Create a subscription-mode Checkout Session and return its URL."""
    ensure_configured()
    customer_id = await get_or_create_customer(db, org)
    price_id = await _ensure_price_id(db, plan)

    stripe = _client()
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=settings.stripe_success_url,
        cancel_url=settings.stripe_cancel_url,
        client_reference_id=str(org.id),
        metadata={"plan_code": plan.code},
        subscription_data={"metadata": {"plan_code": plan.code}},
    )
    return session.url


async def create_portal_session(org: Organization) -> str:
    """Create a billing portal session for the org's customer and return its URL."""
    ensure_configured()
    if not org.stripe_customer_id:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "No Stripe customer for this organization",
        )

    stripe = _client()
    session = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=settings.stripe_success_url,
    )
    return session.url


async def handle_webhook_event(
    db: AsyncSession, payload: bytes, sig_header: str | None
) -> None:
    """Verify and process a Stripe webhook event. Defensive throughout."""
    ensure_configured()
    if not settings.stripe_webhook_secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Stripe webhook secret not configured",
        )

    stripe = _client()
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as exc:  # signature or parsing failure
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid webhook: {exc}")

    event_type = event.get("type")
    data_object = (event.get("data") or {}).get("object") or {}

    if event_type == "checkout.session.completed":
        org_id = data_object.get("client_reference_id")
        metadata = data_object.get("metadata") or {}
        plan_code = metadata.get("plan_code")
        subscription_id = data_object.get("subscription")
        if not org_id:
            return
        try:
            import uuid

            org = await db.get(Organization, uuid.UUID(str(org_id)))
        except (ValueError, TypeError):
            org = None
        if org is None:
            return
        if plan_code:
            org.plan = plan_code
        if subscription_id:
            org.stripe_subscription_id = subscription_id
        await db.commit()

    elif event_type == "customer.subscription.deleted":
        subscription_id = data_object.get("id")
        customer_id = data_object.get("customer")
        org = None
        from sqlalchemy import select

        if subscription_id:
            org = (
                await db.execute(
                    select(Organization).where(
                        Organization.stripe_subscription_id == subscription_id
                    )
                )
            ).scalar_one_or_none()
        if org is None and customer_id:
            org = (
                await db.execute(
                    select(Organization).where(
                        Organization.stripe_customer_id == customer_id
                    )
                )
            ).scalar_one_or_none()
        if org is None:
            return
        org.plan = "free"
        org.stripe_subscription_id = None
        await db.commit()
