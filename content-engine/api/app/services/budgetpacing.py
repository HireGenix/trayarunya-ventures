"""Budget pacing service: budget CRUD, real spend ingest (manual + ads sync),
pacing computation (seasonality-aware), true-revenue ROAS, marginal-ROI
reallocation and per-channel efficiency — all from real DB rows."""
from __future__ import annotations

import math
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ads import Campaign, Metric
from app.models.attribution import RevenueEvent, WON_STAGES
from app.models.budgetpacing import (
    Budget,
    PacingAlert,
    ReallocationProposal,
    SpendRecord,
)
from app.models.conversion import ConversionEvent

# Map ad-platform metric sources / campaign platforms to budget channel keys.
_PLATFORM_TO_CHANNEL = {
    "google_ads": "google",
    "meta_ads": "meta",
    "linkedin_ads": "linkedin",
}

# Map attribution channel names to budget channel keys.
_ATTR_CHANNEL_MAP = {
    "ads": "google",
    "linkedin": "linkedin",
    "content": "other",
    "email": "other",
    "organic": "other",
    "referral": "other",
    "events": "other",
    "other": "other",
}

VALID_CHANNELS = ("google", "meta", "linkedin", "other")


def _today() -> date:
    return datetime.now(timezone.utc).date()


# --------------------------------------------------------------------------- #
# Budget CRUD
# --------------------------------------------------------------------------- #
async def list_budgets(db: AsyncSession, ws_id: uuid.UUID) -> list[Budget]:
    res = await db.execute(
        select(Budget)
        .where(Budget.workspace_id == ws_id)
        .order_by(Budget.created_at.desc())
    )
    return list(res.scalars().all())


async def get_budget(
    db: AsyncSession, ws_id: uuid.UUID, budget_id: uuid.UUID
) -> Budget | None:
    res = await db.execute(
        select(Budget).where(
            Budget.workspace_id == ws_id, Budget.id == budget_id
        )
    )
    return res.scalar_one_or_none()


async def create_budget(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    period: str,
    total_amount: float,
    start_date: date,
    end_date: date,
    channels: dict[str, float] | None,
) -> Budget:
    obj = Budget(
        workspace_id=ws_id,
        name=name,
        period=period,
        total_amount=total_amount,
        start_date=start_date,
        end_date=end_date,
        channels=channels or {},
        status="active",
    )
    db.add(obj)
    await db.flush()
    return obj


# --------------------------------------------------------------------------- #
# Spend ingest
# --------------------------------------------------------------------------- #
async def add_manual_spend(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    channel: str,
    amount: float,
    on_date: date,
    budget_id: uuid.UUID | None,
) -> SpendRecord:
    chan = channel if channel in VALID_CHANNELS else "other"
    rec = SpendRecord(
        workspace_id=ws_id,
        budget_id=budget_id,
        channel=chan,
        amount=amount,
        date=on_date,
        source="manual",
    )
    db.add(rec)
    await db.flush()
    return rec


