"""LinkedIn Growth Copilot scoring and recommendation engine.

This service is intentionally human-in-the-loop. It analyzes user-provided
profile snapshots and screenshots/vision notes, creates rewrite drafts and
manual action items, and enforces policy-safe guardrails: no credential storage,
no automated browsing, no mass messaging, no auto-connect behavior.
"""
from __future__ import annotations

import json
from typing import Any

from app.llm.adapters import complete_json

OBJECTIVES = [
    {
        "id": "high_ticket_leads",
        "label": "High-ticket lead generation",
        "description": "Turn profile visitors into qualified sales conversations.",
    },
    {
        "id": "founder_authority",
        "label": "Founder / executive authority",
        "description": "Build trust, category expertise and inbound credibility.",
    },
    {
        "id": "partnerships",
        "label": "Partnerships",
        "description": "Attract alliances, channel partners and strategic conversations.",
    },
    {
        "id": "hiring",
        "label": "Hiring / employer brand",
        "description": "Make the profile compelling for candidates and talent networks.",
    },
]

POLICY_GUARDRAILS = [
    "AI gives recommendations and drafts; humans make every LinkedIn edit, post, connection request and message.",
    "No mass scraping, no automated connection requests, no automated DMs, no engagement pods.",
    "Use public/profile-owner-visible information only; do not extract private data at scale.",
    "Keep outreach personalized, relevant, low-volume and value-first.",
    "Do not store LinkedIn passwords or session cookies in this platform.",
]

SECTION_WEIGHTS = {
    "headline": 18,
    "banner": 12,
    "about": 18,
    "featured": 12,
    "experience": 10,
    "proof": 10,
    "content": 12,
    "cta": 8,
}


def normalize_objective(value: str | None) -> str:
    ids = {o["id"] for o in OBJECTIVES}
    return value if value in ids else "high_ticket_leads"


def grade_for(score: float) -> str:
    if score >= 85:
        return "lead_machine"
    if score >= 70:
        return "strong"
    if score >= 50:
        return "developing"
    return "needs_work"


def browser_session(profile_url: str | None = None) -> dict[str, Any]:
    """Return a safe human-controlled browser session descriptor."""
    return {
        "url": profile_url or "https://www.linkedin.com/feed/",
        "mode": "human_controlled_window",
        "policy": "AI may guide and draft. The human must perform every LinkedIn action manually.",
        "guardrails": POLICY_GUARDRAILS,
        "capture_steps": [
            "Open LinkedIn in the new window and log in directly with LinkedIn.",
            "Open your profile and review headline, banner, About, Featured, Experience and recent posts.",
            "Copy visible section text or summarize screenshots into the Profile Snapshot fields.",
            "Run Audit. Apply suggested edits manually inside LinkedIn only after reviewing them.",
        ],
    }


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return json.dumps(value, ensure_ascii=False)


def _word_count(value: str) -> int:
    return len([w for w in value.replace("\n", " ").split(" ") if w.strip()])


def _has_any(text: str, needles: list[str]) -> bool:
    t = text.lower()
    return any(n.lower() in t for n in needles)


