"""Reputation service — real, DB-backed review & reputation operations.

All aggregates (avg rating, distribution, sentiment split, response rate) are
computed from rows this module actually writes. Ingest only ever stores real
reviews; there is no fabrication. When a live connector is absent we simply
operate on stored rows.

Enterprise additions: deterministic lexicon-based sentiment scoring (0-1),
theme/topic extraction via keyword frequency, time-series trends, and
per-source breakdown — all from real data.
"""
from __future__ import annotations

import collections
import math
import re
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reputation import (
    REQUEST_CHANNELS,
    REQUEST_STATUSES,
    REVIEW_SENTIMENTS,
    REVIEW_SOURCES,
    REVIEW_STATUSES,
    ReputationSource,
    Review,
    ReviewRequest,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _clamp_rating(value: int | None) -> int:
    try:
        n = int(value if value is not None else 5)
    except (TypeError, ValueError):
        n = 5
    return max(1, min(5, n))


# --------------------------------------------------------------------------- #
# Sentiment scoring — deterministic lexicon fallback
# --------------------------------------------------------------------------- #
_NEG_WORDS = {
    "worst": -0.9, "terrible": -0.85, "awful": -0.85, "horrible": -0.8,
    "broken": -0.7, "refund": -0.6, "scam": -0.9, "rude": -0.7,
    "never": -0.3, "bad": -0.6, "poor": -0.6, "disappointing": -0.55,
    "slow": -0.4, "useless": -0.7, "frustrating": -0.55, "waste": -0.6,
    "overpriced": -0.5, "avoid": -0.6, "hate": -0.8, "issue": -0.3,
    "problem": -0.35, "difficult": -0.3, "complaint": -0.4, "mediocre": -0.35,
    "unreliable": -0.55, "unresponsive": -0.5, "buggy": -0.5, "crash": -0.6,
}

_POS_WORDS = {
    "love": 0.85, "great": 0.7, "excellent": 0.85, "amazing": 0.85,
    "perfect": 0.9, "best": 0.8, "recommend": 0.7, "fantastic": 0.85,
    "wonderful": 0.8, "awesome": 0.8, "outstanding": 0.85, "superb": 0.85,
    "brilliant": 0.8, "helpful": 0.6, "fast": 0.5, "easy": 0.5,
    "reliable": 0.6, "professional": 0.6, "friendly": 0.6, "responsive": 0.6,
    "quality": 0.55, "smooth": 0.5, "intuitive": 0.55, "impressed": 0.7,
    "delight": 0.75, "seamless": 0.6, "efficient": 0.55, "thankyou": 0.5,
    "thank": 0.4, "thanks": 0.4, "exceptional": 0.85,
}

_NEGATION = {"not", "no", "never", "don't", "doesn't", "didn't", "won't", "can't", "isn't", "wasn't", "aren't", "weren't"}


def score_sentiment(rating: int, body: str | None = None) -> float:
    """Deterministic sentiment score in [0, 1] (0 = most negative, 1 = most positive).

    Combines the star rating (primary signal) with lexicon hits in the text.
    """
    rating = _clamp_rating(rating)
    base = (rating - 1) / 4.0  # 1->0.0, 5->1.0

    if not body:
        return round(base, 4)

    words = re.findall(r"[a-z']+", body.lower())
    text_signal = 0.0
    count = 0
    for i, w in enumerate(words):
        negated = i > 0 and words[i - 1] in _NEGATION
        if w in _POS_WORDS:
            val = _POS_WORDS[w] * (-0.6 if negated else 1.0)
            text_signal += val
            count += 1
        elif w in _NEG_WORDS:
            val = _NEG_WORDS[w] * (-0.6 if negated else 1.0)
            text_signal += val
            count += 1

    if count == 0:
        return round(base, 4)

    text_avg = text_signal / count  # roughly -1..+1
    text_norm = (text_avg + 1.0) / 2.0  # 0..1
    # blend: 60% rating, 40% text
    blended = 0.6 * base + 0.4 * text_norm
    return round(max(0.0, min(1.0, blended)), 4)


def label_from_score(score: float) -> str:
    if score <= 0.35:
        return "negative"
    if score <= 0.6:
        return "neutral"
    return "positive"


def classify_sentiment(rating: int, body: str | None = None) -> str:
    """Deterministic sentiment from rating, lightly nudged by review text."""
    return label_from_score(score_sentiment(rating, body))


# --------------------------------------------------------------------------- #
# Theme / topic extraction — deterministic keyword frequency
# --------------------------------------------------------------------------- #
_STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "to", "of",
    "in", "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "about", "up", "out", "it", "its", "this", "that", "these", "those",
    "i", "we", "you", "he", "she", "they", "me", "us", "him", "her", "them",
    "my", "our", "your", "his", "their", "mine", "ours", "yours", "hers",
    "theirs", "what", "which", "who", "whom", "whose", "where", "when",
    "how", "not", "no", "nor", "only", "very", "so", "too", "just", "also",
    "more", "most", "some", "any", "all", "each", "every", "than", "then",
    "there", "here", "if", "because", "since", "while", "after", "before",
    "during", "between", "over", "under", "above", "below", "own", "same",
    "other", "such", "both", "few", "many", "much", "am", "don't", "doesn't",
    "didn't", "won't", "can't", "isn't", "wasn't", "aren't", "weren't",
    "get", "got", "really", "like", "even", "still", "already", "back",
}