async def sync_ads_spend(
    db: AsyncSession, ws_id: uuid.UUID, budget: Budget
) -> dict:
    """Pull real Campaign/Metric spend for the workspace within the budget window
    and persist one SpendRecord per (channel, date) bucket. Idempotent: existing
    ads_sync rows for the budget window are removed before re-inserting."""
    camp_res = await db.execute(
        select(Campaign.id, Campaign.ad_account_id).where(
            Campaign.workspace_id == ws_id
        )
    )
    campaign_ids = {row[0] for row in camp_res.all()}

    from app.models.ads import AdAccount

    acct_res = await db.execute(
        select(AdAccount.id, AdAccount.platform).where(
            AdAccount.workspace_id == ws_id
        )
    )
    acct_channel = {
        row[0]: _PLATFORM_TO_CHANNEL.get(
            row[1].value if hasattr(row[1], "value") else str(row[1]), "other"
        )
        for row in acct_res.all()
    }
    camp_channel_res = await db.execute(
        select(Campaign.id, Campaign.ad_account_id).where(
            Campaign.workspace_id == ws_id
        )
    )
    camp_channel = {
        cid: acct_channel.get(acct_id, "other")
        for cid, acct_id in camp_channel_res.all()
    }

    met_res = await db.execute(
        select(Metric.ref_id, Metric.metric_date, Metric.spend).where(
            Metric.workspace_id == ws_id,
            Metric.metric_date >= budget.start_date,
            Metric.metric_date <= budget.end_date,
            Metric.spend > 0,
        )
    )
    rows = met_res.all()

    buckets: dict[tuple[str, date], float] = defaultdict(float)
    for ref_id, mdate, spend in rows:
        channel = camp_channel.get(ref_id, "other") if ref_id in campaign_ids else "other"
        buckets[(channel, mdate)] += float(spend or 0.0)

    existing = await db.execute(
        select(SpendRecord).where(
            SpendRecord.workspace_id == ws_id,
            SpendRecord.budget_id == budget.id,
            SpendRecord.source == "ads_sync",
        )
    )
    for old in existing.scalars().all():
        await db.delete(old)
    await db.flush()

    inserted = 0
    total = 0.0
    for (channel, mdate), amount in buckets.items():
        db.add(
            SpendRecord(
                workspace_id=ws_id,
                budget_id=budget.id,
                channel=channel,
                amount=amount,
                date=mdate,
                source="ads_sync",
            )
        )
        inserted += 1
        total += amount
    await db.flush()
    return {"records": inserted, "total_synced": round(total, 2)}


# --------------------------------------------------------------------------- #
# Revenue helpers — true revenue ROAS
# --------------------------------------------------------------------------- #
async def _channel_revenue(
    db: AsyncSession,
    ws_id: uuid.UUID,
    start: date,
    end: date,
) -> tuple[dict[str, float], bool]:
    """Sum real revenue from RevenueEvent (closed_won) + ConversionEvent
    (purchase/checkout) within [start, end], mapped to budget channels.

    Returns (channel_revenue_dict, has_revenue). If no revenue rows exist
    we return empty dict and False so callers can fall back to proxy.
    """
    rev: dict[str, float] = defaultdict(float)
    has_any = False

    # RevenueEvent — closed_won deals
    try:
        re_res = await db.execute(
            select(RevenueEvent.channel, func.sum(RevenueEvent.value)).where(
                RevenueEvent.workspace_id == ws_id,
                RevenueEvent.stage.in_(WON_STAGES),
                func.date(RevenueEvent.occurred_at) >= start,
                func.date(RevenueEvent.occurred_at) <= end,
            ).group_by(RevenueEvent.channel)
        )
        for attr_chan, val in re_res.all():
            if val and val > 0:
                bc = _ATTR_CHANNEL_MAP.get(str(attr_chan), "other")
                rev[bc] += float(val)
                has_any = True
    except Exception:  # noqa: BLE001
        pass

    # ConversionEvent — purchase / checkout with monetary value
    try:
        ce_res = await db.execute(
            select(ConversionEvent.utm_source, func.sum(ConversionEvent.value)).where(
                ConversionEvent.workspace_id == ws_id,
                ConversionEvent.event_type.in_(("purchase", "checkout")),
                func.date(ConversionEvent.occurred_at) >= start,
                func.date(ConversionEvent.occurred_at) <= end,
                ConversionEvent.value > 0,
            ).group_by(ConversionEvent.utm_source)
        )
        for src, val in ce_res.all():
            if val and val > 0:
                bc = _ATTR_CHANNEL_MAP.get(str(src or "other"), "other")
                rev[bc] += float(val)
                has_any = True
    except Exception:  # noqa: BLE001
        pass

    return dict(rev), has_any


# --------------------------------------------------------------------------- #
# Seasonality: day-of-week weighting from historical spend
# --------------------------------------------------------------------------- #
async def _dow_weights(
    db: AsyncSession,
    ws_id: uuid.UUID,
    budget_id: uuid.UUID | None,
) -> list[float]:
    """Compute day-of-week spend weights from real historical SpendRecord rows
    for this workspace. Returns a list[7] indexed by weekday (Mon=0 … Sun=6).
    Falls back to flat [1,1,1,1,1,1,1] when insufficient data.
    """
    q = select(SpendRecord.date, SpendRecord.amount).where(
        SpendRecord.workspace_id == ws_id,
    )
    res = await db.execute(q)
    rows = res.all()

    if len(rows) < 14:
        return [1.0] * 7

    dow_total = [0.0] * 7
    dow_count = [0] * 7
    for d, amount in rows:
        wd = d.weekday()
        dow_total[wd] += float(amount or 0.0)
        dow_count[wd] += 1

    avg = [dow_total[i] / max(dow_count[i], 1) for i in range(7)]
    total = sum(avg)
    if total < 1e-9:
        return [1.0] * 7
    return [v * 7.0 / total for v in avg]


