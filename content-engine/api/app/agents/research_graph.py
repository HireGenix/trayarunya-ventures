"""Research agent — a LangGraph flow that grounds strategy in real web data.

Graph
-----
    plan -> search -> crawl -> synthesize -> END

- **plan**: expand the topic into focused search queries (LLM).
- **search**: DuckDuckGo for each query (free, no key).
- **crawl**: deep-crawl the target site + top result pages (crawl4ai).
- **synthesize**: LLM turns raw evidence into structured findings, competitor
  profiles and AnswerThePublic-style audience insights — strictly as JSON.

The flow returns a dict the API layer persists into research_jobs / competitors /
insights tables.
"""
from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.llm.adapters import complete, complete_json
from app.tools.crawler import deep_crawl
from app.tools.web_search import web_search


class ResearchState(TypedDict, total=False):
    topic: str
    target_url: str | None
    competitor_urls: list[str]
    countries: list[str]
    platforms: list[str]
    queries: list[str]
    search_results: list[dict[str, Any]]
    pages: list[dict[str, Any]]
    findings: dict[str, Any]
    summary: str
    competitors: list[dict[str, Any]]
    insights: list[dict[str, Any]]
    sources: list[dict[str, Any]]


PLAN_SYSTEM = (
    "You are a senior B2B market researcher. Given a topic and an optional brand "
    "website, produce 5-7 high-signal web search queries that uncover the audience's "
    "pains, the competitive landscape, demand keywords, and trending angles. "
    'Respond as JSON: {"queries": ["...", ...]}.'
)

SYNTH_SYSTEM = (
    "You are a master B2B content strategist and demand researcher. Using ONLY the "
    "evidence provided (search snippets + crawled page text), produce a rigorous, "
    "specific research brief. Never invent facts; cite source URLs you used.\n\n"
    "Return STRICT JSON with this shape:\n"
    "{\n"
    '  "summary": "3-5 sentence executive summary",\n'
    '  "findings": {\n'
    '    "audience_pains": ["..."],\n'
    '    "value_props": ["..."],\n'
    '    "positioning_gaps": ["..."],\n'
    '    "keywords": ["..."],\n'
    '    "trends": ["..."]\n'
    "  },\n"
    '  "competitors": [\n'
    '    {"name": "...", "website": "...", "positioning": "...",\n'
    '     "country": "the country this brand primarily competes in (or null)",\n'
    '     "social_handles": {"instagram": "@handle or null", "youtube": "@handle or null",\n'
    '        "linkedin": "company-slug or null", "x": "@handle or null", "tiktok": "@handle or null",\n'
    '        "facebook": "page or null"},\n'
    '     "strengths": ["..."], "weaknesses": ["..."], "content_themes": ["..."]}\n'
    "  ],\n"
    '  "insights": [\n'
    '    {"kind": "question|keyword|trend", "text": "...",\n'
    '     "intent": "awareness|consideration|decision", "score": 0.0}\n'
    "  ]\n"
    "}\n"
    "Produce 15-30 insights covering who/what/why/how/where/when questions like "
    "AnswerThePublic. Score 0..1 by how valuable the angle is for the brand."
)


async def _plan(state: ResearchState) -> ResearchState:
    countries = [c for c in (state.get("countries") or []) if c]
    geo = ""
    if countries and not any(c.lower() in {"global", "worldwide"} for c in countries):
        geo = f"\nTarget countries: {', '.join(countries)} — bias queries to find the top brands/competitors in EACH of these markets."
    platforms = [p for p in (state.get("platforms") or []) if p]
    plat = f"\nFocus social platforms: {', '.join(platforms)}." if platforms else ""
    user = (
        f"Topic: {state['topic']}\nBrand website: {state.get('target_url') or 'n/a'}"
        f"{geo}{plat}"
    )
    data = await complete_json([{"role": "user", "content": user}], PLAN_SYSTEM)
    queries = data.get("queries") if isinstance(data, dict) else None
    if not queries:
        queries = [state["topic"], f"{state['topic']} best practices", f"{state['topic']} competitors"]
    queries = list(queries)[:7]
    # Ensure each target country gets an explicit competitor-discovery query.
    if countries and not any(c.lower() in {"global", "worldwide"} for c in countries):
        for c in countries[:4]:
            queries.append(f"top {state['topic']} brands competitors in {c}")
    state["queries"] = queries[:11]
    return state


