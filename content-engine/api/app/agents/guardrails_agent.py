"""The Guardrails Agent — autonomous brand-voice & compliance brain.

SENSE   -> read the workspace BrandBrain voice + active GuardrailPolicies
DIAGNOSE-> run the deterministic scans (banned terms, disclaimers, reading level)
PLAN    -> ask the LLM to judge the copy against the brand voice + policies,
           returning violations with spans, severity and concrete rewrites
ACT     -> merge deterministic + AI violations, compute a 0-100 brand-fit score

`autofix` returns an on-brand corrected version. `run_cycle` re-checks recently
created content (when a readable content table is accessible) and logs results.
Every LLM path has a deterministic fallback so the feature never hard-fails.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete, complete_json
from app.models.brand import BrandBrain
from app.models.guardrails import GuardrailPolicy
from app.services import guardrails as svc

log = logging.getLogger("guardrails_agent")

SYSTEM = (
    "You are an expert brand-voice and compliance editor. You judge marketing "
    "copy against a brand's documented voice and a set of guardrail policies. "
    "Respond with strict JSON only — no prose, no markdown."
)


async def _load_brand(db: AsyncSession, ws_id: uuid.UUID) -> BrandBrain | None:
    res = await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == ws_id))
    return res.scalar_one_or_none()


def _brand_summary(bb: BrandBrain | None) -> str:
    if bb is None:
        return "No brand profile is configured for this workspace."
    voice = bb.voice or {}
    parts = []
    if bb.mission:
        parts.append(f"Mission: {bb.mission}")
    if bb.value_prop:
        parts.append(f"Value prop: {bb.value_prop}")
    if voice:
        parts.append(f"Voice: {voice}")
    if bb.pillars:
        parts.append(f"Pillars: {bb.pillars}")
    return "\n".join(parts) or "Brand profile present but sparse."


def _policy_brief(policies: list[GuardrailPolicy]) -> str:
    lines = []
    for p in policies:
        cfg = p.config or {}
        lines.append(
            f"- {p.name} (kind={p.kind}, severity={p.severity}): {cfg}"
        )
    return "\n".join(lines) or "No active policies."


def _clamp_score(value: Any, fallback: int) -> int:
    try:
        return int(max(0, min(100, round(float(value)))))
    except (TypeError, ValueError):
        return fallback


async def evaluate(
    db: AsyncSession,
    ws_id: uuid.UUID,
    text: str,
    policies: list[GuardrailPolicy],
) -> dict[str, Any]:
    """Evaluate ``text`` against brand voice + ``policies``.

    Returns ``{score, passed, violations, ai_used}``. Deterministic scans always
    run; the AI layer adds voice/claims judgement and is merged on top.
    """
    deterministic = svc.deterministic_scan(text, policies)
    bb = await _load_brand(db, ws_id)
    ai_violations: list[dict[str, Any]] = []
    ai_score: int | None = None
    ai_used = False

    try:
        user = (
            f"BRAND PROFILE:\n{_brand_summary(bb)}\n\n"
            f"ACTIVE GUARDRAIL POLICIES:\n{_policy_brief(policies)}\n\n"
            f"CONTENT TO REVIEW (verbatim):\n\"\"\"\n{text}\n\"\"\"\n\n"
            "Judge the content for brand-voice fit, unsupported/risky claims, "
            "tone, and policy compliance. Be precise and conservative.\n"
            "Return JSON exactly:\n"
            "{\n"
            '  "brand_fit": <int 0-100>,\n'
            '  "violations": [\n'
            "    {\n"
            '      "policy": "<policy name or category>",\n'
            '      "severity": "low|medium|high|critical",\n'
            '      "span": [<start>, <end>] or null,\n'
            '      "message": "<what is wrong>",\n'
            '      "suggestion": "<concrete on-brand rewrite>"\n'
            "    }\n"
            "  ]\n"
            "}"
        )
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if isinstance(data, dict) and not data.get("_parse_error"):
            ai_used = True
            for v in data.get("violations", []) or []:
                if not isinstance(v, dict):
                    continue
                ai_violations.append(
                    {
                        "policy": str(v.get("policy") or "Brand voice"),
                        "severity": str(v.get("severity") or "medium").lower(),
                        "span": v.get("span") if isinstance(v.get("span"), list) else None,
                        "message": str(v.get("message") or "Off-brand or risky phrasing."),
                        "suggestion": str(v.get("suggestion") or "Revise to match the brand voice."),
                    }
                )
            if data.get("brand_fit") is not None:
                ai_score = _clamp_score(data.get("brand_fit"), 0)
    except Exception:  # noqa: BLE001 — never hard-fail; fall back to scans
        log.exception("guardrails AI evaluate failed; using deterministic scans only")

    violations = deterministic + ai_violations
    det_score = svc.score_from_violations(violations)
    if ai_score is not None:
        # Blend the model's holistic judgement with the rule-based penalty.
        score = int(round(0.5 * ai_score + 0.5 * det_score))
    else:
        score = det_score
    passed = score >= 70 and not any(
        str(v.get("severity")) in ("high", "critical") for v in violations
    )
    return {
        "score": score,
        "passed": passed,
        "violations": violations,
        "ai_used": ai_used,
    }


async def autofix(db: AsyncSession, ws_id: uuid.UUID, text: str) -> dict[str, Any]:
    """Return an on-brand corrected version of ``text``."""
    bb = await _load_brand(db, ws_id)
    policies = await svc.active_policies(db, ws_id)
    try:
        user = (
            f"BRAND PROFILE:\n{_brand_summary(bb)}\n\n"
            f"ACTIVE GUARDRAIL POLICIES:\n{_policy_brief(policies)}\n\n"
            f"ORIGINAL CONTENT:\n\"\"\"\n{text}\n\"\"\"\n\n"
            "Rewrite the content so it fully complies with the policies and matches "
            "the brand voice. Preserve meaning and length where possible. Remove "
            "banned terms, add any required disclaimers, and soften unsupported "
            "claims.\nReturn JSON exactly: {\"fixed_text\": \"<rewritten copy>\", "
            '"notes": "<one-line summary of changes>"}'
        )
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if isinstance(data, dict) and data.get("fixed_text"):
            return {
                "fixed_text": str(data["fixed_text"]),
                "notes": str(data.get("notes") or "Rewritten for brand compliance."),
                "ai_used": True,
            }
    except Exception:  # noqa: BLE001
        log.exception("guardrails autofix failed; applying deterministic fallback")

    return {
        "fixed_text": _deterministic_fix(text, policies),
        "notes": "Applied rule-based fixes (AI unavailable).",
        "ai_used": False,
    }


def _deterministic_fix(text: str, policies: list[GuardrailPolicy]) -> str:
    """Strip banned terms and append missing required disclaimers."""
    fixed = text
    appended: list[str] = []
    for p in policies:
        cfg = p.config or {}
        for term in cfg.get("banned_words", []) or []:
            term = str(term).strip()
            if term:
                fixed = _replace_ci(fixed, term, "")
        for disc in cfg.get("required_disclaimers", []) or []:
            disc = str(disc).strip()
            if disc and disc.lower() not in fixed.lower() and disc not in appended:
                appended.append(disc)
    fixed = " ".join(fixed.split())
    if appended:
        fixed = f"{fixed}\n\n" + "\n".join(appended)
    return fixed


def _replace_ci(text: str, needle: str, repl: str) -> str:
    import re

    return re.sub(re.escape(needle), repl, text, flags=re.IGNORECASE)


async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Autonomy hook: re-check recently created content if accessible.

    We look for a generic content table (``content_items``) and re-evaluate any
    rows that have not yet been checked. If no such table is reachable, we return
    a clear status without fabricating work.
    """
    policies = await svc.active_policies(db, ws_id)
    items = await _recent_content(db, ws_id)
    if not items:
        return {"status": "no_content", "checked": 0, "violations": 0}

    checked = 0
    total_violations = 0
    for ref, body in items:
        result = await evaluate(db, ws_id, body, policies)
        await svc.save_check(
            db,
            ws_id,
            content_text=body,
            content_ref=ref,
            policies_run=[p.name for p in policies],
            score=result["score"],
            passed=result["passed"],
            violations=result["violations"],
        )
        checked += 1
        total_violations += len(result["violations"])
    await db.flush()
    return {"status": "complete", "checked": checked, "violations": total_violations}


async def _recent_content(
    db: AsyncSession, ws_id: uuid.UUID, limit: int = 10
) -> list[tuple[str, str]]:
    """Best-effort read of recent content rows. Degrades to empty if unavailable."""
    from sqlalchemy import text as sql_text

    try:
        res = await db.execute(
            sql_text(
                "SELECT id::text, body FROM content_items "
                "WHERE workspace_id = :ws AND body IS NOT NULL "
                "ORDER BY created_at DESC LIMIT :lim"
            ),
            {"ws": str(ws_id), "lim": limit},
        )
        return [(r[0], r[1]) for r in res.fetchall() if r[1]]
    except Exception:  # noqa: BLE001 — table may not exist in this deployment
        return []
