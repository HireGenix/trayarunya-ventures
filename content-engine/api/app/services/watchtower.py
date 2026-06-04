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
import logging
import re
import uuid
from datetime import datetime, timezone

from bs4 import BeautifulSoup
from sqlalchemy import func, select

from app.db import AsyncSessionLocal
from app.llm.adapters import complete_json
from app.models import CompetitorWatch, WatchEvent
from app.services.notifications import notify
from app.tools.crawler import deep_crawl

log = logging.getLogger("watchtower")

WATCHTOWER_INTERVAL_SECONDS = 86_400  # daily
WATCHTOWER_INITIAL_DELAY_SECONDS = 90
PER_WATCH_DELAY_SECONDS = 2  # gentle rate-limit between site fetches

VALID_KINDS = {"messaging", "pricing", "content", "launch", "seo", "hiring", "other"}
VALID_IMPORTANCE = {"low", "medium", "high"}

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
