"""LinkedIn platform service — next-action engine, vision analysis, cadence safety.

All logic is human-in-the-loop and policy-safe:
  * AI suggests the next best action; the human performs it manually in the browser.
  * Cadence guardrails cap daily connects/messages to keep activity human-paced.
  * Live screenshots/DOM are summarized by a vision model into signals + a single
    recommended action — never an automated click.
"""
from __future__ import annotations

import csv
import io
import json
from datetime import date, datetime, timezone
from typing import Any

from app.llm.adapters import complete_json
from app.llm.vision_adapters import complete_vision_json, vision_configured

# ---------------------------------------------------------------------------
# Pipeline definition
# ---------------------------------------------------------------------------

STAGES = [
    "new",
    "researching",
    "warming_up",
    "connect_sent",
    "connected",
    "in_conversation",
    "qualified",
    "won",
    "lost",
    "nurture",
]

# Allowed forward/sideways transitions (human can always correct via override).
STAGE_FLOW: dict[str, list[str]] = {
    "new": ["researching", "warming_up", "connect_sent", "nurture", "lost"],
    "researching": ["warming_up", "connect_sent", "nurture", "lost"],
    "warming_up": ["connect_sent", "in_conversation", "nurture", "lost"],
    "connect_sent": ["connected", "nurture", "lost"],
    "connected": ["in_conversation", "nurture", "lost"],
    "in_conversation": ["qualified", "nurture", "lost", "won"],
    "qualified": ["won", "lost", "nurture", "in_conversation"],
    "won": ["nurture"],
    "lost": ["nurture", "researching"],
    "nurture": ["researching", "warming_up", "in_conversation", "lost"],
}

POLICY_GUARDRAILS = [
    "AI gives recommendations and drafts; the human performs every LinkedIn action manually.",
    "No automated connection requests, no automated DMs, no mass scraping, no engagement pods.",
    "Keep outreach personalized, relevant, low-volume and value-first.",
    "Respect daily connect/message caps to stay human-paced and within LinkedIn norms.",
    "Never store LinkedIn passwords or session cookies.",
]

# Default human-paced caps (per account, per day).
DEFAULT_CONNECT_CAP = 15
DEFAULT_MESSAGE_CAP = 25


def can_transition(from_stage: str | None, to_stage: str) -> bool:
    if to_stage not in STAGES:
        return False
    if from_stage is None or from_stage == to_stage:
        return True
    return to_stage in STAGE_FLOW.get(from_stage, [])


# ---------------------------------------------------------------------------
# Cadence guardrails
# ---------------------------------------------------------------------------

def cadence_check(action_type: str, used_today: int, cap: int) -> dict[str, Any]:
    """Return whether a connect/message action is within today's human-paced cap."""
    remaining = max(cap - used_today, 0)
    safe = remaining > 0
    return {
        "action_type": action_type,
        "used_today": used_today,
        "cap": cap,
        "remaining": remaining,
        "allowed": safe,
        "warning": None
        if safe
        else f"Daily {action_type} cap reached ({cap}). Pause to stay human-paced and policy-safe.",
    }


# ---------------------------------------------------------------------------
# Deterministic next-action engine (fallback / no-LLM path)
# ---------------------------------------------------------------------------

_STAGE_PLAYBOOK: dict[str, dict[str, Any]] = {
    "new": {
        "task_type": "research",
        "title": "Research this lead before any outreach",
        "detail": "Open their profile, read headline, About, recent activity. Note 1-2 genuine hooks.",
        "next_stage": "researching",
    },
    "researching": {
        "task_type": "warmup",
        "title": "Warm up with a genuine engagement",
        "detail": "Like/comment thoughtfully on a recent relevant post. No pitch. Build familiarity first.",
        "next_stage": "warming_up",
    },
    "warming_up": {
        "task_type": "connect",
        "title": "Send a personalized connection request",
        "detail": "Reference the specific post/role/company. One clear human reason to connect. No sales pitch.",
        "next_stage": "connect_sent",
    },
    "connect_sent": {
        "task_type": "follow_up",
        "title": "Wait for acceptance, then open value-first",
        "detail": "Once accepted, send a short thank-you + one relevant insight or question. Do not pitch yet.",
        "next_stage": "connected",
    },
    "connected": {
        "task_type": "message",
        "title": "Start a real conversation",
        "detail": "Ask a relevant question tied to their world. Listen. Look for a pain you can genuinely help.",
        "next_stage": "in_conversation",
    },
    "in_conversation": {
        "task_type": "message",
        "title": "Qualify and offer a next step",
        "detail": "If pain + fit are clear, suggest a low-friction next step (audit/call). Otherwise keep nurturing.",
        "next_stage": "qualified",
    },
    "qualified": {
        "task_type": "follow_up",
        "title": "Move toward the deal",
        "detail": "Confirm the next step, send relevant proof/case study, and book the call.",
        "next_stage": "won",
    },
    "nurture": {
        "task_type": "content",
        "title": "Stay top-of-mind with value",
        "detail": "Engage periodically with useful comments/content. Re-open when a buying signal appears.",
        "next_stage": "in_conversation",
    },
}


