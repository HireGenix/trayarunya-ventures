"""Brand-voice profiling and consistency scoring.

Derives a deterministic style fingerprint from a workspace's past content
(ContentItem rows) + BrandBrain voice configuration. Scores new drafts
against that fingerprint using real computed features — no randomness.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field, asdict

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import ContentItem, ContentStatus
from app.models.brand import BrandBrain

# ── Text feature extraction ─────────────────────────────────────────────────
_SENTENCE_RE = re.compile(r'(?<=[.!?])\s+')
_WORD_RE = re.compile(r"[a-zA-Z']+")
_SYLLABLE_VOWELS = re.compile(r'[aeiouy]+', re.I)

# Tone-word lexicons (compact but real)
_FORMAL_WORDS = frozenset(
    "therefore furthermore moreover consequently additionally hereby "
    "pursuant accordingly henceforth notwithstanding nevertheless "
    "facilitate leverage optimize endeavor implement utilize".split()
)
_CASUAL_WORDS = frozenset(
    "hey cool awesome great nice pretty stuff things guys basically "
    "gonna wanna kinda sorta honestly literally actually really super "
    "totally amazing incredible".split()
)
_POWER_WORDS = frozenset(
    "exclusive proven guaranteed revolutionary breakthrough ultimate "
    "powerful essential critical urgent premium elite transform "
    "accelerate dominate unleash skyrocket maximize".split()
)


def _count_syllables(word: str) -> int:
    word = word.lower()
    if len(word) <= 2:
        return 1
    matches = _SYLLABLE_VOWELS.findall(word)
    count = len(matches)
    if word.endswith('e') and count > 1:
        count -= 1
    return max(count, 1)


@dataclass
class StyleFingerprint:
    avg_sentence_length: float = 0.0
    avg_word_length: float = 0.0
    vocabulary_richness: float = 0.0  # type-token ratio
    reading_level: float = 0.0  # Flesch reading ease
    formality_ratio: float = 0.0  # formal words / (formal + casual)
    power_word_density: float = 0.0  # power words per 100 words
    question_density: float = 0.0  # questions per sentence
    exclamation_density: float = 0.0
    avg_paragraph_length: float = 0.0  # sentences per paragraph
    top_bigrams: list[str] = field(default_factory=list)  # top recurring phrases
    top_trigrams: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    def feature_vector(self) -> list[float]:
        """Ordered numeric features for cosine similarity."""
        return [
            self.avg_sentence_length,
            self.avg_word_length,
            self.vocabulary_richness * 100,
            self.reading_level,
            self.formality_ratio * 100,
            self.power_word_density,
            self.question_density * 100,
            self.exclamation_density * 100,
            self.avg_paragraph_length,
        ]


def _extract_fingerprint(text: str) -> StyleFingerprint:
    """Compute a deterministic style fingerprint from raw text."""
    fp = StyleFingerprint()
    if not text or len(text) < 20:
        return fp

    sentences = [s.strip() for s in _SENTENCE_RE.split(text) if s.strip()]
    if not sentences:
        sentences = [text]

    words = _WORD_RE.findall(text)
    if not words:
        return fp

    words_lower = [w.lower() for w in words]
    n_words = len(words)
    n_sentences = max(len(sentences), 1)

    # Basic stats
    fp.avg_sentence_length = round(n_words / n_sentences, 1)
    fp.avg_word_length = round(sum(len(w) for w in words) / n_words, 2)
    fp.vocabulary_richness = round(len(set(words_lower)) / n_words, 3)

    # Flesch reading ease
    n_syllables = sum(_count_syllables(w) for w in words)
    fre = 206.835 - 1.015 * (n_words / n_sentences) - 84.6 * (n_syllables / n_words)
    fp.reading_level = round(max(0.0, min(100.0, fre)), 1)

    # Tone ratios
    formal_count = sum(1 for w in words_lower if w in _FORMAL_WORDS)
    casual_count = sum(1 for w in words_lower if w in _CASUAL_WORDS)
    power_count = sum(1 for w in words_lower if w in _POWER_WORDS)
    tone_total = formal_count + casual_count
    fp.formality_ratio = round(formal_count / tone_total, 3) if tone_total > 0 else 0.5
    fp.power_word_density = round(power_count / n_words * 100, 2)

    # Punctuation density
    fp.question_density = round(text.count('?') / n_sentences, 3)
    fp.exclamation_density = round(text.count('!') / n_sentences, 3)

    # Paragraph structure
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    if paragraphs:
        para_sent_counts = [len(_SENTENCE_RE.split(p)) for p in paragraphs]
        fp.avg_paragraph_length = round(sum(para_sent_counts) / len(para_sent_counts), 1)

    # N-grams (bigrams + trigrams)
    if len(words_lower) >= 2:
        bigrams = Counter()
        for i in range(len(words_lower) - 1):
            bg = f"{words_lower[i]} {words_lower[i+1]}"
            bigrams[bg] += 1
        fp.top_bigrams = [bg for bg, _ in bigrams.most_common(10) if _ >= 2]

    if len(words_lower) >= 3:
        trigrams = Counter()
        for i in range(len(words_lower) - 2):
            tg = f"{words_lower[i]} {words_lower[i+1]} {words_lower[i+2]}"
            trigrams[tg] += 1
        fp.top_trigrams = [tg for tg, _ in trigrams.most_common(8) if _ >= 2]

    return fp


def _merge_fingerprints(fps: list[StyleFingerprint]) -> StyleFingerprint:
    """Average multiple fingerprints into a brand profile."""
    if not fps:
        return StyleFingerprint()
    n = len(fps)
    merged = StyleFingerprint(
        avg_sentence_length=round(sum(f.avg_sentence_length for f in fps) / n, 1),
        avg_word_length=round(sum(f.avg_word_length for f in fps) / n, 2),
        vocabulary_richness=round(sum(f.vocabulary_richness for f in fps) / n, 3),
        reading_level=round(sum(f.reading_level for f in fps) / n, 1),
        formality_ratio=round(sum(f.formality_ratio for f in fps) / n, 3),
        power_word_density=round(sum(f.power_word_density for f in fps) / n, 2),
        question_density=round(sum(f.question_density for f in fps) / n, 3),
        exclamation_density=round(sum(f.exclamation_density for f in fps) / n, 3),
        avg_paragraph_length=round(sum(f.avg_paragraph_length for f in fps) / n, 1),
    )

    # Merge n-grams: keep those appearing in ≥30% of fingerprints
    bigram_counter: Counter = Counter()
    trigram_counter: Counter = Counter()
    for fp in fps:
        bigram_counter.update(set(fp.top_bigrams))
        trigram_counter.update(set(fp.top_trigrams))
    min_freq = max(2, int(n * 0.3))
    merged.top_bigrams = [bg for bg, c in bigram_counter.most_common(10) if c >= min_freq]
    merged.top_trigrams = [tg for tg, c in trigram_counter.most_common(8) if c >= min_freq]

    return merged


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two numeric vectors."""
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