_THEME_LABELS: dict[str, str] = {
    "price": "pricing", "prices": "pricing", "cost": "pricing", "expensive": "pricing",
    "cheap": "pricing", "affordable": "pricing", "overpriced": "pricing", "value": "value for money",
    "support": "customer support", "help": "customer support", "service": "customer service",
    "response": "responsiveness", "responsive": "responsiveness",
    "speed": "speed/performance", "fast": "speed/performance", "slow": "speed/performance",
    "performance": "speed/performance", "latency": "speed/performance",
    "ui": "user interface", "interface": "user interface", "design": "design/UX",
    "ux": "design/UX", "usability": "design/UX", "intuitive": "ease of use",
    "easy": "ease of use", "simple": "ease of use", "difficult": "ease of use",
    "quality": "quality", "reliable": "reliability", "reliability": "reliability",
    "bug": "bugs/issues", "buggy": "bugs/issues", "crash": "bugs/issues",
    "feature": "features", "functionality": "features", "missing": "missing features",
    "onboarding": "onboarding", "setup": "onboarding", "documentation": "documentation",
    "docs": "documentation", "team": "team/people", "staff": "team/people",
    "shipping": "shipping/delivery", "delivery": "shipping/delivery",
    "recommend": "recommendation", "integration": "integrations",
}


def extract_themes_from_text(body: str | None) -> list[str]:
    """Extract topic tokens from a single review body."""
    if not body:
        return []
    words = re.findall(r"[a-z]+", body.lower())
    themes: list[str] = []
    seen: set[str] = set()
    for w in words:
        if w in _STOP_WORDS or len(w) < 3:
            continue
        label = _THEME_LABELS.get(w)
        if label and label not in seen:
            seen.add(label)
            themes.append(label)
    return themes


def extract_aggregate_themes(reviews: list[Review], top_n: int = 15) -> list[dict[str, Any]]:
    """Aggregate recurring themes across reviews with counts and avg sentiment."""
    counter: dict[str, list[float]] = collections.defaultdict(list)
    for r in reviews:
        score = r.sentiment_score if r.sentiment_score is not None else score_sentiment(r.rating, r.body)
        per_review = r.themes if isinstance(r.themes, list) else extract_themes_from_text(r.body)
        for t in per_review:
            counter[t].append(score)

    result = []
    for theme, scores in counter.items():
        result.append({
            "theme": theme,
            "count": len(scores),
            "avg_sentiment": round(sum(scores) / len(scores), 3) if scores else 0,
        })
    result.sort(key=lambda x: x["count"], reverse=True)
    return result[:top_n]


