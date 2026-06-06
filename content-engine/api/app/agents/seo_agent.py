"""The SEO Agent — the agentic AI brain of the SEO Suite.

Three real capabilities, each grounded in workspace rows and degrading to a
deterministic fallback so the feature never hard-fails:

* ``content_brief``  — produce a complete, usable SEO brief (title, H2/H3
  outline, key questions, entities, internal-link ideas, word count).
* ``audit_page``     — evaluate on-page SEO factors and return scored issues.
  Fetches the URL with the real crawler when given a URL; otherwise evaluates
  the supplied HTML/meta text.
* ``run_cycle``      — autonomous loop: flag ranking drops + suggest briefs for
  gap keywords.
"""
from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.services import seo as svc

log = logging.getLogger("seo_agent")

BRIEF_SYSTEM = (
    "You are an expert SEO content strategist and editor. You design briefs that "
    "writers can execute to rank in Google. Respond with strict JSON only."
)
AUDIT_SYSTEM = (
    "You are a technical + on-page SEO auditor. You evaluate a page against "
    "Google ranking factors and return concrete, prioritized issues. Respond "
    "with strict JSON only."
)

_SEVERITY_WEIGHT = {"critical": 18, "high": 12, "medium": 6, "low": 3}


# --------------------------------------------------------------------------- #
# Content brief
# --------------------------------------------------------------------------- #
async def content_brief(
    db: AsyncSession, ws_id: uuid.UUID, keyword: str
) -> dict[str, Any]:
    """Generate a complete, usable SEO content brief for ``keyword``.

    Grounds the brief in real SERP research (competitor target terms, median word
    count, and People-Also-Ask-style questions) via
    :func:`app.services.content_optimize.research_serp`, then has the LLM build the
    structure around that real data. Degrades to a deterministic brief on failure.
    """
    keyword = (keyword or "").strip()
    if not keyword:
        return _fallback_brief("your topic")

    # Real SERP research (deterministic term/word-count/question extraction).
    research = None
    serp_block = ""
    try:
        from app.services.content_optimize import research_serp

        research = await research_serp(keyword)
    except Exception as exc:  # noqa: BLE001
        log.warning("content_brief SERP research failed: %s", exc)

    if research is not None and not research.low_confidence and research.target_terms:
        top_terms = ", ".join(t.term for t in research.target_terms[:25])
        top_questions = "; ".join(research.questions[:8])
        serp_block = (
            "\nUse this REAL SERP research from the current top-ranking pages "
            "(do not contradict it):\n"
            f"- Competitor target terms to cover: {top_terms}\n"
            f"- Median competitor word count: {research.recommended_word_count}\n"
            f"- Questions competitors answer: {top_questions or 'n/a'}\n"
            f"- Competitors analyzed: {research.competitors_analyzed}\n"
        )

    user = (
        f"Create a comprehensive SEO content brief for the target keyword: "
        f'"{keyword}".\n'
        "Ground it in modern search intent and topical authority best practices.\n"
        f"{serp_block}"
        "Return JSON with EXACTLY these keys:\n"
        "{\n"
        '  "title": "an SEO-optimized H1/title (<=60 chars ideally)",\n'
        '  "meta_description": "compelling meta description <=155 chars",\n'
        '  "search_intent": "informational|commercial|transactional|navigational",\n'
        '  "word_count_target": <integer>,\n'
        '  "outline": [ {"h2": "section heading", "h3": ["sub point", ...]} ],\n'
        '  "key_questions": ["question to answer", ...],\n'
        '  "entities": ["important entity/term to mention", ...],\n'
        '  "internal_link_suggestions": ["anchor or topic to link", ...],\n'
        '  "primary_keyword": "%s",\n' % keyword
        + '  "secondary_keywords": ["related keyword", ...]\n'
        "}\n"
        "Make the outline genuinely useful (5-9 H2 sections with H3s)."
    )

    data: dict[str, Any] = {}
    try:
        data = await complete_json([{"role": "user", "content": user}], system=BRIEF_SYSTEM)
    except Exception as exc:  # noqa: BLE001
        log.warning("content_brief LLM failed: %s", exc)
        data = {}

    if not isinstance(data, dict) or data.get("_parse_error") or "outline" not in data:
        fb = _fallback_brief(keyword)
        if research is not None:
            _attach_serp_research(fb, research)
        return fb

    # Normalize.
    data.setdefault("primary_keyword", keyword)
    try:
        data["word_count_target"] = int(data.get("word_count_target") or 1500)
    except (TypeError, ValueError):
        data["word_count_target"] = 1500
    # Prefer the real median competitor word count when research is confident.
    if research is not None and not research.low_confidence and research.recommended_word_count:
        data["word_count_target"] = research.recommended_word_count
    if not isinstance(data.get("outline"), list) or not data["outline"]:
        fb = _fallback_brief(keyword)
        if research is not None:
            _attach_serp_research(fb, research)
        return fb
    if research is not None:
        _attach_serp_research(data, research)
    data["brief_md"] = _brief_to_markdown(keyword, data)
    data["generated_by"] = "llm"
    return data