def _seasonal_ideal_curve(
    start: date,
    end: date,
    total: float,
    dow_weights: list[float],
) -> dict[date, float]:
    """Produce a date→cumulative-ideal map using day-of-week weights.
    The ideal spend on each day is proportional to its dow weight, scaled
    so the entire period sums to `total`."""
    span_days = max((end - start).days + 1, 1)
    raw = []
    for i in range(span_days):
        d = start + timedelta(days=i)
        raw.append(dow_weights[d.weekday()])
    s = sum(raw)
    if s < 1e-9:
        daily = total / span_days
        raw = [daily] * span_days
    else:
        raw = [v * total / s for v in raw]

    cumulative: dict[date, float] = {}
    running = 0.0
    for i in range(span_days):
        running += raw[i]
        cumulative[start + timedelta(days=i)] = running
    return cumulative


# --------------------------------------------------------------------------- #
# Pacing computation (seasonality-aware)
# --------------------------------------------------------------------------- #
async def _spend_rows(
    db: AsyncSession, ws_id: uuid.UUID, budget_id: uuid.UUID
) -> list[SpendRecord]:
    res = await db.execute(
        select(SpendRecord).where(
            SpendRecord.workspace_id == ws_id,
            SpendRecord.budget_id == budget_id,
        )
    )
    return list(res.scalars().all())


async def channel_efficiency(
    db: AsyncSession, ws_id: uuid.UUID, budget: Budget
) -> dict[str, dict]:
    """Per-channel ROAS / CPA from real Metric + revenue rows."""
    from app.models.ads import AdAccount

    acct_res = await db.execute(
        select(AdAccount.id, AdAccount.platform).where(
            AdAccount.workspace_id == ws_id
        )
    )
    acct_channel = {
        row[0]: _PLATFORM_TO_CHANNEL.get(
            row[1].value if hasattr(row[1], "value") else str(row[1]), "other"
        )
        for row in acct_res.all()
    }
    camp_res = await db.execute(
        select(Campaign.id, Campaign.ad_account_id).where(
            Campaign.workspace_id == ws_id
        )
    )
    camp_channel = {
        cid: acct_channel.get(acct_id, "other") for cid, acct_id in camp_res.all()
    }

    met_res = await db.execute(
        select(
            Metric.ref_id,
            Metric.spend,
            Metric.conversions,
            Metric.clicks,
            Metric.impressions,
        ).where(
            Metric.workspace_id == ws_id,
            Metric.metric_date >= budget.start_date,
            Metric.metric_date <= budget.end_date,
        )
    )
    agg: dict[str, dict[str, float]] = defaultdict(
        lambda: {"spend": 0.0, "conversions": 0.0, "clicks": 0.0, "impressions": 0.0}
    )
    for ref_id, spend, conversions, clicks, impressions in met_res.all():
        channel = camp_channel.get(ref_id, "other")
        agg[channel]["spend"] += float(spend or 0.0)
        agg[channel]["conversions"] += float(conversions or 0)
        agg[channel]["clicks"] += float(clicks or 0)
        agg[channel]["impressions"] += float(impressions or 0)

    # Try real revenue
    chan_rev, has_revenue = await _channel_revenue(
        db, ws_id, budget.start_date, budget.end_date,
    )

    out: dict[str, dict] = {}
    for channel, a in agg.items():
        spend = a["spend"]
        conv = a["conversions"]
        cpa = round(spend / conv, 2) if conv > 0 else None

        revenue = chan_rev.get(channel, 0.0) if has_revenue else 0.0
        if has_revenue and revenue > 0 and spend > 0:
            roas = round(revenue / spend, 4)
            roas_type = "revenue"
        elif spend > 0:
            roas = round(conv / spend, 4) if conv > 0 else 0.0
            roas_type = "conversion_proxy"
        else:
            roas = 0.0
            roas_type = "conversion_proxy"

        out[channel] = {
            "spend": round(spend, 2),
            "conversions": round(conv, 2),
            "clicks": round(a["clicks"], 2),
            "impressions": round(a["impressions"], 2),
            "cpa": cpa,
            "roas": roas,
            "roas_type": roas_type,
            "revenue": round(revenue, 2) if has_revenue else None,
        }
    return out


