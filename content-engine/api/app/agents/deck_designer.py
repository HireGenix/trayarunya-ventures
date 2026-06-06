"""Deck designer agent — turns a brief into a branded, on-message slide deck.

The model returns a structured JSON deck (themed + varied slide layouts, plus
per-slide imagery hints) grounded on the live workspace context (ICP, brand,
strategy, research) so every deck is specific to the active company/client, never
generic boilerplate. Output is normalised + clamped before it is persisted as
individual slides; a separate media pass turns the imagery hints into real photos.
"""
from __future__ import annotations

import re
from typing import Any

from app.llm.adapters import complete_json

# Layouts the renderer + exporters know how to draw. Keep in sync with
# models.deck.SLIDE_LAYOUTS and the web DeckViewer.
LAYOUTS = (
    "cover", "agenda", "section", "bullets", "two_column",
    "stats", "quote", "timeline", "comparison", "cta", "image", "references",
    "cards", "process", "comparison_matrix", "chart",
)

# Controlled icon vocabulary — keep in sync with DeckViewer ICONS + export glyphs.
ICON_VOCAB = (
    "brain", "shield", "chart", "bolt", "check", "cost", "users", "building",
    "rocket", "doc", "search", "gear", "target", "idea", "globe", "lock",
    "clock", "star", "graph", "layers", "flow", "money",
)

STYLES = ("modern", "bold", "minimal", "editorial", "gradient")