def _attach_serp_research(data: dict[str, Any], research) -> None:
    """Attach the real SERP research payload + merge missing questions/terms."""
    data["serp_research"] = research.to_dict()
    # Fold competitor questions into key_questions (de-duplicated, capped).
    if research.questions:
        existing = {str(q).lower().strip() for q in (data.get("key_questions") or [])}
        merged = list(data.get("key_questions") or [])
        for q in research.questions:
            if q.lower().strip() not in existing and len(merged) < 12:
                merged.append(q)
                existing.add(q.lower().strip())
        data["key_questions"] = merged
    # Surface top competitor terms as entities when the LLM under-specified.
    if research.target_terms and len(data.get("entities") or []) < 5:
        terms = [t.term for t in research.target_terms[:12]]
        data["entities"] = list(dict.fromkeys([*(data.get("entities") or []), *terms]))


def _brief_to_markdown(keyword: str, d: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append(f"# {d.get('title') or keyword.title()}")
    lines.append("")
    if d.get("meta_description"):
        lines.append(f"**Meta description:** {d['meta_description']}")
        lines.append("")
    lines.append(f"**Target keyword:** {keyword}")
    if d.get("search_intent"):
        lines.append(f"**Search intent:** {d['search_intent']}")
    if d.get("word_count_target"):
        lines.append(f"**Word count target:** {d['word_count_target']}")
    lines.append("")
    lines.append("## Outline")
    for sec in d.get("outline", []):
        if not isinstance(sec, dict):
            continue
        h2 = sec.get("h2") or sec.get("heading") or ""
        if h2:
            lines.append(f"### {h2}")
        for h3 in sec.get("h3", []) or []:
            lines.append(f"- {h3}")
    if d.get("key_questions"):
        lines.append("")
        lines.append("## Key questions to answer")
        for q in d["key_questions"]:
            lines.append(f"- {q}")
    if d.get("entities"):
        lines.append("")
        lines.append("## Entities & terms to cover")
        lines.append(", ".join(str(e) for e in d["entities"]))
    if d.get("internal_link_suggestions"):
        lines.append("")
        lines.append("## Internal link suggestions")
        for li in d["internal_link_suggestions"]:
            lines.append(f"- {li}")
    if d.get("secondary_keywords"):
        lines.append("")
        lines.append("## Secondary keywords")
        lines.append(", ".join(str(k) for k in d["secondary_keywords"]))
    return "\n".join(lines)


def _fallback_brief(keyword: str) -> dict[str, Any]:
    kw = keyword.strip() or "your topic"
    title = f"{kw.title()}: A Complete Guide"
    outline = [
        {"h2": f"What is {kw}?", "h3": ["Definition", "Why it matters"]},
        {"h2": f"How {kw} works", "h3": ["Key components", "Step-by-step"]},
        {"h2": f"Benefits of {kw}", "h3": ["Primary benefits", "Use cases"]},
        {"h2": f"Best practices for {kw}", "h3": ["Do's", "Common mistakes"]},
        {"h2": "Frequently asked questions", "h3": ["Cost", "Getting started"]},
    ]
    data: dict[str, Any] = {
        "title": title,
        "meta_description": f"Everything you need to know about {kw}: how it works, benefits, and best practices.",
        "search_intent": "informational",
        "word_count_target": 1500,
        "outline": outline,
        "key_questions": [
            f"What is {kw}?",
            f"How does {kw} work?",
            f"What are the benefits of {kw}?",
            f"How do I get started with {kw}?",
        ],
        "entities": [kw, f"{kw} guide", f"{kw} best practices"],
        "internal_link_suggestions": [
            f"Related: introduction to {kw}",
            f"Compare {kw} options",
        ],
        "primary_keyword": kw,
        "secondary_keywords": [f"{kw} guide", f"{kw} tips", f"best {kw}"],
        "generated_by": "fallback",
    }
    data["brief_md"] = _brief_to_markdown(kw, data)
    return data


# --------------------------------------------------------------------------- #
# Page audit
# --------------------------------------------------------------------------- #
async def audit_page(
    db: AsyncSession,
    ws_id: uuid.UUID,
    url: str | None,
    html_or_meta: str | None = None,
) -> dict[str, Any]:
    """Audit on-page SEO. Crawls ``url`` for real signals when no text given."""
    text = (html_or_meta or "").strip()
    fetched_title = ""
    crawl_ok = False

    if not text and url:
        try:
            from app.tools.crawler import deep_crawl

            result = await deep_crawl(url)
            crawl_ok = bool(getattr(result, "ok", False))
            fetched_title = getattr(result, "title", "") or ""
            body = getattr(result, "text", "") or getattr(result, "markdown", "") or ""
            text = f"TITLE: {fetched_title}\n\n{body}"[:12000]
        except Exception as exc:  # noqa: BLE001
            log.warning("audit_page crawl failed for %s: %s", url, exc)

    signals = _deterministic_signals(text, fetched_title)

    user = (
        f"Audit this page for on-page SEO. URL: {url or 'n/a'}.\n"
        f"Observed signals (from real fetch): {signals}\n\n"
        f"Page content / meta (truncated):\n{text[:6000] if text else '(no content available)'}\n\n"
        "Evaluate title tag, meta description, headings (H1/H2), keyword usage, "
        "content depth, readability, internal/external links, image alt text, and "
        "structured data. Return JSON:\n"
        "{\n"
        '  "score": <0-100 integer>,\n'
        '  "summary": "one-sentence verdict",\n'
        '  "issues": [ {"type": "title|meta|headings|content|links|images|schema|performance", '
        '"severity": "critical|high|medium|low", "detail": "specific, actionable finding"} ]\n'
        "}\n"
        "Base findings only on the provided signals/content; do not invent data."
    )

    data: dict[str, Any] = {}
    try:
        data = await complete_json([{"role": "user", "content": user}], system=AUDIT_SYSTEM)
    except Exception as exc:  # noqa: BLE001
        log.warning("audit_page LLM failed: %s", exc)
        data = {}

    if (
        not isinstance(data, dict)
        or data.get("_parse_error")
        or not isinstance(data.get("issues"), list)
    ):
        data = _fallback_audit(signals, has_content=bool(text))

    issues = [i for i in data.get("issues", []) if isinstance(i, dict)]
    # Recompute a defensible score from issue severities when present.
    if issues:
        penalty = sum(_SEVERITY_WEIGHT.get(str(i.get("severity")).lower(), 4) for i in issues)
        derived = max(0, 100 - penalty)
    else:
        derived = 95
    try:
        score = int(data.get("score"))
    except (TypeError, ValueError):
        score = derived
    score = max(0, min(100, score))

    return {
        "score": score,
        "issues": issues,
        "summary": data.get("summary") or "On-page audit complete.",
        "crawled": crawl_ok,
        "generated_by": data.get("generated_by", "llm" if issues and "summary" in data else "fallback"),
    }


def _deterministic_signals(text: str, title: str) -> dict[str, Any]:
    t = text or ""
    words = re.findall(r"\w+", t)
    return {
        "has_content": bool(t.strip()),
        "word_count": len(words),
        "title_present": bool(title.strip()),
        "title_length": len(title.strip()),
        "h1_count": len(re.findall(r"(?im)^#\s|<h1", t)),
        "h2_count": len(re.findall(r"(?im)^##\s|<h2", t)),
        "has_meta_description": "description" in t.lower()[:2000],
        "image_count": len(re.findall(r"!\[|<img", t)),
        "link_count": len(re.findall(r"\]\(http|href=", t)),
    }


def _fallback_audit(signals: dict[str, Any], *, has_content: bool) -> dict[str, Any]:
    issues: list[dict[str, str]] = []
    if not has_content:
        issues.append(
            {
                "type": "content",
                "severity": "high",
                "detail": "Page content could not be fetched. Verify the URL is reachable and not blocking crawlers.",
            }
        )
        return {"score": 40, "summary": "Unable to fetch page content.", "issues": issues, "generated_by": "fallback"}

    wc = int(signals.get("word_count", 0))
    if not signals.get("title_present"):
        issues.append({"type": "title", "severity": "critical", "detail": "Missing <title> tag — add a descriptive, keyword-led title."})
    elif signals.get("title_length", 0) > 60:
        issues.append({"type": "title", "severity": "medium", "detail": "Title exceeds ~60 characters and may be truncated in SERPs."})
    if not signals.get("has_meta_description"):
        issues.append({"type": "meta", "severity": "medium", "detail": "No meta description detected — add a compelling 150-char summary."})
    if signals.get("h1_count", 0) == 0:
        issues.append({"type": "headings", "severity": "high", "detail": "No H1 heading found — every page needs a single clear H1."})
    if signals.get("h1_count", 0) > 1:
        issues.append({"type": "headings", "severity": "medium", "detail": "Multiple H1 headings found — keep exactly one H1 per page."})
    if signals.get("h2_count", 0) < 2:
        issues.append({"type": "headings", "severity": "low", "detail": "Few H2 sections — break content into scannable sections."})
    if wc < 300:
        issues.append({"type": "content", "severity": "high", "detail": f"Thin content (~{wc} words). Aim for comprehensive, intent-matching depth."})
    if signals.get("image_count", 0) == 0:
        issues.append({"type": "images", "severity": "low", "detail": "No images detected — add relevant visuals with descriptive alt text."})
    if signals.get("link_count", 0) < 2:
        issues.append({"type": "links", "severity": "low", "detail": "Few links — add internal links to relevant pages and authoritative sources."})

    penalty = sum(_SEVERITY_WEIGHT.get(i["severity"], 4) for i in issues)
    score = max(0, 100 - penalty)
    return {
        "score": score,
        "summary": "Heuristic on-page audit complete." if issues else "No major on-page issues detected.",
        "issues": issues,
        "generated_by": "fallback",
    }


# --------------------------------------------------------------------------- #
# Autonomous cycle
# --------------------------------------------------------------------------- #
async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Flag ranking drops and suggest briefs for content-gap keywords.

    Grounded entirely in real keyword rows. When no GSC connector is connected,
    attempts free SERP-based rank checks for a rate-limited batch of tracked
    keywords (real positions only — never fabricated). Emits nothing itself
    (routers own event emission); returns a structured summary for the loop.
    """
    keywords = await svc.list_keywords(db, ws_id)

    # SERP-based rank checks when no real ranking connector exists.
    serp_checks: list[dict[str, Any]] = []
    try:
        if not await svc.has_rank_connector(db, ws_id):
            domain = await _resolve_workspace_domain(db, ws_id)
            if domain:
                tracked = [k for k in keywords if k.is_tracked][:10]
                for kw in tracked:
                    try:
                        res = await svc.check_keyword_serp(db, ws_id, kw, domain)
                        serp_checks.append({"term": kw.term, "status": res.get("status"), "rank": res.get("rank")})
                    except Exception as exc:  # noqa: BLE001 — one keyword must not break the cycle
                        log.warning("run_cycle SERP check failed for '%s': %s", kw.term, exc)
                # Refresh keyword rows so drop detection sees the new ranks.
                keywords = await svc.list_keywords(db, ws_id)
    except Exception as exc:  # noqa: BLE001
        log.warning("run_cycle SERP rank phase failed: %s", exc)

    drops: list[dict[str, Any]] = []
    for k in keywords:
        if not k.is_tracked:
            continue
        d = svc.rank_delta(k)
        if d is not None and d < 0:  # rank number grew = position worsened
            drops.append(
                {
                    "keyword_id": str(k.id),
                    "term": k.term,
                    "current_rank": k.current_rank,
                    "previous_rank": k.previous_rank,
                    "drop": abs(d),
                }
            )
    drops.sort(key=lambda x: x["drop"], reverse=True)

    gaps = await svc.content_gaps(db, ws_id)
    suggested_briefs = [
        {
            "keyword_id": str(g.id),
            "term": g.term,
            "current_rank": g.current_rank,
            "reason": "not ranking" if g.current_rank is None else "outside top 10",
        }
        for g in gaps[:10]
    ]

    return {
        "status": "ok",
        "tracked_keywords": sum(1 for k in keywords if k.is_tracked),
        "rank_drops": drops,
        "rank_drop_count": len(drops),
        "serp_checks": serp_checks,
        "serp_check_count": len(serp_checks),
        "suggested_briefs": suggested_briefs,
        "gap_count": len(gaps),
    }


async def _resolve_workspace_domain(db: AsyncSession, ws_id: uuid.UUID) -> str | None:
    """Best-effort registrable domain for the workspace (brand or workspace site)."""
    candidates: list[str | None] = []
    try:
        from app.models.brand import BrandBrain
        from sqlalchemy import select

        res = await db.execute(
            select(BrandBrain.website).where(BrandBrain.workspace_id == ws_id)
        )
        candidates.append(res.scalars().first())
    except Exception:  # noqa: BLE001
        pass
    try:
        from app.models.tenant import Workspace
        from sqlalchemy import select

        res = await db.execute(select(Workspace.website).where(Workspace.id == ws_id))
        candidates.append(res.scalars().first())
    except Exception:  # noqa: BLE001
        pass
    for c in candidates:
        if c and c.strip():
            return c.strip()
    return None