async def compute_pacing(
    db: AsyncSession, ws_id: uuid.UUID, budget: Budget
) -> dict:
    """Compute spend-to-date vs seasonality-aware pace target."""
    rows = await _spend_rows(db, ws_id, budget.id)
    spent = sum(float(r.amount or 0.0) for r in rows)
    by_channel: dict[str, float] = defaultdict(float)
    by_date: dict[date, float] = defaultdict(float)
    for r in rows:
        by_channel[r.channel] += float(r.amount or 0.0)
        by_date[r.date] += float(r.amount or 0.0)

    total = float(budget.total_amount or 0.0)
    start, end = budget.start_date, budget.end_date
    today = _today()
    span_days = max((end - start).days + 1, 1)
    elapsed_days = min(max((today - start).days + 1, 0), span_days)
    elapsed_frac = elapsed_days / span_days if span_days else 0.0

    # Seasonality-aware ideal
    dow = await _dow_weights(db, ws_id, budget.id)
    ideal_curve = _seasonal_ideal_curve(start, end, total, dow)
    ideal_to_date = ideal_curve.get(
        min(today, end), total * elapsed_frac
    ) if ideal_curve else total * elapsed_frac

    pace_ratio = (spent / ideal_to_date) if ideal_to_date > 0 else 0.0
    spend_frac = (spent / total) if total > 0 else 0.0

    daily_rate = (spent / elapsed_days) if elapsed_days > 0 else 0.0
    projected_total = round(daily_rate * span_days, 2)
    projected_variance = round(projected_total - total, 2)

    if pace_ratio > 1.1:
        status = "overspend"
    elif pace_ratio < 0.9 and elapsed_frac > 0.1:
        status = "underspend"
    else:
        status = "on_pace"

    # Build daily pacing series for chart
    pacing_series: list[dict] = []
    cum_spend = 0.0
    sorted_dates = sorted(by_date.keys())
    day = start
    spend_idx = 0
    while day <= min(today, end):
        cum_spend_today = cum_spend + by_date.get(day, 0.0)
        cum_spend = cum_spend_today
        ideal_val = ideal_curve.get(day, 0.0)
        linear_ideal = total * min(max(((day - start).days + 1) / span_days, 0), 1)
        pacing_series.append({
            "date": day.isoformat(),
            "actual": round(cum_spend, 2),
            "seasonal_target": round(ideal_val, 2),
            "linear_target": round(linear_ideal, 2),
        })
        day += timedelta(days=1)

    # Per-channel pace versus its own allocation.
    alloc = budget.channels or {}
    channel_pace = []
    for chan, allocated in alloc.items():
        chan_spent = round(by_channel.get(chan, 0.0), 2)
        chan_ideal = round(float(allocated or 0.0) * elapsed_frac, 2)
        chan_ratio = (chan_spent / chan_ideal) if chan_ideal > 0 else 0.0
        channel_pace.append(
            {
                "channel": chan,
                "allocated": round(float(allocated or 0.0), 2),
                "spent": chan_spent,
                "ideal_to_date": chan_ideal,
                "pace_ratio": round(chan_ratio, 3),
            }
        )
    for chan, val in by_channel.items():
        if chan not in alloc:
            channel_pace.append(
                {
                    "channel": chan,
                    "allocated": 0.0,
                    "spent": round(val, 2),
                    "ideal_to_date": 0.0,
                    "pace_ratio": 0.0,
                }
            )

    return {
        "budget_id": str(budget.id),
        "total_amount": round(total, 2),
        "spent_to_date": round(spent, 2),
        "ideal_to_date": round(ideal_to_date, 2),
        "pace_ratio": round(pace_ratio, 3),
        "spend_fraction": round(spend_frac, 3),
        "elapsed_fraction": round(elapsed_frac, 3),
        "status": status,
        "projected_total": projected_total,
        "projected_variance": projected_variance,
        "channels": channel_pace,
        "pacing_series": pacing_series,
        "dow_weights": [round(w, 3) for w in dow],
    }


