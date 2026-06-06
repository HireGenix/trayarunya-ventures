"""Competitor Watchtower service: always-on competitor monitoring.

Builds a lightweight signal *snapshot* of a competitor's homepage using the
existing crawler, diffs it against the previously stored snapshot (LLM-powered
with a deterministic fallback), and persists real ``WatchEvent`` rows for the
meaningful changes it detects. Nothing here is fabricated — if a site cannot be
fetched we record no events.

``run_watch_cycle`` sweeps every active watch across all workspaces and is safe
to call from the daily ``watchtower_loop`` background task.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from bs4 import BeautifulSoup
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.llm.adapters import complete_json
from app.models import CompetitorWatch, WatchEvent
from app.models.watchtower import WatchTarget, WatchSnapshot, WatchDiff
from app.services.notifications import notify
from app.tools.crawler import deep_crawl

log = logging.getLogger("watchtower")

WATCHTOWER_INTERVAL_SECONDS = 86_400  # daily
WATCHTOWER_INITIAL_DELAY_SECONDS = 90
PER_WATCH_DELAY_SECONDS = 2  # gentle rate-limit between site fetches

VALID_KINDS = {"messaging", "pricing", "content", "launch", "seo", "hiring", "other"}
VALID_IMPORTANCE = {"low", "medium", "high"}

MONITORING_INTERVAL_SECONDS = 43_200  # 12 hours for the monitoring loop
MONITORING_INITIAL_DELAY_SECONDS = 120
VALID_CLASSIFICATIONS = {
    "price_change", "content_change", "new_page", "structure_change", "seo_change",
}

_PRICING_KEYWORDS = [
    "pricing", "price", "/month", "/mo", "per month", "per user", "free trial",
    "free plan", "subscription", "billed annually", "$", "€", "£", "₹",
]


def _normalize_url(website: str) -> str:
    website = (website or "").strip()
    if not website:
        return ""
    if not re.match(r"^https?://", website, re.IGNORECASE):
        website = f"https://{website}"
    return website


def _detect_pricing_signals(text: str) -> list[str]:
    low = text.lower()
    found = []
    for kw in _PRICING_KEYWORDS:
        if kw in low and kw not in found:
            found.append(kw)
    return found[:12]


async def build_snapshot(website: str) -> dict:
    """Fetch a competitor homepage and extract a lightweight signal snapshot.

    Returns a dict with ``ok`` set to False (plus ``error``) when the site can't
    be fetched, so callers never diff against a fabricated snapshot.
    """
    url = _normalize_url(website)
    if not url:
        return {"ok": False, "error": "No website configured", "url": website}

    result = await deep_crawl(url)
    if not result.ok:
        return {"ok": False, "error": result.error or "fetch failed", "url": url}

    title = (result.title or "").strip()
    meta_description = ""
    h1s: list[str] = []
    headline = ""

    # crawl4ai returns markdown; the httpx fallback returns HTML-derived text.
    # Try to parse HTML structure when present in the raw markdown/text.
    raw = result.markdown or result.text or ""
    if "<" in raw and ">" in raw:
        try:
            soup = BeautifulSoup(raw, "lxml")
            md_tag = soup.find("meta", attrs={"name": "description"})
            if md_tag and md_tag.get("content"):
                meta_description = md_tag["content"].strip()
            h1s = [h.get_text(" ", strip=True) for h in soup.find_all("h1")][:8]
        except Exception:  # noqa: BLE001
            pass

    text = " ".join((result.text or raw).split())
    headline = text[:600]
    if not h1s:
        # Derive pseudo-headlines from markdown '# ' headers if available.
        h1s = [
            ln.lstrip("# ").strip()
            for ln in raw.splitlines()
            if ln.strip().startswith("#")
        ][:8]

    return {
        "ok": True,
        "url": url,
        "title": title,
        "meta_description": meta_description,
        "h1s": h1s,
        "headline": headline,
        "pricing_signals": _detect_pricing_signals(text),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def _clean_event(raw: dict, url: str | None) -> dict | None:
    if not isinstance(raw, dict):
        return None
    title = str(raw.get("title") or "").strip()
    if not title:
        return None
    kind = str(raw.get("kind") or "other").strip().lower()
    if kind not in VALID_KINDS:
        kind = "other"
    importance = str(raw.get("importance") or "medium").strip().lower()
    if importance not in VALID_IMPORTANCE:
        importance = "medium"
    detail = str(raw.get("detail") or "").strip() or None
    return {
        "kind": kind,
        "title": title[:400],
        "detail": detail,
        "importance": importance,
        "url": url,
    }


def _deterministic_diff(old: dict, new: dict) -> list[dict]:
    """Fallback diff comparing titles / headlines / pricing without an LLM."""
    events: list[dict] = []
    url = new.get("url")

    old_title = (old.get("title") or "").strip()
    new_title = (new.get("title") or "").strip()
    if new_title and new_title != old_title:
        events.append({
            "kind": "messaging",
            "title": "Homepage title changed",
            "detail": f"From '{old_title}' to '{new_title}'.",
            "importance": "medium",
            "url": url,
        })

    old_h1 = [h.strip() for h in (old.get("h1s") or []) if h.strip()]
    new_h1 = [h.strip() for h in (new.get("h1s") or []) if h.strip()]
    added = [h for h in new_h1 if h not in old_h1]
    if added:
        events.append({
            "kind": "messaging",
            "title": "New headline messaging detected",
            "detail": "; ".join(added[:5]),
            "importance": "medium",
            "url": url,
        })

    old_price = set(old.get("pricing_signals") or [])
    new_price = set(new.get("pricing_signals") or [])
    if new_price and new_price != old_price:
        diff = new_price.symmetric_difference(old_price)
        if diff:
            events.append({
                "kind": "pricing",
                "title": "Pricing signals changed",
                "detail": "Changed pricing keywords: " + ", ".join(sorted(diff)[:10]),
                "importance": "high",
                "url": url,
            })

    old_meta = (old.get("meta_description") or "").strip()
    new_meta = (new.get("meta_description") or "").strip()
    if new_meta and new_meta != old_meta:
        events.append({
            "kind": "seo",
            "title": "Meta description updated",
            "detail": new_meta[:300],
            "importance": "low",
            "url": url,
        })

    return events


async def diff_snapshots(old: dict | None, new: dict) -> list[dict]:
    """Return a list of event dicts {kind,title,detail,importance,url}.

    Uses the LLM to summarize meaningful changes, falling back to a
    deterministic comparison if the model is unavailable or returns nothing
    parseable. No old snapshot means we treat this as a seed (no events).
    """
    if not new or not new.get("ok"):
        return []
    if not old or not old.get("ok"):
        # First observation — nothing to diff against, just seed.
        return []

    url = new.get("url")

    # Try the LLM summarizer first.
    try:
        system = (
            "You are a competitive intelligence analyst. Compare two snapshots of "
            "a competitor's homepage and report only MEANINGFUL changes that a "
            "marketer would care about. Do not invent changes. If nothing material "
            "changed, return an empty list. Respond with strict JSON only."
        )
        payload = {
            "old": {
                "title": old.get("title"),
                "meta_description": old.get("meta_description"),
                "h1s": old.get("h1s"),
                "headline": old.get("headline"),
                "pricing_signals": old.get("pricing_signals"),
            },
            "new": {
                "title": new.get("title"),
                "meta_description": new.get("meta_description"),
                "h1s": new.get("h1s"),
                "headline": new.get("headline"),
                "pricing_signals": new.get("pricing_signals"),
            },
        }
        user = (
            "Compare OLD vs NEW competitor homepage snapshots. Return JSON of the "
            'form {"events": [{"kind": "messaging|pricing|content|launch|seo|'
            'hiring|other", "title": "...", "detail": "...", "importance": '
            '"low|medium|high"}]}. Only include real, observable differences.\n\n'
            f"{payload}"
        )
        out = await complete_json([{"role": "user", "content": user}], system)
        if isinstance(out, dict) and not out.get("_parse_error"):
            raw_events = out.get("events")
            if isinstance(raw_events, list):
                cleaned = [e for e in (_clean_event(r, url) for r in raw_events) if e]
                # An empty list from the LLM is a valid "no material change".
                return cleaned
    except Exception:  # noqa: BLE001
        log.exception("LLM diff failed; using deterministic fallback")

    return _deterministic_diff(old, new)


async def _check_watch(db, watch: CompetitorWatch) -> int:
    """Check a single watch: build snapshot, diff, persist events. Returns count."""
    snapshot = await build_snapshot(watch.website or "")
    watch.last_checked_at = datetime.now(timezone.utc)

    if not snapshot.get("ok"):
        # Don't overwrite a good snapshot with a failed fetch; just record time.
        db.add(watch)
        await db.flush()
        log.info("Watch %s fetch failed: %s", watch.id, snapshot.get("error"))
        return 0

    events = await diff_snapshots(watch.last_snapshot, snapshot)
    created = 0
    for ev in events:
        db.add(WatchEvent(
            workspace_id=watch.workspace_id,
            watch_id=watch.id,
            kind=ev["kind"],
            title=ev["title"],
            detail=ev.get("detail"),
            url=ev.get("url"),
            importance=ev["importance"],
        ))
        created += 1
        if ev["importance"] == "high":
            await notify(
                db, watch.workspace_id,
                level="warning", category="competitor",
                title=f"{watch.name}: {ev['title']}",
                body=ev.get("detail"),
                link="/dashboard/watchtower",
                dedupe_key=f"watch:{watch.id}:{ev['kind']}:{ev['title']}",
            )

    watch.last_snapshot = snapshot
    db.add(watch)
    await db.flush()
    await db.commit()
    return created


async def run_watch_cycle() -> int:
    """Sweep all active watches across every workspace. Returns events created."""
    total = 0
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(CompetitorWatch).where(CompetitorWatch.active.is_(True))
        )
        watches = res.scalars().all()

    for watch in watches:
        try:
            async with AsyncSessionLocal() as db:
                fresh = await db.get(CompetitorWatch, watch.id)
                if fresh is None or not fresh.active:
                    continue
                total += await _check_watch(db, fresh)
        except Exception:  # noqa: BLE001
            log.exception("Watch %s check failed", watch.id)
        try:
            await asyncio.sleep(PER_WATCH_DELAY_SECONDS)
        except asyncio.CancelledError:
            raise

    return total


async def watchtower_loop(stop: asyncio.Event | None = None) -> None:
    """Background loop that runs a competitor watch cycle once per day."""
    log.info("Watchtower loop started (every %ss)", WATCHTOWER_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(WATCHTOWER_INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return
    while not (stop and stop.is_set()):
        try:
            n = await run_watch_cycle()
            if n:
                log.info("Watchtower cycle created %s event(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Watchtower cycle failed")
        try:
            await asyncio.sleep(WATCHTOWER_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break


# =========================================================================== #
# Enterprise watchtower: multi-target page-level monitoring
# =========================================================================== #

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def normalize_text(raw: str) -> str:
    """Strip HTML tags, collapse whitespace, lowercase and strip."""
    if not raw:
        return ""
    text = _TAG_RE.sub(" ", raw)
    text = _WS_RE.sub(" ", text)
    return text.lower().strip()


def content_hash(text: str) -> str:
    """SHA-256 hex digest of the normalized text."""
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


def _snapshot_text(snap: dict) -> str:
    """Build a representative text blob from a snapshot's signal fields."""
    parts: list[str] = [
        str(snap.get("title") or ""),
        str(snap.get("meta_description") or ""),
        " ".join(str(h) for h in (snap.get("h1s") or [])),
        str(snap.get("headline") or ""),
        " ".join(str(p) for p in (snap.get("pricing_signals") or [])),
    ]
    return " ".join(p for p in parts if p).strip()


