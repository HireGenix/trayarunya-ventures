"""ICP discovery chat agent.

Mirrors the marketing-site contact-page chat, but server-side and provider
agnostic (works across Responses / Anthropic / chat-completions models via the
unified ``complete`` adapter). Instead of provider-native function calling we use
a small JSON protocol: every turn the model returns

    {
      "say":    "<assistant reply to the user>",
      "icp":    { ...partial ICP fields to merge... },
      "search": ["web query", ...],   # optional research requests
      "scrape": ["https://...", ...], # optional page fetches
      "done":   false                  # true when the profile is solid
    }

The server executes any ``search``/``scrape`` requests, feeds the results back
as a synthetic tool message and re-calls the model until it stops asking for
research (or a round cap is hit). This keeps the chat grounded in real web data
the same way the research stack is.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.llm.adapters import complete
from app.services import icp_service
from app.tools.crawler import deep_crawl_many
from app.tools.web_search import multi_search

logger = logging.getLogger("icp.chat")

_MAX_ROUNDS = 4
_ICP_PROVIDER = "gpt-chat-latest"  # falls back automatically via adapter chain

ICP_SYSTEM = """You are MarketIQ's onboarding strategist. Your job is to build a precise \
Ideal Customer Profile (ICP) and business profile for the workspace BEFORE any \
marketing research runs. You are NOT a lead-capture bot — you are profiling the \
USER'S OWN business so the platform can plan research, strategy and a content calendar.

Conversation style:
- Warm, sharp, senior marketer. Hinglish is fine if the user writes that way.
- Ask ONE focused question at a time. Never dump a long form.
- Proactively research silently: when the user names a company, website, product or \
competitor, request a web search or page scrape instead of guessing.
- Infer the SEGMENT early and confirm it: B2B, B2C, or D2C.
  * B2B  -> you MUST also capture, in the "b2b" object: company_profile (the brand \
voice/positioning of the company page) AND personal_profile (the founder/SDR personal \
profile used for outreach) AND outreach_owner (who sends outreach). B2B outreach goes \
from a PERSONAL profile while selling the COMPANY's offer, so both must be aligned.
  * B2C  -> focus on broad audience, lifestyle, social-first channels.
  * D2C  -> focus on product, shopping behaviour, paid social + email/SMS + UGC.
- Keep enriching: industry, company_summary, value_prop, offer, target_customer, \
personas, pains, goals, geographies, channels, keywords, competitors, brand_voice.