async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Roll up pacing across all active budgets for the workspace."""
    budgets = await list_budgets(db, ws_id)
    total_budget = 0.0
    total_spent = 0.0
    projected_total = 0.0
    per_budget = []
    for b in budgets:
        if b.status != "active":
            continue
        pacing = await compute_pacing(db, ws_id, b)
        total_budget += pacing["total_amount"]
        total_spent += pacing["spent_to_date"]
        projected_total += pacing["projected_total"]
        per_budget.append(
            {
                "id": str(b.id),
                "name": b.name,
                "status": pacing["status"],
                "pace_ratio": pacing["pace_ratio"],
                "spent_to_date": pacing["spent_to_date"],
                "total_amount": pacing["total_amount"],
                "projected_variance": pacing["projected_variance"],
            }
        )
    pace_pct = round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0.0
    projected_variance = round(projected_total - total_budget, 2)
    return {
        "total_budget": round(total_budget, 2),
        "spent_to_date": round(total_spent, 2),
        "pace_pct": pace_pct,
        "projected_total": round(projected_total, 2),
        "projected_variance": projected_variance,
        "active_budgets": len(per_budget),
        "budgets": per_budget,
    }


# --------------------------------------------------------------------------- #
# Marginal-ROI reallocation engine
# --------------------------------------------------------------------------- #
def _hill_transform(x: float, alpha: float, gamma: float) -> float:
    """Hill saturation curve (same as MMM)."""
    if x <= 0.0 or gamma <= 0.0 or alpha <= 0.0:
        return 0.0
    log_x = alpha * math.log(x)
    log_g = alpha * math.log(gamma)
    m = max(log_x, log_g)
    num = math.exp(log_x - m)
    den = math.exp(log_x - m) + math.exp(log_g - m)
    return num / den if den > 0.0 else 0.0


def _hill_marginal(x: float, alpha: float, gamma: float) -> float:
    """Derivative of Hill at x."""
    if x <= 0.0 or gamma <= 0.0 or alpha <= 0.0:
        return 0.0
    xa = x ** alpha
    ga = gamma ** alpha
    denom = (xa + ga) ** 2
    if denom < 1e-30:
        return 0.0
    return alpha * ga * (x ** (alpha - 1)) / denom


def _fit_local_diminishing_returns(
    spends: list[float],
    outcomes: list[float],
) -> tuple[float, float, float]:
    """Fit a simple diminishing-returns (Hill-like) model from a channel's own
    spend→outcome history. Returns (beta, alpha, gamma) using a grid search
    over plausible alpha/gamma values, minimizing squared error.

    Requires >=3 observations. Returns (0, 1, 1) if fitting impossible.
    """
    if len(spends) < 3 or len(outcomes) < 3:
        return 0.0, 1.0, 1.0

    # Remove zero-spend observations
    pairs = [(s, o) for s, o in zip(spends, outcomes) if s > 0]
    if len(pairs) < 3:
        return 0.0, 1.0, 1.0

    ss, oo = zip(*pairs)
    max_spend = max(ss)

    best_err = float("inf")
    best = (1.0, 1.0, 1.0)

    for alpha in (0.5, 0.8, 1.0, 1.5, 2.0):
        for gamma_frac in (0.3, 0.5, 0.7, 1.0, 1.5):
            gamma = max_spend * gamma_frac
            if gamma < 1e-6:
                continue
            # Compute Hill values
            hvals = [_hill_transform(s, alpha, gamma) for s in ss]
            sum_ho = sum(h * o for h, o in zip(hvals, oo))
            sum_hh = sum(h * h for h in hvals)
            if sum_hh < 1e-12:
                continue
            beta = sum_ho / sum_hh
            if beta <= 0:
                continue
            err = sum((o - beta * h) ** 2 for h, o in zip(hvals, oo))
            if err < best_err:
                best_err = err
                best = (beta, alpha, gamma)

    return best


async def _get_mmm_marginal_roi(
    db: AsyncSession,
    ws_id: uuid.UUID,
) -> dict[str, dict] | None:
    """Try to load the latest ready MMM model's marginal-ROI and params.
    Returns None if no MMM results available."""
    from app.models.mmm import MmmModel
    res = await db.execute(
        select(MmmModel)
        .where(MmmModel.workspace_id == ws_id, MmmModel.status == "ready")
        .order_by(MmmModel.created_at.desc())
        .limit(1)
    )
    model = res.scalar_one_or_none()
    if model is None or not model.results:
        return None
    results = model.results
    marginal_roi = results.get("marginal_roi") or {}
    coefficients = results.get("coefficients") or {}
    channel_params = results.get("channel_params") or {}
    if not marginal_roi or not coefficients:
        return None

    out: dict[str, dict] = {}
    for ch in marginal_roi:
        hp = channel_params.get(ch, {})
        out[ch] = {
            "marginal_roi": marginal_roi[ch],
            "beta": coefficients.get(ch, 0.0),
            "alpha": hp.get("alpha", 1.0),
            "gamma": hp.get("gamma", 1.0),
            "source": "mmm",
        }
    return out


async def _build_local_marginal_roi(
    db: AsyncSession,
    ws_id: uuid.UUID,
    efficiency: dict[str, dict],
    budget: Budget,
) -> dict[str, dict]:
    """Build channel marginal-ROI from local diminishing-returns fit on each
    channel's own spend→outcome history within the budget window."""
    from app.models.ads import AdAccount

    acct_res = await db.execute(
        select(AdAccount.id, AdAccount.platform).where(
            AdAccount.workspace_id == ws_id
        )
    )
    acct_channel = {
        row[0]: _PLATFORM_TO_CHANNEL.get(
            row[1].value if hasattr(row[1], "value") else str(row[1]), "other"
        )
        for row in acct_res.all()
    }
    camp_res = await db.execute(
        select(Campaign.id, Campaign.ad_account_id).where(
            Campaign.workspace_id == ws_id
        )
    )
    camp_channel = {
        cid: acct_channel.get(acct_id, "other") for cid, acct_id in camp_res.all()
    }

    met_res = await db.execute(
        select(
            Metric.ref_id,
            Metric.metric_date,
            Metric.spend,
            Metric.conversions,
        ).where(
            Metric.workspace_id == ws_id,
            Metric.metric_date >= budget.start_date,
            Metric.metric_date <= budget.end_date,
        )
    )

    # Bucket spend and conversions by (channel, date)
    chan_date_spend: dict[str, dict[date, float]] = defaultdict(lambda: defaultdict(float))
    chan_date_conv: dict[str, dict[date, float]] = defaultdict(lambda: defaultdict(float))
    for ref_id, mdate, spend, conv in met_res.all():
        ch = camp_channel.get(ref_id, "other")
        chan_date_spend[ch][mdate] += float(spend or 0.0)
        chan_date_conv[ch][mdate] += float(conv or 0)

    out: dict[str, dict] = {}
    for ch in efficiency:
        dates = sorted(set(chan_date_spend.get(ch, {}).keys()) | set(chan_date_conv.get(ch, {}).keys()))
        if len(dates) < 3:
            # Fall back to simple ROAS
            roas = efficiency[ch].get("roas", 0.0)
            out[ch] = {
                "marginal_roi": roas * 0.7,  # heuristic diminishing marginal
                "beta": roas,
                "alpha": 1.0,
                "gamma": 1.0,
                "source": "local_proxy",
                "low_data": True,
            }
            continue

        spends = [chan_date_spend[ch].get(d, 0.0) for d in dates]
        outcomes = [chan_date_conv[ch].get(d, 0.0) for d in dates]
        beta, alpha, gamma = _fit_local_diminishing_returns(spends, outcomes)

        avg_spend = sum(spends) / len(spends) if spends else 0.0
        if beta > 0 and avg_spend > 0:
            m_roi = beta * _hill_marginal(avg_spend, alpha, gamma)
        else:
            m_roi = efficiency[ch].get("roas", 0.0) * 0.7

        out[ch] = {
            "marginal_roi": round(m_roi, 6),
            "beta": round(beta, 6),
            "alpha": round(alpha, 2),
            "gamma": round(gamma, 4),
            "source": "local_fit",
            "low_data": len(dates) < 10,
        }

    return out


