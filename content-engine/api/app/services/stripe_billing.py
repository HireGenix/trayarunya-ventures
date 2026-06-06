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


async def cancel_subscription(org: Organization) -> bool:
    """Cancel the org's live Stripe subscription, if any.

    Best-effort: when Stripe is unconfigured or the cancel call fails (e.g. the
    subscription was already removed), it returns ``False`` without raising so a
    superadmin can still terminate the plan locally. Clears the stored
    subscription id on success. The caller persists the org changes.
    """
    sub_id = org.stripe_subscription_id
    if not sub_id or not settings.stripe_configured:
        org.stripe_subscription_id = None
        return False
    try:
        stripe = _client()
        stripe.Subscription.delete(sub_id)
    except Exception:  # noqa: BLE001 — never block a local termination on Stripe.
        import logging

        logging.getLogger("billing").warning(
            "cancel_subscription: Stripe delete failed for %s", sub_id, exc_info=True
        )
        org.stripe_subscription_id = None
        return False
    org.stripe_subscription_id = None
    return True


_PRO_PRODUCT_NAME = "MarketiQ AI Pro"
_LOOKUP_MONTHLY = "marketiq_pro_monthly_usd"
_LOOKUP_YEARLY = "marketiq_pro_yearly_usd"

# Introductory taper: 50% off year 1, then 25% off years 2-3, then full price.
_COUPON_INTRO_50 = "marketiq_intro_50"
_COUPON_INTRO_25 = "marketiq_intro_25"


def _get_or_create_coupon(coupon_id: str, percent_off: int, duration_in_months: int) -> str:
    """Return a stable percent-off coupon id, creating it once if missing.

    The coupon is bounded by ``duration_in_months`` so that, even if the
    follow-on subscription schedule is never attached, the discount expires on
    its own and the subscription reverts to list price (never an over-charge
    beyond the published price).
    """
    stripe = _client()
    try:
        return stripe.Coupon.retrieve(coupon_id).id
    except Exception:  # noqa: BLE001 — not found / first run; create below.
        pass
    coupon = stripe.Coupon.create(
        id=coupon_id,
        percent_off=percent_off,
        duration="repeating",
        duration_in_months=duration_in_months,
        name=f"MarketiQ intro {percent_off}% off",
    )
    return coupon.id


def _ensure_intro_schedule(subscription_id: str, interval: str) -> None:
    """Wrap a fresh subscription in a 3-phase schedule for the intro taper.

    Phases (in billing cycles): 50% off year 1 -> 25% off years 2-3 -> full.
    Best-effort: any failure is logged and swallowed so signup never breaks. In
    that case the customer keeps the year-1 50% applied at checkout and the
    taper can be reconciled manually.
    """
    if not subscription_id:
        return
    try:
        stripe = _client()
        sub = stripe.Subscription.retrieve(subscription_id)
        price_id = sub["items"]["data"][0]["price"]["id"]
        is_yearly = interval == "yearly"
        p1_iters = 1 if is_yearly else 12   # year 1
        p2_iters = 2 if is_yearly else 24   # years 2-3
        c50 = _get_or_create_coupon(_COUPON_INTRO_50, 50, 12)
        c25 = _get_or_create_coupon(_COUPON_INTRO_25, 25, 24)

        schedule = stripe.SubscriptionSchedule.create(from_subscription=subscription_id)
        item = [{"price": price_id, "quantity": 1}]
        stripe.SubscriptionSchedule.modify(
            schedule.id,
            end_behavior="release",
            phases=[
                {"items": item, "iterations": p1_iters, "discounts": [{"coupon": c50}]},
                {"items": item, "iterations": p2_iters, "discounts": [{"coupon": c25}]},
                {"items": item},
            ],
        )
    except Exception:  # noqa: BLE001 — never block signup on Stripe scheduling.
        import logging

        logging.getLogger("billing").warning(
            "intro schedule attach failed for %s", subscription_id, exc_info=True
        )


