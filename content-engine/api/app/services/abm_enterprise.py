"""ABM enterprise service: fit scoring, intent signals, tiering, play ops.

All scores are deterministic and transparent — derived from real account
attributes matched against workspace ICP and real engagement signals. LLM is
used ONLY for copy generation (which still lives in the old abm service module).

Public surface:

    score_account_fit    -> ICP-fit score with per-factor breakdown
    score_account_intent -> engagement/intent score from real signal tables
    tier_account         -> 2-axis fit x intent -> A/B/C tier
    score_all_accounts   -> batch-recompute for a workspace
    create_play / list_plays / get_play
    add_play_step / reorder_steps
    enroll_account / advance_enrollment / list_enrollments
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.abm_play import (
    AbmPlay,
    AbmPlayEnrollment,
    AbmPlayStep,
    ENROLLMENT_STATUSES,
    PLAY_STATUSES,
)
from app.models.conversion import ConversionEvent
from app.models.email import EmailSendLog
from app.models.funnels import FunnelVisit
from app.models.icp import ICPProfile
from app.models.platform import AbmAccount

log = logging.getLogger("abm_service")

# ── Fit-scoring weights (sum = 100) ──────────────────────────────────────── #
_W_INDUSTRY = 30
_W_SIZE = 20
_W_GEO = 15
_W_TECH = 20
_W_STAGE = 15

_SIZE_BANDS = {
    "enterprise": ["enterprise", "10000+", "5000+", "1000+", "large"],
    "mid_market": ["mid-market", "mid_market", "midmarket", "500+", "200+", "medium"],
    "smb": ["smb", "small", "startup", "1-50", "51-200", "micro"],
}


def _normalize(text: str | None) -> str:
    return (text or "").strip().lower()


def _industry_score(account_industry: str | None, icp_industry: str | None) -> tuple[int, str]:
    """Score industry match: exact=100, partial=50, miss=0."""
    ai = _normalize(account_industry)
    ii = _normalize(icp_industry)
    if not ai or not ii:
        return (0, "no_data") if not ai else (30, "icp_unset")
    if ai == ii:
        return (100, "exact_match")
    if ai in ii or ii in ai:
        return (50, "partial_match")
    return (0, "mismatch")


def _size_score(firmographics: dict | None, icp_b2b: dict | None) -> tuple[int, str]:
    """Score company-size band match against ICP b2b.target_company_size."""
    fg = firmographics or {}
    size_raw = _normalize(str(fg.get("employees") or fg.get("size") or fg.get("company_size") or ""))
    icp_size = _normalize(str((icp_b2b or {}).get("target_company_size", "")))
    if not size_raw:
        return (0, "no_data")
    if not icp_size:
        return (40, "icp_unset")

    def _band(val: str) -> str | None:
        for band, aliases in _SIZE_BANDS.items():
            for a in aliases:
                if a in val:
                    return band
        return None

    ab = _band(size_raw)
    ib = _band(icp_size)
    if ab and ib:
        if ab == ib:
            return (100, f"band_match:{ab}")
        return (30, f"band_mismatch:{ab}_vs_{ib}")
    if size_raw == icp_size:
        return (100, "exact_text_match")
    return (20, "unresolved")


def _geo_score(firmographics: dict | None, icp_geos: list | None) -> tuple[int, str]:
    """Score geography match."""
    fg = firmographics or {}
    acct_geo = _normalize(str(fg.get("hq") or fg.get("country") or fg.get("region") or fg.get("geography") or ""))
    if not acct_geo:
        return (0, "no_data")
    targets = [_normalize(str(g)) for g in (icp_geos or []) if g]
    if not targets:
        return (50, "icp_unset")
    for t in targets:
        if acct_geo in t or t in acct_geo:
            return (100, f"match:{t}")
    return (0, "mismatch")


def _tech_score(
    firmographics: dict | None,
    notes: str | None,
    icp_keywords: list | None,
) -> tuple[int, str]:
    """Score technology/keyword overlap between account attributes and ICP."""
    fg = firmographics or {}
    blob = _normalize(
        " ".join(
            str(v)
            for v in [
                fg.get("tech_stack"),
                fg.get("technologies"),
                fg.get("tools"),
                notes,
            ]
            if v
        )
    )
    if not blob:
        return (0, "no_data")
    kws = [_normalize(str(k)) for k in (icp_keywords or []) if k]
    if not kws:
        return (30, "icp_unset")
    hits = [k for k in kws if k in blob]
    if not hits:
        return (0, "no_keyword_overlap")
    ratio = len(hits) / len(kws)
    score = min(int(ratio * 100), 100)
    return (score, f"matched:{','.join(hits[:5])}")


def _stage_score(stage: str) -> tuple[int, str]:
    """Later funnel stages score higher."""
    stage_map = {
        "won": 100,
        "opportunity": 80,
        "engaging": 60,
        "researching": 40,
        "new": 20,
        "lost": 10,
    }
    s = stage_map.get(stage, 20)
    return (s, stage)


def compute_fit_score(
    account: AbmAccount,
    icp: ICPProfile | None,
) -> dict[str, Any]:
    """Deterministic ICP-fit score with transparent per-factor breakdown."""
    icp_industry = icp.industry if icp else None
    icp_b2b = icp.b2b if icp else None
    icp_geos = icp.geographies if icp else None
    icp_keywords = icp.keywords if icp else None

    ind_s, ind_r = _industry_score(account.industry, icp_industry)
    size_s, size_r = _size_score(account.firmographics, icp_b2b)
    geo_s, geo_r = _geo_score(account.firmographics, icp_geos)
    tech_s, tech_r = _tech_score(account.firmographics, account.notes, icp_keywords)
    stg_s, stg_r = _stage_score(account.stage)

    weighted = (
        ind_s * _W_INDUSTRY
        + size_s * _W_SIZE
        + geo_s * _W_GEO
        + tech_s * _W_TECH
        + stg_s * _W_STAGE
    ) / 100

    factors = {
        "industry": {"score": ind_s, "weight": _W_INDUSTRY, "reason": ind_r},
        "size": {"score": size_s, "weight": _W_SIZE, "reason": size_r},
        "geo": {"score": geo_s, "weight": _W_GEO, "reason": geo_r},
        "tech_keywords": {"score": tech_s, "weight": _W_TECH, "reason": tech_r},
        "stage": {"score": stg_s, "weight": _W_STAGE, "reason": stg_r},
    }
    missing = [k for k, v in factors.items() if v["reason"] == "no_data"]

    return {
        "fit_score": round(weighted, 1),
        "factors": factors,
        "missing_signals": missing,
        "icp_available": icp is not None,
    }


# ── Intent scoring (real signals) ───────────────────────────────────────── #

async def _count_conversion_signals(
    db: AsyncSession,
    ws_id: uuid.UUID,
    company: str,
    website: str | None,
    lookback_days: int = 90,
) -> dict[str, int]:
    """Count conversion events that can be attributed to this account."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    filters = [
        ConversionEvent.workspace_id == ws_id,
        ConversionEvent.occurred_at >= cutoff,
    ]
    domain = _extract_domain(website)
    if domain:
        filters.append(
            func.lower(ConversionEvent.referrer).contains(domain)
        )
    else:
        filters.append(
            func.lower(func.coalesce(ConversionEvent.contact_ref, "")).contains(
                _normalize(company).split()[0] if company else ""
            )
        )

    stmt = (
        select(ConversionEvent.event_type, func.count(ConversionEvent.id))
        .where(*filters)
        .group_by(ConversionEvent.event_type)
    )
    res = await db.execute(stmt)
    return {str(et): int(n) for et, n in res.all()}