def marginal_roi_reallocation(
    current_alloc: dict[str, float],
    marginal_params: dict[str, dict],
    *,
    max_shift_pct: float = 0.25,
) -> dict:
    """Marginal-ROI equalisation: reallocate budget from channels with low
    marginal ROI to channels with high marginal ROI, bounded by per-step caps.

    Returns { moves, projected_lift, rationale, marginal_roi_before, marginal_roi_after }.
    """
    channels = [c for c in current_alloc if current_alloc[c] > 0]
    if len(channels) < 2:
        return {"moves": [], "projected_lift": 0.0, "rationale": "Need >= 2 channels."}

    total_budget = sum(current_alloc[c] for c in channels)
    alloc = {c: current_alloc[c] for c in channels}

    def _marginal_at(ch: str, spend: float) -> float:
        p = marginal_params.get(ch, {})
        beta = p.get("beta", 0.0)
        alpha = p.get("alpha", 1.0)
        gamma = p.get("gamma", 1.0)
        if beta <= 0 or spend <= 0:
            return 0.0
        return beta * _hill_marginal(spend, alpha, gamma)

    def _response_at(ch: str, spend: float) -> float:
        p = marginal_params.get(ch, {})
        beta = p.get("beta", 0.0)
        alpha = p.get("alpha", 1.0)
        gamma = p.get("gamma", 1.0)
        if beta <= 0 or spend <= 0:
            return 0.0
        return beta * _hill_transform(spend, alpha, gamma)

    mr_before = {c: round(_marginal_at(c, alloc[c]), 6) for c in channels}

    # Response before
    resp_before = sum(_response_at(c, alloc[c]) for c in channels)

    # Hill-climb: move budget in slices from lowest-marginal to highest-marginal
    max_shift = total_budget * max_shift_pct
    slice_size = max(total_budget / 500.0, 1.0)
    shifted = 0.0
    moves_raw: dict[tuple[str, str], float] = defaultdict(float)

    for _ in range(500):
        if shifted >= max_shift:
            break
        mrs = [(c, _marginal_at(c, alloc[c])) for c in channels if alloc[c] > slice_size]
        if len(mrs) < 2:
            break
        mrs.sort(key=lambda x: x[1])
        worst_ch, worst_mr = mrs[0]
        best_ch, best_mr = mrs[-1]
        if best_mr <= worst_mr * 1.05:
            break  # marginal ROIs already balanced
        chunk = min(slice_size, alloc[worst_ch] * 0.1, max_shift - shifted)
        if chunk <= 0:
            break
        alloc[worst_ch] -= chunk
        alloc[best_ch] += chunk
        moves_raw[(worst_ch, best_ch)] += chunk
        shifted += chunk

    # Build move list
    moves = []
    for (src, dst), amt in moves_raw.items():
        if amt < 0.01:
            continue
        mr_src_before = mr_before.get(src, 0.0)
        mr_dst_before = mr_before.get(dst, 0.0)
        moves.append({
            "from": src,
            "to": dst,
            "amount": round(amt, 2),
            "reason": (
                f"Marginal ROI {dst}={mr_dst_before:.4f} > {src}={mr_src_before:.4f}; "
                f"shift spend to higher-marginal channel."
            ),
        })

    resp_after = sum(_response_at(c, alloc[c]) for c in channels)
    mr_after = {c: round(_marginal_at(c, alloc[c]), 6) for c in channels}

    lift = ((resp_after - resp_before) / resp_before * 100.0) if resp_before > 1e-9 else 0.0
    if not moves:
        lift = 0.0

    low_data = any(marginal_params.get(c, {}).get("low_data", False) for c in channels)
    source = set(marginal_params.get(c, {}).get("source", "unknown") for c in channels)

    return {
        "moves": moves,
        "projected_lift": round(lift, 2),
        "rationale": (
            f"Marginal-ROI equalisation across {len(channels)} channels "
            f"(source: {', '.join(source)}). "
            f"Projected lift: {round(lift, 2)}%."
            + (" Low data flag: some channels have limited observations." if low_data else "")
        ),
        "marginal_roi_before": mr_before,
        "marginal_roi_after": mr_after,
        "proposed_allocation": {c: round(alloc[c], 2) for c in channels},
        "low_data": low_data,
    }