# --------------------------------------------------------------------------- #
# Trends — real time-series from review rows
# --------------------------------------------------------------------------- #
def compute_trends(reviews: list[Review]) -> dict[str, Any]:
    """Build time-bucketed trends from real review rows.

    Returns monthly buckets with avg_rating, avg_sentiment, volume,
    and a per-source breakdown.
    """
    if not reviews:
        return {"low_data": True, "buckets": [], "by_source": {}}

    # bucket by YYYY-MM
    buckets: dict[str, list[Review]] = collections.defaultdict(list)
    source_buckets: dict[str, dict[str, list[Review]]] = collections.defaultdict(
        lambda: collections.defaultdict(list)
    )
    for r in reviews:
        dt = r.review_date or r.created_at
        if dt is None:
            continue
        key = dt.strftime("%Y-%m")
        buckets[key].append(r)
        source_buckets[r.source][key].append(r)

    sorted_keys = sorted(buckets.keys())
    timeline: list[dict[str, Any]] = []
    for key in sorted_keys:
        grp = buckets[key]
        ratings = [_clamp_rating(r.rating) for r in grp]
        scores = [
            r.sentiment_score if r.sentiment_score is not None else score_sentiment(r.rating, r.body)
            for r in grp
        ]
        timeline.append({
            "month": key,
            "volume": len(grp),
            "avg_rating": round(sum(ratings) / len(ratings), 2),
            "avg_sentiment": round(sum(scores) / len(scores), 3),
        })

    by_source: dict[str, list[dict[str, Any]]] = {}
    for src, s_buckets in source_buckets.items():
        s_timeline: list[dict[str, Any]] = []
        for key in sorted(s_buckets.keys()):
            grp = s_buckets[key]
            ratings = [_clamp_rating(r.rating) for r in grp]
            s_timeline.append({
                "month": key,
                "volume": len(grp),
                "avg_rating": round(sum(ratings) / len(ratings), 2),
            })
        by_source[src] = s_timeline

    low_data = len(reviews) < 5 or len(sorted_keys) < 2
    return {"low_data": low_data, "buckets": timeline, "by_source": by_source}


