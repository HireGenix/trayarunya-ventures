"""The Forms Agent — autonomous form/quiz/survey designer & analyst.

Grounded entirely in REAL workspace rows:

    generate_form      -> design a complete, goal-grounded fields[] array for the
                          requested kind (lead-gen form, NPS survey, product quiz,
                          poll). LLM + deterministic fallback so it never hard-fails.
    summarize_responses-> real aggregation over FormSubmission rows + LLM synthesis
                          of the key themes / insights.
    run_cycle          -> SENSE low-completion published forms and PLAN concrete
                          field-reduction suggestions for autonomy loops.

The LLM is the platform Azure-registry adapter; every prompt is anchored to the
brief and to counts/answers pulled from the database.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.forms import Form, FormSubmission
from app.services import forms as svc

log = logging.getLogger("forms_agent")

SYSTEM = (
    "You are an expert conversion-focused forms, survey and quiz strategist. "
    "You design lean, high-completion forms and read response data like an "
    "analyst. Respond with strict JSON only — no prose, no markdown."
)


# --------------------------------------------------------------------------- #
# Deterministic fallbacks (valid fields arrays, per kind)
# --------------------------------------------------------------------------- #
def _fallback_fields(kind: str) -> list[dict]:
    if kind == "survey":
        return [
            {"id": "nps", "label": "How likely are you to recommend us to a friend or colleague?",
             "type": "nps", "required": True},
            {"id": "reason", "label": "What is the primary reason for your score?",
             "type": "text", "required": False},
            {"id": "improve", "label": "What is the one thing we could improve?",
             "type": "text", "required": False},
        ]
    if kind == "quiz":
        return [
            {"id": "q1", "label": "Which goal matters most to you right now?",
             "type": "radio", "required": True,
             "options": ["Grow traffic", "Improve conversion", "Reduce churn"]},
            {"id": "q2", "label": "What is your current monthly visitor range?",
             "type": "select", "required": True,
             "options": ["< 1k", "1k-10k", "10k-100k", "100k+"]},
            {"id": "email", "label": "Where should we send your results?",
             "type": "email", "required": True},
        ]
    if kind == "poll":
        return [
            {"id": "choice", "label": "Which option do you prefer?",
             "type": "radio", "required": True,
             "options": ["Option A", "Option B", "Option C"]},
        ]
    # Default lead-gen form
    return [
        {"id": "name", "label": "Full name", "type": "text", "required": True},
        {"id": "email", "label": "Work email", "type": "email", "required": True},
        {"id": "company", "label": "Company", "type": "text", "required": False},
        {"id": "interest", "label": "What are you most interested in?",
         "type": "select", "required": False,
         "options": ["Product demo", "Pricing", "Partnership", "Support"]},
    ]


# --------------------------------------------------------------------------- #
# generate_form
# --------------------------------------------------------------------------- #
async def generate_form(
    db: AsyncSession,
    ws_id: uuid.UUID,
    brief: str,
    kind: str = "form",
) -> dict[str, Any]:
    """Design a complete fields[] array appropriate to ``kind``, grounded in goal."""
    kind = kind if kind in svc.VALID_KINDS else "form"

    # SENSE: ground prompt in how many forms already exist for this workspace.
    existing = (
        await db.execute(select(Form).where(Form.workspace_id == ws_id))
    ).scalars().all()
    existing_names = [f.name for f in existing][:10]

    field_types = ", ".join(svc.VALID_FIELD_TYPES)
    user = (
        f"Workspace already has {len(existing)} forms: {existing_names}.\n"
        f"Design a {kind}.\n"
        f"Goal / brief: {brief.strip()}\n\n"
        f"Field types allowed: {field_types}.\n"
        "Rules:\n"
        "- Keep it lean (max 6 fields) to maximise completion.\n"
        "- For a survey prefer an `nps` field plus a short open follow-up.\n"
        "- For a quiz, each scored field MUST include an `answer` key (the "
        "correct option) and `options`.\n"
        "- For a lead-gen form, always capture an `email` field.\n"
        "- Each field: {id, label, type, required, options?(for select/radio/"
        "checkbox), answer?(quiz only)}.\n"
        'Return JSON: {"name": "...", "fields": [ ... ]}'
    )

    fields: list[dict] = []
    name = ""
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if isinstance(data, dict) and not data.get("_parse_error"):
            raw_fields = data.get("fields")
            fields = svc._normalize_fields(raw_fields)
            # Preserve quiz answer keys that _normalize_fields drops.
            if kind == "quiz" and isinstance(raw_fields, list):
                by_id = {f["id"]: f for f in fields}
                for raw in raw_fields:
                    if isinstance(raw, dict) and raw.get("id") in by_id and raw.get("answer") is not None:
                        by_id[raw["id"]]["answer"] = str(raw["answer"])
            name = str(data.get("name") or "").strip()
    except Exception as exc:  # noqa: BLE001
        log.warning("generate_form LLM failed, using fallback: %s", exc)

    if not fields:
        fields = svc._normalize_fields(_fallback_fields(kind))
        if kind == "quiz":
            # Re-attach fallback answers stripped by normalization.
            answers = {f["id"]: f.get("answer") for f in _fallback_fields(kind) if f.get("answer")}
            for f in fields:
                if f["id"] in answers:
                    f["answer"] = answers[f["id"]]

    if not name:
        name = (brief.strip()[:60] or f"New {kind}").rstrip()

    return {"name": name, "kind": kind, "fields": fields, "source": "agent"}


# --------------------------------------------------------------------------- #
# summarize_responses
# --------------------------------------------------------------------------- #
async def summarize_responses(
    db: AsyncSession,
    ws_id: uuid.UUID,
    form_id: uuid.UUID,
) -> dict[str, Any]:
    """Real aggregation over submissions + LLM synthesis of themes/insights."""
    form = await svc.get_form(db, ws_id, form_id)
    if form is None:
        return {"status": "not_found", "insights": [], "themes": []}

    subs = await svc.list_submissions(db, ws_id, form_id, limit=500)
    total = len(subs)
    if total == 0:
        return {
            "status": "low_data",
            "responses": 0,
            "themes": [],
            "insights": ["No submissions yet — share or embed the form to collect responses."],
            "summary": "No responses collected yet.",
        }

    # Real per-field aggregation.
    fields = form.fields or []
    aggregates: dict[str, Any] = {}
    text_samples: list[str] = []
    for f in fields:
        if not isinstance(f, dict):
            continue
        fid = f.get("id")
        ftype = f.get("type")
        values = [s.data.get(fid) for s in subs if isinstance(s.data, dict) and s.data.get(fid) is not None]
        if ftype in ("select", "radio", "checkbox"):
            counts: dict[str, int] = {}
            for v in values:
                for item in (v if isinstance(v, list) else [v]):
                    counts[str(item)] = counts.get(str(item), 0) + 1
            aggregates[f.get("label", fid)] = counts
        elif ftype in ("rating", "nps"):
            nums = [float(v) for v in values if _is_num(v)]
            if nums:
                aggregates[f.get("label", fid)] = {
                    "avg": round(sum(nums) / len(nums), 2),
                    "count": len(nums),
                }
        elif ftype == "text":
            for v in values[:25]:
                if isinstance(v, str) and v.strip():
                    text_samples.append(v.strip())

    nps = await svc.nps_breakdown(db, ws_id, form_id)

    user = (
        f"Form '{form.name}' ({form.kind}) received {total} responses.\n"
        f"Structured aggregates: {aggregates}\n"
        f"NPS breakdown: {nps}\n"
        f"Open-text samples: {text_samples[:25]}\n\n"
        "Analyze the responses and surface the most actionable findings.\n"
        'Return JSON: {"summary": "2-3 sentence overview", '
        '"themes": ["theme", ...], "insights": ["specific insight", ...]}'
    )

    themes: list[str] = []
    insights: list[str] = []
    summary = ""
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if isinstance(data, dict) and not data.get("_parse_error"):
            themes = [str(t) for t in (data.get("themes") or [])][:8]
            insights = [str(i) for i in (data.get("insights") or [])][:8]
            summary = str(data.get("summary") or "")
    except Exception as exc:  # noqa: BLE001
        log.warning("summarize_responses LLM failed: %s", exc)

    if not summary:
        summary = f"{total} responses analyzed across {len(fields)} fields."
    if not insights:
        insights = [f"{total} total responses collected."]
        if nps.get("nps") is not None:
            insights.append(f"Current NPS is {nps['nps']} from {nps['responses']} scored responses.")

    return {
        "status": "ok",
        "responses": total,
        "aggregates": aggregates,
        "nps": nps,
        "summary": summary,
        "themes": themes,
        "insights": insights,
    }


# --------------------------------------------------------------------------- #
# run_cycle — autonomy loop
# --------------------------------------------------------------------------- #
async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Flag low-completion published forms + suggest field reductions."""
    forms = await svc.list_forms(db, ws_id)
    flagged: list[dict[str, Any]] = []
    for f in forms:
        if f.status != "published":
            continue
        views = int(f.views or 0)
        if views < 20:  # not enough traffic to judge
            continue
        rate = svc.completion_rate(f)
        n_fields = len(f.fields or [])
        if rate < 40.0 and n_fields > 3:
            required = [x for x in (f.fields or []) if isinstance(x, dict) and x.get("required")]
            suggestion = (
                f"Reduce from {n_fields} fields — completion is {rate}%. "
                f"Consider trimming to the {min(3, len(required) or 3)} most essential, "
                "and making optional fields non-required or progressive."
            )
            flagged.append({
                "form_id": str(f.id),
                "name": f.name,
                "completion_rate": rate,
                "fields": n_fields,
                "views": views,
                "suggestion": suggestion,
            })
    return {
        "status": "ok",
        "checked": len(forms),
        "flagged": flagged,
        "count": len(flagged),
    }


def _is_num(v: Any) -> bool:
    try:
        float(v)
        return True
    except (TypeError, ValueError):
        return False