async def _count_email_signals(
    db: AsyncSession,
    ws_id: uuid.UUID,
    company: str,
    lookback_days: int = 90,
) -> dict[str, int]:
    """Count email engagement signals attributable to this account."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    company_token = _normalize(company).split()[0] if company else ""
    if not company_token:
        return {}

    stmt = select(
        func.count(EmailSendLog.id).label("total"),
        func.count(EmailSendLog.opened_at).label("opens"),
        func.count(EmailSendLog.clicked_at).label("clicks"),
    ).where(
        EmailSendLog.workspace_id == ws_id,
        EmailSendLog.created_at >= cutoff,
        func.lower(func.coalesce(EmailSendLog.email, "")).contains(company_token),
    )
    row = (await db.execute(stmt)).one_or_none()
    if not row:
        return {}
    return {
        "email_sent": int(row.total or 0),
        "email_opened": int(row.opens or 0),
        "email_clicked": int(row.clicks or 0),
    }


async def _count_funnel_signals(
    db: AsyncSession,
    ws_id: uuid.UUID,
    lookback_days: int = 90,
) -> int:
    """Count recent funnel visits for the workspace (aggregate, not per-account)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    stmt = select(func.count(FunnelVisit.id)).where(
        FunnelVisit.workspace_id == ws_id,
        FunnelVisit.occurred_at >= cutoff,
    )
    return int((await db.execute(stmt)).scalar() or 0)