# ── Public API ───────────────────────────────────────────────────────────────
@dataclass
class BrandVoiceProfile:
    fingerprint: StyleFingerprint
    sample_count: int
    brand_voice_config: dict | None = None  # from BrandBrain.voice

    def to_dict(self) -> dict:
        return {
            "fingerprint": self.fingerprint.to_dict(),
            "sample_count": self.sample_count,
            "brand_voice_config": self.brand_voice_config,
        }


@dataclass
class VoiceScore:
    score: int  # 0-100 consistency percentage
    deviations: list[str] = field(default_factory=list)  # top areas of divergence

    def to_dict(self) -> dict:
        return {"score": self.score, "deviations": self.deviations}


async def build_brand_voice_profile(
    db: AsyncSession, workspace_id, *, max_items: int = 50
) -> BrandVoiceProfile:
    """Build a style fingerprint from the workspace's top published content."""
    import uuid as _uuid
    wid = _uuid.UUID(str(workspace_id)) if not isinstance(workspace_id, _uuid.UUID) else workspace_id

    # Fetch best recent content
    stmt = (
        select(ContentItem)
        .where(
            ContentItem.workspace_id == wid,
            ContentItem.status.in_([
                ContentStatus.published,
                ContentStatus.approved,
                ContentStatus.draft,
            ]),
        )
        .order_by(desc(ContentItem.updated_at))
        .limit(max_items)
    )
    rows = (await db.execute(stmt)).scalars().all()

    fingerprints: list[StyleFingerprint] = []
    for item in rows:
        text = item.body or ""
        if len(text) < 50:
            continue
        fingerprints.append(_extract_fingerprint(text))

    merged = _merge_fingerprints(fingerprints) if fingerprints else StyleFingerprint()

    # Load brand voice config
    brand = (
        await db.execute(select(BrandBrain).where(BrandBrain.workspace_id == wid))
    ).scalar_one_or_none()
    voice_config = brand.voice if brand else None

    return BrandVoiceProfile(
        fingerprint=merged,
        sample_count=len(fingerprints),
        brand_voice_config=voice_config if isinstance(voice_config, dict) else None,
    )


