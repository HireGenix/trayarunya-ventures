"""SEO Suite service — real, DB-backed keyword tracking, rank math, audits.

All numbers are computed from rows this module writes. Rank checks use a real
Search Console connector when one is connected for the workspace; otherwise the
keyword is stored and the check returns ``awaiting_data`` — we never fabricate a
rank.
"""
from __future__ import annotations

import csv
import io
import json
import logging
import re
import uuid
from collections import Counter
from datetime import datetime, timezone
from urllib.parse import urlparse, urljoin

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.seo import (
    ContentBrief,
    RankSnapshot,
    SeoAudit,
    SeoBacklink,
    SeoKeyword,
    SeoReferringDomain,
    SeoSerpFeature,
    SeoTopicCluster,
    SiteCrawlAudit,
    SiteLinkGraph,
)

log = logging.getLogger("seo_service")

# Providers that can supply real organic ranking signals.
_RANK_PROVIDERS = ("search_console",)


# --------------------------------------------------------------------------- #
# Keyword CRUD + tracking
# --------------------------------------------------------------------------- #
async def list_keywords(db: AsyncSession, ws_id: uuid.UUID) -> list[SeoKeyword]:
    res = await db.execute(
        select(SeoKeyword)
        .where(SeoKeyword.workspace_id == ws_id)
        .order_by(SeoKeyword.created_at.desc())
    )
    return list(res.scalars().all())


async def get_keyword(
    db: AsyncSession, ws_id: uuid.UUID, keyword_id: uuid.UUID
) -> SeoKeyword | None:
    res = await db.execute(
        select(SeoKeyword).where(
            SeoKeyword.workspace_id == ws_id, SeoKeyword.id == keyword_id
        )
    )
    return res.scalar_one_or_none()


async def create_keyword(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    term: str,
    country: str = "US",
    device: str = "desktop",
    intent: str | None = None,
    search_volume: int | None = None,
    difficulty: int | None = None,
    volume_proxy: int | None = None,
    metrics: dict | None = None,
    is_tracked: bool = True,
) -> SeoKeyword:
    obj = SeoKeyword(
        workspace_id=ws_id,
        term=term.strip(),
        country=(country or "US").upper()[:8],
        device=device if device in ("desktop", "mobile") else "desktop",
        intent=(intent or None),
        search_volume=search_volume,
        difficulty=_clamp_0_100(difficulty) if difficulty is not None else None,
        volume_proxy=_clamp_0_100(volume_proxy) if volume_proxy is not None else None,
        metrics=metrics if isinstance(metrics, dict) else None,
        is_tracked=is_tracked,
    )
    db.add(obj)
    await db.flush()
    return obj


def _clamp_0_100(value: int | float | None) -> int | None:
    if value is None:
        return None
    try:
        return int(max(0, min(100, round(float(value)))))
    except (TypeError, ValueError):
        return None


async def set_tracking(
    db: AsyncSession, ws_id: uuid.UUID, keyword_id: uuid.UUID, is_tracked: bool
) -> SeoKeyword | None:
    kw = await get_keyword(db, ws_id, keyword_id)
    if kw is None:
        return None
    kw.is_tracked = is_tracked
    await db.flush()
    return kw


# --------------------------------------------------------------------------- #
# Rank connector detection + check
# --------------------------------------------------------------------------- #
async def has_rank_connector(db: AsyncSession, ws_id: uuid.UUID) -> bool:
    """True when a connected ranking provider exists for this workspace."""
    try:
        from app.models.platform import Integration
    except Exception:  # noqa: BLE001 — model may move; degrade gracefully
        return False
    res = await db.execute(
        select(func.count(Integration.id)).where(
            Integration.workspace_id == ws_id,
            Integration.provider.in_(_RANK_PROVIDERS),
            Integration.status == "connected",
        )
    )
    return int(res.scalar_one() or 0) > 0


async def record_snapshot(
    db: AsyncSession,
    ws_id: uuid.UUID,
    keyword: SeoKeyword,
    *,
    rank: int | None,
    url: str | None,
) -> RankSnapshot:
    """Persist a rank reading and roll the keyword's current/previous rank."""
    snap = RankSnapshot(
        workspace_id=ws_id,
        keyword_id=keyword.id,
        rank=rank,
        url=url,
        checked_at=datetime.now(timezone.utc),
    )
    db.add(snap)
    if rank is not None:
        keyword.previous_rank = keyword.current_rank
        keyword.current_rank = rank
    keyword.last_checked_at = datetime.now(timezone.utc)
    await db.flush()
    return snap


async def check_keyword(
    db: AsyncSession, ws_id: uuid.UUID, keyword: SeoKeyword
) -> dict:
    """Run a rank check. Uses a real connector if available; else awaiting_data.

    Returns a status dict; when a connector exists a RankSnapshot is recorded.
    We never invent ranks: without real organic data the keyword is simply
    stamped as checked with an ``awaiting_data`` outcome.
    """
    if not await has_rank_connector(db, ws_id):
        keyword.last_checked_at = datetime.now(timezone.utc)
        await db.flush()
        return {
            "status": "awaiting_data",
            "keyword_id": str(keyword.id),
            "detail": (
                "No ranking provider connected. Connect Google Search Console to "
                "pull real positions — we never fabricate ranks."
            ),
        }

    reading = await _fetch_rank_from_connector(db, ws_id, keyword)
    if reading is None or reading.get("rank") is None:
        keyword.last_checked_at = datetime.now(timezone.utc)
        await db.flush()
        return {
            "status": "awaiting_data",
            "keyword_id": str(keyword.id),
            "detail": "Connector returned no position for this term yet.",
        }

    snap = await record_snapshot(
        db, ws_id, keyword, rank=reading.get("rank"), url=reading.get("url")
    )
    delta = None
    if keyword.previous_rank is not None and keyword.current_rank is not None:
        # Lower rank number is better; positive delta = improved.
        delta = keyword.previous_rank - keyword.current_rank
    return {
        "status": "recorded",
        "keyword_id": str(keyword.id),
        "rank": keyword.current_rank,
        "previous_rank": keyword.previous_rank,
        "delta": delta,
        "snapshot_id": str(snap.id),
    }


async def _fetch_rank_from_connector(
    db: AsyncSession, ws_id: uuid.UUID, keyword: SeoKeyword
) -> dict | None:
    """Best-effort real organic position from the connected provider.

    Wired defensively: if the live Search Console sync helper isn't callable in
    this environment, we return ``None`` so the caller degrades to awaiting_data
    rather than guessing.
    """
    try:
        from app.models.platform import Integration

        res = await db.execute(
            select(Integration).where(
                Integration.workspace_id == ws_id,
                Integration.provider.in_(_RANK_PROVIDERS),
                Integration.status == "connected",
            )
        )
        integ = res.scalars().first()
        if integ is None:
            return None
        # Real provider payloads expose position per query under config/last
        # sync. We only read; absence => awaiting_data (never a fake number).
        cfg = integ.config if isinstance(integ.config, dict) else {}
        positions = cfg.get("positions") if isinstance(cfg, dict) else None
        if isinstance(positions, dict):
            entry = positions.get(keyword.term.lower())
            if isinstance(entry, dict) and entry.get("position") is not None:
                return {
                    "rank": int(round(float(entry["position"]))),
                    "url": entry.get("url"),
                }
    except Exception:  # noqa: BLE001 — degrade to awaiting_data
        return None
    return None