def _section_score(section: str, snapshot: dict[str, Any], objective: dict[str, Any]) -> tuple[float, list[str]]:
    headline = _text(snapshot.get("headline"))
    about = _text(snapshot.get("about"))
    banner = _text(snapshot.get("banner_notes"))
    featured = _text(snapshot.get("featured"))
    experience = _text(snapshot.get("experience"))
    posts = _text(snapshot.get("recent_posts"))
    proof = _text(snapshot.get("proof"))
    cta = _text(snapshot.get("cta"))
    offer = _text(objective.get("offer"))
    icp = _text(objective.get("icp"))

    issues: list[str] = []
    score = 0.0
    if section == "headline":
        score += 35 if 8 <= _word_count(headline) <= 24 else 12 if headline else 0
        score += 25 if _has_any(headline, ["help", "grow", "scale", "generate", "pipeline", "revenue", "leads"]) else 0
        score += 20 if icp and any(w.lower() in headline.lower() for w in icp.split()[:12]) else 0
        score += 20 if offer and any(w.lower() in headline.lower() for w in offer.split()[:12]) else 0
        if score < 60:
            issues.append("Headline should clearly name ICP, outcome and credibility.")
    elif section == "banner":
        score += 40 if banner else 0
        score += 30 if _has_any(banner, ["outcome", "cta", "proof", "book", "audit", "pipeline", "revenue"]) else 0
        score += 30 if _word_count(banner) >= 8 else 0
        if score < 60:
            issues.append("Banner should communicate promise, proof and a clear next step.")
    elif section == "about":
        wc = _word_count(about)
        score += 30 if wc >= 120 else 12 if about else 0
        score += 25 if _has_any(about, ["problem", "pain", "help", "result", "case", "proof", "roi"]) else 0
        score += 25 if _has_any(about, ["book", "dm", "message", "audit", "call", "comment"]) else 0
        score += 20 if icp and any(w.lower() in about.lower() for w in icp.split()[:16]) else 0
        if score < 60:
            issues.append("About section needs pain, proof, positioning and CTA.")
    elif section == "featured":
        score += 45 if featured else 0
        score += 35 if _has_any(featured, ["case", "playbook", "audit", "guide", "webinar", "calendar", "demo"]) else 0
        score += 20 if _word_count(featured) >= 8 else 0
        if score < 60:
            issues.append("Featured section should act as an inbound lead magnet shelf.")
    elif section == "experience":
        score += 45 if _word_count(experience) >= 40 else 18 if experience else 0
        score += 35 if _has_any(experience, ["increased", "generated", "reduced", "pipeline", "revenue", "%", "$", "roi"]) else 0
        score += 20 if _has_any(experience, ["strategy", "execution", "systems", "team", "growth"]) else 0
        if score < 60:
            issues.append("Experience should show measurable outcomes, not job duties.")
    elif section == "proof":
        score += 50 if proof else 0
        score += 30 if _has_any(proof, ["case", "testimonial", "client", "result", "%", "$", "roi"]) else 0
        score += 20 if _word_count(proof) >= 10 else 0
        if score < 60:
            issues.append("Add proof: results, testimonials, case studies or quantified wins.")
    elif section == "content":
        score += 35 if _word_count(posts) >= 40 else 12 if posts else 0
        score += 35 if _has_any(posts, ["framework", "lesson", "mistake", "case", "trend", "playbook"]) else 0
        score += 30 if _has_any(posts, ["comment", "dm", "save", "share", "audit", "follow"]) else 0
        if score < 60:
            issues.append("Recent posts should teach, prove expertise and invite relevant conversation.")
    elif section == "cta":
        combined = f"{headline}\n{about}\n{featured}\n{cta}"
        score += 60 if _has_any(combined, ["book", "dm", "message", "audit", "call", "comment"]) else 0
        score += 40 if _word_count(cta) >= 4 else 0
        if score < 60:
            issues.append("CTA should tell the right buyer exactly what to do next.")
    return min(score, 100.0), issues


