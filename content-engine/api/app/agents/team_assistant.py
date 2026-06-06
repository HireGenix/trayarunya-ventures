"""Team assistant agent — a workspace-grounded conversational assistant.

Blocking (non-streaming) to match the rest of content-engine. The caller passes
the conversation transcript plus a grounding block (built by ``chat_context``);
we prepend the grounding to the persona system prompt and dispatch through the
unified model adapter so any registry model (responses / anthropic /
chat_completions) works and the user can pick one per conversation.
"""
from __future__ import annotations

from app.llm.adapters import complete

TEAM_SYSTEM = """You are MarketIQ's in-house marketing co-pilot for the team. You work \
exclusively for the workspace described in the WORKSPACE CONTEXT below — treat its \
business, customers, brand and strategy as the single source of truth and tailor every \
answer to it. You are not a generic chatbot; you are this client's dedicated strategist, \
copywriter, analyst and operator rolled into one.

How you work:
- Ground every answer in the workspace context (ICP, brand, strategy, research). When the \
user asks for content, plans, messaging or analysis, make it specific to THIS business and \
its segment (B2B / B2C / D2C) and channels — never generic.
- If the context is thin or missing for what's asked, say what you'd need (e.g. "run the \
ICP chat or a research job first") and still give your best provisional answer.
- For B2B, remember outreach goes from a PERSONAL profile (founder/SDR) while selling the \
COMPANY offer — keep both aligned in any copy or sequence you draft.
- Be concise, concrete and execution-ready. Use markdown (headings, bullets, tables, code \
blocks) when it helps. Hinglish is fine if the user writes that way.
- Never invent metrics, quotes or facts about the business that aren't in context; ask or \
clearly flag assumptions instead."""


def build_system(grounding: str) -> str:
    block = grounding.strip() if grounding else "(no workspace context captured yet)"
    return f"{TEAM_SYSTEM}\n\n---\nWORKSPACE CONTEXT:\n{block}"


async def run_chat(
    messages: list[dict[str, str]],
    grounding: str,
    model_key: str | None = None,
    images: list[str] | None = None,
) -> str:
    """Generate the assistant reply for a transcript of {role, content} messages.

    ``images`` (data URLs / URLs) are attached to the most recent user turn so
    vision-capable models can read them.
    """
    convo = [
        {"role": "assistant" if m.get("role") == "assistant" else "user",
         "content": str(m.get("content") or "")}
        for m in messages
        if (m.get("content") or "").strip()
    ]
    if not convo:
        return "Tell me what you'd like help with for this workspace."
    if images:
        for turn in reversed(convo):
            if turn["role"] == "user":
                turn["images"] = images
                break
    return await complete(convo, build_system(grounding), provider=model_key)


async def title_for(first_message: str, model_key: str | None = None) -> str:
    """Derive a short conversation title from the first user message."""
    text = (first_message or "").strip()
    if not text:
        return "New chat"
    try:
        raw = await complete(
            [{"role": "user", "content": f"Summarise this into a 3-6 word chat title, "
              f"no quotes, no trailing punctuation:\n\n{text[:500]}"}],
            "You write ultra-short, specific titles.",
            provider=model_key,
        )
        title = raw.strip().strip('"').splitlines()[0][:80]
        return title or text[:60]
    except Exception:  # noqa: BLE001
        return text[:60]
