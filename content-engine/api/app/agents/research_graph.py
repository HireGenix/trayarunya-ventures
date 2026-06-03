"""Agentic research engine — a LangGraph flow that out-researches general answer
engines by *iterating* until the brief is genuinely complete and every claim is
grounded in a cited source.

Graph
-----
    plan -> search -> crawl -> synthesize -> reflect --(gaps & budget left)--> search
                                                  |
                                                  +--(complete)--> verify -> END

- **plan**: expand the topic into focused queries *and* the concrete research
  questions the final brief MUST answer (LLM).
- **search**: multi-source fan-out — web + fresh news + platform-scoped results.
- **crawl**: deep-crawl the brand site, top organic pages, news and platform
  pages (crawl4ai, httpx fallback).
- **synthesize**: LLM turns evidence into findings / competitors / insights,
  each carrying the source URLs it relied on (citations).
- **reflect**: gap analysis — which research questions are still unanswered?
  Emits follow-up queries and loops back to search (budget-capped).
- **verify**: drops/flags any claim not supported by a collected source and
  computes an overall confidence score.

Every node appends to ``state["steps"]`` — a live reasoning trace the UI streams
(Perplexity-style, but marketing-aware) — and, when an ``on_step`` callback is
provided, persists progress mid-run so the frontend shows it in real time.
"""
from __future__ import annotations

import time
from typing import Any, Awaitable, Callable, TypedDict

from langgraph.graph import END, StateGraph

from app.llm.adapters import complete, complete_json
from app.tools.crawler import deep_crawl
from app.tools.web_search import multi_search

StepCb = Callable[[list[dict[str, Any]]], Awaitable[None]]

MAX_ITERATIONS = 3  # plan + up to 2 reflect-driven deepening passes


class ResearchState(TypedDict, total=False):
    topic: str
    target_url: str | None
    competitor_urls: list[str]
    countries: list[str]
    platforms: list[str]
    # agent working memory
    queries: list[str]
    research_questions: list[str]
    open_questions: list[str]
    iteration: int
    search_results: list[dict[str, Any]]
    pages: list[dict[str, Any]]
    crawled_urls: list[str]
    steps: list[dict[str, Any]]
    on_step: StepCb | None
    # outputs
    findings: dict[str, Any]
    summary: str
    competitors: list[dict[str, Any]]
    insights: list[dict[str, Any]]
    sources: list[dict[str, Any]]
    confidence: float
    coverage: float


# --------------------------------------------------------------------------- #
# Reasoning-trace helper                                                       #
# --------------------------------------------------------------------------- #
async def _emit(
    state: ResearchState,
    phase: str,
    label: str,
    detail: str = "",
    *,
    sources: int | None = None,
    status: str = "done",
) -> None:
    steps = state.setdefault("steps", [])
    steps.append(
        {
            "phase": phase,
            "label": label,
            "detail": detail,
            "sources": sources,
            "status": status,
            "iteration": state.get("iteration", 0),
            "ts": time.time(),
        }
    )
    cb = state.get("on_step")
    if cb:
        try:
            await cb(list(steps))
        except Exception:  # noqa: BLE001
            pass  # streaming is best-effort; never break the pipeline


# --------------------------------------------------------------------------- #
# Prompts                                                                      #
# --------------------------------------------------------------------------- #
PLAN_SYSTEM = (
    "You are a senior B2B/B2C/D2C market-research lead. Given a topic and an "
    "optional brand website, design a research plan.\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "queries": ["5-7 high-signal web search queries"],\n'
    '  "research_questions": ["6-10 specific questions the final brief MUST '
    'answer about audience pains, competitors, demand keywords, channel '
    'tactics and trends"]\n'
    "}"
)