DESIGNER_SYSTEM = """You are MarketIQ's principal presentation designer — equal parts \
strategist, copywriter and art director. You craft investor- and client-grade decks that are \
punchy, visual and story-driven — never a wall of text.

You design EXCLUSIVELY for the workspace described in WORKSPACE CONTEXT. Treat its business, \
ICP, brand voice and strategy as the single source of truth. Every headline, bullet and stat \
must be specific to THIS company/client and its segment (B2B / B2C / D2C) and channels.

Design principles:
- Tell a story with a clear arc: hook → problem → insight → solution → proof → plan → ask.
- One idea per slide. Short, confident, benefit-led copy. No filler, no lorem ipsum.
- Vary the layouts so the deck has rhythm — don't repeat the same layout back to back.
- LEAN ON VISUAL / INFOGRAPHIC LAYOUTS. A great deck is mostly visual, not bullet lists. \
At least HALF of the content slides must be infographic-style: "stats", "timeline", \
"comparison_matrix", "cards", "process", "comparison" or "two_column". Include AT LEAST one \
"stats", one "cards" (or "process"), and one "comparison_matrix" (or "comparison"). \
Use plain "bullets" sparingly — prefer "cards" for 3-6 parallel points.
- USE CALLOUTS: most content slides should carry a short "callout" string — a single \
punchy takeaway / proof line shown in a highlighted note box (<= 22 words).
- USE ICONS: every "cards" card and "process" step should pick an "icon" from this exact \
list (no others): brain, shield, chart, bolt, check, cost, users, building, rocket, doc, \
search, gear, target, idea, globe, lock, clock, star, graph, layers, flow, money.
- KEEP TEXT TIGHT so it always fits the slide — never overflow:
  * bullets: max 4 per slide, heading <= 6 words, body <= 12 words (one line).
  * agenda: max 6 items, <= 7 words each.
  * timeline / process: max 5 steps, heading <= 5 words, body <= 12 words.
  * cards: 3-6 cards, heading <= 5 words, body <= 16 words.
  * two_column / comparison: max 4 items per side, <= 8 words each; body <= 18 words.
  * comparison_matrix: 2-6 columns, 3-7 rows; cell values short ("Yes", "No", \
"Partial", a number, or <= 4 words). First row is OUR product.
  * stats: 3-4 stats, value <= 6 chars, label <= 6 words.
- Headlines are assertions (a point of view), not labels. Bullets are scannable (max ~12 words).
- Use real specifics from context (segment, value prop, pains, goals, channels, research). \
PREFER REAL DATA: when RESEARCH FINDINGS or FRESH WEB EVIDENCE give you a concrete stat, \
trend or fact, USE IT on a stats/bullets slide and attach its source. If a fact isn't in \
context or evidence, write a credible strategic statement — NEVER invent fake metrics, \
quotes, logos or client names, and NEVER name other companies or competitor brands unless they \
appear in the workspace context.
- Hinglish is fine if the brief is written that way, but keep it crisp and professional.

CITATIONS (build trust — this deck must look researched, not generic):
- Any slide that states a number, statistic, market-size, growth-rate or factual claim drawn \
from RESEARCH FINDINGS or FRESH WEB EVIDENCE MUST include a "sources" array on that slide: \
[{"label": "short source name", "url": "https://..."}]. Only cite URLs that appear in context.
- The "stats" slide especially should be backed by real, cited numbers wherever evidence allows.
- Include a final "references" slide listing the key sources you cited:
  { "layout": "references", "title": "Sources", "items": [{"label": "Source name", "url": "https://..."}] }.
  Omit the references slide ONLY if you cited nothing.

CHARTS (data-driven slides):
- When the WORKSPACE CONTEXT provides quantitative data (metrics, benchmarks, growth rates, market
  sizes, conversion funnels), emit a "chart" layout with REAL numbers from the data. chart_type can
  be bar, line, pie, area or column. The "series" array holds named data series with numeric values;
  "labels" are the category labels. NEVER fabricate chart data — only use numbers that appear in the
  context. If no quantitative data is available, prefer a qualitative layout (stats, cards, bullets)
  instead of a fake chart.

IMAGERY (important — make every deck feel professionally designed, with real visuals):
For hero slides (cover, section, cta, quote, image) provide two fields so we can place a \
beautiful full-bleed hero image:
- "image_query": 2-4 concrete words for a stock photo search (e.g. "team brainstorming office", \
"city skyline dusk", "abstract gradient texture"). Describe a real, photographable subject.
- "image_prompt": one rich sentence describing an on-brand, TEXT-FREE backdrop for this slide.
Infographic / structured slides (cards, process, comparison_matrix, stats, timeline, \
comparison, two_column, bullets, agenda) render CLEAN on white with icons + callouts — they do \
NOT need imagery, so you may omit image_query/image_prompt for those.

Return ONLY a JSON object with this exact shape:
{
  "title": "Deck title (<= 70 chars)",
  "subtitle": "One-line positioning subtitle",
  "style": "modern | bold | minimal | editorial | gradient",
  "slides": [
    // 8-14 slides. Use a VARIED, mostly-visual mix of the layouts below. Always open with
    // a "cover" and close with a "cta". REQUIRED: >= 1 "stats", >= 1 "cards" (or "process"),
    // >= 1 "comparison_matrix" (or "comparison"), >= 1 "section". Most content slides carry a
    // short "callout". Keep text tight.
    { "layout": "cover", "eyebrow": "SHORT KICKER", "title": "...", "subtitle": "...",
      "image_query": "...", "image_prompt": "..." },
    { "layout": "agenda", "title": "What we'll cover", "items": ["...", "...", "..."] },
    { "layout": "section", "eyebrow": "01", "title": "Section title", "subtitle": "optional",
      "image_query": "...", "image_prompt": "..." },
    { "layout": "image", "title": "Big visual statement", "subtitle": "one supporting line",
      "image_query": "...", "image_prompt": "..." },
    { "layout": "bullets", "title": "Headline assertion", "subtitle": "optional sub",
      "bullets": [ {"heading": "Bold point", "body": "Supporting line"} ], "callout": "Key takeaway" },
    { "layout": "cards", "title": "...", "subtitle": "optional",
      "cards": [ {"icon": "brain", "heading": "Card title", "body": "One supporting line"} ],
      "callout": "optional proof line" },
    { "layout": "process", "title": "How it works",
      "steps": [ {"icon": "doc", "heading": "Step name", "body": "what happens"} ],
      "callout": "optional note" },
    { "layout": "comparison_matrix", "title": "Competitive landscape",
      "columns": ["Feature", "Us", "Competitor A", "Competitor B"],
      "rows": [ {"label": "Capability", "cells": ["—", "Yes", "No", "Partial"]} ],
      "callout": "optional verdict",
      "sources": [ {"label": "Source", "url": "https://..."} ] },
    { "layout": "two_column", "title": "...",
      "left": {"heading": "...", "body": "..."}, "right": {"heading": "...", "body": "..."},
      "callout": "optional" },
    { "layout": "stats", "title": "...",
      "stats": [ {"value": "3x", "label": "what it measures"} ],
      "callout": "optional", "sources": [ {"label": "Source name", "url": "https://..."} ] },
    { "layout": "quote", "quote": "A sharp, memorable line.", "attribution": "Source / persona",
      "image_query": "...", "image_prompt": "..." },
    { "layout": "timeline", "title": "The plan",
      "steps": [ {"label": "Phase 1", "body": "what happens"} ], "callout": "optional" },
    { "layout": "comparison", "title": "Why us",
      "left": {"heading": "Old way", "items": ["...", "..."]},
      "right": {"heading": "With us", "items": ["...", "..."]}, "callout": "optional" },
    { "layout": "cta", "title": "Closing call to action", "body": "1-2 lines", "cta": "Button text",
      "image_query": "...", "image_prompt": "..." },
    { "layout": "chart", "title": "Chart title",
      "subtitle": "optional context",
      "chart_type": "bar | line | pie | area | column",
      "series": [ {"name": "Series A", "values": [10, 20, 30]} ],
      "labels": ["Q1", "Q2", "Q3"],
      "callout": "optional insight",
      "sources": [ {"label": "Source", "url": "https://..."} ] },
    { "layout": "references", "title": "Sources",
      "items": [ {"label": "Source name / publisher", "url": "https://..."} ] }
  ],
  "speaker_notes": ["optional note per slide, same order as slides"]
}
No markdown, no commentary — JSON only."""