# --------------------------------------------------------------------------- #
# History
# --------------------------------------------------------------------------- #
async def keyword_history(
    db: AsyncSession, ws_id: uuid.UUID, keyword_id: uuid.UUID, *, limit: int = 90
) -> list[RankSnapshot]:
    res = await db.execute(
        select(RankSnapshot)
        .where(
            RankSnapshot.workspace_id == ws_id,
            RankSnapshot.keyword_id == keyword_id,
        )
        .order_by(RankSnapshot.checked_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


# --------------------------------------------------------------------------- #
# Rank distribution / overview math (from real keyword rows)
# --------------------------------------------------------------------------- #
def rank_delta(kw: SeoKeyword) -> int | None:
    """Improvement vs previous reading (positive = moved up). Real ranks only."""
    if kw.previous_rank is None or kw.current_rank is None:
        return None
    return kw.previous_rank - kw.current_rank


async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    keywords = await list_keywords(db, ws_id)
    tracked = [k for k in keywords if k.is_tracked]
    ranked = [k for k in tracked if k.current_rank is not None]

    top3 = sum(1 for k in ranked if k.current_rank <= 3)
    top10 = sum(1 for k in ranked if k.current_rank <= 10)
    top100 = sum(1 for k in ranked if k.current_rank <= 100)

    avg_position = (
        round(sum(k.current_rank for k in ranked) / len(ranked), 1)
        if ranked
        else None
    )

    improved = sum(1 for k in ranked if (rank_delta(k) or 0) > 0)
    declined = sum(1 for k in ranked if (rank_delta(k) or 0) < 0)

    audits_run = int(
        (
            await db.execute(
                select(func.count(SeoAudit.id)).where(SeoAudit.workspace_id == ws_id)
            )
        ).scalar_one()
        or 0
    )
    briefs_count = int(
        (
            await db.execute(
                select(func.count(ContentBrief.id)).where(
                    ContentBrief.workspace_id == ws_id
                )
            )
        ).scalar_one()
        or 0
    )

    return {
        "tracked_count": len(tracked),
        "total_keywords": len(keywords),
        "ranked_count": len(ranked),
        "avg_position": avg_position,
        "distribution": {"top3": top3, "top10": top10, "top100": top100},
        "improved": improved,
        "declined": declined,
        "audits_run": audits_run,
        "briefs_count": briefs_count,
        "has_rank_connector": await has_rank_connector(db, ws_id),
    }


# --------------------------------------------------------------------------- #
# Content gap analysis (tracked vs actually ranked)
# --------------------------------------------------------------------------- #
async def content_gaps(db: AsyncSession, ws_id: uuid.UUID) -> list[SeoKeyword]:
    """Tracked keywords that have no real ranking yet, or rank outside top 10.

    These are the highest-leverage targets for new/updated content.
    """
    keywords = await list_keywords(db, ws_id)
    gaps: list[SeoKeyword] = []
    for k in keywords:
        if not k.is_tracked:
            continue
        if k.current_rank is None or k.current_rank > 10:
            gaps.append(k)
    return gaps


# --------------------------------------------------------------------------- #
# Audits CRUD
# --------------------------------------------------------------------------- #
async def list_audits(db: AsyncSession, ws_id: uuid.UUID) -> list[SeoAudit]:
    res = await db.execute(
        select(SeoAudit)
        .where(SeoAudit.workspace_id == ws_id)
        .order_by(SeoAudit.created_at.desc())
    )
    return list(res.scalars().all())


async def get_audit(
    db: AsyncSession, ws_id: uuid.UUID, audit_id: uuid.UUID
) -> SeoAudit | None:
    res = await db.execute(
        select(SeoAudit).where(
            SeoAudit.workspace_id == ws_id, SeoAudit.id == audit_id
        )
    )
    return res.scalar_one_or_none()


async def create_audit(
    db: AsyncSession, ws_id: uuid.UUID, url: str
) -> SeoAudit:
    obj = SeoAudit(workspace_id=ws_id, url=url.strip(), status="running", score=0, issues=[])
    db.add(obj)
    await db.flush()
    return obj


async def finalize_audit(
    db: AsyncSession,
    audit: SeoAudit,
    *,
    score: int,
    issues: list[dict],
) -> SeoAudit:
    audit.score = int(max(0, min(100, score)))
    audit.issues = issues
    audit.status = "done"
    await db.flush()
    return audit


# --------------------------------------------------------------------------- #
# Briefs CRUD
# --------------------------------------------------------------------------- #
async def list_briefs(db: AsyncSession, ws_id: uuid.UUID) -> list[ContentBrief]:
    res = await db.execute(
        select(ContentBrief)
        .where(ContentBrief.workspace_id == ws_id)
        .order_by(ContentBrief.created_at.desc())
    )
    return list(res.scalars().all())


async def save_brief(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    target_keyword: str,
    title: str | None,
    outline: dict | None,
    word_count_target: int | None,
    brief_md: str | None,
    status: str = "ready",
) -> ContentBrief:
    obj = ContentBrief(
        workspace_id=ws_id,
        target_keyword=target_keyword.strip(),
        title=title,
        outline=outline,
        word_count_target=word_count_target,
        brief_md=brief_md,
        status=status if status in ("draft", "ready") else "ready",
    )
    db.add(obj)
    await db.flush()
    return obj


# --------------------------------------------------------------------------- #
# SERP text-mining helpers (shared with content_optimize term logic)
# --------------------------------------------------------------------------- #
# Reuse the exact stopword set + tokenizer from content_optimize so our keyword
# mining matches the scoring engine (no divergent term lists).
from app.services.content_optimize import _STOP, _tokenize  # noqa: E402

# Strong/authoritative domains that signal a competitive SERP. Detected by
# suffix (.gov/.edu) or substring (well-known brands). Transparent + auditable.
_STRONG_DOMAIN_SUFFIXES = (".gov", ".edu", ".mil")
_STRONG_DOMAIN_BRANDS = frozenset(
    "wikipedia.org amazon.com youtube.com forbes.com nytimes.com bbc.co.uk "
    "bbc.com cnn.com reddit.com linkedin.com microsoft.com apple.com "
    "hubspot.com semrush.com ahrefs.com moz.com wordpress.org medium.com "
    "investopedia.com healthline.com webmd.com mayoclinic.org gov.uk "
    "stackoverflow.com github.com shopify.com salesforce.com".split()
)

# Transactional / informational / commercial intent keyword markers (fallback).
_TXN_MARKERS = ("buy", "price", "cost", "cheap", "discount", "deal", "order", "shop", "coupon", "for sale", "subscription", "pricing")
_COMM_MARKERS = ("best", "top", "review", "vs", "compare", "comparison", "alternative", "software", "tool", "service", "agency", "company")
_NAV_MARKERS = ("login", "sign in", "download", "app", "official", "website", "near me", "account")
_INFO_MARKERS = ("how", "what", "why", "when", "guide", "tutorial", "tips", "ideas", "examples", "meaning", "definition", "learn")

_WORDISH = re.compile(r"[a-z][a-z'-]*[a-z]|[a-z]", re.I)


def _registered_domain(url: str) -> str:
    """Best-effort registrable domain (host minus leading www)."""
    try:
        host = (urlparse(url).netloc or "").lower()
    except Exception:  # noqa: BLE001
        return ""
    return host[4:] if host.startswith("www.") else host


def _domain_matches(target: str, candidate_host: str) -> bool:
    """True when ``candidate_host`` is, or is a subdomain of, ``target`` domain."""
    t = (target or "").strip().lower()
    t = _registered_domain(t) if "://" in t else (t[4:] if t.startswith("www.") else t)
    c = candidate_host
    if not t or not c:
        return False
    return c == t or c.endswith("." + t)


def _significant_terms(text: str) -> list[str]:
    """Meaningful (non-stopword) tokens from a phrase."""
    return [w for w in _tokenize(text) if w not in _STOP]


def _phrase_ngrams(text: str, lo: int = 2, hi: int = 3) -> list[str]:
    """Meaningful 2-3 word ngrams (drop ngrams that are entirely stopwords)."""
    toks = [w.lower() for w in _WORDISH.findall(text) if len(w) > 2]
    out: list[str] = []
    for n in range(lo, hi + 1):
        for i in range(len(toks) - n + 1):
            gram = toks[i : i + n]
            # Require at least one meaningful (non-stop) term and no stopword edges.
            if gram[0] in _STOP or gram[-1] in _STOP:
                continue
            if all(g in _STOP for g in gram):
                continue
            out.append(" ".join(gram))
    return out


# --------------------------------------------------------------------------- #
# Keyword research (SERP-grounded, transparent proxies)
# --------------------------------------------------------------------------- #
def _classify_intent_fallback(phrase: str) -> str:
    """Deterministic intent label from keyword patterns (no LLM)."""
    p = f" {phrase.lower()} "
    if any(m in p for m in _TXN_MARKERS):
        return "transactional"
    if any(m in p for m in _NAV_MARKERS):
        return "navigational"
    if any(m in p for m in _COMM_MARKERS):
        return "commercial"
    if any(m in p for m in _INFO_MARKERS):
        return "informational"
    return "informational"


async def _classify_intents_llm(seed: str, phrases: list[str], snippets: list[str]) -> dict[str, str]:
    """One batched LLM call labelling each phrase's search intent from SERP context.

    Returns ``{phrase: intent}``. Falls back to the deterministic classifier for
    any phrase the LLM doesn't return (or if the whole call fails).
    """
    fallback = {p: _classify_intent_fallback(p) for p in phrases}
    if not phrases:
        return fallback
    try:
        from app.llm.adapters import complete_json

        context = "\n".join(f"- {s}" for s in snippets[:10] if s)
        listing = "\n".join(f"{i+1}. {p}" for i, p in enumerate(phrases))
        user = (
            f'Seed topic: "{seed}".\n'
            f"SERP snippets for context:\n{context or '(none)'}\n\n"
            "Classify the SEARCH INTENT of each keyword below as exactly one of: "
            "informational, commercial, transactional, navigational.\n"
            f"Keywords:\n{listing}\n\n"
            'Return JSON: {"intents": {"<keyword>": "<intent>", ...}}. '
            "Use only the four allowed labels."
        )
        data = await complete_json(
            [{"role": "user", "content": user}],
            system="You are an SEO search-intent classifier. Respond with strict JSON only.",
        )
        mapping = data.get("intents") if isinstance(data, dict) else None
        if isinstance(mapping, dict):
            allowed = {"informational", "commercial", "transactional", "navigational"}
            for p in phrases:
                val = str(mapping.get(p, "")).strip().lower()
                if val in allowed:
                    fallback[p] = val
    except Exception as exc:  # noqa: BLE001 — degrade to deterministic labels
        log.warning("intent LLM classification failed: %s", exc)
    return fallback


def _cluster_phrases(phrases: list[str]) -> dict[str, str]:
    """Group phrases sharing 2+ significant terms under a shared cluster label.

    The cluster label is the most frequent significant term in the group.
    """
    terms_by_phrase = {p: set(_significant_terms(p)) for p in phrases}
    clusters: list[list[str]] = []
    for p in phrases:
        placed = False
        for group in clusters:
            # Compare against the group's first member as the anchor.
            anchor = group[0]
            shared = terms_by_phrase[p] & terms_by_phrase[anchor]
            if len(shared) >= 2 or (len(terms_by_phrase[p]) == 1 and terms_by_phrase[p] & terms_by_phrase[anchor]):
                group.append(p)
                placed = True
                break
        if not placed:
            clusters.append([p])

    labels: dict[str, str] = {}
    for group in clusters:
        counter: Counter = Counter()
        for ph in group:
            counter.update(terms_by_phrase[ph])
        label = counter.most_common(1)[0][0] if counter else (group[0].split()[0] if group else "general")
        for ph in group:
            labels[ph] = label
    return labels


async def keyword_research(seed: str, country: str = "US", limit: int = 25) -> list[dict]:
    """Research keyword ideas for ``seed`` from real SERP + crawled competitor text.

    Pipeline (every number traces to real data):

    * ``web_search(seed)`` for the primary SERP; ``web_search(f"{seed} autosuggest")``
      and ``web_search(f"related:{seed}")`` for related/demand signals.
    * ``deep_crawl_many`` on the top SERP URLs to mine real headings + ngrams.
    * Ideas come from result snippets, crawled headings, and frequent meaningful
      2-3 word ngrams across crawled pages.

    Per idea we compute transparent proxies:

    * ``difficulty`` (0-100): weighted average of
        - title_match_density (40%): % of top-10 results whose title contains the
          idea's significant terms (high = competitive head term).
        - strong_domain_score (35%): share of top-10 results on strong domains
          (.gov/.edu/.mil or well-known brands) — authority of the SERP.
        - content_depth_score (25%): avg competitor word count, scaled (longer =
          more comprehensive content needed to compete).
    * ``volume_proxy`` (0-100): *estimated relative demand* (NOT real volume):
        - autosuggest presence (found in DDG/related suggestions),
        - related-query breadth (how many related results contain the idea),
        - SERP saturation signal (full result page = healthy demand).
    * ``intent``: LLM-labelled from SERP snippets, deterministic fallback.
    * ``cluster``: grouped by 2+ shared significant terms.
    """
    seed = (seed or "").strip()
    if not seed:
        return []

    from app.tools.web_search import web_search
    from app.tools.crawler import deep_crawl_many

    low_confidence = False

    async def _safe_search(q: str, n: int) -> list:
        try:
            return await web_search(q, limit=n) or []
        except Exception as exc:  # noqa: BLE001
            log.warning("keyword_research search failed for '%s': %s", q, exc)
            return []

    serp = await _safe_search(seed, 20)
    autosuggest = await _safe_search(f"{seed} autosuggest", 10)
    related = await _safe_search(f"related:{seed}", 10)

    if not serp:
        low_confidence = True

    top10 = serp[:10]
    top10_titles = [(r.title or "").lower() for r in top10]
    serp_snippets = [(r.snippet or "") for r in serp[:10]]

    # ---- SERP-level competitiveness signals (shared across ideas) ----------- #
    strong_hits = 0
    for r in top10:
        host = _registered_domain(r.url)
        is_strong = host in _STRONG_DOMAIN_BRANDS or any(
            host.endswith(suf) for suf in _STRONG_DOMAIN_SUFFIXES
        )
        if is_strong:
            strong_hits += 1
    strong_domain_score = (strong_hits / len(top10) * 100) if top10 else 0.0
    serp_saturation = (len(serp) / 20 * 100) if serp else 0.0

    # ---- Crawl the top SERP URLs for headings + ngram mining ---------------- #
    crawl_urls = [r.url for r in serp[:8]]
    crawled: list = []
    if crawl_urls:
        try:
            crawled = await deep_crawl_many(crawl_urls)
        except Exception as exc:  # noqa: BLE001
            log.warning("keyword_research crawl failed: %s", exc)
            low_confidence = True

    ok_pages = [c for c in crawled if getattr(c, "ok", False) and len((getattr(c, "text", "") or "")) > 200]
    word_counts = [len(_tokenize(c.text)) for c in ok_pages]
    avg_words = (sum(word_counts) / len(word_counts)) if word_counts else 0.0
    # Scale avg competitor depth: 2000+ words ~= maximally competitive.
    content_depth_score = min(100.0, (avg_words / 2000.0) * 100) if avg_words else 0.0

    # ---- Gather candidate ideas from real text ------------------------------ #
    from app.services.content_optimize import _extract_headings  # local import

    idea_counter: Counter = Counter()
    idea_source: dict[str, str] = {}

    def _consider(phrase: str, source: str) -> None:
        p = " ".join((phrase or "").lower().split()).strip(" -–—:|")
        if not p or len(p) < 4 or len(p) > 70:
            return
        if not _significant_terms(p):
            return
        idea_counter[p] += 1
        idea_source.setdefault(p, source)

    # From SERP snippets: ngrams.
    for snip in serp_snippets:
        for g in _phrase_ngrams(snip):
            _consider(g, "serp_snippet")
    # From crawled headings.
    for page in ok_pages:
        for h in _extract_headings(page.text):
            _consider(h, "competitor_heading")
    # From crawled body ngrams (frequent across pages).
    body_ngram_counter: Counter = Counter()
    for page in ok_pages:
        seen_on_page: set[str] = set()
        for g in _phrase_ngrams(page.text):
            if g not in seen_on_page:
                body_ngram_counter[g] += 1
                seen_on_page.add(g)
    for g, df in body_ngram_counter.items():
        if df >= max(2, int(len(ok_pages) * 0.4)):
            _consider(g, "competitor_ngram")
    # Always include the seed itself.
    _consider(seed, "seed")

    # Rank ideas by frequency and trim to the requested limit.
    ranked_ideas = [p for p, _ in idea_counter.most_common(max(limit * 2, limit))]
    ranked_ideas = ranked_ideas[:limit]
    if not ranked_ideas:
        return []

    # Demand signals from autosuggest + related result text.
    autosuggest_text = " ".join(
        f"{r.title} {r.snippet}" for r in autosuggest
    ).lower()
    related_blobs = [f"{r.title} {r.snippet}".lower() for r in related]

    # Intent classification (batched LLM, deterministic fallback).
    intents = await _classify_intents_llm(seed, ranked_ideas, serp_snippets)
    clusters = _cluster_phrases(ranked_ideas)

    results: list[dict] = []
    for idea in ranked_ideas:
        sig = _significant_terms(idea)
        # title_match_density: share of top-10 titles containing all sig terms.
        if top10_titles and sig:
            matches = sum(1 for t in top10_titles if all(s in t for s in sig))
            title_match_density = matches / len(top10_titles) * 100
        else:
            title_match_density = 0.0

        difficulty = (
            title_match_density * 0.40
            + strong_domain_score * 0.35
            + content_depth_score * 0.25
        )

        # volume_proxy (estimated relative demand):
        in_autosuggest = bool(sig) and all(s in autosuggest_text for s in sig)
        autosuggest_score = 100.0 if in_autosuggest else 0.0
        related_breadth = (
            sum(1 for blob in related_blobs if sig and all(s in blob for s in sig))
            / len(related_blobs) * 100
            if related_blobs
            else 0.0
        )
        volume_proxy = (
            autosuggest_score * 0.45
            + related_breadth * 0.35
            + serp_saturation * 0.20
        )

        # Confidence reflects how much real data backed this idea.
        confidence = "low" if (low_confidence or not ok_pages) else (
            "high" if idea_counter[idea] >= 2 else "medium"
        )

        results.append(
            {
                "keyword": idea,
                "difficulty": _clamp_0_100(difficulty) or 0,
                "volume_proxy": _clamp_0_100(volume_proxy) or 0,
                "intent": intents.get(idea, _classify_intent_fallback(idea)),
                "cluster": clusters.get(idea, sig[0] if sig else "general"),
                "source": idea_source.get(idea, "serp_snippet"),
                "confidence": confidence,
                "metrics": {
                    "title_match_density": round(title_match_density, 1),
                    "strong_domain_score": round(strong_domain_score, 1),
                    "content_depth_score": round(content_depth_score, 1),
                    "avg_competitor_words": int(avg_words),
                    "in_autosuggest": in_autosuggest,
                    "related_breadth": round(related_breadth, 1),
                    "serp_saturation": round(serp_saturation, 1),
                    "competitors_analyzed": len(ok_pages),
                    "estimated_relative_demand": True,
                    "source": "serp_research",
                },
            }
        )

    # Sort by an opportunity signal: demand high, difficulty low.
    results.sort(key=lambda r: (r["volume_proxy"] - r["difficulty"]), reverse=True)
    return results


# --------------------------------------------------------------------------- #
# SERP-based rank checking (free fallback when no GSC connector)
# --------------------------------------------------------------------------- #
async def check_keyword_serp(
    db: AsyncSession,
    ws_id: uuid.UUID,
    keyword: SeoKeyword,
    domain: str,
) -> dict:
    """Scrape the SERP for ``keyword.term`` and record the workspace domain's rank.

    Records the 1-indexed position if the domain is found in the top results;
    otherwise records ``rank=None`` (never fabricated). Source is marked
    ``serp_scrape`` in the keyword's ``metrics``.
    """
    domain = (domain or "").strip()
    if not domain:
        keyword.last_checked_at = datetime.now(timezone.utc)
        await db.flush()
        return {
            "status": "no_domain",
            "keyword_id": str(keyword.id),
            "detail": "No domain provided to locate in the SERP.",
        }

    from app.tools.web_search import web_search

    try:
        results = await web_search(keyword.term, limit=20)
    except Exception as exc:  # noqa: BLE001
        keyword.last_checked_at = datetime.now(timezone.utc)
        await db.flush()
        log.warning("check_keyword_serp search failed for '%s': %s", keyword.term, exc)
        return {
            "status": "low_confidence",
            "keyword_id": str(keyword.id),
            "detail": f"SERP scrape failed: {exc}",
        }

    found_rank: int | None = None
    found_url: str | None = None
    for idx, r in enumerate(results, start=1):
        host = _registered_domain(r.url)
        if _domain_matches(domain, host):
            found_rank = idx
            found_url = r.url
            break

    metrics = dict(keyword.metrics) if isinstance(keyword.metrics, dict) else {}
    metrics["rank_source"] = "serp_scrape"
    metrics["serp_results_scanned"] = len(results)
    metrics["serp_checked_at"] = datetime.now(timezone.utc).isoformat()
    keyword.metrics = metrics

    snap = await record_snapshot(db, ws_id, keyword, rank=found_rank, url=found_url)

    if found_rank is None:
        return {
            "status": "not_found",
            "keyword_id": str(keyword.id),
            "detail": f"Domain not present in top {len(results)} SERP results.",
            "snapshot_id": str(snap.id),
            "source": "serp_scrape",
            "results_scanned": len(results),
        }
    delta = None
    if keyword.previous_rank is not None and keyword.current_rank is not None:
        delta = keyword.previous_rank - keyword.current_rank
    return {
        "status": "recorded",
        "keyword_id": str(keyword.id),
        "rank": keyword.current_rank,
        "previous_rank": keyword.previous_rank,
        "delta": delta,
        "url": found_url,
        "snapshot_id": str(snap.id),
        "source": "serp_scrape",
    }


# --------------------------------------------------------------------------- #
# SiteCrawlAudit CRUD
# --------------------------------------------------------------------------- #
async def create_site_audit(
    db: AsyncSession, ws_id: uuid.UUID, base_url: str, max_pages: int = 20
) -> SiteCrawlAudit:
    obj = SiteCrawlAudit(
        workspace_id=ws_id,
        base_url=base_url.strip(),
        max_pages=int(max(1, min(100, max_pages or 20))),
        pages_crawled=0,
        score=0,
        issues=[],
        status="running",
    )
    db.add(obj)
    await db.flush()
    return obj


async def get_site_audit(
    db: AsyncSession, ws_id: uuid.UUID, audit_id: uuid.UUID
) -> SiteCrawlAudit | None:
    res = await db.execute(
        select(SiteCrawlAudit).where(
            SiteCrawlAudit.workspace_id == ws_id, SiteCrawlAudit.id == audit_id
        )
    )
    return res.scalar_one_or_none()


async def list_site_audits(db: AsyncSession, ws_id: uuid.UUID) -> list[SiteCrawlAudit]:
    res = await db.execute(
        select(SiteCrawlAudit)
        .where(SiteCrawlAudit.workspace_id == ws_id)
        .order_by(SiteCrawlAudit.created_at.desc())
    )
    return list(res.scalars().all())


async def finalize_site_audit(
    db: AsyncSession,
    audit: SiteCrawlAudit,
    *,
    score: int,
    issues: list[dict],
    pages_crawled: int,
    status: str = "done",
) -> SiteCrawlAudit:
    audit.score = int(max(0, min(100, score)))
    audit.issues = issues
    audit.pages_crawled = int(max(0, pages_crawled))
    audit.status = status if status in ("running", "done", "failed") else "done"
    await db.flush()
    return audit


# --------------------------------------------------------------------------- #
# Full-site crawl audit (real HTML issue detection)
# --------------------------------------------------------------------------- #
_SITE_SEVERITY_WEIGHT = {"critical": 12, "high": 8, "medium": 4, "low": 2}


def _detect_page_issues(url: str, html: str, crawl_ok: bool) -> list[dict]:
    """Detect real on-page issues from fetched HTML for a single page."""
    issues: list[dict] = []
    if not crawl_ok:
        issues.append({
            "type": "broken_link",
            "severity": "high",
            "detail": "Page could not be fetched (broken or blocking crawlers).",
            "url": url,
        })
        return issues

    h = html or ""
    low = h.lower()

    # Title tag
    titles = re.findall(r"<title[^>]*>(.*?)</title>", h, re.I | re.S)
    title_text = titles[0].strip() if titles else ""
    if not title_text:
        issues.append({"type": "title", "severity": "critical", "detail": "Missing or empty <title> tag.", "url": url})
    elif len(titles) > 1:
        issues.append({"type": "title", "severity": "medium", "detail": f"Duplicate <title> tags ({len(titles)}).", "url": url})

    # Meta description
    has_meta_desc = bool(re.search(r'<meta[^>]+name=["\']description["\'][^>]*>', h, re.I))
    if not has_meta_desc:
        issues.append({"type": "meta", "severity": "medium", "detail": "Missing meta description.", "url": url})

    # H1 tags
    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", h, re.I | re.S)
    if len(h1s) == 0:
        issues.append({"type": "headings", "severity": "high", "detail": "No H1 heading found.", "url": url})
    elif len(h1s) > 1:
        issues.append({"type": "headings", "severity": "medium", "detail": f"Multiple H1 headings ({len(h1s)}).", "url": url})

    # Canonical
    if not re.search(r'<link[^>]+rel=["\']canonical["\']', h, re.I):
        issues.append({"type": "canonical", "severity": "low", "detail": "Missing canonical tag.", "url": url})

    # Viewport meta
    if not re.search(r'<meta[^>]+name=["\']viewport["\']', h, re.I):
        issues.append({"type": "mobile", "severity": "medium", "detail": "Missing viewport meta tag (not mobile-ready).", "url": url})

    # Images missing alt text
    imgs = re.findall(r"<img\b[^>]*>", h, re.I)
    imgs_no_alt = [i for i in imgs if not re.search(r'\balt\s*=', i, re.I)]
    if imgs_no_alt:
        issues.append({
            "type": "images",
            "severity": "low",
            "detail": f"{len(imgs_no_alt)} image(s) missing alt text.",
            "url": url,
        })

    # Thin content (visible text words) — strip tags first.
    text_only = re.sub(r"<[^>]+>", " ", h)
    words = re.findall(r"[a-zA-Z']+", text_only)
    if len(words) < 300:
        issues.append({
            "type": "content",
            "severity": "high",
            "detail": f"Thin content (~{len(words)} words; aim for 300+).",
            "url": url,
        })

    # Oversized HTML
    if len(text_only) > 200_000:
        issues.append({
            "type": "performance",
            "severity": "medium",
            "detail": f"Very large page (~{len(text_only) // 1000}KB of text) — may hurt load time.",
            "url": url,
        })

    return issues


async def run_site_crawl_audit(
    db: AsyncSession, ws_id: uuid.UUID, audit_id: uuid.UUID
) -> SiteCrawlAudit | None:
    """Crawl up to ``max_pages`` from the audit's base_url and aggregate real issues.

    Detects duplicate titles/descriptions across pages and per-page on-page issues.
    Score starts at 100 and is reduced per issue, weighted by severity.
    """
    audit = await get_site_audit(db, ws_id, audit_id)
    if audit is None:
        return None

    from app.tools.crawler import deep_crawl, deep_crawl_many

    base = audit.base_url
    max_pages = int(audit.max_pages or 20)

    try:
        # Seed crawl on the base URL to harvest internal links.
        seed = await deep_crawl(base)
        base_host = _registered_domain(base)
        internal: list[str] = []
        seen: set[str] = {base}
        for link in (getattr(seed, "links", None) or []):
            if not isinstance(link, str):
                continue
            absolute = urljoin(base, link)
            if not absolute.startswith("http"):
                continue
            if _domain_matches(base_host, _registered_domain(absolute)) and absolute not in seen:
                seen.add(absolute)
                internal.append(absolute)
            if len(internal) >= max_pages - 1:
                break

        to_crawl = internal[: max_pages - 1]
        crawled = await deep_crawl_many(to_crawl) if to_crawl else []
        pages = [(base, seed)] + [(c.url, c) for c in crawled]
    except Exception as exc:  # noqa: BLE001
        log.warning("run_site_crawl_audit crawl failed for %s: %s", base, exc)
        return await finalize_site_audit(
            db,
            audit,
            score=0,
            issues=[{
                "type": "crawl",
                "severity": "critical",
                "detail": f"Site crawl failed: {exc}",
                "url": base,
            }],
            pages_crawled=0,
            status="failed",
        )

    all_issues: list[dict] = []
    titles_seen: Counter = Counter()
    descs_seen: Counter = Counter()
    pages_crawled = 0

    for page_url, result in pages:
        ok = bool(getattr(result, "ok", False))
        # Prefer the raw markdown/text which our crawler stores; HTML detection
        # works against whatever markup-ish text is available.
        html = getattr(result, "markdown", "") or getattr(result, "text", "") or ""
        if ok:
            pages_crawled += 1
            title = (getattr(result, "title", "") or "").strip().lower()
            if title:
                titles_seen[title] += 1
            descs = re.findall(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', html, re.I)
            if descs:
                descs_seen[descs[0].strip().lower()] += 1
        all_issues.extend(_detect_page_issues(page_url, html, ok))

    # Cross-page duplicates.
    for title, n in titles_seen.items():
        if n > 1:
            all_issues.append({
                "type": "title",
                "severity": "medium",
                "detail": f"Duplicate <title> used on {n} pages: \"{title[:80]}\".",
                "url": base,
            })
    for desc, n in descs_seen.items():
        if n > 1:
            all_issues.append({
                "type": "meta",
                "severity": "low",
                "detail": f"Duplicate meta description used on {n} pages.",
                "url": base,
            })

    penalty = sum(_SITE_SEVERITY_WEIGHT.get(str(i.get("severity")).lower(), 3) for i in all_issues)
    score = max(0, 100 - penalty)

    return await finalize_site_audit(
        db, audit, score=score, issues=all_issues, pages_crawled=pages_crawled, status="done"
    )


# --------------------------------------------------------------------------- #
# Content gap analysis v2 (SERP research vs own-site content)
# --------------------------------------------------------------------------- #
async def content_gaps_v2(db: AsyncSession, ws_id: uuid.UUID) -> list[dict]:
    """Subtopics/questions present in SERP research for tracked keywords but
    absent from the workspace's own crawled site content.

    Own-site content is sourced from the most recent completed SiteCrawlAudit's
    crawled pages when available; otherwise we degrade to comparing against the
    keyword terms themselves and flag low confidence.
    """
    from app.services.content_optimize import research_serp

    keywords = await list_keywords(db, ws_id)
    tracked = [k for k in keywords if k.is_tracked][:10]
    if not tracked:
        return []

    # Build a corpus of the workspace's own content from the latest site audit.
    own_terms: set[str] = set()
    own_text = ""
    audits = await list_site_audits(db, ws_id)
    done_audits = [a for a in audits if a.status == "done"]
    base_url = done_audits[0].base_url if done_audits else None
    low_confidence = base_url is None

    if base_url:
        try:
            from app.tools.crawler import deep_crawl

            own = await deep_crawl(base_url)
            own_text = (getattr(own, "text", "") or getattr(own, "markdown", "") or "")
            own_terms = {t for t in _tokenize(own_text) if t not in _STOP}
        except Exception as exc:  # noqa: BLE001
            log.warning("content_gaps_v2 own-site crawl failed: %s", exc)
            low_confidence = True

    own_text_low = own_text.lower()
    gaps: list[dict] = []
    for kw in tracked:
        try:
            research = await research_serp(kw.term)
        except Exception as exc:  # noqa: BLE001
            log.warning("content_gaps_v2 research failed for '%s': %s", kw.term, exc)
            continue

        missing_terms = [
            t.term for t in research.target_terms
            if t.importance >= 0.3 and t.term not in own_terms
        ][:15]
        missing_questions = [
            q for q in research.questions
            if q.lower()[:40] not in own_text_low
        ][:8]

        if missing_terms or missing_questions:
            gaps.append({
                "keyword_id": str(kw.id),
                "term": kw.term,
                "missing_terms": missing_terms,
                "missing_questions": missing_questions,
                "recommended_word_count": research.recommended_word_count,
                "competitors_analyzed": research.competitors_analyzed,
                "low_confidence": low_confidence or research.low_confidence,
            })

    return gaps


# --------------------------------------------------------------------------- #
# Brief with real SERP data
# --------------------------------------------------------------------------- #
async def create_brief_with_serp(
    db: AsyncSession, ws_id: uuid.UUID, keyword: str
) -> ContentBrief:
    """Generate a brief that injects real SERP research (terms, word count,
    questions) into the LLM-built structure, then persists it."""
    from app.agents import seo_agent

    data = await seo_agent.content_brief(db, ws_id, keyword)
    outline = {
        "outline": data.get("outline"),
        "key_questions": data.get("key_questions"),
        "entities": data.get("entities"),
        "internal_link_suggestions": data.get("internal_link_suggestions"),
        "secondary_keywords": data.get("secondary_keywords"),
        "meta_description": data.get("meta_description"),
        "search_intent": data.get("search_intent"),
        "serp_research": data.get("serp_research"),
    }
    return await save_brief(
        db,
        ws_id,
        target_keyword=keyword,
        title=data.get("title"),
        outline=outline,
        word_count_target=data.get("word_count_target"),
        brief_md=data.get("brief_md"),
        status="ready",
    )


# --------------------------------------------------------------------------- #
# Content scoring helper
# --------------------------------------------------------------------------- #
async def score_content_for_keyword(
    keyword: str, text_or_url: str
) -> dict:
    """Score content (raw text or a URL to crawl) against SERP research for a keyword."""
    from app.services.content_optimize import research_serp, score_content

    keyword = (keyword or "").strip()
    payload = (text_or_url or "").strip()
    if not keyword or not payload:
        return {"error": "keyword and text_or_url are required", "low_confidence": True}

    text = payload
    crawled_url: str | None = None
    if payload.startswith("http://") or payload.startswith("https://"):
        crawled_url = payload
        try:
            from app.tools.crawler import deep_crawl

            result = await deep_crawl(payload)
            text = (getattr(result, "text", "") or getattr(result, "markdown", "") or "")
        except Exception as exc:  # noqa: BLE001
            log.warning("score_content_for_keyword crawl failed for %s: %s", payload, exc)
            return {"error": f"Could not fetch URL: {exc}", "low_confidence": True}

    research = await research_serp(keyword)
    score = score_content(text, research)
    out = score.to_dict()
    out["keyword"] = keyword
    out["crawled_url"] = crawled_url
    out["low_confidence"] = research.low_confidence
    out["competitors_analyzed"] = research.competitors_analyzed
    return out


# --------------------------------------------------------------------------- #
# Share of voice (weighted visibility from real ranks)
# --------------------------------------------------------------------------- #
async def share_of_voice(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Weighted visibility across tracked, ranked keywords.

    Each ranked keyword contributes ``(1/rank) * weight`` where ``weight`` is the
    keyword's volume_proxy (or 1 when unknown). SOV is normalised against the
    theoretical maximum (every keyword ranking #1) so it reads as 0-100%.
    """
    keywords = await list_keywords(db, ws_id)
    tracked = [k for k in keywords if k.is_tracked]
    ranked = [k for k in tracked if k.current_rank is not None and k.current_rank > 0]

    def _weight(k: SeoKeyword) -> float:
        return float(k.volume_proxy) if k.volume_proxy else 1.0

    actual = sum((1.0 / k.current_rank) * _weight(k) for k in ranked)
    maximum = sum(_weight(k) for k in tracked)  # every kw at rank 1 -> 1/1
    sov_pct = round((actual / maximum) * 100, 1) if maximum > 0 else 0.0

    per_keyword = sorted(
        (
            {
                "keyword_id": str(k.id),
                "term": k.term,
                "rank": k.current_rank,
                "weight": round(_weight(k), 1),
                "visibility": round((1.0 / k.current_rank) * _weight(k), 3),
            }
            for k in ranked
        ),
        key=lambda x: x["visibility"],
        reverse=True,
    )

    return {
        "share_of_voice_pct": sov_pct,
        "visibility_score": round(actual, 3),
        "tracked_count": len(tracked),
        "ranked_count": len(ranked),
        "keywords": per_keyword,
    }


# --------------------------------------------------------------------------- #
# SERP feature detection
# --------------------------------------------------------------------------- #
_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp")
_VIDEO_HOSTS = ("youtube.com", "youtu.be", "vimeo.com", "dailymotion.com")
_LOCAL_MARKERS = (
    "map", "directions", "near me", "located in", "address", "opening hours",
    "phone number", "reviews ·", "·",
)
_QA_RE = re.compile(r"\b(what|how|why|when|where|who|which|is|are|can|do|does)\b.*\?", re.I)


def _result_host(url: str) -> str:
    try:
        return (urlparse(url).netloc or "").lower()
    except Exception:  # noqa: BLE001
        return ""


def _result_path(url: str) -> str:
    try:
        return (urlparse(url).path or "").lower()
    except Exception:  # noqa: BLE001
        return ""


def _detect_features_from_results(serp_results: list) -> list[str]:
    """Heuristically detect likely SERP features from real search results.

    Never invents features: each flag is derived from an observable property of
    the returned results (URL host/path, snippet text, title).
    """
    features: set[str] = set()
    if not serp_results:
        return []

    # featured_snippet: long snippet on the #1 result.
    first = serp_results[0]
    first_snip = (getattr(first, "snippet", "") or "")
    if len(first_snip) > 200:
        features.add("featured_snippet")

    domain_counts: Counter = Counter()
    for idx, r in enumerate(serp_results, start=1):
        title = (getattr(r, "title", "") or "")
        snippet = (getattr(r, "snippet", "") or "")
        url = (getattr(r, "url", "") or "")
        host = _result_host(url)
        path = _result_path(url)
        blob = f"{title} {snippet}".lower()

        if idx <= 5 and host:
            domain_counts[_registered_domain(url)] += 1

        # people also ask
        if "?" in title or _QA_RE.search(snippet):
            features.add("paa")

        # video pack
        if any(v in host for v in _VIDEO_HOSTS) or "/video" in path or path.endswith("/video"):
            features.add("video_pack")

        # image pack
        if host.startswith("images.") or any(path.endswith(ext) for ext in _IMAGE_EXTS):
            features.add("image_pack")

        # local pack
        if any(m in blob for m in _LOCAL_MARKERS):
            features.add("local_pack")

        # ai overview / generative
        if ("ai" in blob and "overview" in blob) or "generative" in blob:
            features.add("ai_overview")

    # sitelinks: same registered domain appearing 2+ times in the top 5.
    if any(c >= 2 for c in domain_counts.values()):
        features.add("sitelinks")

    # Stable ordering for deterministic output.
    order = [
        "featured_snippet", "paa", "sitelinks", "video_pack",
        "image_pack", "local_pack", "ai_overview",
    ]
    return [f for f in order if f in features]


async def detect_serp_features(
    db: AsyncSession, ws_id: uuid.UUID, keyword: SeoKeyword, serp_results: list
) -> dict:
    """Detect likely SERP features for ``keyword`` from real SERP results.

    Persists the detected list on ``keyword.serp_features`` and records a
    ``SeoSerpFeature`` row. If no results were supplied, returns ``awaiting_data``
    and never fabricates features.
    """
    if not serp_results:
        return {
            "status": "awaiting_data",
            "keyword_id": str(keyword.id),
            "features": [],
            "detail": "No SERP results available — connect a search source first.",
        }

    features = _detect_features_from_results(serp_results)
    keyword.serp_features = features
    keyword.last_checked_at = datetime.now(timezone.utc)

    row = SeoSerpFeature(
        workspace_id=ws_id,
        keyword_id=keyword.id,
        features=features,
        detected_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.flush()
    return {
        "status": "detected",
        "keyword_id": str(keyword.id),
        "features": features,
        "results_scanned": len(serp_results),
        "serp_feature_id": str(row.id),
    }


async def detect_serp_features_for_keyword(
    db: AsyncSession, ws_id: uuid.UUID, keyword: SeoKeyword
) -> dict:
    """Run a live SERP scrape for the keyword term, then detect features."""
    from app.tools.web_search import web_search

    try:
        results = await web_search(keyword.term, limit=20)
    except Exception as exc:  # noqa: BLE001
        keyword.last_checked_at = datetime.now(timezone.utc)
        await db.flush()
        log.warning("detect_serp_features search failed for '%s': %s", keyword.term, exc)
        return {
            "status": "low_confidence",
            "keyword_id": str(keyword.id),
            "features": [],
            "detail": f"SERP scrape failed: {exc}",
        }
    return await detect_serp_features(db, ws_id, keyword, results or [])


async def list_serp_features(db: AsyncSession, ws_id: uuid.UUID) -> list[SeoSerpFeature]:
    res = await db.execute(
        select(SeoSerpFeature)
        .where(SeoSerpFeature.workspace_id == ws_id)
        .order_by(SeoSerpFeature.detected_at.desc())
    )
    return list(res.scalars().all())


# --------------------------------------------------------------------------- #
# Competitor keyword gap
# --------------------------------------------------------------------------- #
def _rank_of_domain(results: list, domain: str) -> tuple[int | None, str | None]:
    """1-indexed rank of ``domain`` in ``results`` (None if absent)."""
    for idx, r in enumerate(results, start=1):
        host = _registered_domain(getattr(r, "url", "") or "")
        if _domain_matches(domain, host):
            return idx, (getattr(r, "url", "") or None)
    return None, None


async def competitor_keyword_gap(
    db: AsyncSession,
    ws_id: uuid.UUID,
    your_domain: str,
    competitor_domains: list[str],
    keyword_terms: list[str] | None = None,
) -> dict:
    """Compare your SERP positions against competitors for a set of keywords.

    For each keyword we scrape the live SERP and locate ``your_domain`` plus each
    competitor. Positions that aren't found are reported as ``null`` /
    ``awaiting_data`` — never fabricated.
    """
    your_domain = (your_domain or "").strip()
    competitor_domains = [d.strip() for d in (competitor_domains or []) if d and d.strip()]
    if not your_domain or not competitor_domains:
        return {"status": "error", "detail": "your_domain and competitor_domains are required", "rows": []}

    if keyword_terms:
        terms = [t.strip() for t in keyword_terms if t and t.strip()]
    else:
        keywords = await list_keywords(db, ws_id)
        terms = [k.term for k in keywords if k.is_tracked]

    if not terms:
        return {
            "status": "awaiting_data",
            "detail": "No keywords to compare — track keywords or pass a list.",
            "rows": [],
        }

    from app.tools.web_search import web_search

    rows: list[dict] = []
    low_confidence = False
    for term in terms[:50]:
        try:
            results = await web_search(term, limit=20)
        except Exception as exc:  # noqa: BLE001
            log.warning("competitor_keyword_gap search failed for '%s': %s", term, exc)
            low_confidence = True
            rows.append({
                "keyword": term,
                "your_rank": None,
                "your_status": "awaiting_data",
                "competitors": [
                    {"domain": d, "rank": None, "status": "awaiting_data"} for d in competitor_domains
                ],
                "gap_flags": [],
            })
            continue

        results = results or []
        if not results:
            low_confidence = True

        your_rank, _ = _rank_of_domain(results, your_domain)
        competitors: list[dict] = []
        gap_flags: list[str] = []
        for d in competitor_domains:
            c_rank, _ = _rank_of_domain(results, d)
            competitors.append({
                "domain": d,
                "rank": c_rank,
                "status": "ranked" if c_rank is not None else "awaiting_data",
            })
            if c_rank is not None and c_rank <= 10 and (your_rank is None or your_rank > 10):
                if "competitor_top10" not in gap_flags:
                    gap_flags.append("competitor_top10")

        rows.append({
            "keyword": term,
            "your_rank": your_rank,
            "your_status": "ranked" if your_rank is not None else "awaiting_data",
            "competitors": competitors,
            "gap_flags": gap_flags,
            "results_scanned": len(results),
        })

    return {
        "status": "ok",
        "your_domain": your_domain,
        "competitor_domains": competitor_domains,
        "keywords_compared": len(rows),
        "low_confidence": low_confidence,
        "rows": rows,
    }


# --------------------------------------------------------------------------- #
# Internal link graph
# --------------------------------------------------------------------------- #
_MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")


def _anchor_map_from_markdown(markdown: str) -> dict[str, str]:
    """Best-effort {url: anchor_text} from markdown link syntax."""
    out: dict[str, str] = {}
    for m in _MD_LINK_RE.finditer(markdown or ""):
        anchor = " ".join(m.group(1).split()).strip()
        url = m.group(2).strip()
        if url and anchor and url not in out:
            out[url] = anchor[:300]
    return out


async def create_link_graph(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    base_url: str,
    site_audit_id: uuid.UUID | None = None,
) -> SiteLinkGraph:
    obj = SiteLinkGraph(
        workspace_id=ws_id,
        site_audit_id=site_audit_id,
        base_url=(base_url or "").strip(),
        graph={"nodes": [], "edges": []},
        orphan_pages=[],
        suggestions=[],
        status="running",
    )
    db.add(obj)
    await db.flush()
    return obj


async def list_link_graphs(db: AsyncSession, ws_id: uuid.UUID) -> list[SiteLinkGraph]:
    res = await db.execute(
        select(SiteLinkGraph)
        .where(SiteLinkGraph.workspace_id == ws_id)
        .order_by(SiteLinkGraph.created_at.desc())
    )
    return list(res.scalars().all())


async def get_link_graph(
    db: AsyncSession, ws_id: uuid.UUID, graph_id: uuid.UUID
) -> SiteLinkGraph | None:
    res = await db.execute(
        select(SiteLinkGraph).where(
            SiteLinkGraph.workspace_id == ws_id, SiteLinkGraph.id == graph_id
        )
    )
    return res.scalar_one_or_none()


async def build_link_graph(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    graph_id: uuid.UUID | None = None,
    site_audit_id: uuid.UUID | None = None,
    base_url: str | None = None,
) -> SiteLinkGraph | None:
    """Crawl a site and compute its internal link graph (real crawled links only).

    Builds nodes (crawled pages) and edges (internal links between them), detects
    orphan pages (zero inbound internal links) and suggests internal links from
    topically-related pages. Persists everything on a ``SiteLinkGraph`` row.
    """
    graph_row: SiteLinkGraph | None = None
    if graph_id is not None:
        graph_row = await get_link_graph(db, ws_id, graph_id)
        if graph_row is None:
            return None
        base_url = graph_row.base_url

    # Resolve base_url from the site audit when needed.
    if not base_url and site_audit_id is not None:
        audit = await get_site_audit(db, ws_id, site_audit_id)
        if audit is not None:
            base_url = audit.base_url

    base_url = (base_url or "").strip()
    if not base_url:
        if graph_row is not None:
            graph_row.status = "failed"
            await db.flush()
        return graph_row

    if graph_row is None:
        graph_row = await create_link_graph(
            db, ws_id, base_url=base_url, site_audit_id=site_audit_id
        )

    from app.tools.crawler import deep_crawl, deep_crawl_many

    base_host = _registered_domain(base_url)
    try:
        seed = await deep_crawl(base_url)
    except Exception as exc:  # noqa: BLE001
        log.warning("build_link_graph seed crawl failed for %s: %s", base_url, exc)
        graph_row.status = "failed"
        graph_row.graph = {"nodes": [], "edges": [], "error": str(exc)}
        await db.flush()
        return graph_row

    # Collect internal URLs to crawl from the seed page's links.
    internal: list[str] = []
    seen: set[str] = {base_url}
    for link in (getattr(seed, "links", None) or []):
        if not isinstance(link, str):
            continue
        absolute = urljoin(base_url, link)
        if not absolute.startswith("http"):
            continue
        if _domain_matches(base_host, _registered_domain(absolute)) and absolute not in seen:
            seen.add(absolute)
            internal.append(absolute)
        if len(internal) >= 30:
            break

    try:
        crawled = await deep_crawl_many(internal) if internal else []
    except Exception as exc:  # noqa: BLE001
        log.warning("build_link_graph internal crawl failed: %s", exc)
        crawled = []

    pages = [(base_url, seed)] + [((getattr(c, "url", "") or ""), c) for c in crawled]

    # Build nodes (only successfully-crawled pages count as real nodes).
    node_urls: list[str] = []
    node_titles: dict[str, str] = {}
    for page_url, result in pages:
        if not page_url:
            continue
        if not bool(getattr(result, "ok", False)):
            continue
        if page_url not in node_titles:
            node_urls.append(page_url)
        node_titles[page_url] = (getattr(result, "title", "") or "").strip()

    node_set = set(node_urls)
    nodes = [{"url": u, "title": node_titles.get(u, "")} for u in node_urls]

    # Build edges from real links found on each crawled page.
    edges: list[dict] = []
    inbound: Counter = Counter()
    for page_url, result in pages:
        if not page_url or not bool(getattr(result, "ok", False)):
            continue
        anchors = _anchor_map_from_markdown(getattr(result, "markdown", "") or "")
        for link in (getattr(result, "links", None) or []):
            if not isinstance(link, str):
                continue
            target = urljoin(page_url, link)
            if not target.startswith("http"):
                continue
            if not _domain_matches(base_host, _registered_domain(target)):
                continue
            if target == page_url or target not in node_set:
                continue
            edges.append({
                "from_url": page_url,
                "to_url": target,
                "anchor_text": anchors.get(target) or anchors.get(link) or None,
            })
            inbound[target] += 1

    # Orphan pages: nodes with zero inbound internal links (exclude base/home).
    orphan_pages = [u for u in node_urls if inbound.get(u, 0) == 0 and u != base_url]

    # Suggestions: link to each orphan from the most topically-related page.
    suggestions: list[dict] = []
    for orphan in orphan_pages:
        o_terms = set(_significant_terms(orphan) + _significant_terms(node_titles.get(orphan, "")))
        best_url: str | None = None
        best_overlap = 0
        for cand in node_urls:
            if cand == orphan:
                continue
            c_terms = set(_significant_terms(cand) + _significant_terms(node_titles.get(cand, "")))
            overlap = len(o_terms & c_terms)
            if overlap > best_overlap:
                best_overlap = overlap
                best_url = cand
        suggestions.append({
            "orphan_url": orphan,
            "suggested_from": best_url,
            "shared_terms": best_overlap,
            "detail": (
                f"Add an internal link to this page from {best_url}"
                if best_url else
                "No clearly related page found — link from your most relevant hub page."
            ),
        })

    graph_row.graph = {"nodes": nodes, "edges": edges}
    graph_row.orphan_pages = orphan_pages
    graph_row.suggestions = suggestions
    graph_row.status = "done"
    await db.flush()
    return graph_row


# --------------------------------------------------------------------------- #
# Schema / JSON-LD generator + validator (pure functions)
# --------------------------------------------------------------------------- #
_SCHEMA_TYPE_ALIASES = {
    "faq": "FAQPage",
    "faqpage": "FAQPage",
    "article": "Article",
    "product": "Product",
    "howto": "HowTo",
    "organization": "Organization",
    "breadcrumblist": "BreadcrumbList",
    "breadcrumb": "BreadcrumbList",
}

_SCHEMA_REQUIRED = {
    "Article": ["headline", "author", "datePublished"],
    "Product": ["name", "description"],
    "FAQPage": ["mainEntity"],
    "HowTo": ["name", "step"],
    "Organization": ["name", "url"],
    "BreadcrumbList": ["itemListElement"],
}

_SCHEMA_LIST_PROPS = {"mainEntity", "step", "itemListElement"}


def _canonical_schema_type(schema_type: str) -> str:
    key = (schema_type or "").strip().lower()
    return _SCHEMA_TYPE_ALIASES.get(key, (schema_type or "").strip())


def generate_schema_jsonld(schema_type: str, fields: dict) -> dict:
    """Build a JSON-LD object for ``schema_type`` from ``fields``.

    Returns ``{"jsonld": {...}, "script_tag": "<script ...>...</script>", ...}``.
    Unknown types are still emitted (with a warning) so callers aren't blocked.
    """
    canonical = _canonical_schema_type(schema_type)
    fields = fields if isinstance(fields, dict) else {}

    jsonld: dict = {"@context": "https://schema.org", "@type": canonical or "Thing"}
    for key, value in fields.items():
        if key in ("@context", "@type"):
            continue
        jsonld[key] = value

    known = canonical in _SCHEMA_REQUIRED
    validation = validate_schema_jsonld(jsonld)
    script_tag = (
        '<script type="application/ld+json">'
        + json.dumps(jsonld, ensure_ascii=False, indent=2)
        + "</script>"
    )
    return {
        "jsonld": jsonld,
        "script_tag": script_tag,
        "schema_type": canonical,
        "known_type": known,
        "valid": validation["valid"],
        "errors": validation["errors"],
        "warnings": validation["warnings"],
    }


def validate_schema_jsonld(jsonld: dict) -> dict:
    """Validate required properties for the JSON-LD ``@type``."""
    errors: list[str] = []
    warnings: list[str] = []
    if not isinstance(jsonld, dict):
        return {"valid": False, "errors": ["JSON-LD must be an object."], "warnings": []}

    if not jsonld.get("@context"):
        warnings.append("Missing @context (expected 'https://schema.org').")

    raw_type = jsonld.get("@type")
    if not raw_type:
        return {"valid": False, "errors": ["Missing @type."], "warnings": warnings}

    canonical = _canonical_schema_type(str(raw_type))
    required = _SCHEMA_REQUIRED.get(canonical)
    if required is None:
        warnings.append(f"Unknown or unsupported @type '{raw_type}' — required fields not checked.")
        return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}

    for prop in required:
        value = jsonld.get(prop)
        if value is None or (isinstance(value, str) and not value.strip()):
            errors.append(f"Missing required property '{prop}' for {canonical}.")
            continue
        if prop in _SCHEMA_LIST_PROPS and not isinstance(value, list):
            errors.append(f"Property '{prop}' for {canonical} should be a list.")
        elif prop in _SCHEMA_LIST_PROPS and isinstance(value, list) and not value:
            errors.append(f"Property '{prop}' for {canonical} should not be empty.")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}


# --------------------------------------------------------------------------- #
# Topical authority map
# --------------------------------------------------------------------------- #
async def compute_topic_clusters(db: AsyncSession, ws_id: uuid.UUID) -> list[dict]:
    """Cluster tracked keywords into topics and score topical authority.

    For each cluster we compute coverage (% of keywords ranking in the top 100),
    an authority score weighted by rank quality, and pillar gaps (keywords with
    no rank or rank > 50). Persists ``SeoTopicCluster`` rows (replacing prior
    ones for the workspace).
    """
    keywords = await list_keywords(db, ws_id)
    tracked = [k for k in keywords if k.is_tracked]
    if not tracked:
        # Clear stale clusters so the map reflects reality.
        existing = await db.execute(
            select(SeoTopicCluster).where(SeoTopicCluster.workspace_id == ws_id)
        )
        for row in existing.scalars().all():
            await db.delete(row)
        await db.flush()
        return []

    by_term: dict[str, list] = {}
    for k in tracked:
        by_term.setdefault(k.term, []).append(k)

    terms = list(by_term.keys())
    labels = _cluster_phrases(terms)  # {term: cluster_label}

    grouped: dict[str, list] = {}
    for term in terms:
        label = labels.get(term, "general")
        grouped.setdefault(label, []).extend(by_term[term])

    # Replace existing clusters for the workspace.
    existing = await db.execute(
        select(SeoTopicCluster).where(SeoTopicCluster.workspace_id == ws_id)
    )
    for row in existing.scalars().all():
        await db.delete(row)
    await db.flush()

    out: list[dict] = []
    for topic, members in sorted(grouped.items(), key=lambda kv: len(kv[1]), reverse=True):
        total = len(members)
        ranked_top100 = [m for m in members if m.current_rank is not None and 1 <= m.current_rank <= 100]
        coverage_pct = int(round(len(ranked_top100) / total * 100)) if total else 0

        # Authority weighted by rank quality (rank 1 ≈ 1.0, rank 100 ≈ 0.01).
        visibility_sum = sum(
            max(0.0, (101 - m.current_rank) / 100.0)
            for m in members
            if m.current_rank is not None and 1 <= m.current_rank <= 100
        )
        authority_score = int(round((visibility_sum / total) * 100)) if total else 0
        authority_score = max(0, min(100, authority_score))

        pillar_gaps = [
            m.term for m in members
            if m.current_rank is None or m.current_rank > 50
        ]

        row = SeoTopicCluster(
            workspace_id=ws_id,
            topic=topic[:200],
            keywords=[m.term for m in members],
            keyword_ids=[str(m.id) for m in members],
            coverage_pct=coverage_pct,
            authority_score=authority_score,
            pillar_gaps=pillar_gaps,
            computed_at=datetime.now(timezone.utc),
        )
        db.add(row)
        out.append({
            "topic": topic,
            "keywords": [m.term for m in members],
            "keyword_count": total,
            "coverage_pct": coverage_pct,
            "authority_score": authority_score,
            "pillar_gaps": pillar_gaps,
        })

    await db.flush()
    return out


async def list_topic_clusters(db: AsyncSession, ws_id: uuid.UUID) -> list[SeoTopicCluster]:
    res = await db.execute(
        select(SeoTopicCluster)
        .where(SeoTopicCluster.workspace_id == ws_id)
        .order_by(SeoTopicCluster.authority_score.desc())
    )
    return list(res.scalars().all())


# --------------------------------------------------------------------------- #
# Enhanced content scoring (grade + competitor term gaps)
# --------------------------------------------------------------------------- #
def _letter_grade(score: int | float) -> str:
    s = float(score or 0)
    if s >= 90:
        return "A"
    if s >= 80:
        return "B"
    if s >= 65:
        return "C"
    if s >= 50:
        return "D"
    return "F"


async def score_content_enhanced(keyword: str, text: str) -> dict:
    """Score content against SERP research and add a letter grade + term gaps.

    Builds on the deterministic content scorer: returns all existing score fields
    plus a letter grade, the competitor ``important_terms`` and the
    ``add_terms`` (important competitor terms missing from the text). We never
    suggest removing terms — only note under-used ones.
    """
    from app.services.content_optimize import research_serp, score_content

    keyword = (keyword or "").strip()
    text = (text or "").strip()
    if not keyword or not text:
        return {"error": "keyword and text are required", "low_confidence": True}

    research = await research_serp(keyword)
    score = score_content(text, research)
    out = score.to_dict()

    out["keyword"] = keyword
    out["grade"] = _letter_grade(score.overall)
    out["low_confidence"] = research.low_confidence
    out["competitors_analyzed"] = research.competitors_analyzed

    # important_terms: top competitor terms by importance (from SERP research).
    important_terms = [
        {"term": t.term, "importance": t.importance, "suggested_count": t.suggested_count}
        for t in research.target_terms[:25]
    ]
    out["important_terms"] = important_terms

    # add_terms: important competitor terms NOT yet present (or under-used) in text.
    add_terms: list[dict] = []
    hit_by_term = {ts.term: ts for ts in score.term_scores}
    for t in research.target_terms:
        if t.importance < 0.3:
            continue
        ts = hit_by_term.get(t.term)
        if ts is None or not ts.hit:
            add_terms.append({
                "term": t.term,
                "importance": t.importance,
                "suggested_count": t.suggested_count,
                "actual_count": ts.actual_count if ts else 0,
            })
    out["add_terms"] = add_terms[:20]
    # We never suggest removing terms — surface under-used ones transparently.
    out["remove_terms"] = []

    return out


# --------------------------------------------------------------------------- #
# Backlinks CSV upload (GSC links export)
# --------------------------------------------------------------------------- #
_BL_SOURCE_KEYS = ("source page", "source url", "source", "from", "linking page", "referring page", "url")
_BL_TARGET_KEYS = ("target page", "target url", "target", "to", "destination", "linked page", "destination url")
_BL_ANCHOR_KEYS = ("anchor text", "anchor", "link text")
_BL_DATE_KEYS = ("date first seen", "first seen", "date", "discovered")


def _pick_col(row: dict, keys: tuple[str, ...]) -> str | None:
    for k in keys:
        if k in row and row[k] is not None and str(row[k]).strip():
            return str(row[k]).strip()
    return None


def _parse_date_loose(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(value, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


async def upload_backlinks_csv(
    db: AsyncSession, ws_id: uuid.UUID, csv_content: str, filename: str
) -> dict:
    """Parse a GSC-style backlinks CSV and persist backlinks + referring domains.

    Tolerant of common column-name variations. Returns a summary with counts and
    any per-row errors. Never fabricates rows.
    """
    csv_content = csv_content or ""
    if not csv_content.strip():
        return {"imported": 0, "domains": 0, "errors": ["Empty CSV content."]}

    try:
        reader = csv.DictReader(io.StringIO(csv_content))
    except Exception as exc:  # noqa: BLE001
        return {"imported": 0, "domains": 0, "errors": [f"Could not parse CSV: {exc}"]}

    if not reader.fieldnames:
        return {"imported": 0, "domains": 0, "errors": ["CSV has no header row."]}

    errors: list[str] = []
    imported = 0
    # Aggregate referring-domain counts in this upload before upserting.
    domain_first_seen: dict[str, datetime | None] = {}
    domain_increment: Counter = Counter()

    for i, raw in enumerate(reader, start=2):  # header is row 1
        row = {
            (k or "").strip().lower(): (v if v is not None else "")
            for k, v in raw.items()
        }
        source = _pick_col(row, _BL_SOURCE_KEYS)
        target = _pick_col(row, _BL_TARGET_KEYS)
        if not source or not target:
            errors.append(f"Row {i}: missing source or target URL.")
            continue
        anchor = _pick_col(row, _BL_ANCHOR_KEYS)
        first_seen = _parse_date_loose(_pick_col(row, _BL_DATE_KEYS))
        ref_domain = _registered_domain(source) or _result_host(source)
        if not ref_domain:
            errors.append(f"Row {i}: could not derive referring domain from '{source}'.")
            continue

        db.add(SeoBacklink(
            workspace_id=ws_id,
            source_url=source[:1000],
            target_url=target[:1000],
            anchor_text=(anchor[:500] if anchor else None),
            referring_domain=ref_domain[:300],
            first_seen=first_seen,
            source_file=(filename[:200] if filename else None),
        ))
        imported += 1
        domain_increment[ref_domain] += 1
        if ref_domain not in domain_first_seen:
            domain_first_seen[ref_domain] = first_seen
        elif first_seen is not None:
            prev = domain_first_seen[ref_domain]
            if prev is None or first_seen < prev:
                domain_first_seen[ref_domain] = first_seen

    # Upsert referring domains (increment counts).
    for domain, inc in domain_increment.items():
        res = await db.execute(
            select(SeoReferringDomain).where(
                SeoReferringDomain.workspace_id == ws_id,
                SeoReferringDomain.domain == domain,
            )
        )
        existing = res.scalar_one_or_none()
        first_seen = domain_first_seen.get(domain)
        if existing is None:
            db.add(SeoReferringDomain(
                workspace_id=ws_id,
                domain=domain[:300],
                backlink_count=inc,
                first_seen=first_seen,
            ))
        else:
            existing.backlink_count = (existing.backlink_count or 0) + inc
            if first_seen is not None and (existing.first_seen is None or first_seen < existing.first_seen):
                existing.first_seen = first_seen

    await db.flush()
    return {
        "imported": imported,
        "domains": len(domain_increment),
        "errors": errors,
    }


async def list_backlinks(db: AsyncSession, ws_id: uuid.UUID) -> list[SeoBacklink]:
    res = await db.execute(
        select(SeoBacklink)
        .where(SeoBacklink.workspace_id == ws_id)
        .order_by(SeoBacklink.created_at.desc())
    )
    return list(res.scalars().all())


async def list_referring_domains(db: AsyncSession, ws_id: uuid.UUID) -> list[SeoReferringDomain]:
    res = await db.execute(
        select(SeoReferringDomain)
        .where(SeoReferringDomain.workspace_id == ws_id)
        .order_by(SeoReferringDomain.backlink_count.desc())
    )
    return list(res.scalars().all())


# --------------------------------------------------------------------------- #
# Track all keywords (bulk SERP rank check)
# --------------------------------------------------------------------------- #
async def track_all_keywords(db: AsyncSession, ws_id: uuid.UUID, domain: str) -> dict:
    """Run a SERP rank check for every tracked keyword against ``domain``."""
    domain = (domain or "").strip()
    if not domain:
        return {"status": "error", "detail": "domain is required", "results": []}

    keywords = await list_keywords(db, ws_id)
    tracked = [k for k in keywords if k.is_tracked]
    if not tracked:
        return {"status": "awaiting_data", "detail": "No tracked keywords.", "results": []}

    results: list[dict] = []
    recorded = 0
    not_found = 0
    for kw in tracked:
        try:
            res = await check_keyword_serp(db, ws_id, kw, domain)
        except Exception as exc:  # noqa: BLE001
            log.warning("track_all_keywords check failed for '%s': %s", kw.term, exc)
            res = {"status": "low_confidence", "keyword_id": str(kw.id), "detail": str(exc)}
        if res.get("status") == "recorded":
            recorded += 1
        elif res.get("status") == "not_found":
            not_found += 1
        results.append({"term": kw.term, **res})

    return {
        "status": "ok",
        "domain": domain,
        "checked": len(tracked),
        "recorded": recorded,
        "not_found": not_found,
        "results": results,
    }