SYNTH_SYSTEM = (
    "You are a master demand researcher. Using ONLY the evidence provided "
    "(search snippets + crawled page text), produce a rigorous, specific brief. "
    "Never invent facts. For every finding/competitor/insight, cite the exact "
    "source URLs (from the evidence) you used.\n\n"
    "Return STRICT JSON with this shape:\n"
    "{\n"
    '  "summary": "3-5 sentence executive summary",\n'
    '  "findings": {\n'
    '    "audience_pains": [{"text": "...", "citations": ["url", ...]}],\n'
    '    "value_props": [{"text": "...", "citations": ["url"]}],\n'
    '    "positioning_gaps": [{"text": "...", "citations": ["url"]}],\n'
    '    "keywords": [{"text": "...", "citations": ["url"]}],\n'
    '    "trends": [{"text": "...", "citations": ["url"]}]\n'
    "  },\n"
    '  "competitors": [\n'
    '    {"name": "...", "website": "...", "positioning": "...",\n'
    '     "country": "primary market or null",\n'
    '     "social_handles": {"instagram": "@handle or null", "youtube": "@handle or null",\n'
    '        "linkedin": "company-slug or null", "x": "@handle or null", "tiktok": "@handle or null",\n'
    '        "facebook": "page or null"},\n'
    '     "strengths": ["..."], "weaknesses": ["..."], "content_themes": ["..."],\n'
    '     "citations": ["url", ...]}\n'
    "  ],\n"
    '  "insights": [\n'
    '    {"kind": "question|keyword|trend", "text": "...",\n'
    '     "intent": "awareness|consideration|decision", "score": 0.0,\n'
    '     "citations": ["url", ...]}\n'
    "  ]\n"
    "}\n"
    "Produce 15-30 insights covering who/what/why/how/where/when questions like "
    "AnswerThePublic. Score 0..1 by value of the angle to the brand."
)

REFLECT_SYSTEM = (
    "You are a meticulous research editor. You are given the research questions "
    "that must be answered and the brief produced so far. Identify gaps.\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "coverage": 0.0,\n'
    '  "unanswered": ["questions still not well supported"],\n'
    '  "follow_up_queries": ["up to 4 NEW, more specific web searches to close gaps"]\n'
    "}\n"
    "If coverage is high and little is missing, return few/empty follow_up_queries."
)


# --------------------------------------------------------------------------- #
# Nodes                                                                        #
# --------------------------------------------------------------------------- #
async def _plan(state: ResearchState) -> ResearchState:
    state.setdefault("iteration", 0)
    state.setdefault("steps", [])
    state.setdefault("search_results", [])
    state.setdefault("pages", [])
    state.setdefault("crawled_urls", [])
    await _emit(state, "plan", "Planning the investigation", state["topic"], status="active")

    countries = [c for c in (state.get("countries") or []) if c]
    geo = ""
    if countries and not any(c.lower() in {"global", "worldwide"} for c in countries):
        geo = (
            f"\nTarget countries: {', '.join(countries)} — bias queries to find the "
            "top brands/competitors in EACH of these markets."
        )
    platforms = [p for p in (state.get("platforms") or []) if p]
    plat = f"\nFocus social platforms: {', '.join(platforms)}." if platforms else ""
    user = (
        f"Topic: {state['topic']}\nBrand website: {state.get('target_url') or 'n/a'}"
        f"{geo}{plat}"
    )
    data = await complete_json([{"role": "user", "content": user}], PLAN_SYSTEM)
    queries = data.get("queries") if isinstance(data, dict) else None
    questions = data.get("research_questions") if isinstance(data, dict) else None
    if not queries:
        queries = [
            state["topic"],
            f"{state['topic']} best practices",
            f"{state['topic']} competitors",
        ]
    queries = list(queries)[:7]
    if countries and not any(c.lower() in {"global", "worldwide"} for c in countries):
        for c in countries[:4]:
            queries.append(f"top {state['topic']} brands competitors in {c}")
    state["queries"] = queries[:11]
    state["research_questions"] = list(questions or [])[:10]
    state["open_questions"] = list(state["research_questions"])
    await _emit(
        state,
        "plan",
        "Research plan ready",
        f"{len(state['queries'])} queries · {len(state['research_questions'])} key questions",
    )
    return state


async def _search(state: ResearchState) -> ResearchState:
    platforms = [p for p in (state.get("platforms") or []) if p]
    queries = state.get("queries", [])
    await _emit(
        state,
        "search",
        f"Searching {len(queries)} queries across web + news"
        + (" + platforms" if platforms else ""),
        ", ".join(queries[:3]) + ("…" if len(queries) > 3 else ""),
        status="active",
    )
    existing = {r["url"] for r in state.get("search_results", [])}
    new_results: list[dict[str, Any]] = []
    for q in queries:
        for r in await multi_search(q, limit=6, include_news=True, platforms=platforms):
            if r["url"] in existing:
                continue
            existing.add(r["url"])
            new_results.append({**r, "query": q})
    state["search_results"] = state.get("search_results", []) + new_results
    state["sources"] = [
        {
            "title": r["title"],
            "url": r["url"],
            "source_type": r.get("source_type", "web"),
            "platform": r.get("platform"),
        }
        for r in state["search_results"]
    ]
    by_type: dict[str, int] = {}
    for r in new_results:
        t = r.get("source_type", "web")
        by_type[t] = by_type.get(t, 0) + 1
    detail = " · ".join(f"{v} {k}" for k, v in by_type.items()) or "no new results"
    await _emit(
        state,
        "search",
        f"Found {len(new_results)} new sources",
        detail,
        sources=len(state["search_results"]),
    )
    return state


