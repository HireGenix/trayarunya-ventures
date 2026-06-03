"""Creation Studio agent — generates execution-ready content grounded in the
workspace brand brain and (optionally) a strategy.

Supports social posts, threads, long-form blogs, newsletters, lead magnets and
ad copy. Returns structured items with title, body and per-platform variants.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any

from app.llm.adapters import Provider, _extract_json, complete

WRITER_SYSTEM = (
    "You are an elite content writer for a B2B/B2C/D2C marketing partner that treats "
    "the client's growth as its own. Write specific, original, high-signal content that "
    "matches the brand voice and drives the stated objective. No fluff, no clichés.\n\n"
    "You will be given: brand context, an optional strategy, the content type, target "
    "platform, and a topic. Produce the requested number of items.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "items": [\n'
    "    {\n"
    '      "title": "short internal title",\n'
    '      "body": "the full content, ready to publish",\n'
    '      "hook": "the scroll-stopping first line",\n'
    '      "hashtags": ["..."],\n'
    '      "cta": "the call to action",\n'
    '      "variants": {"linkedin": "...", "x": "..."}\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Rules by type — ALWAYS return the COMPLETE, ready-to-publish piece, never an "
    "outline or placeholder:\n"
    "- social_post: 120-220 words, 1 idea, strong hook, line breaks for skimming.\n"
    "- thread: 'body' is the full thread; 'variants.x' splits into numbered tweets.\n"
    "- blog: a FULL 800-1300 word article in markdown with a '# H1' title, 4-6 "
    "'## H2' sections, intro, body and a clear takeaway/CTA. No '[TODO]' or '...'.\n"
    "- newsletter: 'title' is the subject line; 'body' is the full issue in markdown "
    "with a greeting, 3-5 clearly-headed sections, and a sign-off CTA.\n"
    "- lead_magnet: the COMPLETE guide/checklist/template content (not just an outline) "
    "in markdown, organized into titled sections ready to drop into a PDF.\n"
    "- ad_copy: 3-5 headline/description pairs inside body, plus variants per platform.\n"
)


CAROUSEL_SYSTEM = (
    "You are an elite social carousel/document designer and copywriter. Given brand "
    "context, a topic and a target platform, write the COMPLETE copy for every slide "
    "of a cohesive multi-slide carousel (or PDF document). Each slide must carry real, "
    "specific, publish-ready copy — never placeholders.\n\n"
    "Structure: slide 1 is a scroll-stopping COVER (big title + one-line promise); the "
    "middle slides each deliver ONE concrete idea (a short punchy heading + 1-3 tight "
    "supporting lines); the final slide is a clear CALL-TO-ACTION.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "title": "internal title for the deck",\n'
    '  "caption": "the post caption to accompany the carousel",\n'
    '  "hashtags": ["..."],\n'
    '  "slides": [\n'
    "    {\n"
    '      "heading": "the on-slide headline (<= 8 words)",\n'
    '      "body": "1-3 short supporting lines for the slide",\n'
    '      "kind": "cover | point | cta"\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Produce exactly the requested number of slides."
)


def _ctx_block(brand: dict[str, Any] | None, strategy: dict[str, Any] | None) -> str:
    parts: list[str] = []
    if brand:
        parts.append(
            "BRAND:\n"
            + json.dumps(
                {
                    "mission": brand.get("mission"),
                    "value_prop": brand.get("value_prop"),
                    "voice": brand.get("voice"),
                    "audience": brand.get("audience"),
                    "pillars": brand.get("pillars"),
                    "keywords": brand.get("keywords"),
                },
                ensure_ascii=False,
            )[:8000]
        )
    if strategy:
        parts.append(
            "STRATEGY:\n"
            + json.dumps(
                {
                    "positioning": strategy.get("positioning"),
                    "pillars": strategy.get("pillars"),
                    "funnel": strategy.get("funnel"),
                },
                ensure_ascii=False,
            )[:6000]
        )
    return "\n\n".join(parts) or "No brand context yet; infer a credible B2B voice."


async def generate_content(
    *,
    content_type: str,
    topic: str,
    platform: str | None,
    count: int,
    notes: str | None,
    brand: dict[str, Any] | None,
    strategy: dict[str, Any] | None,
    provider: Provider | None = None,
    scheduled_date: str | None = None,
) -> list[dict[str, Any]]:
    today = date.today()
    date_line = f"TODAY'S DATE: {today.isoformat()} ({today.strftime('%A, %d %B %Y')})\n"
    if scheduled_date:
        date_line += f"PUBLISH DATE: {scheduled_date}\n"
    prompt = (
        f"{date_line}"
        f"{_ctx_block(brand, strategy)}\n\n"
        f"CONTENT TYPE: {content_type}\n"
        f"PLATFORM: {platform or 'general'}\n"
        f"TOPIC: {topic}\n"
        f"NUMBER OF ITEMS: {count}\n"
        f"NOTES: {notes or 'none'}\n"
    )
    raw = await complete([{"role": "user", "content": prompt}], WRITER_SYSTEM, provider)
    try:
        data = json.loads(_extract_json(raw))
        items = data.get("items")
        if not isinstance(items, list):
            # Some models return the items directly as a list at root level.
            items = data if isinstance(data, list) else None
        if isinstance(items, list) and items:
            return items[:count]
    except (json.JSONDecodeError, AttributeError, TypeError):
        pass
    # Fallback: wrap the raw text as a single item so the call always yields content.
    return [{"title": (topic or "Content")[:80], "body": raw, "variants": {}}]


def _fallback_slides(topic: str, body: str, count: int) -> list[dict[str, Any]]:
    """Best-effort slide split when the model doesn't return clean JSON."""
    blocks = [b.strip() for b in (body or "").split("\n\n") if b.strip()]
    slides: list[dict[str, Any]] = [
        {"heading": (topic or "Content")[:60], "body": (body or topic or "")[:160], "kind": "cover"}
    ]
    for block in blocks[: max(1, count - 2)]:
        lines = block.split("\n")
        heading = lines[0].lstrip("#-• ").strip()[:60]
        rest = "\n".join(lines[1:]).strip() or heading
        slides.append({"heading": heading, "body": rest[:200], "kind": "point"})
    slides.append(
        {"heading": "Ready to grow?", "body": "Let's build your marketing strategy.", "kind": "cta"}
    )
    return slides[:count]


