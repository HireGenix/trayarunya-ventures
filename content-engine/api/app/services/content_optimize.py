"""SERP-optimized content analysis + scoring.

Given a target keyword, fetches top organic results via web_search + crawler,
extracts the most frequent meaningful terms/entities/headings from real crawled
pages (TF analysis — no LLM hallucination for the term list), and scores a
draft against those terms plus real readability metrics.
"""
from __future__ import annotations

import math
import re
import logging
from collections import Counter
from dataclasses import dataclass, field, asdict

from app.tools.web_search import web_search
from app.tools.crawler import deep_crawl_many

logger = logging.getLogger(__name__)

# ── Stop words for English (compact set) ─────────────────────────────────────
_STOP = frozenset(
    "a about above after again against all am an and any are aren't as at be "
    "because been before being below between both but by can could couldn't did "
    "didn't do does doesn't doing don't down during each few for from further "
    "get got had hasn't have haven't having he her here hers herself him himself "
    "his how however i if in into is isn't it its itself just let ll like m me "
    "might more most mustn't my myself no nor not now of off on once only or "
    "other our ours ourselves out over own re s same shall shan't she should "
    "shouldn't so some such t than that the their theirs them themselves then "
    "there these they this those through to too under until up us ve very was "
    "wasn't we were weren't what when where which while who whom why will with "
    "won't would wouldn't you your yours yourself yourselves also been being can "
    "could may might must need shall should will would one two three four five "
    "new make made get got go going use used using well way even still many much "
    "thing things".split()
)

# ── Flesch reading-ease (deterministic) ──────────────────────────────────────
_SENTENCE_RE = re.compile(r'[.!?]+')
_SYLLABLE_VOWELS = re.compile(r'[aeiouy]+', re.I)


def _count_syllables(word: str) -> int:
    word = word.lower().strip()
    if len(word) <= 2:
        return 1
    matches = _SYLLABLE_VOWELS.findall(word)
    count = len(matches)
    if word.endswith('e') and count > 1:
        count -= 1
    return max(count, 1)


def flesch_reading_ease(text: str) -> float:
    """Compute Flesch reading-ease score (0-100 scale, higher = easier)."""
    words = re.findall(r"[a-zA-Z']+", text)
    if not words:
        return 0.0
    sentences = [s.strip() for s in _SENTENCE_RE.split(text) if s.strip()]
    n_sentences = max(len(sentences), 1)
    n_words = len(words)
    n_syllables = sum(_count_syllables(w) for w in words)
    score = 206.835 - 1.015 * (n_words / n_sentences) - 84.6 * (n_syllables / n_words)
    return round(max(0.0, min(100.0, score)), 1)


# ── Text cleaning ────────────────────────────────────────────────────────────
_WORD_RE = re.compile(r"[a-z][a-z'-]*[a-z]|[a-z]", re.I)
_HEADING_RE = re.compile(r'^#{1,3}\s+(.+)', re.M)
_QUESTION_RE = re.compile(r'[^.!?\n]*\?', re.M)


def _tokenize(text: str) -> list[str]:
    return [w.lower() for w in _WORD_RE.findall(text) if len(w) > 2]


def _meaningful_terms(tokens: list[str]) -> Counter:
    return Counter(t for t in tokens if t not in _STOP)


def _extract_headings(text: str) -> list[str]:
    """Extract headings from markdown or HTML-like text."""
    headings: list[str] = []
    for m in _HEADING_RE.finditer(text):
        headings.append(m.group(1).strip())
    # Also catch <h1>-<h3> tags
    for m in re.finditer(r'<h[1-3][^>]*>([^<]+)</h[1-3]>', text, re.I):
        headings.append(m.group(1).strip())
    return headings


def _extract_questions(text: str) -> list[str]:
    questions = []
    for m in _QUESTION_RE.finditer(text):
        q = m.group(0).strip()
        if 5 < len(q) < 200:
            questions.append(q)
    return questions