def classify_change(old_snap: dict, new_snap: dict) -> str:
    """Deterministically classify the type of change between two snapshots."""
    old_price = set(old_snap.get("pricing_signals") or [])
    new_price = set(new_snap.get("pricing_signals") or [])
    if (bool(old_price) != bool(new_price)) or (old_price != new_price):
        return "price_change"

    old_title = (old_snap.get("title") or "").strip()
    new_title = (new_snap.get("title") or "").strip()
    old_h1 = [h.strip() for h in (old_snap.get("h1s") or []) if str(h).strip()]
    new_h1 = [h.strip() for h in (new_snap.get("h1s") or []) if str(h).strip()]
    if old_title != new_title and old_h1 != new_h1:
        return "structure_change"

    old_meta = (old_snap.get("meta_description") or "").strip()
    new_meta = (new_snap.get("meta_description") or "").strip()
    if old_meta != new_meta and old_title == new_title and old_h1 == new_h1:
        return "seo_change"

    return "content_change"


def build_diff_detail(old_snap: dict, new_snap: dict) -> dict:
    """Build a structured diff dict between two snapshots."""
    old_title = (old_snap.get("title") or "").strip()
    new_title = (new_snap.get("title") or "").strip()

    old_h1 = [h.strip() for h in (old_snap.get("h1s") or []) if str(h).strip()]
    new_h1 = [h.strip() for h in (new_snap.get("h1s") or []) if str(h).strip()]
    h1s_added = [h for h in new_h1 if h not in old_h1]
    h1s_removed = [h for h in old_h1 if h not in new_h1]

    old_meta = (old_snap.get("meta_description") or "").strip()
    new_meta = (new_snap.get("meta_description") or "").strip()

    old_price = set(old_snap.get("pricing_signals") or [])
    new_price = set(new_snap.get("pricing_signals") or [])
    pricing_added = sorted(new_price - old_price)
    pricing_removed = sorted(old_price - new_price)

    old_headline = (old_snap.get("headline") or "").strip()
    new_headline = (new_snap.get("headline") or "").strip()

    return {
        "title_changed": old_title != new_title,
        "title_old": old_title,
        "title_new": new_title,
        "h1s_added": h1s_added,
        "h1s_removed": h1s_removed,
        "meta_changed": old_meta != new_meta,
        "meta_old": old_meta,
        "meta_new": new_meta,
        "pricing_added": pricing_added,
        "pricing_removed": pricing_removed,
        "headline_changed": old_headline != new_headline,
    }