OUTPUT FORMAT — every single turn, reply with ONE JSON object ONLY (no prose, no \
markdown fences) of this exact shape:
{
  "say": "your next message to the user (a question or a short summary)",
  "icp": { only the NEW/updated ICP fields you learned this turn },
  "search": ["optional web search queries to run now"],
  "scrape": ["optional full URLs to fetch now"],
  "done": false
}
Rules for the JSON:
- "icp" fields use these keys: segment (B2B|B2C|D2C), industry, company_name, website, \
company_summary, value_prop, offer, target_customer, brand_voice, personas (list), \
pains (list), goals (list), geographies (list), channels (list), keywords (list), \
competitors (list), b2b (object: {company_profile, personal_profile, outreach_owner}).
- Only include keys you actually have new info for. Lists are merged (append), so just \
send the new items.
- Use "search"/"scrape" when you need facts; you will receive the results and should \
then continue. When you request research, you may keep "say" short (e.g. "Ek sec, main \
{company} ko dekh leta hoon...").
- Set "done": true ONLY when segment + industry + company_summary + target_customer + \
at least one persona and one channel are known, and (for B2B) the b2b profiles are set. \
When done, "say" should be a crisp 2-3 line ICP recap and an invite to start research.
- NEVER output anything except the single JSON object."""


def _safe_json(text: str) -> dict[str, Any]:
    t = (text or "").strip()
    if t.startswith("```"):
        t = t.split("\n", 1)[1] if "\n" in t else t
        t = t.rsplit("```", 1)[0]
        t = t.removeprefix("json").strip()
    start, end = t.find("{"), t.rfind("}")
    if start != -1 and end != -1 and end > start:
        t = t[start : end + 1]
    try:
        obj = json.loads(t)
        return obj if isinstance(obj, dict) else {}
    except json.JSONDecodeError:
        # Model returned plain prose — treat it as the reply.
        return {"say": text.strip(), "icp": {}, "done": False}


async def _run_search(queries: list[str]) -> str:
    blocks: list[str] = []
    for q in queries[:3]:
        try:
            results = await multi_search(q, limit=5, include_news=False)
        except Exception as exc:  # noqa: BLE001
            logger.warning("icp search failed for %r: %s", q, exc)
            results = []
        lines = [
            f"- {r.get('title', '')} ({r.get('url', '')}): {r.get('snippet', '')}"
            for r in results[:5]
        ]
        blocks.append(f"SEARCH: {q}\n" + ("\n".join(lines) if lines else "(no results)"))
    return "\n\n".join(blocks)


async def _run_scrape(urls: list[str]) -> str:
    clean = [u for u in urls[:3] if isinstance(u, str) and u.startswith("http")]
    if not clean:
        return ""
    try:
        results = await deep_crawl_many(clean)
    except Exception as exc:  # noqa: BLE001
        logger.warning("icp scrape failed: %s", exc)
        return ""
    blocks: list[str] = []
    for r in results:
        body = (r.text or r.markdown or "")[:2500]
        blocks.append(f"PAGE: {r.url}\nTITLE: {r.title}\n{body}")
    return "\n\n".join(blocks)


async def run_icp_turn(
    messages: list[dict[str, Any]],
    existing_icp: dict[str, Any] | None,
) -> dict[str, Any]:
    """Run one user turn through the agent loop.

    ``messages`` is the running transcript as ``[{role, text}]``. Returns
    ``{"message": str, "icp": dict (merged), "completeness": int, "done": bool}``.
    """
    icp_state: dict[str, Any] = dict(existing_icp or {})

    convo: list[dict[str, str]] = []
    if icp_state:
        convo.append({
            "role": "user",
            "content": "KNOWN ICP SO FAR (build on this, don't repeat questions):\n"
            + json.dumps(icp_state, ensure_ascii=False),
        })
    for m in messages:
        role = "assistant" if m.get("role") == "assistant" else "user"
        convo.append({"role": role, "content": str(m.get("text") or "")})

    say = ""
    done = False
    for _ in range(_MAX_ROUNDS):
        raw = await complete(convo, ICP_SYSTEM, provider=_ICP_PROVIDER)
        obj = _safe_json(raw)

        delta = obj.get("icp") if isinstance(obj.get("icp"), dict) else {}
        if delta:
            icp_state = icp_service.merge_icp_delta(icp_state, delta)
        say = str(obj.get("say") or say or "")
        done = bool(obj.get("done"))

        searches = obj.get("search") if isinstance(obj.get("search"), list) else []
        scrapes = obj.get("scrape") if isinstance(obj.get("scrape"), list) else []
        if not searches and not scrapes:
            break

        research_text = ""
        if searches:
            research_text += await _run_search([str(s) for s in searches])
        if scrapes:
            scraped = await _run_scrape([str(u) for u in scrapes])
            if scraped:
                research_text += ("\n\n" if research_text else "") + scraped

        # Feed the assistant's own JSON back plus the tool results, then continue.
        convo.append({"role": "assistant", "content": raw})
        convo.append({
            "role": "user",
            "content": "RESEARCH RESULTS (use these to enrich the ICP, then continue "
            "the conversation):\n" + (research_text or "(no usable results)"),
        })

    completeness = icp_service.compute_completeness(icp_state)
    if not say:
        say = "Got it — let's keep building your profile. Tell me a bit more about your business."
    return {
        "message": say,
        "icp": icp_state,
        "completeness": completeness,
        "done": done or completeness >= 80,
    }
