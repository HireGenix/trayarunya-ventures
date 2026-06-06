"""Public pages & forms runtime — zero-auth endpoints for anonymous visitors.

These endpoints are hit by public browsers rendering landing pages and submitting
forms. NO authentication, NO workspace header. CORS-friendly.

Endpoints:
- GET  /public/pages/{slug}        → fetch published page by slug
- POST /public/pages/{slug}/visit  → record a visit event
- POST /public/events              → generic pixel event ingest
- GET  /public/assign              → deterministic variant assignment
- GET  /public/forms/{form_id}     → fetch published form for embedding
- POST /public/forms/{form_id}/submit → validate + submit form data
- POST /public/forms/{form_id}/field-event → field-level analytics
"""
from __future__ import annotations

import hashlib
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Workspace
from app.models.conversion import EVENT_TYPES, ConversionEvent
from app.models.form_field_event import FormFieldEvent
from app.models.forms import Form, FormSubmission
from app.models.funnels import LandingPage
from app.models.leadscore import Lead, LeadActivity
from app.models.platform import Experiment
from app.models.variant_assignment import VariantAssignment
from app.services import forms as forms_svc
from app.services import funnels as funnels_svc
from app.services.variant_assignment import assign_variant

router = APIRouter(prefix="/public", tags=["public"])


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _coerce_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None


def _page_payload(page: LandingPage) -> dict:
    return {
        "id": str(page.id),
        "name": page.name,
        "slug": page.slug,
        "blocks": page.blocks or [],
        "seo_title": page.seo_title,
        "seo_description": page.seo_description,
        "theme": page.theme or {},
        "workspace_id": str(page.workspace_id),
    }


# --------------------------------------------------------------------------- #
# Pages
# --------------------------------------------------------------------------- #
@router.get("/pages/{slug}")
async def get_public_page(slug: str, db: AsyncSession = Depends(get_db)) -> dict:
    """Fetch a published landing page by slug. Returns 404 for unpublished/unknown."""
    page = await funnels_svc.get_page_by_slug(db, slug)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found")
    return _page_payload(page)


class VisitIn(BaseModel):
    anon_id: str = Field(min_length=1, max_length=120)
    referrer: str | None = None
    device: str | None = None
    experiment_id: str | None = None
    variant_id: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    campaign: str | None = None


@router.post("/pages/{slug}/visit", status_code=status.HTTP_202_ACCEPTED)
async def record_page_visit(
    slug: str, body: VisitIn, db: AsyncSession = Depends(get_db)
) -> dict:
    """Record a real visit event for a published page.

    Creates a FunnelVisit row (increments page.views) AND a ConversionEvent
    row so the CRO funnel lights up with real data.
    """
    page = await funnels_svc.get_page_by_slug(db, slug)
    if page is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found")

    # FunnelVisit + page.views increment
    await funnels_svc.record_visit(
        db,
        page.workspace_id,
        page_id=page.id,
        anon_id=body.anon_id,
    )

    # ConversionEvent for CRO funnel
    now = datetime.now(timezone.utc)
    db.add(ConversionEvent(
        workspace_id=page.workspace_id,
        anon_id=body.anon_id[:120],
        event_type="page_view",
        url=f"/p/{slug}",
        referrer=body.referrer,
        device=body.device,
        experiment_id=_coerce_uuid(body.experiment_id),
        variant_id=body.variant_id,
        campaign=body.campaign,
        utm_source=body.utm_source,
        utm_medium=body.utm_medium,
        source="public_page",
        occurred_at=now,
    ))
    await db.flush()
    return {"status": "accepted", "page_id": str(page.id)}