async def summarize_diff_llm(
    old_snap: dict, new_snap: dict, classification: str
) -> str | None:
    """Try to get an LLM summary of the diff. Returns None on failure."""
    try:
        system = (
            "You are a competitive intelligence analyst. Summarize the specific "
            "changes detected between two snapshots. Be factual and concise. "
            'Return JSON: {"summary": "..."}'
        )
        payload = {
            "classification": classification,
            "old": {
                "title": old_snap.get("title"),
                "meta_description": old_snap.get("meta_description"),
                "h1s": old_snap.get("h1s"),
                "headline": old_snap.get("headline"),
                "pricing_signals": old_snap.get("pricing_signals"),
            },
            "new": {
                "title": new_snap.get("title"),
                "meta_description": new_snap.get("meta_description"),
                "h1s": new_snap.get("h1s"),
                "headline": new_snap.get("headline"),
                "pricing_signals": new_snap.get("pricing_signals"),
            },
        }
        user = (
            "Summarize the specific changes between OLD and NEW competitor page "
            'snapshots. Return JSON {"summary": "..."}.\n\n'
            f"{payload}"
        )
        out = await complete_json([{"role": "user", "content": user}], system)
        if isinstance(out, dict) and not out.get("_parse_error"):
            summary = out.get("summary")
            if isinstance(summary, str) and summary.strip():
                return summary.strip()
    except Exception:  # noqa: BLE001
        log.exception("LLM diff summary failed")
    return None