def score_voice_consistency(
    text: str, profile: BrandVoiceProfile
) -> VoiceScore:
    """Score how closely a draft matches the brand voice profile (deterministic)."""
    if not text or len(text) < 20 or profile.sample_count == 0:
        return VoiceScore(score=50, deviations=["Insufficient data for scoring"])

    draft_fp = _extract_fingerprint(text)
    brand_fp = profile.fingerprint

    # Cosine similarity on numeric features
    cos_sim = _cosine_similarity(draft_fp.feature_vector(), brand_fp.feature_vector())

    # Feature-level deviation analysis
    deviations: list[str] = []

    # Sentence length
    sl_diff = abs(draft_fp.avg_sentence_length - brand_fp.avg_sentence_length)
    if sl_diff > 8:
        direction = "longer" if draft_fp.avg_sentence_length > brand_fp.avg_sentence_length else "shorter"
        deviations.append(f"Sentences are {direction} than brand average ({draft_fp.avg_sentence_length:.0f} vs {brand_fp.avg_sentence_length:.0f} words)")

    # Reading level
    rl_diff = abs(draft_fp.reading_level - brand_fp.reading_level)
    if rl_diff > 15:
        direction = "simpler" if draft_fp.reading_level > brand_fp.reading_level else "more complex"
        deviations.append(f"Reading level is {direction} than brand norm")

    # Formality
    form_diff = abs(draft_fp.formality_ratio - brand_fp.formality_ratio)
    if form_diff > 0.2:
        direction = "more formal" if draft_fp.formality_ratio > brand_fp.formality_ratio else "more casual"
        deviations.append(f"Tone is {direction} than brand voice")

    # Power words
    pw_diff = abs(draft_fp.power_word_density - brand_fp.power_word_density)
    if pw_diff > 1.5:
        direction = "more" if draft_fp.power_word_density > brand_fp.power_word_density else "fewer"
        deviations.append(f"Uses {direction} power words than typical")

    # Question usage
    q_diff = abs(draft_fp.question_density - brand_fp.question_density)
    if q_diff > 0.15:
        direction = "more" if draft_fp.question_density > brand_fp.question_density else "fewer"
        deviations.append(f"Uses {direction} questions than brand norm")

    # Combine cosine similarity with penalty for deviations
    base_score = cos_sim * 100
    deviation_penalty = len(deviations) * 5
    final_score = int(round(max(0, min(100, base_score - deviation_penalty))))

    return VoiceScore(score=final_score, deviations=deviations[:5])


def voice_context_for_generation(profile: BrandVoiceProfile) -> str:
    """Build a text block suitable for injection into LLM system prompts."""
    fp = profile.fingerprint
    parts: list[str] = ["BRAND VOICE GUIDELINES:"]

    if profile.brand_voice_config:
        vc = profile.brand_voice_config
        if isinstance(vc, dict):
            for k, v in vc.items():
                parts.append(f"- {k}: {v}")

    parts.append(f"- Target sentence length: ~{fp.avg_sentence_length:.0f} words")
    parts.append(f"- Reading level (Flesch): {fp.reading_level:.0f}")

    if fp.formality_ratio > 0.6:
        parts.append("- Tone: Formal, professional")
    elif fp.formality_ratio < 0.3:
        parts.append("- Tone: Casual, conversational")
    else:
        parts.append("- Tone: Balanced professional-conversational")

    if fp.top_bigrams:
        parts.append(f"- Characteristic phrases: {', '.join(fp.top_bigrams[:5])}")

    return "\n".join(parts)