# ── SERP research ────────────────────────────────────────────────────────────
@dataclass
class TargetTerm:
    term: str
    suggested_count: int  # recommended usage count
    competitor_avg: float  # average frequency across competitors
    importance: float  # 0-1 relevance weight


@dataclass
class SerpResearch:
    keyword: str
    target_terms: list[TargetTerm] = field(default_factory=list)
    recommended_word_count: int = 1500
    competitor_word_counts: list[int] = field(default_factory=list)
    headings: list[str] = field(default_factory=list)
    questions: list[str] = field(default_factory=list)
    competitors_analyzed: int = 0
    low_confidence: bool = False
    error: str | None = None

    def to_dict(self) -> dict:
        return {
            "keyword": self.keyword,
            "target_terms": [asdict(t) for t in self.target_terms],
            "recommended_word_count": self.recommended_word_count,
            "competitor_word_counts": self.competitor_word_counts,
            "headings": self.headings,
            "questions": self.questions[:15],
            "competitors_analyzed": self.competitors_analyzed,
            "low_confidence": self.low_confidence,
        }


async def research_serp(keyword: str, limit: int = 8) -> SerpResearch:
    """Fetch top organic results for *keyword*, crawl them, and extract term
    frequencies, headings, and questions. All analysis is deterministic."""
    result = SerpResearch(keyword=keyword)
    try:
        search_results = await web_search(keyword, limit=limit)
    except Exception as exc:
        logger.warning("SERP search failed for '%s': %s", keyword, exc)
        result.low_confidence = True
        result.error = str(exc)
        return result

    if not search_results:
        result.low_confidence = True
        return result

    urls = [r.url for r in search_results[:limit]]
    try:
        crawled = await deep_crawl_many(urls)
    except Exception as exc:
        logger.warning("Crawl failed for '%s': %s", keyword, exc)
        result.low_confidence = True
        result.error = str(exc)
        return result

    ok_pages = [c for c in crawled if c.ok and len(c.text) > 200]
    if not ok_pages:
        result.low_confidence = True
        return result

    result.competitors_analyzed = len(ok_pages)

    # Aggregate term frequencies across all competitor pages
    all_term_counters: list[Counter] = []
    word_counts: list[int] = []
    all_headings: Counter = Counter()
    all_questions: list[str] = []

    for page in ok_pages:
        tokens = _tokenize(page.text)
        word_counts.append(len(tokens))
        tf = _meaningful_terms(tokens)
        all_term_counters.append(tf)
        for h in _extract_headings(page.text):
            all_headings[h.lower()] += 1
        all_questions.extend(_extract_questions(page.text))

    result.competitor_word_counts = sorted(word_counts)

    # Median word count as recommendation
    if word_counts:
        sorted_wc = sorted(word_counts)
        mid = len(sorted_wc) // 2
        result.recommended_word_count = (
            sorted_wc[mid]
            if len(sorted_wc) % 2 == 1
            else (sorted_wc[mid - 1] + sorted_wc[mid]) // 2
        )
        # Clamp to reasonable range
        result.recommended_word_count = max(300, min(5000, result.recommended_word_count))

    # Compute document frequency and average TF per term
    n_docs = len(all_term_counters)
    doc_freq: Counter = Counter()
    total_freq: Counter = Counter()
    for tf in all_term_counters:
        for term in tf:
            doc_freq[term] += 1
            total_freq[term] += tf[term]

    # Filter: term must appear in ≥40% of competitor pages
    min_df = max(2, int(n_docs * 0.4))
    candidate_terms = {
        term: total_freq[term] / n_docs
        for term, df in doc_freq.items()
        if df >= min_df and len(term) > 2
    }

    # Rank by TF-IDF-like importance: avg_tf * log(df/n_docs+1)
    scored: list[tuple[str, float, float]] = []
    for term, avg_tf in candidate_terms.items():
        df_ratio = doc_freq[term] / n_docs
        importance = avg_tf * math.log(1 + df_ratio)
        scored.append((term, avg_tf, importance))

    scored.sort(key=lambda x: x[2], reverse=True)

    # Build target term list (top 40 terms)
    for term, avg_tf, importance in scored[:40]:
        suggested = max(1, round(avg_tf))
        result.target_terms.append(TargetTerm(
            term=term,
            suggested_count=suggested,
            competitor_avg=round(avg_tf, 1),
            importance=round(min(1.0, importance / (scored[0][2] or 1)), 3),
        ))

    # Deduplicated headings sorted by frequency
    result.headings = [
        h for h, _ in all_headings.most_common(20)
    ]

    # Deduplicated questions
    seen_q: set[str] = set()
    for q in all_questions:
        ql = q.lower().strip()
        if ql not in seen_q and len(ql) > 10:
            seen_q.add(ql)
            result.questions.append(q.strip())
        if len(result.questions) >= 15:
            break

    return result