async def _search(state: ResearchState) -> ResearchState:
    seen: set[str] = set()
    results: list[dict[str, Any]] = []
    for q in state.get("queries", []):
        for r in await web_search(q, limit=6):
            if r.url in seen:
                continue
            seen.add(r.url)
            results.append({**r.to_dict(), "query": q})
    state["search_results"] = results
    state["sources"] = [{"title": r["title"], "url": r["url"]} for r in results]
    return state


async def _crawl(state: ResearchState) -> ResearchState:
    targets: list[str] = []
    if state.get("target_url"):
        targets.append(state["target_url"])  # type: ignore[arg-type]
    targets.extend(state.get("competitor_urls", []) or [])
    # Add the top few organic result URLs.
    for r in state.get("search_results", [])[:5]:
        if r["url"] not in targets:
            targets.append(r["url"])

    pages: list[dict[str, Any]] = []
    for url in targets[:8]:
        res = await deep_crawl(url)
        if res.ok and res.text:
            pages.append({"url": res.url, "title": res.title, "text": res.text[:6000]})
    state["pages"] = pages
    return state


def _evidence_block(state: ResearchState) -> str:
    parts: list[str] = ["# Search results"]
    for r in state.get("search_results", [])[:20]:
        parts.append(f"- {r['title']} ({r['url']})\n  {r['snippet']}")
    parts.append("\n# Crawled pages")
    for p in state.get("pages", []):
        parts.append(f"## {p['title']} — {p['url']}\n{p['text']}")
    return "\n".join(parts)[:60000]


async def _synthesize(state: ResearchState) -> ResearchState:
    countries = [c for c in (state.get("countries") or []) if c]
    geo = ""
    if countries:
        geo = (
            f"\nTarget markets: {', '.join(countries)}. Prioritise competitors operating in "
            "these markets and set each competitor's \"country\". Extract real social handles "
            "you can find in the evidence (do not invent them; use null when unknown).\n"
        )
    user = (
        f"Topic: {state['topic']}\nBrand website: {state.get('target_url') or 'n/a'}\n{geo}\n"
        f"Evidence:\n{_evidence_block(state)}"
    )
    data = await complete_json([{"role": "user", "content": user}], SYNTH_SYSTEM)
    if not isinstance(data, dict) or data.get("_parse_error"):
        # One retry with an explicit reminder.
        retry = await complete(
            [{"role": "user", "content": user + "\n\nReturn ONLY valid JSON."}],
            SYNTH_SYSTEM,
        )
        from app.llm.adapters import _extract_json  # local import to avoid cycle
        import json

        try:
            data = json.loads(_extract_json(retry))
        except Exception:
            data = {}
    state["summary"] = (data or {}).get("summary", "")
    state["findings"] = (data or {}).get("findings", {})
    state["competitors"] = (data or {}).get("competitors", [])
    state["insights"] = (data or {}).get("insights", [])
    return state


def build_research_graph():
    graph = StateGraph(ResearchState)
    graph.add_node("plan", _plan)
    graph.add_node("search", _search)
    graph.add_node("crawl", _crawl)
    graph.add_node("synthesize", _synthesize)
    graph.set_entry_point("plan")
    graph.add_edge("plan", "search")
    graph.add_edge("search", "crawl")
    graph.add_edge("crawl", "synthesize")
    graph.add_edge("synthesize", END)
    return graph.compile()


async def run_research(
    topic: str,
    target_url: str | None = None,
    competitor_urls: list[str] | None = None,
    countries: list[str] | None = None,
    platforms: list[str] | None = None,
) -> ResearchState:
    app = build_research_graph()
    initial: ResearchState = {
        "topic": topic,
        "target_url": target_url,
        "competitor_urls": competitor_urls or [],
        "countries": countries or [],
        "platforms": platforms or [],
    }
    return await app.ainvoke(initial)