def _recommendations(snapshot: dict[str, Any], objective: dict[str, Any], section_scores: dict[str, float]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for section, score in sorted(section_scores.items(), key=lambda x: x[1]):
        if score >= 80:
            continue
        priority = "high" if score < 50 else "medium"
        titles = {
            "headline": "Rewrite headline around ICP + outcome",
            "banner": "Turn banner into a visual landing page",
            "about": "Rebuild About section as a sales page",
            "featured": "Add lead-magnet assets to Featured",
            "experience": "Replace duties with proof-backed outcomes",
            "proof": "Add credibility proof before outreach",
            "content": "Publish authority posts that create inbound demand",
            "cta": "Add one clear conversion CTA",
        }
        details = {
            "headline": "Use: who you help + business outcome + proof/category. Avoid vague titles.",
            "banner": "Add promise, niche, proof and a simple CTA such as 'DM AUDIT'.",
            "about": "Open with buyer pain, show your mechanism, add proof, then a clear CTA.",
            "featured": "Pin a case study, audit offer, lead magnet, calendar or flagship framework.",
            "experience": "Quantify pipeline, revenue, conversion, CAC or content outcomes wherever possible.",
            "proof": "Collect testimonials/results and make them visible before scaling outreach.",
            "content": "Post frameworks, teardown lessons, objection-handling and proof stories weekly.",
            "cta": "Pick one next step: book a call, DM a keyword, or request a profile/audience audit.",
        }
        items.append(
            {
                "section": section,
                "priority": priority,
                "title": titles[section],
                "detail": details[section],
                "policy_note": "Manual change only. AI drafts; human reviews and edits inside LinkedIn.",
            }
        )
    return items[:8]


def _drafts(snapshot: dict[str, Any], objective: dict[str, Any]) -> dict[str, Any]:
    icp = _text(objective.get("icp")) or "your ideal buyers"
    offer = _text(objective.get("offer")) or "turn LinkedIn into a predictable growth channel"
    voice = _text(objective.get("voice")) or "clear, expert, direct"
    return {
        "headline_options": [
            f"I help {icp} {offer} | LinkedIn growth + demand systems",
            f"{offer.title()} for {icp} | Strategy, content and high-trust pipeline",
            f"Helping {icp} convert LinkedIn authority into qualified sales conversations",
        ],
        "about_template": (
            f"I help {icp} {offer}.\n\n"
            "Most profiles explain what someone does. A lead-generating profile shows the right buyer: "
            "their pain, the promised outcome, why you are credible, and the next step.\n\n"
            "My approach combines positioning, content strategy, proof, and human-led outreach so inbound "
            "and outbound work together without spam or policy-breaking automation.\n\n"
            "If you want a clearer LinkedIn growth system, message me with 'PROFILE' and I will share the framework."
        ),
        "featured_assets": [
            "Profile/audience audit offer",
            "Case study or before/after teardown",
            "Lead magnet: LinkedIn high-ticket sales checklist",
            "Calendar/booking link with a specific promise",
        ],
        "content_pillars": [
            f"Pain points and buying triggers for {icp}",
            "Proof stories / case-study breakdowns",
            "Objection handling and strategic mistakes",
            "Frameworks, teardown posts and tactical checklists",
        ],
        "tone": voice,
    }


def _fallback_audit(snapshot: dict[str, Any], objective: dict[str, Any]) -> dict[str, Any]:
    section_scores: dict[str, float] = {}
    issues: dict[str, list[str]] = {}
    for section in SECTION_WEIGHTS:
        s, section_issues = _section_score(section, snapshot, objective)
        section_scores[section] = s
        issues[section] = section_issues
    weighted = sum(section_scores[k] * SECTION_WEIGHTS[k] for k in SECTION_WEIGHTS) / sum(SECTION_WEIGHTS.values())
    recs = _recommendations(snapshot, objective, section_scores)
    return {
        "score": round(weighted, 1),
        "grade": grade_for(weighted),
        "findings": {
            "section_scores": section_scores,
            "issues": issues,
            "summary": (
                "Profile is scored for inbound lead-generation readiness: ICP clarity, outcome promise, "
                "proof, CTA, content authority and LinkedIn-policy-safe conversion paths."
            ),
        },
        "recommendations": recs,
        "drafts": _drafts(snapshot, objective),
        "compliance": {
            "risk_level": "safe",
            "guardrails": POLICY_GUARDRAILS,
            "blocked_automation": ["auto-connect", "auto-DM", "mass-scrape", "auto-profile-edit"],
            "allowed_mode": "human-in-the-loop guidance, drafting and manual approval",
        },
        "ai_mode": "deterministic_scoring",
    }


def _clean_llm(raw: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return fallback
    out = dict(fallback)
    for key in ("findings", "drafts", "compliance"):
        if isinstance(raw.get(key), dict):
            out[key] = raw[key]
    if isinstance(raw.get("recommendations"), list) and raw["recommendations"]:
        out["recommendations"] = raw["recommendations"][:10]
    score = raw.get("score")
    if isinstance(score, (int, float)):
        out["score"] = max(0, min(100, float(score)))
        out["grade"] = grade_for(out["score"])
    elif isinstance(raw.get("grade"), str):
        out["grade"] = raw["grade"]
    out["ai_mode"] = "llm_enhanced"
    return out


async def audit_profile(snapshot: dict[str, Any], objective: dict[str, Any]) -> dict[str, Any]:
    """Score and optimize a LinkedIn profile snapshot."""
    fallback = _fallback_audit(snapshot, objective)
    system = (
        "You are a senior LinkedIn profile strategist for high-ticket lead generation. "
        "You must be policy-safe: never recommend automated connection requests, automated DMs, "
        "mass scraping, spam, credential capture, or browser automation. You may audit, advise, "
        "draft copy, and create human-reviewed action items. Return STRICT JSON only."
    )
    user = (
        "Analyze this LinkedIn profile snapshot for inbound lead generation and outbound readiness.\n"
        f"OBJECTIVE CONTEXT:\n{json.dumps(objective, ensure_ascii=False)[:6000]}\n\n"
        f"PROFILE SNAPSHOT / VISION NOTES:\n{json.dumps(snapshot, ensure_ascii=False)[:12000]}\n\n"
        "Return JSON with: score (0-100), grade, findings {summary, section_scores, issues}, "
        "recommendations [{section, priority, title, detail, suggested_copy, policy_note}], "
        "drafts {headline_options, about_template, featured_assets, content_pillars}, "
        "compliance {risk_level, guardrails, blocked_automation, allowed_mode}."
    )
    try:
        raw = await complete_json([{"role": "user", "content": user}], system)
    except Exception:  # noqa: BLE001
        return fallback
    return _clean_llm(raw, fallback)