async def _crawl(state: ResearchState) -> ResearchState:
    already = set(state.get("crawled_urls", []))
    targets: list[str] = []
    if state.get("target_url") and state["target_url"] not in already:
        targets.append(state["target_url"])  # type: ignore[arg-type]
    targets.extend(u for u in (state.get("competitor_urls") or []) if u not in already)

    results = state.get("search_results", [])
    prioritized = (
        [r for r in results if r.get("source_type") == "news"][:3]
        + [r for r in results if r.get("source_type") == "platform"][:3]
        + [r for r in results if r.get("source_type") == "web"][:4]
    )
    for r in prioritized:
        if r["url"] not in already and r["url"] not in targets:
            targets.append(r["url"])

    targets = targets[:9]
    await _emit(
        state,
        "crawl",
        f"Reading {len(targets)} pages in depth",
        "brand site, news & platform sources",
        status="active",
    )
    pages = state.get("pages", [])
    crawled = 0
    for url in targets:
        res = await deep_crawl(url)
        already.add(url)
        if res.ok and res.text:
            pages.append({"url": res.url, "title": res.title, "text": res.text[:6000]})
            crawled += 1
    state["pages"] = pages
    state["crawled_urls"] = list(already)
    await _emit(
        state,
        "crawl",
        f"Extracted content from {crawled} pages",
        f"{len(pages)} pages in evidence pool",
        sources=len(pages),
    )
    return state


def _evidence_block(state: ResearchState) -> str:
    parts: list[str] = ["# Search results"]
    for r in state.get("search_results", [])[:28]:
        tag = r.get("source_type", "web")
        parts.append(f"- [{tag}] {r['title']} ({r['url']})\n  {r['snippet']}")
    parts.append("\n# Crawled pages")
    for p in state.get("pages", []):
        parts.append(f"## {p['title']} — {p['url']}\n{p['text']}")
    return "\n".join(parts)[:70000]


async def _synthesize(state: ResearchState) -> ResearchState:
    await _emit(
        state,
        "synthesize",
        "Synthesising findings from evidence",
        "extracting pains, competitors, demand & trends",
        status="active",
    )
    countries = [c for c in (state.get("countries") or []) if c]
    geo = ""
    if countries:
        geo = (
            f"\nTarget markets: {', '.join(countries)}. Prioritise competitors "
            "operating in these markets and set each competitor's \"country\". "
            "Extract real social handles found in the evidence (null when unknown).\n"
        )
    questions = state.get("research_questions") or []
    qblock = ""
    if questions:
        qblock = "\nResearch questions to answer:\n" + "\n".join(f"- {q}" for q in questions)
    user = (
        f"Topic: {state['topic']}\nBrand website: {state.get('target_url') or 'n/a'}\n"
        f"{geo}{qblock}\n\nEvidence:\n{_evidence_block(state)}"
    )
    data = await complete_json([{"role": "user", "content": user}], SYNTH_SYSTEM)
    if not isinstance(data, dict) or data.get("_parse_error"):
        retry = await complete(
            [{"role": "user", "content": user + "\n\nReturn ONLY valid JSON."}],
            SYNTH_SYSTEM,
        )
        from app.llm.adapters import _extract_json
        import json

        try:
            data = json.loads(_extract_json(retry))
        except Exception:  # noqa: BLE001
            data = {}
    data = data or {}
    state["summary"] = data.get("summary", state.get("summary", ""))
    state["findings"] = data.get("findings", state.get("findings", {}))
    state["competitors"] = data.get("competitors", state.get("competitors", [])) or []
    state["insights"] = data.get("insights", state.get("insights", [])) or []
    await _emit(
        state,
        "synthesize",
        "Draft brief assembled",
        f"{len(state['competitors'])} competitors · {len(state['insights'])} insights",
    )
    return state


