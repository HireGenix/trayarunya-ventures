"""Social Inbox agent — the agentic AI brain.

SENSE → DIAGNOSE → PLAN → ACT over real inbox rows:

* ``analyze_sentiment`` classifies one message (sentiment / intent / urgency).
* ``draft_reply`` writes an on-brand reply grounded in the item text + the
  workspace BrandBrain voice.
* ``run_cycle`` auto-classifies any unanalyzed items and drafts replies for
  high-urgency ones, honoring an autonomy level (suggest / approve / auto).

Every LLM call has a deterministic fallback so the feature never hard-fails.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete, complete_json
from app.models.brand import BrandBrain
from app.models.social_inbox import InboxItem, InboxReply

log = logging.getLogger("social_inbox_agent")

AUTONOMY_LEVELS = ("suggest", "approve", "auto")

SENTIMENT_SYSTEM = (
    "You are an expert social media community manager. Classify an inbound "
    "social message. Respond with strict JSON only."
)
REPLY_SYSTEM = (
    "You are an expert brand social media manager. Write a concise, helpful, "
    "on-brand public reply. No emojis. Plain text only."
)

_NEGATIVE_HINTS = (
    "angry", "terrible", "worst", "hate", "broken", "refund", "scam", "bug",
    "disappointed", "awful", "useless", "cancel", "complaint", "not working",
    "poor", "frustrated", "bad", "wrong", "fail", "issue", "problem",
)
_POSITIVE_HINTS = (
    "love", "great", "amazing", "thanks", "thank you", "awesome", "excellent",
    "best", "perfect", "happy", "fantastic", "recommend", "brilliant", "good",
    "wonderful", "helpful",
)
_URGENT_HINTS = (
    "urgent", "asap", "immediately", "now", "down", "outage", "refund",
    "cancel", "lawsuit", "legal", "angry", "complaint", "broken", "not working",
)
_QUESTION_HINTS = ("?", "how do", "can i", "where", "when", "what", "why", "help")


# --------------------------------------------------------------------------- #
# Deterministic fallbacks (used when the LLM yields nothing usable)
# --------------------------------------------------------------------------- #
def _fallback_classify(text: str) -> dict[str, Any]:
    t = (text or "").lower()
    neg = sum(1 for w in _NEGATIVE_HINTS if w in t)
    pos = sum(1 for w in _POSITIVE_HINTS if w in t)
    if neg > pos:
        sentiment = "negative"
    elif pos > neg:
        sentiment = "positive"
    else:
        sentiment = "neutral"

    if any(w in t for w in _QUESTION_HINTS):
        intent = "question"
    elif sentiment == "negative":
        intent = "complaint"
    elif sentiment == "positive":
        intent = "praise"
    else:
        intent = "general"

    if sentiment == "negative" or any(w in t for w in _URGENT_HINTS):
        urgency = "high"
    elif intent == "question":
        urgency = "medium"
    else:
        urgency = "low"
    return {"sentiment": sentiment, "intent": intent, "urgency": urgency}


def _fallback_reply(item: InboxItem, brand: dict[str, Any] | None) -> str:
    name = item.author_name or item.author_handle or "there"
    name = name.split()[0] if name else "there"
    company = (brand or {}).get("company") or "our team"
    cls = _fallback_classify(item.text or "")
    if cls["sentiment"] == "negative":
        return (
            f"Hi {name}, thank you for flagging this and we're sorry for the "
            f"trouble. We'd like to make it right — please share a few details "
            f"and {company} will follow up directly."
        )
    if cls["intent"] == "question":
        return (
            f"Hi {name}, great question — happy to help. Could you share a bit "
            f"more context so we can point you to the right answer?"
        )
    return (
        f"Hi {name}, thanks so much for reaching out — we really appreciate it. "
        f"Let us know if there's anything {company} can help with."
    )


# --------------------------------------------------------------------------- #
# Brand voice loader
# --------------------------------------------------------------------------- #
async def _load_brand(
    db: AsyncSession, ws_id: uuid.UUID
) -> dict[str, Any] | None:
    bb = (
        await db.execute(
            select(BrandBrain).where(BrandBrain.workspace_id == ws_id)
        )
    ).scalar_one_or_none()
    if bb is None:
        return None
    voice = bb.voice if isinstance(bb.voice, dict) else {}
    audience = bb.audience if isinstance(bb.audience, dict) else {}
    return {
        "company": getattr(bb, "company", None) or getattr(bb, "name", None),
        "value_prop": bb.value_prop,
        "mission": bb.mission,
        "voice": voice.get("tone") or voice.get("voice"),
        "tone": voice.get("tone"),
        "audience": audience.get("primary") or audience.get("description"),
        "website": bb.website,
    }


# --------------------------------------------------------------------------- #
# Public agent surface
# --------------------------------------------------------------------------- #
async def analyze_sentiment(text: str) -> dict[str, Any]:
    """Classify one message → {sentiment, intent, urgency}."""
    clean = (text or "").strip()
    if not clean:
        return {"sentiment": "neutral", "intent": "general", "urgency": "low"}

    user = (
        "Classify this inbound social message.\n"
        f"Message: \"\"\"{clean[:1500]}\"\"\"\n"
        "Return JSON exactly: {\"sentiment\": \"positive|neutral|negative\", "
        "\"intent\": \"question|complaint|praise|lead|general\", "
        "\"urgency\": \"low|medium|high\"}"
    )
    try:
        data = await complete_json(
            [{"role": "user", "content": user}], system=SENTIMENT_SYSTEM
        )
    except Exception:  # noqa: BLE001
        log.exception("analyze_sentiment LLM failed; using fallback")
        return _fallback_classify(clean)

    if not isinstance(data, dict) or data.get("_parse_error"):
        return _fallback_classify(clean)

    sentiment = str(data.get("sentiment", "")).lower().strip()
    if sentiment not in ("positive", "neutral", "negative"):
        sentiment = _fallback_classify(clean)["sentiment"]
    intent = str(data.get("intent", "general")).lower().strip() or "general"
    urgency = str(data.get("urgency", "low")).lower().strip()
    if urgency not in ("low", "medium", "high"):
        urgency = "low"
    return {"sentiment": sentiment, "intent": intent, "urgency": urgency}


async def draft_reply(
    db: AsyncSession,
    ws_id: uuid.UUID,
    item_id: uuid.UUID,
    tone: str | None = None,
) -> dict[str, Any]:
    """Draft an on-brand reply for one inbox item. Returns {body, source}."""
    item = (
        await db.execute(
            select(InboxItem).where(
                InboxItem.id == item_id, InboxItem.workspace_id == ws_id
            )
        )
    ).scalar_one_or_none()
    if item is None:
        return {"body": "", "source": "missing_item"}

    brand = await _load_brand(db, ws_id)
    brand_tone = tone or (brand or {}).get("tone") or "warm, professional, helpful"
    company = (brand or {}).get("company") or "the brand"
    value_prop = (brand or {}).get("value_prop") or ""
    platform = item.platform
    author = item.author_name or item.author_handle or "the customer"

    user = (
        f"Brand: {company}. Voice/tone: {brand_tone}.\n"
        f"Value proposition: {value_prop}\n"
        f"Platform: {platform}. Interaction type: {item.kind}.\n"
        f"From: {author}\n"
        f"Their message: \"\"\"{(item.text or '')[:1500]}\"\"\"\n\n"
        "Write a single reply (max 60 words) in the brand voice. Be specific to "
        "their message, acknowledge their point, and move the conversation "
        "forward. No emojis, no hashtags, plain text only. Return only the reply."
    )
    try:
        raw = await complete([{"role": "user", "content": user}], system=REPLY_SYSTEM)
        body = (raw or "").strip().strip('"')
    except Exception:  # noqa: BLE001
        log.exception("draft_reply LLM failed; using fallback")
        body = _fallback_reply(item, brand)
        return {"body": body, "source": "fallback"}

    if not body:
        body = _fallback_reply(item, brand)
        return {"body": body, "source": "fallback"}
    return {"body": body, "source": "llm"}


async def run_cycle(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    autonomy: str = "suggest",
    limit: int = 50,
) -> dict[str, Any]:
    """One autonomy cycle: classify unanalyzed items, draft for urgent ones.

    * suggest/approve  → write draft replies (status='draft') for high-urgency
      items but never send.
    * auto             → same drafting (sending still requires a live connector
      and is handled by the router/send path, so we keep drafts here).
    """
    if autonomy not in AUTONOMY_LEVELS:
        autonomy = "suggest"

    # SENSE: find items still missing a sentiment classification.
    unanalyzed = list(
        (
            await db.execute(
                select(InboxItem)
                .where(
                    InboxItem.workspace_id == ws_id,
                    InboxItem.sentiment.is_(None),
                )
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )

    classified = 0
    drafted = 0
    high_urgency: list[str] = []

    for item in unanalyzed:
        # DIAGNOSE
        cls = await analyze_sentiment(item.text or "")
        item.sentiment = cls["sentiment"]
        meta = dict(item.meta or {})
        meta["ai_intent"] = cls["intent"]
        meta["ai_urgency"] = cls["urgency"]
        item.meta = meta
        classified += 1

        # PLAN/ACT: draft a reply for high-urgency items that have none yet.
        if cls["urgency"] == "high":
            high_urgency.append(str(item.id))
            existing = (
                await db.execute(
                    select(InboxReply).where(
                        InboxReply.inbox_item_id == item.id,
                        InboxReply.workspace_id == ws_id,
                    )
                )
            ).scalars().first()
            if existing is None:
                draft = await draft_reply(db, ws_id, item.id)
                if draft.get("body"):
                    reply = InboxReply(
                        workspace_id=ws_id,
                        inbox_item_id=item.id,
                        body=draft["body"],
                        status="draft",
                        meta={"source": "agent", "autonomy": autonomy},
                    )
                    db.add(reply)
                    if item.status == "unread":
                        item.status = "open"
                    drafted += 1

    await db.flush()
    return {
        "autonomy": autonomy,
        "classified": classified,
        "drafted": drafted,
        "high_urgency_items": high_urgency,
        "scanned": len(unanalyzed),
    }
