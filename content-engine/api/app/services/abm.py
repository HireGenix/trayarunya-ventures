"""ABM (account-based marketing) LLM helpers.

Prompt builders + defensive parsers for generating buying-committee personas and
ABM assets (LinkedIn angle, cold outbound sequence, battlecard, objection card),
grounded in the workspace's brand voice / value-prop / audience.

Keep routers thin: they load the account + brand, call into here, then persist.
"""
from __future__ import annotations

import json
from typing import Any

from app.llm.adapters import complete_json

# --------------------------------------------------------------------------- #
# Brand grounding
# --------------------------------------------------------------------------- #
def _brand_block(brand: dict[str, Any] | None) -> str:
    """Render the workspace brand into a compact grounding block for prompts."""
    if not brand:
        return "Brand context: (none provided — infer a credible B2B positioning)."
    parts: list[str] = []
    if brand.get("value_prop"):
        parts.append(f"Value proposition: {brand['value_prop']}")
    if brand.get("mission"):
        parts.append(f"Mission: {brand['mission']}")
    voice = brand.get("voice")
    if voice:
        parts.append(f"Brand voice: {json.dumps(voice, ensure_ascii=False)[:600]}")
    audience = brand.get("audience")
    if audience:
        parts.append(f"Audience: {json.dumps(audience, ensure_ascii=False)[:600]}")
    keywords = brand.get("keywords")
    if keywords:
        parts.append(f"Keywords: {json.dumps(keywords, ensure_ascii=False)[:300]}")
    positioning = brand.get("positioning")
    if positioning:
        parts.append(f"Positioning: {positioning}")
    return "Brand context:\n" + "\n".join(f"- {p}" for p in parts)


def _account_block(
    company: str,
    industry: str | None,
    tier: str | None,
    firmographics: dict[str, Any] | None,
    notes: str | None,
) -> str:
    parts = [f"Target account: {company}"]
    if industry:
        parts.append(f"Industry: {industry}")
    if tier:
        parts.append(f"Tier: {tier}")
    if firmographics:
        parts.append(
            f"Firmographics: {json.dumps(firmographics, ensure_ascii=False)[:800]}"
        )
    if notes:
        parts.append(f"Notes: {notes[:600]}")
    return "\n".join(f"- {p}" for p in parts)


def _as_str(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple)):
        return ", ".join(_as_str(v) for v in value if v)
    if value is None:
        return ""
    return str(value)


def _as_str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [s for s in (_as_str(v) for v in value) if s]
    s = _as_str(value)
    return [s] if s else []


# --------------------------------------------------------------------------- #
# Personas
# --------------------------------------------------------------------------- #
_DEFAULT_ROLES = [
    ("CEO", "Chief Executive Officer"),
    ("CFO", "Chief Financial Officer"),
    ("CTO", "Chief Technology Officer"),
    ("RevOps", "Head of Revenue Operations"),
    ("Procurement", "Procurement / Vendor Management Lead"),
    ("Champion", "End-User Champion"),
]


def _persona_fallback(company: str, industry: str | None) -> list[dict[str, Any]]:
    sector = industry or "the target sector"
    out: list[dict[str, Any]] = []
    for role, title in _DEFAULT_ROLES:
        out.append(
            {
                "role": role,
                "title": title,
                "pains": [
                    f"Uncertainty about ROI when adopting new solutions in {sector}",
                    "Competing priorities and limited time/budget",
                ],
                "priorities": [
                    "Measurable business impact",
                    "Low-risk, fast time-to-value",
                ],
                "objections": [
                    "We already have a solution / process for this",
                    "Now is not the right time",
                ],
                "message_angle": (
                    f"Show {role} at {company} a credible, low-risk path to "
                    "measurable outcomes."
                ),
            }
        )
    return out


def _normalize_personas(
    raw: dict[str, Any], company: str, industry: str | None
) -> list[dict[str, Any]]:
    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return _persona_fallback(company, industry)
    items = raw.get("personas")
    if not isinstance(items, list) or not items:
        return _persona_fallback(company, industry)
    cleaned: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        role = _as_str(item.get("role"))
        title = _as_str(item.get("title"))
        if not role and not title:
            continue
        cleaned.append(
            {
                "role": role or title,
                "title": title or role,
                "pains": _as_str_list(item.get("pains")),
                "priorities": _as_str_list(item.get("priorities")),
                "objections": _as_str_list(item.get("objections")),
                "message_angle": _as_str(item.get("message_angle")),
            }
        )
    return cleaned or _persona_fallback(company, industry)