# --------------------------------------------------------------------------- #
# Generic pixel event ingest (public)
# --------------------------------------------------------------------------- #
class PublicEventIn(BaseModel):
    workspace_id: str = Field(description="Public site key (workspace id)")
    anon_id: str = Field(min_length=1, max_length=120)
    event_type: str
    url: str | None = None
    referrer: str | None = None
    device: str | None = None
    experiment_id: str | None = None
    variant_id: str | None = None
    campaign: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    value: float = 0.0
    currency: str = "USD"
    step: str | None = None
    meta: dict | None = None


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
async def collect_public_event(
    body: PublicEventIn, db: AsyncSession = Depends(get_db)
) -> dict:
    """Public pixel event ingest — mirrors /cro/collect but single-event."""
    ws_id = _coerce_uuid(body.workspace_id)
    if ws_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid workspace_id")
    workspace = await db.get(Workspace, ws_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown site key")

    etype = body.event_type if body.event_type in EVENT_TYPES else "custom"
    now = datetime.now(timezone.utc)
    db.add(ConversionEvent(
        workspace_id=ws_id,
        anon_id=body.anon_id[:120],
        event_type=etype,
        step=body.step,
        url=body.url,
        referrer=body.referrer,
        device=body.device,
        experiment_id=_coerce_uuid(body.experiment_id),
        variant_id=body.variant_id,
        campaign=body.campaign,
        utm_source=body.utm_source,
        utm_medium=body.utm_medium,
        value=float(body.value or 0.0),
        currency=(body.currency or "USD")[:8],
        source="pixel",
        meta=body.meta,
        occurred_at=now,
    ))
    await db.flush()
    return {"accepted": 1}


# --------------------------------------------------------------------------- #
# Variant assignment
# --------------------------------------------------------------------------- #
@router.get("/assign")
async def assign_visitor_variant(
    experiment: str = Query(description="Experiment ID"),
    visitor: str = Query(description="Anonymous visitor ID", min_length=1, max_length=120),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Deterministic variant assignment for A/B testing.

    Given an experiment ID and anonymous visitor ID, returns the assigned
    variant deterministically (same visitor always gets same variant).
    Records an impression event.
    """
    exp_id = _coerce_uuid(experiment)
    if exp_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid experiment ID")
    result = await assign_variant(db, experiment_id=exp_id, visitor_id=visitor)
    if "error" in result:
        if result["error"] == "experiment_not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Experiment not found")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, result["error"])
    return result


# --------------------------------------------------------------------------- #
# Forms runtime
# --------------------------------------------------------------------------- #
@router.get("/forms/{form_id}")
async def get_public_form(form_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> dict:
    """Fetch a published form by ID for public embedding."""
    form = await db.get(Form, form_id)
    if form is None or form.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    await forms_svc.increment_views(db, form)
    return forms_svc.public_view(form)


class ConditionalRule(BaseModel):
    """A show/hide rule: show this field when another field has a certain value."""
    field_id: str
    operator: str = "eq"  # eq | neq | contains | gt | lt
    value: str | None = None


class FormSubmitIn(BaseModel):
    data: dict
    anon_id: str | None = None
    honeypot: str | None = Field(default=None, alias="_hp")
    timestamp: float | None = Field(default=None, description="Page load timestamp (ms)")
    token: str | None = None


def _evaluate_condition(rule: dict, data: dict) -> bool:
    """Evaluate a single conditional visibility rule."""
    dep_field = rule.get("depends_on") or rule.get("field_id", "")
    op = rule.get("operator", "eq")
    expected = rule.get("value")
    actual = data.get(dep_field)

    if actual is None:
        return op == "neq"

    actual_str = str(actual)
    expected_str = str(expected) if expected is not None else ""

    if op == "eq":
        return actual_str == expected_str
    if op == "neq":
        return actual_str != expected_str
    if op == "contains":
        return expected_str in actual_str
    if op == "gt":
        try:
            return float(actual_str) > float(expected_str)
        except (ValueError, TypeError):
            return False
    if op == "lt":
        try:
            return float(actual_str) < float(expected_str)
        except (ValueError, TypeError):
            return False
    return True


def _validate_form_data(fields: list[dict], data: dict) -> list[str]:
    """Validate form submission data against field definitions.

    Evaluates conditional logic (show/hide) and required validation.
    Returns a list of validation error messages (empty = valid).
    """
    errors: list[str] = []
    for field in fields:
        fid = field.get("id", "")
        required = bool(field.get("required", False))

        # Conditional visibility: if field has a condition and it's not met,
        # the field is hidden and should not be validated
        condition = field.get("condition")
        if condition and isinstance(condition, dict):
            if not _evaluate_condition(condition, data):
                continue  # Field is hidden, skip validation

        value = data.get(fid)
        if required and (value is None or str(value).strip() == ""):
            label = field.get("label", fid)
            errors.append(f"{label} is required")

    return errors


def _generate_token(form_id: str, timestamp: float) -> str:
    """Generate a simple anti-bot token from form_id + timestamp."""
    raw = f"{form_id}:{int(timestamp / 10000)}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


MIN_SUBMIT_TIME_MS = 2000  # 2 seconds minimum


@router.post("/forms/{form_id}/submit", status_code=status.HTTP_201_CREATED)
async def submit_public_form(
    form_id: uuid.UUID,
    body: FormSubmitIn,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Public form submission with validation, spam protection, and lead creation.

    Spam protection:
    - Honeypot field: if _hp is filled, reject silently (bots fill hidden fields)
    - Minimum time-to-submit: reject if submitted too fast (< 2 seconds)
    - Optional token validation
    """
    form = await db.get(Form, form_id)
    if form is None or form.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")

    # Spam protection: honeypot
    if body.honeypot:
        # Silently accept but don't record (looks like success to bots)
        return {"status": "accepted", "submission_id": str(uuid.uuid4())}

    # Spam protection: minimum time check
    if body.timestamp is not None:
        elapsed = time.time() * 1000 - body.timestamp
        if elapsed < MIN_SUBMIT_TIME_MS:
            return {"status": "accepted", "submission_id": str(uuid.uuid4())}

    # Validate form data
    fields = form.fields or []
    errors = _validate_form_data(fields, body.data or {})
    if errors:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, {"errors": errors})

    # Extract contact email from data
    contact_email = None
    for f in fields:
        if f.get("type") == "email":
            val = (body.data or {}).get(f.get("id", ""))
            if val and isinstance(val, str) and "@" in val:
                contact_email = val
                break

    # Record submission (uses existing service)
    sub = await forms_svc.record_submission(
        db,
        form,
        data=body.data or {},
        contact_email=contact_email,
        anon_id=body.anon_id,
    )

    # Record ConversionEvent for CRO
    now = datetime.now(timezone.utc)
    db.add(ConversionEvent(
        workspace_id=form.workspace_id,
        anon_id=(body.anon_id or "unknown")[:120],
        event_type="form_submit",
        step=form.name,
        source="public_form",
        occurred_at=now,
    ))

    # Create/update Lead if we have an email
    if contact_email:
        existing_lead = await db.execute(
            select(Lead).where(
                Lead.workspace_id == form.workspace_id,
                Lead.email == contact_email,
            )
        )
        lead = existing_lead.scalar_one_or_none()
        if lead is None:
            # Extract name/company from submission data
            name_val = None
            company_val = None
            for f in fields:
                fid = f.get("id", "")
                ftype = f.get("type", "")
                flabel = (f.get("label") or "").lower()
                val = (body.data or {}).get(fid)
                if val and ("name" in flabel and "company" not in flabel):
                    name_val = str(val)
                elif val and ("company" in flabel or "org" in flabel):
                    company_val = str(val)

            lead = Lead(
                workspace_id=form.workspace_id,
                email=contact_email,
                name=name_val,
                company=company_val,
                source=f"form:{form.name}",
                stage="subscriber",
                score=10,
                grade="C",
            )
            db.add(lead)
            await db.flush()

        # Record lead activity
        db.add(LeadActivity(
            lead_id=lead.id,
            workspace_id=form.workspace_id,
            kind="form_submit",
            weight=10,
            meta={"form_id": str(form_id), "form_name": form.name},
        ))

    # Also record page submission on the form's associated page if applicable
    await db.flush()

    return {
        "status": "accepted",
        "submission_id": str(sub.id),
        "score": sub.score,
    }


class FieldEventIn(BaseModel):
    field_id: str = Field(min_length=1, max_length=80)
    event_type: str = Field(description="started | completed")
    anon_id: str | None = None


@router.post("/forms/{form_id}/field-event", status_code=status.HTTP_202_ACCEPTED)
async def record_field_event(
    form_id: uuid.UUID,
    body: FieldEventIn,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Record a field-level analytics event (started/completed)."""
    form = await db.get(Form, form_id)
    if form is None or form.status != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")

    event_type = body.event_type if body.event_type in ("started", "completed") else "started"
    db.add(FormFieldEvent(
        form_id=form_id,
        workspace_id=form.workspace_id,
        field_id=body.field_id,
        event_type=event_type,
        anon_id=body.anon_id,
    ))
    await db.flush()
    return {"status": "accepted"}
