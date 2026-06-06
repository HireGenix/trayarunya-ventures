"""CRO experimenter agent — turn a funnel leak into a testable experiment.

Given the stage where visitors are leaking and the workspace's brand context,
this proposes a small, concrete A/B experiment: a *surface* to test (CTA,
headline, landing page, offer…), a hypothesis, and 2-4 variants with real copy
``payload`` — one flagged as the control.

Like every agent in this codebase it is LLM-first with a **deterministic
fallback**: if the model is unavailable or returns junk, a rule-based playbook
guarantees a sensible experiment so the CRO loop never stalls.
"""
from __future__ import annotations

import logging
from typing import Any

from app.llm.adapters import complete_json

log = logging.getLogger("cro_experimenter")

# Which surface to test for a given leaking funnel stage.
_STAGE_SURFACE: dict[str, str] = {
    "visit": "headline",        # landing above-the-fold not hooking visitors
    "engage": "cta",            # visitors not clicking the CTA
    "lead": "landing_page",     # form/lead step has friction
    "convert": "offer",         # not closing — test the offer/checkout
}

_STAGE_PLAYBOOK: dict[str, list[dict[str, str]]] = {
    "engage": [
        {"label": "Benefit-led CTA", "payload": "Get my free growth plan"},
        {"label": "Urgency CTA", "payload": "Start today — 2 spots left"},
        {"label": "Low-friction CTA", "payload": "See how it works (60s)"},
    ],
    "visit": [
        {"label": "Outcome headline", "payload": "Double your conversions in 30 days"},
        {"label": "Problem headline", "payload": "Stop losing customers at checkout"},
        {"label": "Proof headline", "payload": "Why 1,200 brands switched to us"},
    ],
    "lead": [
        {"label": "Shorter form", "payload": "Ask only for email; defer the rest"},
        {"label": "Trust reinforcement", "payload": "Add testimonial + privacy note by the form"},
        {"label": "Inline value", "payload": "Restate the reward right above the form"},
    ],
    "convert": [
        {"label": "Risk reversal", "payload": "30-day money-back guarantee badge"},
        {"label": "Bundle offer", "payload": "Add a bonus to the same price"},
        {"label": "Scarcity", "payload": "Limited-time pricing with a live countdown"},
    ],
}


def _brand_summary(brand: dict[str, Any] | None) -> str:
    if not isinstance(brand, dict):
        return ""
    parts = []
    for field in ("name", "tagline", "voice", "tone", "audience", "value_prop", "industry"):
        val = brand.get(field)
        if val:
            parts.append(f"{field}: {val}")
    return "; ".join(parts)


def _fallback_experiment(leak: dict[str, Any], surface: str) -> dict[str, Any]:
    """Rule-based experiment when the LLM is unavailable."""
    stage_key = leak.get("to_key") or leak.get("from_key") or "engage"
    plays = _STAGE_PLAYBOOK.get(stage_key, _STAGE_PLAYBOOK["engage"])
    variants: list[dict[str, Any]] = [
        {"key": "control", "label": "Current (control)", "payload": "Existing experience", "is_control": True}
    ]
    keys = ["b", "c", "d"]
    for idx, play in enumerate(plays[:3]):
        variants.append(
            {
                "key": keys[idx],
                "label": play["label"],
                "payload": play["payload"],
                "is_control": False,
            }
        )
    frm = leak.get("from", "a stage")
    to = leak.get("to", "the next stage")
    return {
        "name": f"Fix {frm} → {to} drop-off",
        "surface": surface,
        "hypothesis": (
            f"Visitors are dropping between {frm} and {to}. Testing the {surface} "
            f"at this step will recover a meaningful share of that loss."
        ),
        "success_metric": "conversion_rate",
        "variants": variants,
        "generated_by": "heuristic",
    }


async def design_experiment_for_leak(
    leak: dict[str, Any],
    *,
    brand: dict[str, Any] | None = None,
    aov: float = 0.0,
) -> dict[str, Any]:
    """Design a CRO experiment to plug ``leak``. LLM-first, heuristic fallback."""
    stage_key = leak.get("to_key") or leak.get("from_key") or "engage"
    surface = _STAGE_SURFACE.get(stage_key, "cta")
    fallback = _fallback_experiment(leak, surface)

    brand_line = _brand_summary(brand)
    prompt = (
        "You are a senior CRO strategist designing one A/B experiment to plug a "
        "specific funnel leak.\n\n"
        f"Funnel leak: {leak.get('drop')} visitors ({leak.get('drop_pct')}%) drop "
        f"from '{leak.get('from')}' to '{leak.get('to')}'.\n"
        f"Surface to test: {surface}\n"
        f"Average order value: {aov}\n"
        f"Brand: {brand_line or 'n/a'}\n\n"
        "Design ONE focused experiment with a control + 2-3 challenger variants. "
        "Each variant needs short, ready-to-ship copy in 'payload'. Exactly one "
        "variant must have is_control=true (the current experience).\n"
        'Return STRICT JSON: {"name": "...", "hypothesis": "...", '
        '"variants": [{"key": "control", "label": "...", "payload": "...", '
        '"is_control": true}, ...]}'
    )
    try:
        raw = await complete_json(
            messages=[{"role": "user", "content": prompt}],
            system=(
                "You are a conversion-rate-optimization strategist. You design one "
                "tight, testable experiment and return only strict JSON."
            ),
            provider=None,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("CRO experiment design LLM failed: %s", exc)
        return fallback

    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return fallback
    items = raw.get("variants")
    if not isinstance(items, list) or len(items) < 2:
        return fallback

    keys = ["control", "b", "c", "d"]
    variants: list[dict[str, Any]] = []
    saw_control = False
    for idx, it in enumerate(items[:4]):
        if not isinstance(it, dict):
            continue
        key = str(it.get("key") or keys[idx]).strip() or keys[idx]
        is_control = bool(it.get("is_control")) and not saw_control
        if is_control:
            saw_control = True
        variants.append(
            {
                "key": key,
                "label": str(it.get("label") or f"Variant {key.upper()}"),
                "payload": str(it.get("payload") or ""),
                "is_control": is_control,
            }
        )
    if not variants:
        return fallback
    if not saw_control:
        variants[0]["is_control"] = True

    return {
        "name": str(raw.get("name") or fallback["name"]),
        "surface": surface,
        "hypothesis": str(raw.get("hypothesis") or fallback["hypothesis"]),
        "success_metric": "conversion_rate",
        "variants": variants,
        "generated_by": "llm",
    }