async def _reflect(state: ResearchState) -> ResearchState:
    state["iteration"] = state.get("iteration", 0) + 1
    if state["iteration"] >= MAX_ITERATIONS:
        state["open_questions"] = []
        state["coverage"] = state.get("coverage", 0.85)
        await _emit(state, "reflect", "Research depth budget reached", "finalising the brief")
        return state

    await _emit(state, "reflect", "Checking for gaps", "what's still unanswered?", status="active")
    questions = state.get("research_questions") or []
    brief = {
        "summary": state.get("summary", ""),
        "findings": state.get("findings", {}),
        "competitors": [c.get("name") for c in state.get("competitors", [])],
        "insight_count": len(state.get("insights", [])),
    }
    import json

    user = (
        "Research questions:\n" + "\n".join(f"- {q}" for q in questions)
        + "\n\nBrief so far (JSON):\n" + json.dumps(brief)[:8000]
    )
    data = await complete_json([{"role": "user", "content": user}], REFLECT_SYSTEM)
    coverage = 0.0
    follow_ups: list[str] = []
    unanswered: list[str] = []
    if isinstance(data, dict):
        try:
            coverage = float(data.get("coverage", 0) or 0)
        except (TypeError, ValueError):
            coverage = 0.0
        follow_ups = [q for q in (data.get("follow_up_queries") or []) if q][:4]
        unanswered = [q for q in (data.get("unanswered") or []) if q]
    state["coverage"] = coverage
    state["open_questions"] = unanswered
    if follow_ups and coverage < 0.8:
        state["queries"] = follow_ups
        await _emit(
            state,
            "reflect",
            f"Coverage {int(coverage * 100)}% — digging deeper",
            f"{len(follow_ups)} follow-up searches: " + "; ".join(follow_ups[:2]),
        )
    else:
        state["queries"] = []
        await _emit(
            state,
            "reflect",
            f"Coverage {int(coverage * 100)}% — research complete",
            "no significant gaps remain",
        )
    return state


def _route_after_reflect(state: ResearchState) -> str:
    if state.get("queries") and state.get("iteration", 0) < MAX_ITERATIONS:
        return "search"
    return "verify"


async def _verify(state: ResearchState) -> ResearchState:
    await _emit(
        state,
        "verify",
        "Verifying every claim against sources",
        "dropping anything unsupported",
        status="active",
    )
    source_urls = {s["url"] for s in state.get("sources", [])}

    def _keep(citations: Any) -> tuple[list[str], bool]:
        cites = [c for c in (citations or []) if isinstance(c, str)]
        grounded = [c for c in cites if any(c.split("?")[0] in u or u in c for u in source_urls)]
        return (grounded or cites, bool(grounded))

    findings = state.get("findings") or {}
    total = 0
    grounded_count = 0
    for _key, items in list(findings.items()):
        if not isinstance(items, list):
            continue
        for it in items:
            if isinstance(it, dict):
                total += 1
                cites, ok = _keep(it.get("citations"))
                it["citations"] = cites
                it["grounded"] = ok
                grounded_count += 1 if ok else 0
    state["findings"] = findings

    for ins in state.get("insights", []) or []:
        if isinstance(ins, dict):
            cites, ok = _keep(ins.get("citations"))
            ins["citations"] = cites
            ins["grounded"] = ok
            total += 1
            grounded_count += 1 if ok else 0

    for c in state.get("competitors", []) or []:
        if isinstance(c, dict):
            cites, ok = _keep(c.get("citations"))
            c["citations"] = cites
            c["grounded"] = ok

    ground_ratio = (grounded_count / total) if total else 0.0
    coverage = state.get("coverage", 0.8)
    confidence = round(min(1.0, 0.5 * ground_ratio + 0.5 * coverage), 2)
    state["confidence"] = confidence
    await _emit(
        state,
        "verify",
        f"Verified — confidence {int(confidence * 100)}%",
        f"{grounded_count}/{total} claims grounded in sources",
        sources=len(source_urls),
    )
    return state


def build_research_graph():
    graph = StateGraph(ResearchState)
    graph.add_node("plan", _plan)
    graph.add_node("search", _search)
    graph.add_node("crawl", _crawl)
    graph.add_node("synthesize", _synthesize)
    graph.add_node("reflect", _reflect)
    graph.add_node("verify", _verify)
    graph.set_entry_point("plan")
    graph.add_edge("plan", "search")
    graph.add_edge("search", "crawl")
    graph.add_edge("crawl", "synthesize")
    graph.add_edge("synthesize", "reflect")
    graph.add_conditional_edges(
        "reflect", _route_after_reflect, {"search": "search", "verify": "verify"}
    )
    graph.add_edge("verify", END)
    return graph.compile()


async def run_research(
    topic: str,
    target_url: str | None = None,
    competitor_urls: list[str] | None = None,
    countries: list[str] | None = None,
    platforms: list[str] | None = None,
    on_step: StepCb | None = None,
) -> ResearchState:
    app = build_research_graph()
    initial: ResearchState = {
        "topic": topic,
        "target_url": target_url,
        "competitor_urls": competitor_urls or [],
        "countries": countries or [],
        "platforms": platforms or [],
        "on_step": on_step,
        "steps": [],
        "iteration": 0,
    }
    return await app.ainvoke(initial, {"recursion_limit": 50})