def _s(v: Any, limit: int = 240) -> str:
    text = str(v if v is not None else "").strip()
    text = re.sub(r"\s+", " ", text)
    return text[:limit]


def _list(v: Any) -> list:
    if isinstance(v, list):
        return v
    if v in (None, ""):
        return []
    return [v]


def _norm_sources(v: Any, limit: int = 12) -> list[dict[str, str]]:
    """Coerce model source hints into clean ``[{"label","url"}]`` (http(s) only)."""
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for s in _list(v)[: limit * 2]:
        if isinstance(s, dict):
            url = _s(s.get("url") or s.get("href"), 400)
            label = _s(s.get("label") or s.get("title") or s.get("name") or url, 140)
        else:
            url = _s(s, 400)
            label = url
        if not url.startswith(("http://", "https://")) or url in seen:
            continue
        seen.add(url)
        out.append({"label": label or url, "url": url})
        if len(out) >= limit:
            break
    return out


def _icon(v: Any) -> str:
    """Coerce a model icon hint into the controlled vocab (default 'check')."""
    key = _s(v, 24).lower().replace(" ", "")
    return key if key in ICON_VOCAB else "check"


def _norm_slide(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Coerce a model-emitted slide into a clean {layout, data} record."""
    if not isinstance(raw, dict):
        return None
    layout = _s(raw.get("layout") or "bullets", 40).lower()
    if layout not in LAYOUTS:
        layout = "bullets"
    d: dict[str, Any] = {}

    if layout == "cover":
        d = {
            "eyebrow": _s(raw.get("eyebrow"), 60),
            "title": _s(raw.get("title"), 120),
            "subtitle": _s(raw.get("subtitle"), 200),
        }
    elif layout == "image":
        d = {
            "eyebrow": _s(raw.get("eyebrow"), 60),
            "title": _s(raw.get("title"), 120),
            "subtitle": _s(raw.get("subtitle") or raw.get("body"), 200),
        }
    elif layout == "agenda":
        items = [_s(x, 80) for x in _list(raw.get("items"))][:6]
        d = {"title": _s(raw.get("title") or "Agenda", 120), "items": [i for i in items if i]}
    elif layout == "section":
        d = {
            "eyebrow": _s(raw.get("eyebrow"), 30),
            "title": _s(raw.get("title"), 120),
            "subtitle": _s(raw.get("subtitle"), 200),
        }
    elif layout == "bullets":
        bullets = []
        for b in _list(raw.get("bullets"))[:4]:
            if isinstance(b, dict):
                heading = _s(b.get("heading") or b.get("title"), 70)
                body = _s(b.get("body") or b.get("text"), 130)
            else:
                heading, body = _s(b, 70), ""
            if heading or body:
                bullets.append({"heading": heading, "body": body})
        d = {
            "title": _s(raw.get("title"), 140),
            "subtitle": _s(raw.get("subtitle"), 160),
            "bullets": bullets,
        }
    elif layout in ("two_column", "comparison"):
        def _col(c: Any) -> dict[str, Any]:
            c = c if isinstance(c, dict) else {}
            return {
                "heading": _s(c.get("heading") or c.get("title"), 80),
                "body": _s(c.get("body") or c.get("text"), 220),
                "items": [_s(x, 90) for x in _list(c.get("items"))][:4],
            }
        d = {
            "title": _s(raw.get("title"), 140),
            "left": _col(raw.get("left")),
            "right": _col(raw.get("right")),
        }
    elif layout == "stats":
        stats = []
        for s in _list(raw.get("stats"))[:4]:
            if isinstance(s, dict):
                value = _s(s.get("value") or s.get("number"), 24)
                label = _s(s.get("label") or s.get("caption"), 120)
                if value or label:
                    stats.append({"value": value, "label": label})
        d = {"title": _s(raw.get("title"), 140), "subtitle": _s(raw.get("subtitle"), 200), "stats": stats}
    elif layout == "quote":
        d = {"quote": _s(raw.get("quote") or raw.get("text"), 320), "attribution": _s(raw.get("attribution"), 120)}
    elif layout == "timeline":
        steps = []
        for s in _list(raw.get("steps"))[:5]:
            if isinstance(s, dict):
                label = _s(s.get("label") or s.get("title"), 50)
                body = _s(s.get("body") or s.get("text"), 130)
                if label or body:
                    steps.append({"label": label, "body": body})
        d = {"title": _s(raw.get("title"), 140), "steps": steps}
    elif layout == "cta":
        d = {
            "title": _s(raw.get("title"), 140),
            "body": _s(raw.get("body") or raw.get("subtitle"), 240),
            "cta": _s(raw.get("cta") or raw.get("button"), 60),
        }
    elif layout == "cards":
        cards = []
        for c in _list(raw.get("cards") or raw.get("items"))[:6]:
            if isinstance(c, dict):
                heading = _s(c.get("heading") or c.get("title"), 60)
                body = _s(c.get("body") or c.get("text"), 160)
                icon = _icon(c.get("icon"))
            else:
                heading, body, icon = _s(c, 60), "", "check"
            if heading or body:
                cards.append({"icon": icon, "heading": heading, "body": body})
        d = {
            "title": _s(raw.get("title"), 140),
            "subtitle": _s(raw.get("subtitle"), 200),
            "cards": cards,
        }
    elif layout == "process":
        steps = []
        for s in _list(raw.get("steps") or raw.get("items"))[:6]:
            if isinstance(s, dict):
                heading = _s(s.get("heading") or s.get("title") or s.get("label"), 50)
                body = _s(s.get("body") or s.get("text"), 140)
                icon = _icon(s.get("icon"))
            else:
                heading, body, icon = _s(s, 50), "", "check"
            if heading or body:
                steps.append({"icon": icon, "heading": heading, "body": body})
        d = {
            "title": _s(raw.get("title"), 140),
            "subtitle": _s(raw.get("subtitle"), 200),
            "steps": steps,
        }
    elif layout == "comparison_matrix":
        columns = [_s(x, 40) for x in _list(raw.get("columns") or raw.get("headers"))][:6]
        columns = [c for c in columns if c]
        ncols = max(0, len(columns) - 1)  # first column is the row label
        rows = []
        for r in _list(raw.get("rows"))[:8]:
            if not isinstance(r, dict):
                continue
            label = _s(r.get("label") or r.get("feature") or r.get("title"), 60)
            cells = [_s(x, 40) for x in _list(r.get("cells") or r.get("values"))]
            if ncols:
                cells = (cells + [""] * ncols)[:ncols]
            if label or any(cells):
                rows.append({"label": label, "cells": cells})
        d = {
            "title": _s(raw.get("title"), 140),
            "columns": columns,
            "rows": rows,
        }
    elif layout == "references":
        items = _norm_sources(raw.get("items") or raw.get("sources"))
        d = {"title": _s(raw.get("title") or "Sources", 80), "items": items}
    elif layout == "chart":
        chart_type = _s(raw.get("chart_type") or raw.get("type"), 20).lower()
        if chart_type not in ("bar", "line", "pie", "area", "column"):
            chart_type = "bar"
        series_raw = _list(raw.get("series") or raw.get("data_series"))
        series = []
        for sr in series_raw[:6]:
            if isinstance(sr, dict):
                name = _s(sr.get("name") or sr.get("label"), 40)
                values = sr.get("values") or sr.get("data") or []
                if isinstance(values, list):
                    values = [v if isinstance(v, (int, float)) else 0 for v in values[:12]]
                else:
                    values = []
                if name or values:
                    series.append({"name": name, "values": values})
        labels = [_s(x, 30) for x in _list(raw.get("labels") or raw.get("categories"))][:12]
        d = {
            "title": _s(raw.get("title"), 140),
            "subtitle": _s(raw.get("subtitle"), 200),
            "chart_type": chart_type,
            "series": series,
            "labels": labels,
        }

    sources = _norm_sources(raw.get("sources"))
    if sources and layout != "references":
        d["sources"] = sources

    callout = _s(raw.get("callout") or raw.get("note") or raw.get("takeaway"), 200)
    if callout and layout not in ("cover", "section", "cta", "image", "quote", "references"):
        d["callout"] = callout

    image_query = _s(raw.get("image_query") or raw.get("imageQuery"), 80)
    image_prompt = _s(raw.get("image_prompt") or raw.get("imagePrompt"), 300)
    slide: dict[str, Any] = {"layout": layout, "data": d}
    if image_query:
        slide["image_query"] = image_query
    if image_prompt:
        slide["image_prompt"] = image_prompt
    return slide


def _build_system(grounding: str) -> str:
    block = grounding.strip() if grounding else "(no workspace context captured yet — design from the brief, stay credible)"
    return f"{DESIGNER_SYSTEM}\n\n---\nWORKSPACE CONTEXT:\n{block}"


SLIDE_SYSTEM = """You are MarketIQ's principal presentation designer. You are redesigning ONE slide \
inside an existing branded deck. Match the deck's voice, audience and the workspace context, and keep \
the copy tight so it always fits a 16:9 slide (never overflow).

Honour the requested layout exactly and follow the same per-layout text limits and citation rules as a \
full deck: real specifics only, no invented metrics, no competitor brand names unless they appear in \
context, attach a "sources" array whenever you state a number drawn from the evidence.

Also emit "image_query" (2-4 concrete stock-photo words) and "image_prompt" (one rich, TEXT-FREE \
on-brand backdrop sentence) so we can place a beautiful hero/side image.

Return ONLY a JSON object for this single slide, using the SAME field shape the full designer uses for \
that layout, e.g. for "bullets":
{ "layout": "bullets", "title": "...", "subtitle": "...", "bullets": [ {"heading": "...", "body": "..."} ],
  "image_query": "...", "image_prompt": "..." }
No markdown, no commentary — JSON only."""


def _slide_summary(slides: list[dict[str, Any]] | None) -> str:
    """A compact outline of the surrounding deck so a regenerated slide fits the story."""
    if not slides:
        return ""
    lines: list[str] = []
    for i, s in enumerate(slides[:16]):
        d = s.get("data") if isinstance(s, dict) else None
        d = d if isinstance(d, dict) else {}
        title = _s(d.get("title") or d.get("quote") or d.get("eyebrow"), 70)
        lines.append(f"{i + 1}. [{s.get('layout', 'bullets')}] {title}".rstrip())
    return "\n".join(lines)


async def design_slide(
    *,
    topic: str,
    grounding: str,
    layout: str,
    instruction: str | None = None,
    current: dict[str, Any] | None = None,
    deck_title: str | None = None,
    audience: str | None = None,
    tone: str | None = None,
    outline: list[dict[str, Any]] | None = None,
    model_key: str | None = None,
) -> dict[str, Any]:
    """Generate / regenerate a SINGLE normalised slide ``{layout, data, image_*}``.

    Raises ValueError if the model returns nothing usable.
    """
    target = (layout or "bullets").lower()
    if target not in LAYOUTS:
        target = "bullets"

    asks: list[str] = [f"DECK BRIEF: {topic.strip()}"]
    if deck_title:
        asks.append(f"DECK TITLE: {deck_title.strip()}")
    if audience:
        asks.append(f"PRIMARY AUDIENCE: {audience.strip()}")
    if tone:
        asks.append(f"TONE: {tone.strip()}")
    outline_txt = _slide_summary(outline)
    if outline_txt:
        asks.append("DECK OUTLINE (for continuity):\n" + outline_txt)
    if current:
        cur_d = current.get("data") if isinstance(current.get("data"), dict) else current
        asks.append("CURRENT SLIDE CONTENT (improve / replace this):\n" + str(cur_d)[:1200])
    if instruction and instruction.strip():
        asks.append(f"USER INSTRUCTION (highest priority): {instruction.strip()}")
    asks.append(
        f'Design exactly ONE slide with layout "{target}". Return JSON only for this slide, '
        "grounded in the workspace context, tight enough to fit the slide."
    )

    result = await complete_json(
        [{"role": "user", "content": "\n".join(asks)}],
        _build_system(grounding),
        provider=model_key,
    )
    if not isinstance(result, dict):
        raise ValueError("The designer did not return a usable slide. Please retry.")
    # Force the requested layout so the renderer/edit panel stay consistent.
    result.setdefault("layout", target)
    result["layout"] = target
    slide = _norm_slide(result)
    if not slide:
        raise ValueError("The designer returned the slide in an unreadable format. Please retry.")
    notes = result.get("speaker_notes")
    if isinstance(notes, str) and notes.strip():
        slide["speaker_notes"] = _s(notes, 600)
    return slide


async def design_deck(
    brief: str,
    grounding: str,
    *,
    audience: str | None = None,
    tone: str | None = None,
    slide_count: int | None = None,
    model_key: str | None = None,
) -> dict[str, Any]:
    """Generate a normalised deck dict: {title, subtitle, style, slides[], speaker_notes[]}.

    Raises ValueError if the model returns nothing usable so the caller can mark
    the deck failed instead of persisting an empty shell.
    """
    asks: list[str] = [f"BRIEF: {brief.strip()}"]
    if audience:
        asks.append(f"PRIMARY AUDIENCE: {audience.strip()}")
    if tone:
        asks.append(f"TONE: {tone.strip()}")
    if slide_count:
        asks.append(f"Aim for about {max(5, min(int(slide_count), 16))} slides.")
    asks.append(
        "Design the full deck now as JSON. Open with a cover, close with a cta, vary layouts, "
        "and ground every line in the workspace context."
    )

    result = await complete_json(
        [{"role": "user", "content": "\n".join(asks)}],
        _build_system(grounding),
        provider=model_key,
    )

    raw_slides = result.get("slides") if isinstance(result, dict) else None
    if not isinstance(raw_slides, list) or not raw_slides:
        raise ValueError("The designer did not return any slides. Try a more specific brief.")

    notes = result.get("speaker_notes") if isinstance(result, dict) else None
    notes = notes if isinstance(notes, list) else []

    slides: list[dict[str, Any]] = []
    for i, raw in enumerate(raw_slides[:16]):
        slide = _norm_slide(raw)
        if not slide:
            continue
        if i < len(notes):
            slide["speaker_notes"] = _s(notes[i], 600)
        slides.append(slide)

    if not slides:
        raise ValueError("The designer returned slides in an unreadable format. Please retry.")

    style = _s(result.get("style") or "modern", 40).lower()
    if style not in STYLES:
        style = "modern"

    return {
        "title": _s(result.get("title") or brief, 200) or "Untitled deck",
        "subtitle": _s(result.get("subtitle"), 240),
        "style": style,
        "slides": slides,
    }