def _get_or_create_price(interval: str) -> str:
    """Return a stable Stripe Price id for the Pro seat, by billing interval.

    Prices are looked up by ``lookup_key`` so we never create duplicates and
    never need to persist price ids in our own database.
    """
    stripe = _client()
    is_yearly = interval == "yearly"
    lookup_key = _LOOKUP_YEARLY if is_yearly else _LOOKUP_MONTHLY

    existing = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1)
    if existing.data:
        return existing.data[0].id

    amount = (
        settings.pro_price_yearly_usd if is_yearly else settings.pro_price_monthly_usd
    ) * 100
    price = stripe.Price.create(
        currency="usd",
        unit_amount=amount,
        recurring={"interval": "year" if is_yearly else "month"},
        lookup_key=lookup_key,
        product_data={"name": _PRO_PRODUCT_NAME},
    )
    return price.id


async def create_signup_checkout(
    *,
    email: str,
    password_hash: str,
    full_name: str,
    org_name: str,
    org_type: str,
    interval: str,
) -> str:
    """Create a subscription Checkout Session for a brand-new, unpaid signup.

    The pending account details (including the already-hashed password) ride in
    the session metadata; the real account is provisioned only after Stripe
    confirms payment in ``complete_signup``.
    """
    ensure_configured()
    stripe = _client()
    price_id = _get_or_create_price(interval)

    base = settings.public_web_url.rstrip("/")
    intro_coupon = _get_or_create_coupon(_COUPON_INTRO_50, 50, 12)
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=email,
        line_items=[{"price": price_id, "quantity": 1}],
        discounts=[{"coupon": intro_coupon}],
        success_url=f"{base}/signup/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base}/signup?checkout=cancel",
        metadata={
            "purpose": "signup",
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "org_name": org_name,
            "org_type": org_type,
            "interval": interval,
            "plan_code": "pro",
        },
        subscription_data={"metadata": {"plan_code": "pro", "purpose": "signup"}},
    )
    return session.url


async def complete_signup(db: AsyncSession, session_id: str):
    """Provision (or resolve) the account for a paid signup Checkout Session.

    Idempotent: safe to call multiple times (e.g. from both the success page and
    the webhook). Returns ``(User, access_token)``.
    """
    ensure_configured()
    stripe = _client()

    session = stripe.checkout.Session.retrieve(session_id)
    metadata = session.get("metadata") or {}
    if metadata.get("purpose") != "signup":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a signup session")
    if session.get("payment_status") != "paid":
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Payment not completed")

    from sqlalchemy import select

    from app.models import Membership, OrgType, Role, User, Workspace
    from app.security import create_access_token
    from app.services import auth_service

    email = (metadata.get("email") or "").lower()
    if not email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing signup email")

    existing = (
        await db.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if existing is not None:
        token = create_access_token(str(existing.id), extra={"email": existing.email})
        return existing, token

    user = User(
        email=email,
        full_name=metadata.get("full_name") or email,
        password_hash=metadata.get("password_hash") or "",
    )
    db.add(user)
    await db.flush()

    try:
        org_type = OrgType(metadata.get("org_type") or "company")
    except ValueError:
        org_type = OrgType.company

    org_name = metadata.get("org_name") or user.full_name
    org = Organization(
        name=org_name,
        slug=await auth_service._unique_org_slug(db, org_name),
        org_type=org_type,
        plan="pro",
        stripe_customer_id=session.get("customer"),
        stripe_subscription_id=session.get("subscription"),
    )
    db.add(org)
    await db.flush()

    workspace = Workspace(organization_id=org.id, name=org_name, slug="default")
    db.add(workspace)
    await db.flush()

    db.add(
        Membership(
            user_id=user.id,
            organization_id=org.id,
            workspace_id=workspace.id,
            role=Role.owner,
        )
    )
    await db.commit()
    await db.refresh(user)

    # Attach the intro taper (50% y1 -> 25% y2-3 -> full). Best-effort.
    _ensure_intro_schedule(
        str(session.get("subscription") or ""),
        str(metadata.get("interval") or "monthly"),
    )

    token = create_access_token(str(user.id), extra={"email": user.email})
    return user, token


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
        metadata = data_object.get("metadata") or {}
        if metadata.get("purpose") == "signup":
            session_id = data_object.get("id")
            if session_id:
                try:
                    await complete_signup(db, str(session_id))
                except HTTPException:
                    pass
            return

        org_id = data_object.get("client_reference_id")
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