def _extract_domain(website: str | None) -> str | None:
    if not website:
        return None
    w = website.lower().replace("https://", "").replace("http://", "").strip("/")
    w = w.split("/")[0]
    if w.startswith("www."):
        w = w[4:]
    return w if w else None


def _compute_intent_from_signals(
    conversion_counts: dict[str, int],
    email_signals: dict[str, int],
) -> dict[str, Any]:
    """Deterministic intent score from real engagement counts."""
    score = 0.0
    breakdown: dict[str, Any] = {}

    # Conversion events
    total_conv = sum(conversion_counts.values())
    if total_conv > 0:
        conv_score = min(total_conv * 5, 40)
        score += conv_score
        breakdown["conversion_events"] = {
            "count": total_conv,
            "points": conv_score,
            "types": conversion_counts,
        }

    # Email engagement
    opens = email_signals.get("email_opened", 0)
    clicks = email_signals.get("email_clicked", 0)
    email_score = min(opens * 3 + clicks * 8, 35)
    if opens or clicks:
        score += email_score
        breakdown["email_engagement"] = {
            "opens": opens,
            "clicks": clicks,
            "points": email_score,
        }

    # Sent but no engagement = weak negative signal
    sent = email_signals.get("email_sent", 0)
    if sent > 0 and opens == 0 and clicks == 0:
        breakdown["email_engagement"] = {
            "sent": sent,
            "opens": 0,
            "clicks": 0,
            "points": 0,
            "note": "emails_sent_but_no_engagement",
        }

    has_any_signal = bool(conversion_counts or any(v > 0 for v in email_signals.values()))
    missing: list[str] = []
    if not conversion_counts:
        missing.append("conversion_events")
    if not any(v > 0 for v in email_signals.values()):
        missing.append("email_engagement")

    return {
        "intent_score": round(min(score, 100), 1),
        "breakdown": breakdown,
        "signals_available": has_any_signal,
        "missing_signals": missing,
    }


async def score_account_intent(
    db: AsyncSession,
    ws_id: uuid.UUID,
    account: AbmAccount,
) -> dict[str, Any]:
    """Real intent/engagement score for one account."""
    conv = await _count_conversion_signals(db, ws_id, account.company, account.website)
    email = await _count_email_signals(db, ws_id, account.company)
    return _compute_intent_from_signals(conv, email)


# ── Tiering (fit × intent) ──────────────────────────────────────────────── #

def compute_tier(fit_score: float, intent_score: float) -> str:
    """Deterministic 2-axis tier assignment.

    High fit + high intent = tier_1 (best)
    Either high            = tier_2
    Both low               = tier_3
    """
    high_fit = fit_score >= 50
    high_intent = intent_score >= 30
    if high_fit and high_intent:
        return "tier_1"
    if high_fit or high_intent:
        return "tier_2"
    return "tier_3"


async def score_and_tier_account(
    db: AsyncSession,
    ws_id: uuid.UUID,
    account: AbmAccount,
    icp: ICPProfile | None,
) -> dict[str, Any]:
    """Full score + tier for one account. Persists to the row."""
    fit = compute_fit_score(account, icp)
    intent = await score_account_intent(db, ws_id, account)
    tier = compute_tier(fit["fit_score"], intent["intent_score"])

    account.fit_score = fit["fit_score"]
    account.intent_score = intent["intent_score"]
    account.fit_factors = fit["factors"]
    account.tier = tier

    return {
        "account_id": str(account.id),
        "company": account.company,
        "fit": fit,
        "intent": intent,
        "tier": tier,
    }


