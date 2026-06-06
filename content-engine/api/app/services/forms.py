"""Forms service: form CRUD, publish, submission recording & real analytics.

All completion-rate, NPS and quiz-scoring math is computed from real
``FormSubmission`` rows — never fabricated. Public-safe helpers expose only the
fields needed to render/embed a published form.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forms import Form, FormSubmission

VALID_KINDS = ("form", "quiz", "survey", "poll")
VALID_FIELD_TYPES = (
    "text",
    "email",
    "select",
    "radio",
    "checkbox",
    "rating",
    "nps",
)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or "form").lower()).strip("-")
    return (base or "form")[:160]


def _normalize_fields(fields: Any) -> list[dict]:
    """Coerce an arbitrary fields blob into a clean ordered list."""
    out: list[dict] = []
    if not isinstance(fields, list):
        return out
    for idx, raw in enumerate(fields):
        if not isinstance(raw, dict):
            continue
        ftype = str(raw.get("type") or "text").lower()
        if ftype not in VALID_FIELD_TYPES:
            ftype = "text"
        fid = str(raw.get("id") or f"f{idx + 1}")
        field: dict[str, Any] = {
            "id": fid,
            "label": str(raw.get("label") or f"Question {idx + 1}"),
            "type": ftype,
            "required": bool(raw.get("required", False)),
        }
        opts = raw.get("options")
        if isinstance(opts, list):
            field["options"] = [str(o) for o in opts]
        out.append(field)
    return out


# --------------------------------------------------------------------------- #
# CRUD
# --------------------------------------------------------------------------- #
async def list_forms(db: AsyncSession, ws_id: uuid.UUID) -> list[Form]:
    res = await db.execute(
        select(Form)
        .where(Form.workspace_id == ws_id)
        .order_by(Form.created_at.desc())
    )
    return list(res.scalars().all())


async def get_form(
    db: AsyncSession, ws_id: uuid.UUID, form_id: uuid.UUID
) -> Form | None:
    res = await db.execute(
        select(Form).where(Form.id == form_id, Form.workspace_id == ws_id)
    )
    return res.scalar_one_or_none()


async def get_form_by_slug(db: AsyncSession, slug: str) -> Form | None:
    """Public-safe getter by slug for embedding (only published forms)."""
    res = await db.execute(
        select(Form).where(Form.slug == slug, Form.status == "published")
    )
    return res.scalar_one_or_none()


async def create_form(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    kind: str = "form",
    fields: Any = None,
    settings: dict | None = None,
    description: str | None = None,
) -> Form:
    kind = kind if kind in VALID_KINDS else "form"
    obj = Form(
        workspace_id=ws_id,
        name=name,
        kind=kind,
        fields=_normalize_fields(fields),
        settings=settings or {},
        description=description,
        slug=_slugify(name) + "-" + uuid.uuid4().hex[:6],
        status="draft",
    )
    db.add(obj)
    await db.flush()
    return obj


async def update_form(
    db: AsyncSession,
    form: Form,
    *,
    name: str | None = None,
    kind: str | None = None,
    fields: Any = None,
    settings: dict | None = None,
    description: str | None = None,
    status: str | None = None,
) -> Form:
    if name is not None:
        form.name = name
    if kind is not None and kind in VALID_KINDS:
        form.kind = kind
    if fields is not None:
        form.fields = _normalize_fields(fields)
    if settings is not None:
        form.settings = settings
    if description is not None:
        form.description = description
    if status is not None and status in ("draft", "published"):
        form.status = status
    await db.flush()
    return form


async def publish_form(db: AsyncSession, form: Form) -> Form:
    form.status = "published"
    form.published_at = datetime.now(timezone.utc)
    if not form.slug:
        form.slug = _slugify(form.name) + "-" + uuid.uuid4().hex[:6]
    await db.flush()
    return form


async def increment_views(db: AsyncSession, form: Form) -> None:
    form.views = int(form.views or 0) + 1
    await db.flush()


# --------------------------------------------------------------------------- #
# Submissions + scoring
# --------------------------------------------------------------------------- #
def _score_submission(form: Form, data: dict[str, Any]) -> float | None:
    """Compute a score for quiz (correct answers) or NPS (rating value)."""
    fields = form.fields or []
    if form.kind == "quiz":
        total = 0
        correct = 0
        for f in fields:
            answer_key = f.get("answer") if isinstance(f, dict) else None
            if answer_key is None:
                continue
            total += 1
            given = data.get(f.get("id"))
            if given is not None and str(given) == str(answer_key):
                correct += 1
        if total == 0:
            return None
        return round(correct / total * 100.0, 2)
    # NPS: take the first nps field's numeric value.
    for f in fields:
        if isinstance(f, dict) and f.get("type") == "nps":
            val = data.get(f.get("id"))
            try:
                return float(val)
            except (TypeError, ValueError):
                return None
    return None


async def record_submission(
    db: AsyncSession,
    form: Form,
    *,
    data: dict[str, Any],
    contact_email: str | None = None,
    anon_id: str | None = None,
) -> FormSubmission:
    score = _score_submission(form, data or {})
    sub = FormSubmission(
        form_id=form.id,
        workspace_id=form.workspace_id,
        data=data or {},
        contact_email=(contact_email or None),
        score=score,
        anon_id=(anon_id or None),
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(sub)
    form.submissions = int(form.submissions or 0) + 1
    await db.flush()
    return sub


async def list_submissions(
    db: AsyncSession, ws_id: uuid.UUID, form_id: uuid.UUID, limit: int = 200
) -> list[FormSubmission]:
    res = await db.execute(
        select(FormSubmission)
        .where(
            FormSubmission.form_id == form_id,
            FormSubmission.workspace_id == ws_id,
        )
        .order_by(FormSubmission.submitted_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


def completion_rate(form: Form) -> float:
    views = int(form.views or 0)
    subs = int(form.submissions or 0)
    if views <= 0:
        return 0.0
    return round(min(subs / views, 1.0) * 100.0, 1)


async def nps_breakdown(
    db: AsyncSession, ws_id: uuid.UUID, form_id: uuid.UUID
) -> dict[str, Any]:
    """Real NPS computation from stored scores (0-10 scale)."""
    res = await db.execute(
        select(FormSubmission.score).where(
            FormSubmission.form_id == form_id,
            FormSubmission.workspace_id == ws_id,
            FormSubmission.score.is_not(None),
        )
    )
    scores = [float(s) for (s,) in res.all() if s is not None]
    total = len(scores)
    if total == 0:
        return {"nps": None, "promoters": 0, "passives": 0, "detractors": 0, "responses": 0}
    promoters = sum(1 for s in scores if s >= 9)
    detractors = sum(1 for s in scores if s <= 6)
    passives = total - promoters - detractors
    nps = round((promoters - detractors) / total * 100.0, 1)
    return {
        "nps": nps,
        "promoters": promoters,
        "passives": passives,
        "detractors": detractors,
        "responses": total,
    }


# --------------------------------------------------------------------------- #
# Overview rollup
# --------------------------------------------------------------------------- #
async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    forms = await list_forms(db, ws_id)
    total_forms = len(forms)
    published = sum(1 for f in forms if f.status == "published")
    total_submissions = sum(int(f.submissions or 0) for f in forms)
    total_views = sum(int(f.views or 0) for f in forms)
    rates = [completion_rate(f) for f in forms if int(f.views or 0) > 0]
    avg_completion = round(sum(rates) / len(rates), 1) if rates else 0.0
    by_kind: dict[str, int] = {}
    for f in forms:
        by_kind[f.kind] = by_kind.get(f.kind, 0) + 1
    return {
        "forms": total_forms,
        "published": published,
        "submissions": total_submissions,
        "views": total_views,
        "avg_completion": avg_completion,
        "by_kind": by_kind,
    }


def public_view(form: Form) -> dict[str, Any]:
    """Public-safe representation for embedding (no internal counters leaked)."""
    return {
        "id": str(form.id),
        "name": form.name,
        "kind": form.kind,
        "description": form.description,
        "fields": form.fields or [],
        "settings": form.settings or {},
        "slug": form.slug,
    }