_CLASSIFICATION_TO_KIND = {
    "price_change": "pricing",
    "seo_change": "seo",
    "structure_change": "content",
    "content_change": "content",
    "new_page": "launch",
}


def _snapshot_to_dict(snap: WatchSnapshot) -> dict:
    """Project a WatchSnapshot row into the signal dict used for diffing."""
    return {
        "title": snap.title,
        "meta_description": snap.meta_description,
        "h1s": snap.h1s or [],
        "headline": snap.headline,
        "pricing_signals": snap.pricing_signals or [],
    }


async def check_target(db: AsyncSession, target: WatchTarget) -> WatchDiff | None:
    """Fetch a target, snapshot it, diff against the previous snapshot."""
    now = datetime.now(timezone.utc)
    snapshot = await build_snapshot(target.url)

    if not snapshot.get("ok"):
        target.status = "fetch_failed"
        target.last_checked_at = now
        db.add(target)
        await db.flush()
        await db.commit()
        log.info("Target %s fetch failed: %s", target.id, snapshot.get("error"))
        return None

    text = _snapshot_text(snapshot)
    new_hash = content_hash(text)

    snap_row = WatchSnapshot(
        workspace_id=target.workspace_id,
        target_id=target.id,
        content_hash=new_hash,
        title=snapshot.get("title"),
        meta_description=snapshot.get("meta_description"),
        h1s=snapshot.get("h1s") or [],
        headline=snapshot.get("headline"),
        pricing_signals=snapshot.get("pricing_signals") or [],
        raw_text_length=len(normalize_text(text)),
        fetched_at=now,
    )
    db.add(snap_row)
    await db.flush()

    # First observation — seed the baseline, emit no diff.
    if target.last_content_hash is None:
        target.status = "awaiting_baseline"
        target.last_content_hash = new_hash
        target.last_checked_at = now
        db.add(target)
        await db.flush()
        await db.commit()
        return None

    # No change since last check.
    if new_hash == target.last_content_hash:
        target.status = "ok"
        target.last_checked_at = now
        db.add(target)
        await db.flush()
        await db.commit()
        return None

    # Content changed — find the previous snapshot (the one before snap_row).
    prev_res = await db.execute(
        select(WatchSnapshot)
        .where(WatchSnapshot.target_id == target.id)
        .order_by(WatchSnapshot.fetched_at.desc())
        .offset(1)
        .limit(1)
    )
    prev_snap = prev_res.scalars().first()

    old_snap = _snapshot_to_dict(prev_snap) if prev_snap else {}
    new_snap = _snapshot_to_dict(snap_row)

    classification = classify_change(old_snap, new_snap)
    detail = build_diff_detail(old_snap, new_snap)

    try:
        summary = await summarize_diff_llm(old_snap, new_snap, classification)
    except Exception:  # noqa: BLE001
        log.exception("Diff summary failed for target %s", target.id)
        summary = None

    if classification == "price_change":
        importance = "high"
    elif classification == "seo_change":
        importance = "low"
    else:
        importance = "medium"

    diff_row = WatchDiff(
        workspace_id=target.workspace_id,
        target_id=target.id,
        old_snapshot_id=prev_snap.id if prev_snap else None,
        new_snapshot_id=snap_row.id,
        classification=classification,
        summary=summary,
        detail=detail,
        importance=importance,
        detected_at=now,
    )
    db.add(diff_row)

    # Backwards-compat WatchEvent on the parent CompetitorWatch.
    kind = _CLASSIFICATION_TO_KIND.get(classification, "content")
    event_title = f"{classification.replace('_', ' ').title()} detected"
    watch = await db.get(CompetitorWatch, target.watch_id)
    db.add(WatchEvent(
        workspace_id=target.workspace_id,
        watch_id=target.watch_id,
        kind=kind,
        title=event_title,
        detail=summary,
        url=target.url,
        importance=importance,
    ))

    target.status = "ok"
    target.last_content_hash = new_hash
    target.last_checked_at = now
    db.add(target)
    await db.flush()

    if importance == "high":
        watch_name = watch.name if watch else (target.label or target.url)
        await notify(
            db, target.workspace_id,
            level="warning", category="competitor",
            title=f"{watch_name}: {event_title}",
            body=summary,
            link="/dashboard/watchtower",
            dedupe_key=f"target:{target.id}:{classification}:{new_hash[:12]}",
        )

    await db.commit()
    return diff_row