# --------------------------------------------------------------------------- #
# Reviews
# --------------------------------------------------------------------------- #
async def list_reviews(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    status: str | None = None,
    source: str | None = None,
    sentiment: str | None = None,
) -> list[Review]:
    stmt = select(Review).where(Review.workspace_id == ws_id)
    if status in REVIEW_STATUSES:
        stmt = stmt.where(Review.status == status)
    if source in REVIEW_SOURCES:
        stmt = stmt.where(Review.source == source)
    if sentiment in REVIEW_SENTIMENTS:
        stmt = stmt.where(Review.sentiment == sentiment)
    stmt = stmt.order_by(Review.review_date.desc().nullslast(), Review.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_review(
    db: AsyncSession, ws_id: uuid.UUID, review_id: uuid.UUID
) -> Review | None:
    res = await db.execute(
        select(Review).where(Review.id == review_id, Review.workspace_id == ws_id)
    )
    return res.scalar_one_or_none()


async def ingest_review(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    source: str,
    rating: int,
    author: str | None = None,
    title: str | None = None,
    body: str | None = None,
    external_id: str | None = None,
    review_date: datetime | None = None,
    meta: dict | None = None,
) -> Review:
    """Store a real review row (manual add or connector hand-off). No mocks."""
    src = source if source in REVIEW_SOURCES else "manual"
    rt = _clamp_rating(rating)
    s_score = score_sentiment(rt, body)
    s_label = label_from_score(s_score)
    themes = extract_themes_from_text(body)
    review = Review(
        workspace_id=ws_id,
        source=src,
        author=(author or None),
        rating=rt,
        title=(title or None),
        body=(body or None),
        sentiment=s_label,
        sentiment_score=s_score,
        themes=themes or None,
        status="new",
        external_id=(external_id or None),
        review_date=review_date or _now(),
        meta=meta,
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


async def backfill_sentiment(db: AsyncSession, ws_id: uuid.UUID) -> int:
    """Backfill sentiment_score/themes for reviews that lack them."""
    stmt = select(Review).where(
        Review.workspace_id == ws_id,
        Review.sentiment_score.is_(None),
    )
    res = await db.execute(stmt)
    rows = list(res.scalars().all())
    for r in rows:
        r.sentiment_score = score_sentiment(r.rating, r.body)
        r.sentiment = label_from_score(r.sentiment_score)
        r.themes = extract_themes_from_text(r.body) or None
    if rows:
        await db.flush()
    return len(rows)


async def respond_to_review(
    db: AsyncSession, review: Review, response_text: str
) -> Review:
    review.response_text = response_text
    review.responded_at = _now()
    review.status = "responded"
    await db.flush()
    await db.refresh(review)
    return review


async def flag_review(db: AsyncSession, review: Review) -> Review:
    review.status = "flagged"
    await db.flush()
    await db.refresh(review)
    return review


# --------------------------------------------------------------------------- #
# Aggregates (single source of truth for the overview)
# --------------------------------------------------------------------------- #
async def aggregate(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    rows = (
        await db.execute(select(Review).where(Review.workspace_id == ws_id))
    ).scalars().all()

    total = len(rows)
    distribution = {str(i): 0 for i in range(1, 6)}
    sentiment_split = {s: 0 for s in REVIEW_SENTIMENTS}
    rating_sum = 0
    responded = 0
    unanswered = 0

    for r in rows:
        rt = _clamp_rating(r.rating)
        rating_sum += rt
        distribution[str(rt)] += 1
        sent = r.sentiment if r.sentiment in sentiment_split else classify_sentiment(rt, r.body)
        sentiment_split[sent] += 1
        if r.status == "responded" and r.response_text:
            responded += 1
        elif r.status != "flagged":
            unanswered += 1

    avg_rating = round(rating_sum / total, 2) if total else 0.0
    response_rate = round((responded / total) * 100, 1) if total else 0.0

    return {
        "total_reviews": total,
        "avg_rating": avg_rating,
        "distribution": distribution,
        "sentiment_split": sentiment_split,
        "responded": responded,
        "unanswered": unanswered,
        "response_rate": response_rate,
    }


async def analytics(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    """Full enterprise analytics: overview + trends + themes from real data."""
    rows = list(
        (await db.execute(select(Review).where(Review.workspace_id == ws_id))).scalars().all()
    )
    total = len(rows)
    if total == 0:
        return {
            "low_data": True,
            "overview": await aggregate(db, ws_id),
            "trends": {"low_data": True, "buckets": [], "by_source": {}},
            "themes": [],
        }

    ov = await aggregate(db, ws_id)
    trends = compute_trends(rows)
    themes = extract_aggregate_themes(rows)

    return {
        "low_data": total < 5,
        "overview": ov,
        "trends": trends,
        "themes": themes,
    }


# --------------------------------------------------------------------------- #
# Review requests
# --------------------------------------------------------------------------- #
async def list_requests(db: AsyncSession, ws_id: uuid.UUID) -> list[ReviewRequest]:
    res = await db.execute(
        select(ReviewRequest)
        .where(ReviewRequest.workspace_id == ws_id)
        .order_by(ReviewRequest.created_at.desc())
    )
    return list(res.scalars().all())


async def get_request(
    db: AsyncSession, ws_id: uuid.UUID, request_id: uuid.UUID
) -> ReviewRequest | None:
    res = await db.execute(
        select(ReviewRequest).where(
            ReviewRequest.id == request_id, ReviewRequest.workspace_id == ws_id
        )
    )
    return res.scalar_one_or_none()


async def create_request(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    channel: str,
    customer_email: str | None = None,
    phone: str | None = None,
    meta: dict | None = None,
) -> ReviewRequest:
    ch = channel if channel in REQUEST_CHANNELS else "email"
    req = ReviewRequest(
        workspace_id=ws_id,
        customer_email=(customer_email or None),
        phone=(phone or None),
        channel=ch,
        status="queued",
        token=secrets.token_urlsafe(24),
        meta=meta,
    )
    db.add(req)
    await db.flush()
    await db.refresh(req)
    return req


def mark_request_sent(req: ReviewRequest) -> None:
    req.status = "sent"
    req.sent_at = _now()


async def update_request_status(
    db: AsyncSession, req: ReviewRequest, status: str
) -> ReviewRequest:
    if status in REQUEST_STATUSES:
        req.status = status
        if status == "sent" and req.sent_at is None:
            req.sent_at = _now()
    await db.flush()
    await db.refresh(req)
    return req


# --------------------------------------------------------------------------- #
# Sources
# --------------------------------------------------------------------------- #
async def list_sources(db: AsyncSession, ws_id: uuid.UUID) -> list[ReputationSource]:
    res = await db.execute(
        select(ReputationSource)
        .where(ReputationSource.workspace_id == ws_id)
        .order_by(ReputationSource.created_at.desc())
    )
    return list(res.scalars().all())


async def upsert_source(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    source: str,
    profile_url: str | None = None,
    avg_rating: float | None = None,
    total_reviews: int | None = None,
    is_connected: bool = False,
) -> ReputationSource:
    src = source if source in REVIEW_SOURCES else "google"
    res = await db.execute(
        select(ReputationSource).where(
            ReputationSource.workspace_id == ws_id, ReputationSource.source == src
        )
    )
    row = res.scalar_one_or_none()
    if row is None:
        row = ReputationSource(workspace_id=ws_id, source=src)
        db.add(row)
    if profile_url is not None:
        row.profile_url = profile_url or None
    if avg_rating is not None:
        row.avg_rating = avg_rating
    if total_reviews is not None:
        row.total_reviews = total_reviews
    row.is_connected = bool(is_connected or row.profile_url)
    await db.flush()
    await db.refresh(row)
    return row