# ── Content scoring ──────────────────────────────────────────────────────────
@dataclass
class TermScore:
    term: str
    target_count: int
    actual_count: int
    hit: bool
    over: bool = False


@dataclass
class ContentScore:
    overall: int  # 0-100
    term_coverage: float  # 0-100
    readability: float  # Flesch reading ease 0-100
    word_count: int
    target_word_count: int
    word_count_score: float  # 0-100
    term_scores: list[TermScore] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)  # missing important terms

    def to_dict(self) -> dict:
        return {
            "overall": self.overall,
            "term_coverage": round(self.term_coverage, 1),
            "readability": self.readability,
            "word_count": self.word_count,
            "target_word_count": self.target_word_count,
            "word_count_score": round(self.word_count_score, 1),
            "term_scores": [asdict(t) for t in self.term_scores],
            "gaps": self.gaps,
        }


def score_content(text: str, research: SerpResearch) -> ContentScore:
    """Deterministic content scoring against SERP research."""
    tokens = _tokenize(text)
    word_count = len(re.findall(r"[a-zA-Z']+", text))
    tf = Counter(tokens)

    # Term coverage: weighted % of target terms present within acceptable range
    term_scores: list[TermScore] = []
    weighted_hits = 0.0
    total_weight = 0.0
    gaps: list[str] = []

    for target in research.target_terms:
        actual = tf.get(target.term, 0)
        # Hit if present at least once; ideal if within 50%-200% of suggested
        low = max(1, target.suggested_count // 2)
        high = target.suggested_count * 3
        hit = actual >= low
        over = actual > high
        ts = TermScore(
            term=target.term,
            target_count=target.suggested_count,
            actual_count=actual,
            hit=hit,
            over=over,
        )
        term_scores.append(ts)
        w = target.importance
        total_weight += w
        if hit and not over:
            weighted_hits += w
        elif hit and over:
            weighted_hits += w * 0.7  # penalty for keyword stuffing
        else:
            if target.importance >= 0.3:
                gaps.append(target.term)

    term_coverage = (weighted_hits / total_weight * 100) if total_weight > 0 else 0.0

    # Readability
    readability = flesch_reading_ease(text)

    # Word count adequacy (0-100): penalize if too short or too long
    target_wc = research.recommended_word_count
    if target_wc > 0 and word_count > 0:
        ratio = word_count / target_wc
        if 0.8 <= ratio <= 1.3:
            wc_score = 100.0
        elif ratio < 0.8:
            wc_score = max(0.0, ratio / 0.8 * 100)
        else:
            wc_score = max(0.0, 100 - (ratio - 1.3) * 50)
    else:
        wc_score = 50.0

    # Overall = 50% term coverage + 25% readability_normalized + 25% word count
    readability_norm = min(100.0, max(0.0, readability))
    overall = int(round(
        term_coverage * 0.50
        + readability_norm * 0.25
        + wc_score * 0.25
    ))
    overall = max(0, min(100, overall))

    return ContentScore(
        overall=overall,
        term_coverage=term_coverage,
        readability=readability,
        word_count=word_count,
        target_word_count=target_wc,
        word_count_score=wc_score,
        term_scores=term_scores,
        gaps=gaps[:10],
    )