async def generate_personas(
    *,
    company: str,
    industry: str | None,
    tier: str | None,
    firmographics: dict[str, Any] | None,
    notes: str | None,
    brand: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """Generate the buying-committee personas for a target account."""
    system = (
        "You are a senior B2B account-based marketing strategist. You map the "
        "buying committee of a target account and craft tailored messaging for "
        "each role, grounded in the seller's brand. Respond with STRICT JSON only."
    )
    user = (
        f"{_brand_block(brand)}\n\n"
        "Account to analyze:\n"
        f"{_account_block(company, industry, tier, firmographics, notes)}\n\n"
        "Identify the typical B2B buying committee for this account: CEO, CFO, "
        "CTO, RevOps, Procurement, and an end-user champion (adapt the set to the "
        "industry where useful). For each persona, infer their pains, priorities, "
        "likely objections, and the single best message angle to win them over, "
        "grounded in the brand's value proposition and voice.\n\n"
        "Return JSON of this exact shape:\n"
        "{\n"
        '  "personas": [\n'
        "    {\n"
        '      "role": "CEO",\n'
        '      "title": "Chief Executive Officer",\n'
        '      "pains": ["..."],\n'
        '      "priorities": ["..."],\n'
        '      "objections": ["..."],\n'
        '      "message_angle": "..."\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Use 5-7 personas. Keep each list to 2-4 concise bullet strings."
    )
    try:
        raw = await complete_json([{"role": "user", "content": user}], system)
    except Exception:  # noqa: BLE001
        return _persona_fallback(company, industry)
    return _normalize_personas(raw, company, industry)


# --------------------------------------------------------------------------- #
# Assets
# --------------------------------------------------------------------------- #
def _assets_fallback(
    company: str, industry: str | None
) -> dict[str, Any]:
    sector = industry or "your industry"
    return {
        "linkedin_angle": {
            "hook": f"What most {sector} leaders get wrong about growth",
            "angle": (
                f"A thought-leadership take that reframes the core problem {company} "
                "faces and positions our approach as the credible path forward."
            ),
            "cta": "Comment 'PLAYBOOK' and I'll share the framework.",
        },
        "outbound_sequence": [
            {
                "step": 1,
                "channel": "email",
                "day": 1,
                "subject": f"A quick idea for {company}",
                "body": (
                    "Short, personalized opener that names a specific pain and the "
                    "outcome we help teams achieve."
                ),
            },
            {
                "step": 2,
                "channel": "linkedin",
                "day": 3,
                "subject": "Connection + value",
                "body": "Connect and share one relevant insight, no pitch.",
            },
            {
                "step": 3,
                "channel": "email",
                "day": 6,
                "subject": "Proof it works",
                "body": "Share a relevant proof point / case and a soft ask.",
            },
            {
                "step": 4,
                "channel": "email",
                "day": 10,
                "subject": "Worth a 15-min look?",
                "body": "Direct ask for a short call with two time options.",
            },
        ],
        "battlecard": (
            f"Vs. competitors: we deliver faster time-to-value and measurable ROI "
            f"for {sector} teams without heavy lift."
        ),
        "objection_card": [
            {
                "objection": "We already have a solution.",
                "response": (
                    "Acknowledge, then differentiate on outcomes and total cost; "
                    "offer a low-risk comparison."
                ),
            },
            {
                "objection": "No budget right now.",
                "response": (
                    "Tie to a priority initiative and quantify the cost of inaction; "
                    "propose a small pilot."
                ),
            },
        ],
    }


def _normalize_sequence(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    steps: list[dict[str, Any]] = []
    for i, item in enumerate(value, start=1):
        if not isinstance(item, dict):
            body = _as_str(item)
            if body:
                steps.append({"step": i, "channel": "email", "day": i, "subject": "", "body": body})
            continue
        steps.append(
            {
                "step": item.get("step") if isinstance(item.get("step"), int) else i,
                "channel": _as_str(item.get("channel")) or "email",
                "day": item.get("day") if isinstance(item.get("day"), int) else i,
                "subject": _as_str(item.get("subject")),
                "body": _as_str(item.get("body") or item.get("message")),
            }
        )
    return steps


def _normalize_objection_card(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        text = _as_str(value)
        return [{"objection": "", "response": text}] if text else []
    cards: list[dict[str, Any]] = []
    for item in value:
        if isinstance(item, dict):
            objection = _as_str(item.get("objection"))
            response = _as_str(item.get("response") or item.get("answer"))
            if objection or response:
                cards.append({"objection": objection, "response": response})
        else:
            text = _as_str(item)
            if text:
                cards.append({"objection": "", "response": text})
    return cards


def _normalize_assets(
    raw: dict[str, Any], company: str, industry: str | None
) -> dict[str, Any]:
    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return _assets_fallback(company, industry)

    fallback = _assets_fallback(company, industry)

    la = raw.get("linkedin_angle")
    if isinstance(la, dict):
        linkedin_angle = {
            "hook": _as_str(la.get("hook")),
            "angle": _as_str(la.get("angle") or la.get("body")),
            "cta": _as_str(la.get("cta")),
        }
        if not any(linkedin_angle.values()):
            linkedin_angle = fallback["linkedin_angle"]
    elif isinstance(la, str) and la.strip():
        linkedin_angle = {"hook": "", "angle": la.strip(), "cta": ""}
    else:
        linkedin_angle = fallback["linkedin_angle"]

    sequence = _normalize_sequence(raw.get("outbound_sequence") or raw.get("sequence"))
    if not sequence:
        sequence = fallback["outbound_sequence"]

    battlecard = _as_str(raw.get("battlecard"))
    if not battlecard:
        battlecard = fallback["battlecard"]

    objection_card = _normalize_objection_card(
        raw.get("objection_card") or raw.get("objection_handling")
    )
    if not objection_card:
        objection_card = fallback["objection_card"]

    return {
        "linkedin_angle": linkedin_angle,
        "outbound_sequence": sequence,
        "battlecard": battlecard,
        "objection_card": objection_card,
    }


async def generate_assets(
    *,
    company: str,
    industry: str | None,
    tier: str | None,
    firmographics: dict[str, Any] | None,
    notes: str | None,
    personas: list[dict[str, Any]] | None,
    brand: dict[str, Any] | None,
) -> dict[str, Any]:
    """Generate ABM assets for a target account, grounded in the brand."""
    persona_hint = ""
    if personas:
        roles = ", ".join(
            _as_str(p.get("role") or p.get("title")) for p in personas if isinstance(p, dict)
        )
        if roles:
            persona_hint = f"\nKnown buying committee: {roles}."

    system = (
        "You are a senior B2B account-based marketing copywriter. You produce "
        "ready-to-use ABM assets tailored to a target account and grounded in the "
        "seller's brand voice and value proposition. Respond with STRICT JSON only."
    )
    user = (
        f"{_brand_block(brand)}\n\n"
        "Account to target:\n"
        f"{_account_block(company, industry, tier, firmographics, notes)}"
        f"{persona_hint}\n\n"
        "Produce ABM assets:\n"
        "1. A LinkedIn thought-leadership angle (hook, angle, CTA).\n"
        "2. A cold outbound sequence of 3-5 steps (channel, day, subject, body).\n"
        "3. A one-line battlecard vs competitors.\n"
        "4. An objection-handling card (2-4 objection/response pairs).\n\n"
        "Return JSON of this exact shape:\n"
        "{\n"
        '  "linkedin_angle": {"hook": "...", "angle": "...", "cta": "..."},\n'
        '  "outbound_sequence": [\n'
        '    {"step": 1, "channel": "email", "day": 1, "subject": "...", "body": "..."}\n'
        "  ],\n"
        '  "battlecard": "...",\n'
        '  "objection_card": [{"objection": "...", "response": "..."}]\n'
        "}\n"
        "Keep copy concise, specific, and grounded in the brand voice."
    )
    try:
        raw = await complete_json([{"role": "user", "content": user}], system)
    except Exception:  # noqa: BLE001
        return _assets_fallback(company, industry)
    return _normalize_assets(raw, company, industry)
