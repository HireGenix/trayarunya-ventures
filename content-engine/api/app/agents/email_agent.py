"""Email marketing agentic brain.

SENSE → DIAGNOSE → PLAN → ACT over real workspace rows.

* ``draft_campaign`` — generates A/B subject variants, preheader and full body
  copy grounded in the workspace BrandBrain voice (LLM, with deterministic
  fallback so it never hard-fails).
* ``optimize_send_time`` — mines real ``EmailSendLog`` open timestamps to
  recommend the best send hour (falls back to a sensible default with reason).
* ``run_cycle`` — finds active sequences due to fire and logs recommended next
  sends, honouring each sequence's autonomy (suggest / approve / auto).
"""
from __future__ import annotations

import logging
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.brand import BrandBrain
from app.models.email import EmailSequence
from app.services import email as svc

log = logging.getLogger("email_agent")

SYSTEM = (
    "You are an expert email marketing strategist and copywriter. "
    "Write high-converting, on-brand email copy. Respond with strict JSON only."
)

# Sensible industry-default send hour when there is no engagement history yet.
_DEFAULT_SEND_HOUR = 10


async def _load_brand(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any] | None:
    bb = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == ws_id))
    ).scalar_one_or_none()
    if bb is None:
        return None
    voice = bb.voice if isinstance(bb.voice, dict) else {}
    audience = bb.audience if isinstance(bb.audience, dict) else {}
    return {
        "name": bb.name if hasattr(bb, "name") else None,
        "value_prop": bb.value_prop,
        "mission": bb.mission,
        "tone": voice.get("tone") or voice.get("voice"),
        "audience": audience.get("primary") or audience.get("description"),
        "website": bb.website,
    }


def _fallback_campaign(brief: str) -> dict[str, Any]:
    """Deterministic copy so the feature still works with no LLM available."""
    topic = (brief or "your latest update").strip()
    short = topic[:60]
    return {
        "subject_variants": [
            f"{short}",
            f"Quick note: {short}",
            f"You'll want to see this — {short}",
        ],
        "preheader": f"A short update about {short}.",
        "body_html": (
            f"<p>Hi {{{{name}}}},</p>"
            f"<p>{topic}</p>"
            f"<p>We thought you'd want to know. Reply to this email with any questions.</p>"
            f"<p>— The team</p>"
        ),
        "body_text": f"Hi,\n\n{topic}\n\nReply with any questions.\n\n— The team",
        "_fallback": True,
    }


async def draft_campaign(
    db: AsyncSession,
    ws_id: uuid.UUID,
    brief: str,
    list_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Generate subject A/B variants, preheader and full body grounded in brand voice."""
    brand = await _load_brand(db, ws_id)
    audience_size = 0
    if list_id is not None:
        try:
            audience_size = await svc.subscriber_count(db, ws_id, list_id)
        except Exception:  # noqa: BLE001
            audience_size = 0

    brand_block = "No brand profile on file; use a clear, friendly, professional tone."
    if brand:
        brand_block = (
            f"Brand value prop: {brand.get('value_prop') or 'n/a'}\n"
            f"Mission: {brand.get('mission') or 'n/a'}\n"
            f"Voice/tone: {brand.get('tone') or 'professional, helpful'}\n"
            f"Audience: {brand.get('audience') or 'general customers'}\n"
            f"Website: {brand.get('website') or 'n/a'}"
        )

    user = (
        f"Campaign brief: {brief}\n"
        f"Recipient list size: {audience_size}\n"
        f"{brand_block}\n\n"
        "Task: Write one marketing email.\n"
        "Return JSON with EXACTLY these keys: "
        '{"subject_variants": ["v1","v2","v3"], '
        '"preheader": "...", '
        '"body_html": "<p>...</p>", '
        '"body_text": "..."}\n'
        "Rules: exactly 3 distinct subject lines for A/B/C testing (<=60 chars each), "
        "preheader <=120 chars, body_html valid inline HTML using {{name}} as the "
        "personalization token. No emojis. Stay on brand."
    )

    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
    except Exception:  # noqa: BLE001
        log.exception("draft_campaign LLM call failed; using fallback")
        data = {}

    if not isinstance(data, dict) or data.get("_parse_error") or not data.get("subject_variants"):
        data = _fallback_campaign(brief)

    # Normalise shape defensively.
    variants = data.get("subject_variants") or []
    if not isinstance(variants, list) or not variants:
        variants = _fallback_campaign(brief)["subject_variants"]
    data["subject_variants"] = [str(v)[:120] for v in variants][:3]
    data.setdefault("preheader", "")
    data.setdefault("body_html", "")
    data.setdefault("body_text", "")
    return data


def _hour_label(hour: int) -> str:
    suffix = "am" if hour < 12 else "pm"
    h12 = hour % 12 or 12
    return f"{h12}{suffix}"


async def optimize_send_time(
    db: AsyncSession,
    ws_id: uuid.UUID,
    list_id: uuid.UUID | None = None,
) -> dict[str, Any]:
    """Recommend the best send hour from real open timestamps."""
    opens = await svc.open_timestamps(db, ws_id, list_id=list_id)
    if not opens:
        return {
            "recommended_hour": _DEFAULT_SEND_HOUR,
            "recommended_label": _hour_label(_DEFAULT_SEND_HOUR),
            "confidence": "low",
            "sample_size": 0,
            "reason": (
                "No open history yet — defaulting to 10am local, a broadly strong "
                "engagement window. Recommendation will sharpen as opens accrue."
            ),
        }

    hist = Counter(ts.astimezone(timezone.utc).hour for ts in opens)
    best_hour, best_count = hist.most_common(1)[0]
    total = sum(hist.values())
    share = round((best_count / total) * 100, 1) if total else 0.0
    confidence = "high" if total >= 50 else "medium" if total >= 10 else "low"
    return {
        "recommended_hour": best_hour,
        "recommended_label": _hour_label(best_hour),
        "confidence": confidence,
        "sample_size": total,
        "reason": (
            f"{best_count} of {total} recorded opens ({share}%) occurred around "
            f"{_hour_label(best_hour)} (UTC) — the strongest engagement window."
        ),
    }


async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Find active sequences and surface recommended next sends per autonomy level."""
    sequences = await svc.list_sequences(db, ws_id)
    recommendations: list[dict[str, Any]] = []
    fired = 0

    for seq in sequences:
        if not seq.is_active:
            continue
        steps = seq.steps if isinstance(seq.steps, list) else []
        if not steps:
            continue
        # The first/next step is "due" for any matching audience on this cycle.
        next_step = steps[0]
        rec = {
            "sequence_id": str(seq.id),
            "sequence_name": seq.name,
            "trigger": seq.trigger,
            "autonomy": seq.autonomy,
            "next_step": {
                "order": next_step.get("order", 1),
                "delay_hours": next_step.get("delay_hours", 0),
                "subject": next_step.get("subject", ""),
            },
            "action": "auto-send" if seq.autonomy == "auto" else "awaiting_approval"
            if seq.autonomy == "approve" else "suggested",
        }
        recommendations.append(rec)
        fired += 1

    return {
        "workspace_id": str(ws_id),
        "active_sequences": fired,
        "recommendations": recommendations,
        "ran_at": datetime.now(timezone.utc).isoformat(),
    }