def _personalized_copy(lead: dict[str, Any], action_type: str) -> str | None:
    name = (lead.get("full_name") or "there").split(" ")[0]
    company = lead.get("company")
    headline = lead.get("headline")
    if action_type == "connect":
        hook = f" your work at {company}" if company else (f" your post on {headline}" if headline else " your work")
        return (
            f"Hi {name}, I came across{hook} and really liked your perspective. "
            f"Would love to connect and follow what you're building."
        )
    if action_type == "message":
        return (
            f"Thanks for connecting, {name}! Genuinely curious — what's the biggest priority "
            f"on your plate this quarter? Always happy to share what's working for teams like yours."
        )
    if action_type == "follow_up":
        return (
            f"Hi {name}, sharing a quick resource I thought was relevant to what you mentioned. "
            f"No agenda — just thought it might help."
        )
    return None


def deterministic_next_action(lead: dict[str, Any], account: dict[str, Any] | None = None) -> dict[str, Any]:
    stage = lead.get("stage") or "new"
    play = _STAGE_PLAYBOOK.get(stage)
    if not play:
        return {
            "task_type": "research",
            "title": "Review lead and choose a stage",
            "detail": "This lead needs a human decision on the right next step.",
            "priority": "medium",
            "suggested_copy": None,
            "policy_note": "Manual action only. AI suggests; you decide and act.",
            "recommended_next_stage": "researching",
            "ai_mode": "deterministic",
        }
    action_type = play["task_type"]
    return {
        "task_type": action_type,
        "title": play["title"],
        "detail": play["detail"],
        "priority": "high" if stage in ("warming_up", "connected", "in_conversation", "qualified") else "medium",
        "suggested_copy": _personalized_copy(lead, action_type),
        "policy_note": "Manual action only. AI drafts; the human reviews and acts inside LinkedIn.",
        "recommended_next_stage": play["next_stage"],
        "ai_mode": "deterministic",
    }


async def ai_next_action(lead: dict[str, Any], account: dict[str, Any] | None = None) -> dict[str, Any]:
    """LLM-enhanced next-best-action with deterministic fallback."""
    fallback = deterministic_next_action(lead, account)
    system = (
        "You are a senior B2B LinkedIn social-selling strategist. You are strictly policy-safe: "
        "never suggest automation, mass messaging, scraping or auto-connect. You suggest ONE next "
        "human action that moves the relationship forward authentically. Return STRICT JSON only."
    )
    user = (
        "Decide the single best next action for this lead. Be specific and human.\n"
        f"LEAD:\n{json.dumps(lead, ensure_ascii=False, default=str)[:6000]}\n\n"
        f"ACCOUNT CONTEXT:\n{json.dumps(account or {}, ensure_ascii=False, default=str)[:3000]}\n\n"
        "Return JSON: {task_type (research|warmup|connect|follow_up|message|content), title, detail, "
        "priority (high|medium|low), suggested_copy (personalized, no spam), recommended_next_stage, "
        "policy_note}."
    )
    try:
        raw = await complete_json([{"role": "user", "content": user}], system)
    except Exception:  # noqa: BLE001
        return fallback
    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return fallback
    out = dict(fallback)
    for key in ("task_type", "title", "detail", "priority", "suggested_copy", "recommended_next_stage", "policy_note"):
        if raw.get(key):
            out[key] = raw[key]
    if out.get("recommended_next_stage") not in STAGES:
        out["recommended_next_stage"] = fallback["recommended_next_stage"]
    out["ai_mode"] = "llm_enhanced"
    return out