async def score_all_accounts(
    db: AsyncSession,
    ws_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Batch recompute fit + intent + tier for every account in a workspace."""
    icp = (
        await db.execute(select(ICPProfile).where(ICPProfile.workspace_id == ws_id))
    ).scalar_one_or_none()

    stmt = (
        select(AbmAccount)
        .where(AbmAccount.workspace_id == ws_id)
        .order_by(AbmAccount.created_at.desc())
    )
    accounts = (await db.execute(stmt)).scalars().all()

    results: list[dict[str, Any]] = []
    for acct in accounts:
        r = await score_and_tier_account(db, ws_id, acct, icp)
        results.append(r)

    await db.flush()
    return results


# ── Play CRUD ────────────────────────────────────────────────────────────── #

async def create_play(
    db: AsyncSession,
    ws_id: uuid.UUID,
    name: str,
    description: str | None = None,
    steps: list[dict[str, Any]] | None = None,
) -> AbmPlay:
    play = AbmPlay(
        workspace_id=ws_id,
        name=name,
        description=description,
        status="draft",
    )
    db.add(play)
    await db.flush()

    if steps:
        for i, s in enumerate(steps):
            step = AbmPlayStep(
                play_id=play.id,
                workspace_id=ws_id,
                ordinal=i,
                channel=s.get("channel", "email"),
                subject=s.get("subject"),
                body=s.get("body"),
                delay_days=int(s.get("delay_days") or 0),
                config=s.get("config"),
            )
            db.add(step)
        await db.flush()
        play.step_summary = [
            {"ordinal": i, "channel": s.get("channel", "email"), "subject": s.get("subject")}
            for i, s in enumerate(steps)
        ]
        await db.flush()

    return play


async def list_plays(
    db: AsyncSession,
    ws_id: uuid.UUID,
) -> list[AbmPlay]:
    stmt = (
        select(AbmPlay)
        .where(AbmPlay.workspace_id == ws_id)
        .order_by(AbmPlay.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_play(
    db: AsyncSession,
    ws_id: uuid.UUID,
    play_id: uuid.UUID,
) -> AbmPlay | None:
    play = await db.get(AbmPlay, play_id)
    if play and play.workspace_id == ws_id:
        return play
    return None


async def get_play_steps(
    db: AsyncSession,
    play_id: uuid.UUID,
) -> list[AbmPlayStep]:
    stmt = (
        select(AbmPlayStep)
        .where(AbmPlayStep.play_id == play_id)
        .order_by(AbmPlayStep.ordinal)
    )
    return list((await db.execute(stmt)).scalars().all())


async def update_play(
    db: AsyncSession,
    play: AbmPlay,
    **kwargs: Any,
) -> AbmPlay:
    for k, v in kwargs.items():
        if hasattr(play, k) and v is not None:
            setattr(play, k, v)
    await db.flush()
    return play


async def delete_play(db: AsyncSession, play: AbmPlay) -> None:
    await db.execute(
        delete(AbmPlayStep).where(AbmPlayStep.play_id == play.id)
    )
    await db.execute(
        delete(AbmPlayEnrollment).where(AbmPlayEnrollment.play_id == play.id)
    )
    await db.delete(play)
    await db.flush()


# ── Enrollment ───────────────────────────────────────────────────────────── #

async def enroll_account(
    db: AsyncSession,
    ws_id: uuid.UUID,
    play_id: uuid.UUID,
    account_id: uuid.UUID,
) -> AbmPlayEnrollment:
    enrollment = AbmPlayEnrollment(
        play_id=play_id,
        account_id=account_id,
        workspace_id=ws_id,
        status="pending",
        current_step=0,
    )
    db.add(enrollment)
    await db.flush()
    return enrollment


async def list_enrollments(
    db: AsyncSession,
    ws_id: uuid.UUID,
    play_id: uuid.UUID | None = None,
    account_id: uuid.UUID | None = None,
) -> list[AbmPlayEnrollment]:
    stmt = select(AbmPlayEnrollment).where(
        AbmPlayEnrollment.workspace_id == ws_id
    )
    if play_id:
        stmt = stmt.where(AbmPlayEnrollment.play_id == play_id)
    if account_id:
        stmt = stmt.where(AbmPlayEnrollment.account_id == account_id)
    stmt = stmt.order_by(AbmPlayEnrollment.created_at.desc())
    return list((await db.execute(stmt)).scalars().all())


async def advance_enrollment(
    db: AsyncSession,
    enrollment: AbmPlayEnrollment,
    action: str = "advance",
) -> AbmPlayEnrollment:
    """Advance, pause, skip or complete an enrollment.

    action: advance | pause | resume | skip | complete
    """
    now = datetime.now(timezone.utc)

    if action == "advance":
        if enrollment.status == "pending":
            enrollment.status = "active"
            enrollment.started_at = now
        enrollment.current_step += 1
    elif action == "pause":
        enrollment.status = "paused"
    elif action == "resume":
        enrollment.status = "active"
    elif action == "skip":
        enrollment.status = "skipped"
        enrollment.completed_at = now
    elif action == "complete":
        enrollment.status = "completed"
        enrollment.completed_at = now

    await db.flush()
    return enrollment
