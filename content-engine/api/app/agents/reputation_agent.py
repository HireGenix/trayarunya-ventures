"""The Reputation Agent — autonomous reviews & reputation manager.

A cycle runs SENSE -> DIAGNOSE -> PLAN -> ACT on **real** review rows:

    SENSE     -> read new/unanswered reviews + the live aggregate scorecard
    DIAGNOSE  -> classify sentiment/themes, surface low-rating risk
    PLAN/ACT  -> draft on-brand responses (LLM + deterministic fallback);
                 flag low ratings. Autonomy gates how far it acts:
                   suggest -> stage drafts in meta, never publish
                   approve -> store drafts as the review response (status stays new)
                   auto    -> store + mark responded, flag low ratings

Replies are grounded in the workspace BrandBrain voice. Every path has a
deterministic fallback so the feature never hard-fails when the LLM is down.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete, complete_json
from app.models.brand import BrandBrain
from app.models.reputation import Review
from app.services import reputation as svc

log = logging.getLogger("reputation_agent")

SYSTEM_RESPONSE = (
    "You are an expert customer-experience and reputation manager. You write "
    "concise, human, on-brand public replies to customer reviews. Never use "
    "emojis. Return plain text only."
)
SYSTEM_ANALYZE = (
    "You are a customer-insight analyst. Classify review sentiment and themes "
    "and suggest one concrete action. Respond with strict JSON only."
)

AUTONOMY_LEVELS = ("suggest", "approve", "auto")


async def _load_brand(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    bb = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == ws_id))
    ).scalar_one_or_none()
    if bb is None:
        return {}
    voice = bb.voice if isinstance(bb.voice, dict) else {}
    return {
        "name": getattr(bb, "name", None),
        "value_prop": bb.value_prop,
        "mission": bb.mission,
        "tone": voice.get("tone") or voice.get("voice"),
    }


def _fallback_response(review: Review, tone: str, brand: dict[str, Any]) -> str:
    """Deterministic, on-brand reply when the LLM is unavailable."""
    rating = max(1, min(5, int(review.rating or 5)))
    name = (review.author or "there").split(" ")[0]
    signoff = brand.get("name") or "the team"
    if rating <= 2:
        return (
            f"Hi {name}, we're sorry your experience fell short — that's not the "
            f"standard we hold ourselves to. We'd like to make this right; please "
            f"reach out so we can look into it directly and fix it. Thank you for "
            f"the honest feedback. — {signoff}"
        )
    if rating == 3:
        return (
            f"Thanks for the feedback, {name}. We appreciate you taking the time and "
            f"we're always working to improve. If there's something specific we can "
            f"do better, we'd love to hear it. — {signoff}"
        )
    return (
        f"Thank you so much, {name}! We're thrilled you had a great experience and "
        f"genuinely appreciate you sharing it. It means a lot to {signoff}."
    )


async def draft_response(
    db: AsyncSession, ws_id: uuid.UUID, review_id: uuid.UUID, tone: str = "professional"
) -> dict[str, Any]:
    """Draft an on-brand public reply tailored to the review's rating/sentiment."""
    review = await svc.get_review(db, ws_id, review_id)
    if review is None:
        return {"error": "not_found"}

    brand = await _load_brand(db, ws_id)
    rating = max(1, min(5, int(review.rating or 5)))
    sentiment = review.sentiment or svc.classify_sentiment(rating, review.body)
    posture = (
        "apologise sincerely, take ownership, and offer to make it right"
        if rating <= 2
        else "acknowledge feedback and show a willingness to improve"
        if rating == 3
        else "thank them warmly and reinforce the relationship"
    )
    user = (
        f"Brand: {brand.get('name') or 'our company'}\n"
        f"Brand voice/tone: {brand.get('tone') or tone}\n"
        f"Value prop: {brand.get('value_prop') or 'n/a'}\n"
        f"Requested tone: {tone}\n"
        f"Review source: {review.source}\n"
        f"Rating: {rating}/5 (sentiment: {sentiment})\n"
        f"Author: {review.author or 'Anonymous'}\n"
        f"Title: {review.title or ''}\n"
        f"Body: {review.body or ''}\n\n"
        f"Task: Write a public reply (2-4 sentences). You should {posture}. "
        f"Be specific to what they said, stay on-brand, no emojis, no placeholders."
    )
    text = ""
    try:
        text = (await complete([{"role": "user", "content": user}], system=SYSTEM_RESPONSE)).strip()
    except Exception as exc:  # noqa: BLE001
        log.warning("draft_response LLM failed, using fallback: %s", exc)

    if not text:
        text = _fallback_response(review, tone, brand)

    return {
        "review_id": str(review.id),
        "rating": rating,
        "sentiment": sentiment,
        "tone": tone,
        "draft": text,
    }