# ---------------------------------------------------------------------------
# Live vision analysis (screenshots + DOM text from the desktop browser)
# ---------------------------------------------------------------------------

def _vision_fallback(lead: dict[str, Any], dom_text: str | None) -> dict[str, Any]:
    action = deterministic_next_action(lead)
    return {
        "summary": (
            "Vision model unavailable — using stage-based guidance. Review the profile manually and "
            "follow the suggested next action."
        ),
        "signals": {
            "has_dom_text": bool(dom_text),
            "stage": lead.get("stage") or "new",
        },
        "recommended_action": {
            "task_type": action["task_type"],
            "title": action["title"],
            "detail": action["detail"],
            "suggested_copy": action.get("suggested_copy"),
            "recommended_next_stage": action.get("recommended_next_stage"),
        },
        "policy_note": "Manual action only. AI guides; the human performs every LinkedIn action.",
        "ai_mode": "deterministic",
    }


async def analyze_live_view(
    lead: dict[str, Any],
    images: list[str] | None = None,
    dom_text: str | None = None,
    account: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Summarize a live LinkedIn view (screenshots + DOM) into signals + one action."""
    images = images or []
    fallback = _vision_fallback(lead, dom_text)
    if not images or not vision_configured():
        # Still try a text-only LLM pass on the DOM if we have it.
        if dom_text:
            try:
                enriched = await ai_next_action({**lead, "_live_dom": dom_text[:8000]}, account)
                fallback["recommended_action"] = {
                    "task_type": enriched["task_type"],
                    "title": enriched["title"],
                    "detail": enriched["detail"],
                    "suggested_copy": enriched.get("suggested_copy"),
                    "recommended_next_stage": enriched.get("recommended_next_stage"),
                }
                fallback["ai_mode"] = "llm_text"
            except Exception:  # noqa: BLE001
                pass
        return fallback

    system = (
        "You are an AI LinkedIn co-pilot watching a human's screen while THEY browse a lead's profile. "
        "You never click or automate. You read the screenshot + page text, extract buying/relationship "
        "signals, and tell the human the single best next manual action (and a personalized draft if "
        "messaging). Stay strictly within LinkedIn policy. Return STRICT JSON only."
    )
    text = (
        "Analyze this live LinkedIn profile view and guide the human operator.\n"
        f"LEAD CONTEXT:\n{json.dumps(lead, ensure_ascii=False, default=str)[:4000]}\n\n"
        f"VISIBLE PAGE TEXT (DOM):\n{(dom_text or '')[:6000]}\n\n"
        "Return JSON: {summary, signals {open_to_work, recently_posted, mutual_topics, seniority, "
        "intent_level}, recommended_action {task_type, title, detail, suggested_copy, "
        "recommended_next_stage}, policy_note}."
    )
    try:
        raw = await complete_vision_json(text, images, system)
    except Exception:  # noqa: BLE001
        return fallback
    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return fallback
    out = dict(fallback)
    for key in ("summary", "signals", "recommended_action", "policy_note"):
        if raw.get(key):
            out[key] = raw[key]
    rec = out.get("recommended_action") or {}
    if isinstance(rec, dict) and rec.get("recommended_next_stage") not in STAGES:
        rec["recommended_next_stage"] = lead.get("stage") or "new"
        out["recommended_action"] = rec
    out["ai_mode"] = "vision"
    return out


# ---------------------------------------------------------------------------
# Live co-pilot (objective-driven, lead-optional screen observation)
# ---------------------------------------------------------------------------

_PRIORITY_BY_PAGE = {
    "profile": "high",
    "messaging": "high",
    "search": "medium",
    "feed": "medium",
    "notifications": "medium",
    "other": "low",
}


def _page_type_from_dom(dom: dict[str, Any] | None, dom_text: str | None) -> str:
    """Best-effort classification of the visible LinkedIn page."""
    if isinstance(dom, dict) and dom.get("pageType"):
        return str(dom["pageType"])
    url = ""
    if isinstance(dom, dict):
        url = str(dom.get("url") or "")
    blob = f"{url}\n{dom_text or ''}".lower()
    if "/in/" in blob:
        return "profile"
    if "/messaging" in blob:
        return "messaging"
    if "/search" in blob:
        return "search"
    if "/feed" in blob or "start a post" in blob:
        return "feed"
    if "/notifications" in blob:
        return "notifications"
    return "other"


def _live_fallback(objective: str, page_type: str, lead: dict[str, Any] | None) -> dict[str, Any]:
    """Deterministic guidance when the vision model is unavailable."""
    guides = {
        "profile": (
            "Review this profile",
            "Read their headline, recent activity and About. Look for a genuine hook (a recent post, "
            "shared interest or pain) before any outreach. If warm, send a personalized connection note.",
        ),
        "search": (
            "Qualify search results",
            "Open promising profiles one at a time. Skip poor-fit results. Add strong matches to your "
            "pipeline before engaging — quality over volume.",
        ),
        "feed": (
            "Engage to warm up",
            "Leave 2-3 thoughtful comments on target-account posts. Comments build familiarity so future "
            "connection requests land warmer.",
        ),
        "messaging": (
            "Continue the conversation",
            "Reply with genuine curiosity tied to their world. Ask one relevant question; avoid pitching "
            "until pain and fit are clear.",
        ),
        "notifications": (
            "Act on warm signals",
            "Respond to people who engaged with you — they are your warmest inbound. Thank, reply, and open "
            "a real conversation.",
        ),
        "other": (
            "Pick a high-intent surface",
            "Move to a target profile, your search list, or the feed of your ICP to take a meaningful "
            "relationship-building action.",
        ),
    }
    title, detail = guides.get(page_type, guides["other"])
    copy = None
    if page_type == "profile" and lead:
        copy = _personalized_copy(lead, "connect")
    return {
        "action": title,
        "reasoning": f"{detail} (Objective: {objective})",
        "copy": copy,
        "policy_note": (
            "Manual action only — AI guides, you perform every action inside LinkedIn to stay policy-safe."
        ),
        "priority": _PRIORITY_BY_PAGE.get(page_type, "low"),
        "page_type": page_type,
        "ai_mode": "deterministic",
    }


def _normalize_live_result(raw: dict[str, Any], page_type: str) -> dict[str, Any]:
    """Coerce an LLM/vision response into the desktop UI contract."""
    action = raw.get("action") or raw.get("title")
    reasoning = raw.get("reasoning") or raw.get("detail") or raw.get("summary")
    copy = raw.get("copy") or raw.get("suggested_copy")
    rec = raw.get("recommended_action")
    if isinstance(rec, dict):
        action = action or rec.get("title")
        reasoning = reasoning or rec.get("detail")
        copy = copy or rec.get("suggested_copy")
    priority = raw.get("priority")
    if priority not in ("high", "medium", "low"):
        priority = _PRIORITY_BY_PAGE.get(page_type, "medium")
    return {
        "action": action or "Review the current view",
        "reasoning": reasoning or "Take the most relevant manual next step for your objective.",
        "copy": copy,
        "policy_note": raw.get("policy_note")
        or "Manual action only — AI guides, you perform every action inside LinkedIn.",
        "priority": priority,
        "signals": raw.get("signals"),
        "page_type": page_type,
    }


async def observe_live_screen(
    objective: str,
    images: list[str] | None = None,
    dom_text: str | None = None,
    dom: dict[str, Any] | None = None,
    lead: dict[str, Any] | None = None,
    account: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Objective-driven guidance for whatever the human is currently viewing on LinkedIn.

    Unlike ``analyze_live_view`` this does not require a specific lead — it reads the visible
    page, optionally enriched with a matched pipeline lead, and returns one policy-safe next
    action in the desktop UI contract: ``{action, reasoning, copy, policy_note, priority}``.
    """
    objective = (objective or "Build relationships and generate qualified B2B leads").strip()
    images = images or []
    page_type = _page_type_from_dom(dom, dom_text)
    fallback = _live_fallback(objective, page_type, lead)

    if not images or not vision_configured():
        if dom_text:
            try:
                system = (
                    "You are an AI LinkedIn co-pilot guiding a human while THEY browse. You never click or "
                    "automate. Read the page text, weigh it against the user's objective, and return ONE "
                    "policy-safe manual next action. Return STRICT JSON only."
                )
                user = (
                    f"USER OBJECTIVE: {objective}\n"
                    f"PAGE TYPE: {page_type}\n"
                    f"MATCHED LEAD (may be empty): {json.dumps(lead or {}, ensure_ascii=False, default=str)[:2500]}\n\n"
                    f"VISIBLE PAGE TEXT:\n{dom_text[:6000]}\n\n"
                    "Return JSON: {action, reasoning, copy (personalized draft or null), priority "
                    "(high|medium|low), policy_note, signals}."
                )
                raw = await complete_json([{"role": "user", "content": user}], system)
                if isinstance(raw, dict) and not raw.get("_parse_error"):
                    out = _normalize_live_result(raw, page_type)
                    out["ai_mode"] = "llm_text"
                    return out
            except Exception:  # noqa: BLE001
                pass
        return fallback

    system = (
        "You are an AI LinkedIn co-pilot watching a human's screen while THEY browse LinkedIn. "
        "You never click or automate. You read the screenshot + page text, weigh them against the "
        "user's stated objective, and tell the human the single best next MANUAL action (plus a "
        "personalized draft when messaging). Stay strictly within LinkedIn policy. Return STRICT JSON only."
    )
    text = (
        f"USER OBJECTIVE: {objective}\n"
        f"PAGE TYPE: {page_type}\n"
        f"MATCHED LEAD (may be empty): {json.dumps(lead or {}, ensure_ascii=False, default=str)[:2500]}\n\n"
        f"VISIBLE PAGE TEXT (DOM):\n{(dom_text or '')[:5000]}\n\n"
        "Return JSON: {action, reasoning, copy (personalized draft or null), priority (high|medium|low), "
        "policy_note, signals {open_to_work, recently_posted, mutual_topics, seniority, intent_level}}."
    )
    try:
        raw = await complete_vision_json(text, images, system)
    except Exception:  # noqa: BLE001
        return fallback
    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return fallback
    out = _normalize_live_result(raw, page_type)
    out["ai_mode"] = "vision"
    return out


# ---------------------------------------------------------------------------
# CSV import
# ---------------------------------------------------------------------------

_FIELD_ALIASES = {
    "full_name": {"full_name", "name", "fullname", "full name", "lead", "contact"},
    "headline": {"headline", "title", "job title", "position", "role"},
    "company": {"company", "organization", "organisation", "employer", "company name"},
    "role_title": {"role_title", "role", "designation"},
    "location": {"location", "city", "region", "country"},
    "profile_url": {"profile_url", "profile", "linkedin", "linkedin url", "url", "profile link"},
    "email": {"email", "e-mail", "email address"},
}


def _match_field(header: str) -> str | None:
    h = header.strip().lower()
    for field, aliases in _FIELD_ALIASES.items():
        if h in aliases:
            return field
    return None


def parse_leads_csv(content: str) -> list[dict[str, Any]]:
    """Parse a CSV string into normalized lead dicts. Skips rows without a name."""
    reader = csv.DictReader(io.StringIO(content))
    rows: list[dict[str, Any]] = []
    if not reader.fieldnames:
        return rows
    mapping = {col: _match_field(col) for col in reader.fieldnames}
    for raw in reader:
        lead: dict[str, Any] = {}
        extra: dict[str, Any] = {}
        for col, value in raw.items():
            if value is None:
                continue
            value = value.strip()
            if not value:
                continue
            field = mapping.get(col)
            if field:
                lead[field] = value
            else:
                extra[col] = value
        if not lead.get("full_name"):
            continue
        if extra:
            lead["enrichment"] = extra
        rows.append(lead)
    return rows


# ---------------------------------------------------------------------------
# Daily work-queue helpers
# ---------------------------------------------------------------------------

def today() -> date:
    return datetime.now(timezone.utc).date()


def playbook() -> dict[str, Any]:
    return {
        "stages": STAGES,
        "stage_flow": STAGE_FLOW,
        "guardrails": POLICY_GUARDRAILS,
        "default_caps": {"connect": DEFAULT_CONNECT_CAP, "message": DEFAULT_MESSAGE_CAP},
        "mode": "human_in_the_loop",
        "vision_available": vision_configured(),
    }