async def run_monitoring_cycle() -> int:
    """Sweep all active targets that are due for re-check. Returns diffs created."""
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(WatchTarget).where(WatchTarget.active.is_(True))
        )
        targets = res.scalars().all()

    due: list[uuid.UUID] = []
    for t in targets:
        if t.last_checked_at is None:
            due.append(t.id)
            continue
        last = t.last_checked_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if last + timedelta(seconds=t.check_interval_seconds) < now:
            due.append(t.id)

    total = 0
    for target_id in due:
        try:
            async with AsyncSessionLocal() as db:
                fresh = await db.get(WatchTarget, target_id)
                if fresh is None or not fresh.active:
                    continue
                diff = await check_target(db, fresh)
                if diff is not None:
                    total += 1
        except Exception:  # noqa: BLE001
            log.exception("Target %s check failed", target_id)
        try:
            await asyncio.sleep(PER_WATCH_DELAY_SECONDS)
        except asyncio.CancelledError:
            raise

    return total


async def monitoring_loop(stop: asyncio.Event | None = None) -> None:
    """Background loop that sweeps watch targets on a fixed interval."""
    log.info("Monitoring loop started (every %ss)", MONITORING_INTERVAL_SECONDS)
    try:
        await asyncio.sleep(MONITORING_INITIAL_DELAY_SECONDS)
    except asyncio.CancelledError:
        return
    while not (stop and stop.is_set()):
        try:
            n = await run_monitoring_cycle()
            if n:
                log.info("Monitoring cycle created %s diff(s)", n)
        except asyncio.CancelledError:
            break
        except Exception:  # noqa: BLE001
            log.exception("Monitoring cycle failed")
        try:
            await asyncio.sleep(MONITORING_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break


# --------------------------------------------------------------------------- #
# Service functions for the router
# --------------------------------------------------------------------------- #
async def list_targets(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    watch_id: uuid.UUID | None = None,
) -> list[WatchTarget]:
    """List watch targets for a workspace, optionally filtered by watch."""
    stmt = select(WatchTarget).where(WatchTarget.workspace_id == workspace_id)
    if watch_id is not None:
        stmt = stmt.where(WatchTarget.watch_id == watch_id)
    stmt = stmt.order_by(WatchTarget.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def create_target(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    watch_id: uuid.UUID,
    url: str,
    label: str | None = None,
) -> WatchTarget:
    """Create a new watch target after normalizing its URL."""
    target = WatchTarget(
        workspace_id=workspace_id,
        watch_id=watch_id,
        url=_normalize_url(url),
        label=label,
    )
    db.add(target)
    await db.flush()
    await db.commit()
    await db.refresh(target)
    return target


async def get_target_snapshots(
    db: AsyncSession, target_id: uuid.UUID, limit: int = 20
) -> list[WatchSnapshot]:
    """Return recent snapshots for a target, newest first."""
    res = await db.execute(
        select(WatchSnapshot)
        .where(WatchSnapshot.target_id == target_id)
        .order_by(WatchSnapshot.fetched_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def get_target_diffs(
    db: AsyncSession, target_id: uuid.UUID, limit: int = 20
) -> list[WatchDiff]:
    """Return recent diffs for a target, newest first."""
    res = await db.execute(
        select(WatchDiff)
        .where(WatchDiff.target_id == target_id)
        .order_by(WatchDiff.detected_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


def _snapshot_payload(snap: WatchSnapshot | None) -> dict | None:
    if snap is None:
        return None
    return {
        "id": str(snap.id),
        "content_hash": snap.content_hash,
        "title": snap.title,
        "meta_description": snap.meta_description,
        "h1s": snap.h1s or [],
        "headline": snap.headline,
        "pricing_signals": snap.pricing_signals or [],
        "raw_text_length": snap.raw_text_length,
        "fetched_at": snap.fetched_at.isoformat() if snap.fetched_at else None,
    }


async def get_diff_detail(db: AsyncSession, diff_id: uuid.UUID) -> dict | None:
    """Return a single diff with its old and new snapshots, or None."""
    diff = await db.get(WatchDiff, diff_id)
    if diff is None:
        return None

    old_snap = (
        await db.get(WatchSnapshot, diff.old_snapshot_id)
        if diff.old_snapshot_id else None
    )
    new_snap = (
        await db.get(WatchSnapshot, diff.new_snapshot_id)
        if diff.new_snapshot_id else None
    )

    return {
        "id": str(diff.id),
        "workspace_id": str(diff.workspace_id),
        "target_id": str(diff.target_id),
        "classification": diff.classification,
        "summary": diff.summary,
        "detail": diff.detail,
        "importance": diff.importance,
        "detected_at": diff.detected_at.isoformat() if diff.detected_at else None,
        "old_snapshot": _snapshot_payload(old_snap),
        "new_snapshot": _snapshot_payload(new_snap),
    }


async def get_timeline(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    watch_id: uuid.UUID | None = None,
    days: int = 90,
) -> list[dict]:
    """Return daily change frequency for a timeline chart."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(WatchDiff)
        .where(WatchDiff.workspace_id == workspace_id)
        .where(WatchDiff.detected_at >= since)
    )
    if watch_id is not None:
        stmt = stmt.join(WatchTarget, WatchTarget.id == WatchDiff.target_id).where(
            WatchTarget.watch_id == watch_id
        )
    res = await db.execute(stmt)
    diffs = res.scalars().all()

    buckets: dict[str, dict[str, int]] = {}
    for d in diffs:
        if not d.detected_at:
            continue
        day = d.detected_at.date().isoformat()
        bucket = buckets.setdefault(
            day, {"changes": 0, "high": 0, "medium": 0, "low": 0}
        )
        bucket["changes"] += 1
        if d.importance in ("high", "medium", "low"):
            bucket[d.importance] += 1

    return [
        {
            "date": day,
            "changes": b["changes"],
            "high": b["high"],
            "medium": b["medium"],
            "low": b["low"],
        }
        for day, b in sorted(buckets.items())
    ]