async def analyze_review(text: str) -> dict[str, Any]:
    """Sentiment + themes + suggested action for an arbitrary review body."""
    body = (text or "").strip()
    if not body:
        return {"sentiment": "neutral", "themes": [], "suggested_action": "monitor"}

    user = (
        "Analyze this customer review.\n"
        f"Review: {body}\n\n"
        'Return JSON: {"sentiment": "positive|neutral|negative", '
        '"themes": ["..."], "suggested_action": "..."}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM_ANALYZE)
        if isinstance(data, dict) and not data.get("_parse_error"):
            sent = data.get("sentiment")
            if sent not in ("positive", "neutral", "negative"):
                sent = svc.classify_sentiment(3, body)
            themes = data.get("themes")
            return {
                "sentiment": sent,
                "themes": themes if isinstance(themes, list) else [],
                "suggested_action": data.get("suggested_action") or "respond promptly",
            }
    except Exception as exc:  # noqa: BLE001
        log.warning("analyze_review LLM failed, using fallback: %s", exc)

    sentiment = svc.classify_sentiment(3, body)
    action = {
        "negative": "respond with an apology and offer to resolve offline",
        "neutral": "respond and invite specific feedback",
        "positive": "thank the reviewer and amplify the review",
    }[sentiment]
    return {"sentiment": sentiment, "themes": [], "suggested_action": action}


async def run_cycle(
    db: AsyncSession, ws_id: uuid.UUID, autonomy: str = "suggest"
) -> dict[str, Any]:
    """Auto-classify new reviews, draft responses, flag low ratings."""
    if autonomy not in AUTONOMY_LEVELS:
        autonomy = "suggest"

    reviews = await svc.list_reviews(db, ws_id, status="new")
    classified = 0
    drafted = 0
    flagged = 0
    actions: list[dict[str, Any]] = []

    for review in reviews:
        rating = max(1, min(5, int(review.rating or 5)))

        # Classify (always — cheap and deterministic).
        if not review.sentiment:
            review.sentiment = svc.classify_sentiment(rating, review.body)
            classified += 1

        # Flag low ratings.
        if rating <= 2 and autonomy == "auto":
            await svc.flag_review(db, review)
            flagged += 1
            actions.append({"review_id": str(review.id), "action": "flagged"})
            continue

        # Draft a response for unanswered reviews.
        if not review.response_text:
            result = await draft_response(db, ws_id, review.id)
            draft = result.get("draft")
            if draft:
                drafted += 1
                if autonomy == "auto":
                    await svc.respond_to_review(db, review, draft)
                    actions.append({"review_id": str(review.id), "action": "responded"})
                elif autonomy == "approve":
                    review.response_text = draft
                    actions.append({"review_id": str(review.id), "action": "draft_saved"})
                else:
                    meta = dict(review.meta or {})
                    meta["suggested_response"] = draft
                    review.meta = meta
                    actions.append({"review_id": str(review.id), "action": "suggested"})

    await db.flush()
    scorecard = await svc.aggregate(db, ws_id)
    return {
        "autonomy": autonomy,
        "reviews_seen": len(reviews),
        "classified": classified,
        "drafted": drafted,
        "flagged": flagged,
        "actions": actions,
        "scorecard": scorecard,
    }