# --------------------------------------------------------------------------- #
# Pacing alert detection
# --------------------------------------------------------------------------- #
async def detect_pacing_alerts(
    db: AsyncSession,
    ws_id: uuid.UUID,
    budget: Budget,
    pacing: dict,
) -> list[PacingAlert]:
    """Create real PacingAlert DB rows for over/under-pace vs seasonal target."""
    alerts_created: list[PacingAlert] = []

    existing = await list_alerts(db, ws_id, status="open")
    existing_kinds = {
        (a.budget_id, a.kind) for a in existing
    }

    pace_status = pacing["status"]
    pace_ratio = pacing["pace_ratio"]
    spent = pacing["spent_to_date"]
    ideal = pacing["ideal_to_date"]

    if pace_status == "overspend" and (budget.id, "overspend") not in existing_kinds:
        detail = (
            f"Budget '{budget.name}' is overpacing vs seasonal target: "
            f"spent {spent:.2f} vs ideal {ideal:.2f} (ratio {pace_ratio:.3f})."
        )
        alert = PacingAlert(
            workspace_id=ws_id,
            budget_id=budget.id,
            kind="overspend",
            detail=detail,
            severity="critical",
            status="open",
        )
        db.add(alert)
        await db.flush()
        alerts_created.append(alert)

    elif pace_status == "underspend" and (budget.id, "underspend") not in existing_kinds:
        detail = (
            f"Budget '{budget.name}' is underpacing vs seasonal target: "
            f"spent {spent:.2f} vs ideal {ideal:.2f} (ratio {pace_ratio:.3f})."
        )
        alert = PacingAlert(
            workspace_id=ws_id,
            budget_id=budget.id,
            kind="underspend",
            detail=detail,
            severity="info",
            status="open",
        )
        db.add(alert)
        await db.flush()
        alerts_created.append(alert)

    return alerts_created


