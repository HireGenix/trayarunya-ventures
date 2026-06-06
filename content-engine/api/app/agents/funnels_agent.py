"""The Funnels Agent — agentic landing-page generation & copy optimisation.

SENSE   -> read the workspace BrandBrain (voice, value prop, audience) + the
           real page rows / their conversion math.
PLAN    -> ask the LLM for a complete, ordered block array grounded in brand voice.
ACT     -> generate full pages, optimise copy variants, and (run_cycle) flag the
           lowest-converting published pages with concrete copy proposals.

Every LLM path has a deterministic fallback that still returns a valid ordered
``blocks`` array, so the builder never hard-fails.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models import BrandBrain
from app.models.funnels import LandingPage
from app.services import funnels as svc

log = logging.getLogger("funnels_agent")

SYSTEM = (
    "You are an expert direct-response landing page strategist and conversion "
    "copywriter. You write in the brand's voice and respond with strict JSON only."
)


async def _brand_context(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    row = (
        await db.execute(
            select(BrandBrain).where(BrandBrain.workspace_id == ws_id)
        )
    ).scalar_one_or_none()
    if row is None:
        return {}
    return {
        "mission": row.mission,
        "value_prop": row.value_prop,
        "voice": row.voice,
        "audience": row.audience,
        "pillars": row.pillars,
        "keywords": row.keywords,
    }


def _fallback_blocks(brief: str, goal: str) -> dict:
    headline = (brief or "Your better solution starts here").strip()[:90]
    cta = {
        "signup": "Start free",
        "demo": "Book a demo",
        "lead": "Get the guide",
        "purchase": "Buy now",
        "waitlist": "Join the waitlist",
    }.get(goal, "Get started")
    blocks = [
        {
            "type": "hero",
            "props": {
                "headline": headline,
                "subhead": "Built for teams who want results without the busywork.",
                "cta": cta,
            },
        },
        {
            "type": "features",
            "props": {
                "items": [
                    {"title": "Fast to launch", "body": "Go live in minutes, not weeks."},
                    {"title": "Made to convert", "body": "Every section earns its place."},
                    {"title": "Always on-brand", "body": "Your voice, end to end."},
                ]
            },
        },
        {
            "type": "testimonial",
            "props": {
                "quote": "This is exactly what we needed.",
                "author": "A happy customer",
            },
        },
        {
            "type": "faq",
            "props": {
                "items": [
                    {"q": "How does it work?", "a": "Set it up once and it runs itself."},
                    {"q": "Can I cancel anytime?", "a": "Yes, no lock-in."},
                ]
            },
        },
        {
            "type": "form",
            "props": {
                "fields": [
                    {"name": "email", "label": "Work email", "type": "email", "required": True},
                    {"name": "name", "label": "Full name", "type": "text", "required": False},
                ],
                "submit": cta,
            },
        },
        {"type": "cta", "props": {"headline": "Ready when you are", "cta": cta}},
    ]
    return {
        "blocks": blocks,
        "seo_title": headline[:60],
        "seo_description": (
            f"{headline} — {goal} landing page built for conversions."
        )[:155],
        "fallback": True,
    }


def _ensure_blocks(data: dict, brief: str, goal: str) -> dict:
    """Guarantee a valid ordered blocks array regardless of LLM output."""
    if not isinstance(data, dict) or data.get("_parse_error"):
        return _fallback_blocks(brief, goal)
    blocks = svc.render_blocks(data.get("blocks"))
    if not blocks:
        return _fallback_blocks(brief, goal)
    return {
        "blocks": blocks,
        "seo_title": (data.get("seo_title") or brief or "Landing page")[:60],
        "seo_description": (data.get("seo_description") or "")[:155],
        "fallback": False,
    }


async def generate_page(
    db: AsyncSession, ws_id: uuid.UUID, brief: str, goal: str
) -> dict:
    """Generate a complete ordered block array + SEO, grounded in brand voice."""
    brand = await _brand_context(db, ws_id)
    user = (
        f"Brand context (real): {brand}\n"
        f"Conversion goal: {goal}\n"
        f"Brief from the operator: {brief}\n\n"
        "Design a complete, high-converting landing page. Return STRICT JSON:\n"
        "{\n"
        '  "blocks": [ an ORDERED array of blocks, each {"type": one of '
        "hero|features|cta|form|testimonial|faq, \"props\": {...} } ],\n"
        '  "seo_title": "<=60 chars", "seo_description": "<=155 chars"\n'
        "}\n"
        "Include: a hero (headline, subhead, cta), a features block with 3 items "
        "(title+body), social proof (testimonial), an faq with 2-4 items, and a "
        "form block with sensible fields. Write in the brand voice."
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
    except Exception:  # noqa: BLE001 — never hard-fail the builder
        log.exception("generate_page LLM call failed; using fallback")
        return _fallback_blocks(brief, goal)
    return _ensure_blocks(data, brief, goal)


async def optimize_copy(
    db: AsyncSession, ws_id: uuid.UUID, page_id: uuid.UUID
) -> dict:
    """Suggest stronger headline / CTA variants from a page's existing blocks."""
    page = await svc.get_page(db, ws_id, page_id)
    if page is None:
        return {"error": "page_not_found", "variants": []}
    brand = await _brand_context(db, ws_id)
    rate = await svc.conversion_rate(db, ws_id, page)
    user = (
        f"Brand voice (real): {brand}\n"
        f"Current blocks: {page.blocks}\n"
        f"Current conversion rate: {rate}\n\n"
        "Propose stronger COPY variants to lift conversion. Return STRICT JSON:\n"
        '{ "headline_variants": ["..."], "cta_variants": ["..."], '
        '"rationale": "one short paragraph" }'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
    except Exception:  # noqa: BLE001
        log.exception("optimize_copy LLM call failed; using fallback")
        data = {"_parse_error": True}

    if not isinstance(data, dict) or data.get("_parse_error"):
        data = {
            "headline_variants": [
                f"{page.name}: the faster way to {page.name.lower()}",
                "Stop guessing. Start converting.",
            ],
            "cta_variants": ["Start free", "See it in action"],
            "rationale": "Lead with the outcome and use an action-first CTA.",
            "fallback": True,
        }
    data["page_id"] = str(page.id)
    data["current_conversion"] = rate
    return data


async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Autonomy loop: flag low-converting published pages + propose copy."""
    pages = await svc.list_pages(db, ws_id)
    published = [p for p in pages if p.status == "published"]
    flagged: list[dict] = []
    for page in published:
        rate = await svc.conversion_rate(db, ws_id, page)
        visits = await svc.page_visit_count(db, ws_id, page.id)
        # Only flag pages with enough traffic and a weak rate (real thresholds).
        if visits >= 20 and rate < 0.02:
            proposal = await optimize_copy(db, ws_id, page.id)
            flagged.append(
                {
                    "page_id": str(page.id),
                    "name": page.name,
                    "conversion": rate,
                    "visits": visits,
                    "proposal": proposal,
                }
            )
    return {
        "reviewed": len(published),
        "flagged": len(flagged),
        "items": flagged,
    }