async def generate_carousel_slides(
    *,
    topic: str,
    platform: str | None,
    slides: int,
    notes: str | None,
    brand: dict[str, Any] | None,
    strategy: dict[str, Any] | None,
    provider: Provider | None = None,
    fmt: str = "carousel",
) -> dict[str, Any]:
    """Generate complete per-slide copy for a carousel / PDF document.

    Returns ``{"title", "caption", "hashtags", "slides": [{heading, body, kind}]}``.
    Always returns at least one usable slide (falls back to a heuristic split).
    """
    slides = max(2, min(slides, 10))
    doc_word = "PDF document" if fmt == "pdf" else "carousel"
    prompt = (
        f"{_ctx_block(brand, strategy)}\n\n"
        f"FORMAT: {doc_word}\n"
        f"PLATFORM: {platform or 'general'}\n"
        f"TOPIC: {topic}\n"
        f"NUMBER OF SLIDES: {slides}\n"
        f"NOTES: {notes or 'none'}\n"
    )
    raw = await complete([{"role": "user", "content": prompt}], CAROUSEL_SYSTEM, provider)
    try:
        data = json.loads(_extract_json(raw))
        out_slides = data.get("slides")
        if isinstance(out_slides, list) and out_slides:
            clean = [
                {
                    "heading": str(s.get("heading", "")).strip(),
                    "body": str(s.get("body", "")).strip(),
                    "kind": s.get("kind") or ("cover" if i == 0 else "point"),
                }
                for i, s in enumerate(out_slides)
                if isinstance(s, dict)
            ][:slides]
            if clean:
                return {
                    "title": data.get("title") or topic[:80],
                    "caption": data.get("caption"),
                    "hashtags": data.get("hashtags") or [],
                    "slides": clean,
                }
    except (json.JSONDecodeError, AttributeError, TypeError):
        pass
    return {
        "title": (topic or "Content")[:80],
        "caption": None,
        "hashtags": [],
        "slides": _fallback_slides(topic, raw, slides),
    }