# --------------------------------------------------------------------------- #
# Alerts & proposals
# --------------------------------------------------------------------------- #
async def list_alerts(
    db: AsyncSession, ws_id: uuid.UUID, *, status: str | None = None
) -> list[PacingAlert]:
    q = select(PacingAlert).where(PacingAlert.workspace_id == ws_id)
    if status:
        q = q.where(PacingAlert.status == status)
    res = await db.execute(q.order_by(PacingAlert.created_at.desc()))
    return list(res.scalars().all())


async def list_proposals(
    db: AsyncSession, ws_id: uuid.UUID, *, budget_id: uuid.UUID | None = None
) -> list[ReallocationProposal]:
    q = select(ReallocationProposal).where(
        ReallocationProposal.workspace_id == ws_id
    )
    if budget_id:
        q = q.where(ReallocationProposal.budget_id == budget_id)
    res = await db.execute(q.order_by(ReallocationProposal.created_at.desc()))
    return list(res.scalars().all())


async def get_proposal(
    db: AsyncSession, ws_id: uuid.UUID, proposal_id: uuid.UUID
) -> ReallocationProposal | None:
    res = await db.execute(
        select(ReallocationProposal).where(
            ReallocationProposal.workspace_id == ws_id,
            ReallocationProposal.id == proposal_id,
        )
    )
    return res.scalar_one_or_none()


async def apply_proposal(
    db: AsyncSession, ws_id: uuid.UUID, proposal: ReallocationProposal
) -> Budget | None:
    """Apply a proposal's moves to its budget's channel allocation map."""
    if proposal.budget_id is None:
        proposal.status = "applied"
        await db.flush()
        return None
    budget = await get_budget(db, ws_id, proposal.budget_id)
    if budget is None:
        return None
    alloc = dict(budget.channels or {})
    for move in proposal.moves or []:
        src = move.get("from")
        dst = move.get("to")
        amt = float(move.get("amount") or 0.0)
        if src and src in alloc:
            alloc[src] = round(max(float(alloc.get(src, 0.0)) - amt, 0.0), 2)
        if dst:
            alloc[dst] = round(float(alloc.get(dst, 0.0)) + amt, 2)
    budget.channels = alloc
    proposal.status = "applied"
    await db.flush()
    return budget
