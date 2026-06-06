"""The Lead-Scoring Agent — autonomous lead qualification + nurture brain.

Grounded entirely in real rows the module writes (Lead / LeadActivity /
ScoringRule) and the workspace ICP when present. SENSE -> DIAGNOSE -> PLAN -> ACT:

    suggest_rules     -> propose scoring rules from observed activity kinds + ICP
    next_best_action  -> recommend the nurture step for one lead from its history
    run_cycle         -> recompute every lead, detect MQL/SQL threshold crossings,
                         emit automation events for nurture (autonomy-gated)

Every LLM call has a deterministic fallback so the feature never hard-fails.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.icp import ICPProfile
from app.models.leadscore import ACTIVITY_KINDS, Lead, LeadActivity
from app.services import leadscore as svc
from app.services.automation import emit_event

log = logging.getLogger("leadscore_agent")

SYSTEM = (
    "You are an expert B2B demand-generation and lead-scoring strategist. "
    "You design point-based scoring models and nurture plays grounded in real "
    "engagement data. Respond with strict JSON only — no prose, no markdown."
)


async def _load_icp(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any] | None:
    row = (
        await db.execute(
            select(ICPProfile).where(ICPProfile.workspace_id == ws_id)
        )
    ).scalar_one_or_none()
    if row is None:
        return None
    return {
        "segment": row.segment,
        "industry": row.industry,
        "value_prop": row.value_prop,
        "target_customer": row.target_customer,
        "personas": row.personas,
    }


async def _observed_kind_counts(
    db: AsyncSession, ws_id: uuid.UUID
) -> dict[str, int]:
    res = await db.execute(
        select(LeadActivity.kind, func.count(LeadActivity.id))
        .where(LeadActivity.workspace_id == ws_id)
        .group_by(LeadActivity.kind)
    )
    return {kind: int(n or 0) for kind, n in res.all()}


# --------------------------------------------------------------------------- #
# 1) Suggest scoring rules
# --------------------------------------------------------------------------- #
def _fallback_rules(observed: dict[str, int]) -> list[dict[str, Any]]:
    """Deterministic rule proposals derived from real observed activity kinds."""
    base_points = {
        "page_view": 1,
        "email_open": 2,
        "email_click": 5,
        "form_submit": 10,
        "meeting": 20,
        "custom": 1,
    }
    kinds = [k for k in ACTIVITY_KINDS if observed.get(k)] or ["form_submit", "email_click"]
    rules: list[dict[str, Any]] = []
    for kind in kinds:
        rules.append(
            {
                "name": f"Engaged: {kind.replace('_', ' ')}",
                "condition": {"activity_kind": kind, "op": "count_gte", "value": 1},
                "points": base_points.get(kind, 2),
                "is_active": True,
            }
        )
    rules.append(
        {
            "name": "Firmographic fit: has company",
            "condition": {"field": "company", "op": "exists"},
            "points": 10,
            "is_active": True,
        }
    )
    return rules


async def suggest_rules(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Propose scoring rules from observed activity kinds + ICP (LLM + fallback)."""
    observed = await _observed_kind_counts(db, ws_id)
    icp = await _load_icp(db, ws_id)
    fallback = _fallback_rules(observed)

    user = (
        "Design a point-based lead scoring model.\n"
        f"Observed activity kinds (kind -> count): {observed or 'none yet'}\n"
        f"Allowed activity kinds: {list(ACTIVITY_KINDS)}\n"
        f"ICP: {icp or 'not provided'}\n"
        "Each rule condition is JSON. Use either an activity rule "
        '{"activity_kind": <kind>, "op": "count_gte", "value": <int>} '
        'or an attribute rule {"field": <name>, "op": "exists|eq|contains", '
        '"value": <optional>}. Award more points to higher-intent signals.\n'
        'Return JSON: {"rules": [{"name": str, "condition": {...}, '
        '"points": int, "is_active": true}], "rationale": str}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        rules = data.get("rules") if isinstance(data, dict) else None
        if not isinstance(rules, list) or not rules:
            raise ValueError("no rules")
        clean: list[dict[str, Any]] = []
        for r in rules:
            if not isinstance(r, dict):
                continue
            cond = r.get("condition")
            if not isinstance(cond, dict):
                continue
            clean.append(
                {
                    "name": str(r.get("name") or "Scoring rule")[:200],
                    "condition": cond,
                    "points": int(r.get("points") or 0),
                    "is_active": bool(r.get("is_active", True)),
                }
            )
        if not clean:
            raise ValueError("empty after clean")
        return {
            "rules": clean,
            "rationale": str(data.get("rationale") or "LLM-proposed scoring model."),
            "source": "llm",
        }
    except Exception as exc:  # noqa: BLE001
        log.warning("suggest_rules fell back to deterministic model: %s", exc)
        return {
            "rules": fallback,
            "rationale": "Derived from observed activity kinds and firmographic fit.",
            "source": "fallback",
        }


# --------------------------------------------------------------------------- #
# 2) Next best action for a lead
# --------------------------------------------------------------------------- #
def _fallback_next_action(
    lead: Lead, kind_counts: dict[str, int]
) -> dict[str, Any]:
    score = int(lead.score or 0)
    if score >= 75 or lead.stage in ("sql", "opportunity"):
        return {
            "action": "sdr_handoff",
            "channel": "sales",
            "reasoning": "High score / sales-qualified — route to an SDR for a direct conversation.",
            "priority": "high",
        }
    if score >= 50 or kind_counts.get("email_click") or kind_counts.get("form_submit"):
        return {
            "action": "sequence",
            "channel": "email",
            "reasoning": "Active engagement signals — enroll in a nurture sequence to build intent.",
            "priority": "medium",
        }
    return {
        "action": "email",
        "channel": "email",
        "reasoning": "Early-stage subscriber — send an educational email to warm them up.",
        "priority": "low",
    }


async def next_best_action(
    db: AsyncSession, ws_id: uuid.UUID, lead_id: uuid.UUID
) -> dict[str, Any]:
    """Recommend the nurture step for one lead from its REAL activity history."""
    lead = await svc.get_lead(db, ws_id, lead_id)
    if lead is None:
        return {"error": "lead_not_found"}

    kind_counts = await svc.activity_kind_counts(db, ws_id, lead_id)
    activities = await svc.list_activities(db, ws_id, lead_id, limit=20)
    history = [
        {"kind": a.kind, "weight": a.weight, "at": a.occurred_at.isoformat() if a.occurred_at else None}
        for a in activities
    ]
    fallback = _fallback_next_action(lead, kind_counts)

    user = (
        "Recommend the single next-best nurture action for this lead.\n"
        f"Lead: stage={lead.stage}, score={lead.score}, grade={lead.grade}, "
        f"company={lead.company or 'unknown'}, source={lead.source or 'unknown'}.\n"
        f"Activity counts: {kind_counts or 'none'}\n"
        f"Recent activity: {history or 'none'}\n"
        "Choose action from: email, sequence, sdr_handoff. "
        'Return JSON: {"action": str, "channel": str, "reasoning": str, '
        '"priority": "low|medium|high"}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        action = data.get("action") if isinstance(data, dict) else None
        if action not in ("email", "sequence", "sdr_handoff"):
            raise ValueError("invalid action")
        return {
            "lead_id": str(lead.id),
            "action": action,
            "channel": str(data.get("channel") or "email"),
            "reasoning": str(data.get("reasoning") or fallback["reasoning"]),
            "priority": str(data.get("priority") or fallback["priority"]),
            "source": "llm",
        }
    except Exception as exc:  # noqa: BLE001
        log.warning("next_best_action fell back: %s", exc)
        return {"lead_id": str(lead.id), **fallback, "source": "fallback"}


# --------------------------------------------------------------------------- #
# 3) Autonomous cycle
# --------------------------------------------------------------------------- #
async def run_cycle(
    db: AsyncSession, ws_id: uuid.UUID, *, autonomy: str = "suggest"
) -> dict[str, Any]:
    """Recompute every lead's score, detect MQL/SQL crossings, emit nurture events.

    Autonomy gates side effects:
        suggest -> recompute scores only, return detected crossings as proposals
        approve -> also emit ``lead.score.changed`` for movers
        auto    -> also promote stage + emit ``revenue.mql`` / ``revenue.sql``
    """
    level = autonomy if autonomy in ("suggest", "approve", "auto") else "suggest"
    leads = await svc.list_leads(db, ws_id, limit=1000)

    crossings: list[dict[str, Any]] = []
    changed = 0
    promoted = 0

    for lead in leads:
        new_score, new_grade, old_score = await svc.recompute_score(db, ws_id, lead)
        if new_score != old_score:
            changed += 1
            if level in ("approve", "auto"):
                await emit_event(
                    db,
                    ws_id,
                    "lead.score.changed",
                    {
                        "lead_id": str(lead.id),
                        "email": lead.email,
                        "old_score": old_score,
                        "new_score": new_score,
                        "grade": new_grade,
                    },
                    source="leadscore",
                )

        target = svc.stage_after_threshold(new_score, lead.stage)
        if target is None:
            continue
        crossing = {
            "lead_id": str(lead.id),
            "email": lead.email,
            "from_stage": lead.stage,
            "to_stage": target,
            "score": new_score,
        }
        crossings.append(crossing)
        if level == "auto":
            lead.stage = target
            promoted += 1
            await emit_event(
                db,
                ws_id,
                f"revenue.{target}",
                {
                    "contact_ref": lead.email,
                    "stage": target,
                    "channel": lead.source or "other",
                    "value": 0.0,
                    "lead_id": str(lead.id),
                },
                source="leadscore",
            )

    await db.flush()
    return {
        "autonomy": level,
        "scored": len(leads),
        "changed": changed,
        "promoted": promoted,
        "crossings": crossings,
    }
