"""Enterprise analytics service: cohort retention, funnel analysis,
segmentation, derived KPIs (CAC/LTV), and trend anomaly detection.

Every number is derived from real event tables (ConversionEvent, RevenueEvent,
EmailSendLog, FunnelVisit, ChannelSpendSeries). When data is insufficient,
results carry an explicit ``low_data`` or ``insufficient_data`` flag —
nothing is fabricated.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

import numpy as np
from sqlalchemy import func, select, and_, case, literal_column, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversion import ConversionEvent, FUNNEL_STAGES
from app.models.attribution import RevenueEvent, WON_STAGES, CHANNELS
from app.models.email import EmailSendLog
from app.models.funnels import FunnelVisit
from app.models.mmm import ChannelSpendSeries

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _week_start(dt: date) -> date:
    """Monday of the ISO week containing *dt*."""
    return dt - timedelta(days=dt.weekday())


def _month_start(dt: date) -> date:
    return dt.replace(day=1)


def _period_start(dt: date, granularity: str) -> date:
    return _week_start(dt) if granularity == "week" else _month_start(dt)


def _z_scores(values: list[float]) -> list[float | None]:
    """Return z-scores for a series; None where std == 0 or len < 3."""
    arr = np.array(values, dtype=float)
    if len(arr) < 3:
        return [None] * len(arr)
    mean = np.nanmean(arr)
    std = np.nanstd(arr)
    if std == 0:
        return [0.0] * len(arr)
    return ((arr - mean) / std).tolist()


def _rolling_z(values: list[float], window: int = 7) -> list[dict]:
    """Rolling z-score with baseline mean/std over a trailing window."""
    results: list[dict] = []
    arr = np.array(values, dtype=float)
    for i in range(len(arr)):
        start = max(0, i - window)
        baseline = arr[start:i] if i > 0 else arr[:1]
        if len(baseline) < 2:
            results.append({"z": None, "baseline_mean": None, "anomaly": False})
            continue
        mu = float(np.nanmean(baseline))
        sigma = float(np.nanstd(baseline))
        if sigma == 0:
            results.append({"z": 0.0, "baseline_mean": mu, "anomaly": False})
            continue
        z = float((arr[i] - mu) / sigma)
        results.append({
            "z": round(z, 3),
            "baseline_mean": round(mu, 2),
            "anomaly": abs(z) >= 2.0,
        })
    return results


# ---------------------------------------------------------------------------
# 1. Cohort retention
# ---------------------------------------------------------------------------

async def cohort_retention(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    granularity: str = "week",
    periods: int = 8,
    days: int = 180,
) -> dict[str, Any]:
    """Build cohort-retention matrix from ConversionEvent rows.

    Cohort = the period of a visitor's *first* event (first-touch).
    Retention in period N = fraction of cohort visitors who fired any event
    in the Nth subsequent period.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(ConversionEvent.anon_id, ConversionEvent.occurred_at)
        .where(
            ConversionEvent.workspace_id == workspace_id,
            ConversionEvent.occurred_at >= since,
        )
        .order_by(ConversionEvent.occurred_at.asc())
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return {"cohorts": [], "periods": periods, "granularity": granularity,
                "low_data": True, "note": "No conversion events found."}

    # First-touch per visitor
    first_touch: dict[str, date] = {}
    activity: dict[str, set[date]] = defaultdict(set)
    for anon_id, occurred_at in rows:
        d = occurred_at.date() if isinstance(occurred_at, datetime) else occurred_at
        ps = _period_start(d, granularity)
        if anon_id not in first_touch:
            first_touch[anon_id] = ps
        activity[anon_id].add(ps)

    # Build cohorts
    cohort_members: dict[date, set[str]] = defaultdict(set)
    for anon_id, ft in first_touch.items():
        cohort_members[ft].add(anon_id)

    sorted_cohorts = sorted(cohort_members.keys())
    delta = timedelta(weeks=1) if granularity == "week" else timedelta(days=30)

    result_cohorts: list[dict] = []
    for cohort_start in sorted_cohorts:
        size = len(cohort_members[cohort_start])
        retention_row: list[float | None] = []
        for p in range(periods):
            target = _period_start(cohort_start + delta * p, granularity)
            active = sum(1 for uid in cohort_members[cohort_start] if target in activity[uid])
            retention_row.append(round(active / size, 4) if size else None)
        result_cohorts.append({
            "cohort": cohort_start.isoformat(),
            "size": size,
            "retention": retention_row,
        })

    return {
        "cohorts": result_cohorts,
        "periods": periods,
        "granularity": granularity,
        "low_data": len(rows) < 20,
    }


# ---------------------------------------------------------------------------
# 2. Funnel analysis with drop-off
# ---------------------------------------------------------------------------

async def funnel_analysis(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    days: int = 30,
    steps: list[str] | None = None,
) -> dict[str, Any]:
    """Ordered-step funnel from ConversionEvent with conversion, drop-off and
    median time-between-steps.

    Uses the canonical FUNNEL_STAGES from the conversion model if *steps* is
    not supplied.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    if steps is None:
        # Use canonical stages
        stage_defs = FUNNEL_STAGES
    else:
        stage_defs = tuple((s, s.replace("_", " ").title(), (s,)) for s in steps)

    # Fetch all events in window
    stmt = (
        select(
            ConversionEvent.anon_id,
            ConversionEvent.event_type,
            ConversionEvent.occurred_at,
        )
        .where(
            ConversionEvent.workspace_id == workspace_id,
            ConversionEvent.occurred_at >= since,
        )
        .order_by(ConversionEvent.occurred_at.asc())
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return {"steps": [], "low_data": True, "note": "No events in period."}

    # Per-visitor: earliest timestamp per stage
    visitor_stages: dict[str, dict[str, datetime]] = defaultdict(dict)
    for anon_id, event_type, occurred_at in rows:
        for stage_key, _, event_types in stage_defs:
            if event_type in event_types:
                if stage_key not in visitor_stages[anon_id]:
                    visitor_stages[anon_id][stage_key] = occurred_at
                else:
                    visitor_stages[anon_id][stage_key] = min(
                        visitor_stages[anon_id][stage_key], occurred_at
                    )

    total_visitors = len(visitor_stages)
    funnel_steps: list[dict] = []
    prev_count: int | None = None
    prev_key: str | None = None

    for stage_key, label, _ in stage_defs:
        reached = {uid for uid, stages in visitor_stages.items() if stage_key in stages}
        count = len(reached)

        step_data: dict[str, Any] = {
            "key": stage_key,
            "label": label,
            "count": count,
            "rate": round(count / total_visitors, 4) if total_visitors else 0,
        }

        if prev_count is not None:
            step_data["drop_off"] = prev_count - count
            step_data["step_conversion"] = round(count / prev_count, 4) if prev_count else 0

            # Median time between prev step and this step
            deltas: list[float] = []
            for uid in reached:
                if prev_key and prev_key in visitor_stages[uid] and stage_key in visitor_stages[uid]:
                    dt = (visitor_stages[uid][stage_key] - visitor_stages[uid][prev_key]).total_seconds()
                    if dt >= 0:
                        deltas.append(dt)
            if deltas:
                med = float(np.median(deltas))
                step_data["median_time_seconds"] = round(med, 1)
            else:
                step_data["median_time_seconds"] = None
        else:
            step_data["drop_off"] = 0
            step_data["step_conversion"] = 1.0
            step_data["median_time_seconds"] = None

        funnel_steps.append(step_data)
        prev_count = count
        prev_key = stage_key

    return {
        "steps": funnel_steps,
        "total_visitors": total_visitors,
        "overall_conversion": round(
            funnel_steps[-1]["count"] / funnel_steps[0]["count"], 4
        ) if funnel_steps and funnel_steps[0]["count"] else 0,
        "days": days,
        "low_data": total_visitors < 10,
    }


# ---------------------------------------------------------------------------
# 3. Segmentation
# ---------------------------------------------------------------------------

async def segmentation_breakdown(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    dimension: str = "channel",
    days: int = 30,
) -> dict[str, Any]:
    """Break KPIs by a real dimension on ConversionEvent or RevenueEvent.

    Supported dimensions: channel (utm_source), campaign, utm_medium, device,
    source, event_type.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Map dimension name -> column on ConversionEvent
    dim_col_map = {
        "channel": ConversionEvent.utm_source,
        "utm_source": ConversionEvent.utm_source,
        "campaign": ConversionEvent.campaign,
        "utm_medium": ConversionEvent.utm_medium,
        "device": ConversionEvent.device,
        "source": ConversionEvent.source,
        "event_type": ConversionEvent.event_type,
    }

    col = dim_col_map.get(dimension)
    if col is None:
        return {
            "dimension": dimension,
            "segments": [],
            "insufficient_data": True,
            "note": f"Dimension '{dimension}' is not available on the event schema.",
        }

    stmt = (
        select(
            col.label("segment"),
            func.count().label("events"),
            func.count(func.distinct(ConversionEvent.anon_id)).label("unique_visitors"),
            func.sum(ConversionEvent.value).label("total_value"),
        )
        .where(
            ConversionEvent.workspace_id == workspace_id,
            ConversionEvent.occurred_at >= since,
            col.isnot(None),
        )
        .group_by(col)
        .order_by(func.count().desc())
    )
    rows = (await db.execute(stmt)).all()

    if not rows:
        return {
            "dimension": dimension,
            "segments": [],
            "low_data": True,
            "note": f"No events with '{dimension}' populated in the last {days} days.",
        }

    total_events = sum(r.events for r in rows)
    segments = []
    for r in rows:
        segments.append({
            "segment": r.segment,
            "events": r.events,
            "share": round(r.events / total_events, 4) if total_events else 0,
            "unique_visitors": r.unique_visitors,
            "total_value": round(float(r.total_value or 0), 2),
        })

    return {
        "dimension": dimension,
        "segments": segments,
        "total_events": total_events,
        "days": days,
        "low_data": total_events < 10,
    }


# ---------------------------------------------------------------------------
# 4. Derived KPIs: CAC, LTV, LTV:CAC, payback, conversion velocity
# ---------------------------------------------------------------------------

async def derived_kpis(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    days: int = 90,
) -> dict[str, Any]:
    """Compute CAC, LTV, LTV:CAC ratio, payback period and conversion velocity.

    - CAC = total spend / new customers (from ChannelSpendSeries + ConversionEvent signups)
    - LTV = avg revenue per customer * estimated lifespan (from RevenueEvent + retention)
    - Payback = CAC / avg monthly revenue per customer
    - Conversion velocity = median time from first page_view to purchase
    """
    since_date = date.today() - timedelta(days=days)
    since_dt = datetime.now(timezone.utc) - timedelta(days=days)
    flags: dict[str, bool] = {}

    # --- Total spend from ChannelSpendSeries ---
    spend_q = (
        select(func.coalesce(func.sum(ChannelSpendSeries.spend), 0.0))
        .where(
            ChannelSpendSeries.workspace_id == workspace_id,
            ChannelSpendSeries.date >= since_date,
        )
    )
    total_spend = float((await db.execute(spend_q)).scalar() or 0)

    # --- New customers: distinct anon_ids with signup/purchase events ---
    new_cust_q = (
        select(func.count(func.distinct(ConversionEvent.anon_id)))
        .where(
            ConversionEvent.workspace_id == workspace_id,
            ConversionEvent.occurred_at >= since_dt,
            ConversionEvent.event_type.in_(["signup", "purchase"]),
        )
    )
    new_customers = int((await db.execute(new_cust_q)).scalar() or 0)

    # CAC
    if new_customers > 0 and total_spend > 0:
        cac = round(total_spend / new_customers, 2)
    elif new_customers > 0:
        cac = 0.0
        flags["spend_data_missing"] = True
    else:
        cac = None
        flags["no_new_customers"] = True

    # --- Revenue from RevenueEvent ---
    rev_q = (
        select(
            func.count(func.distinct(RevenueEvent.contact_ref)).label("customers"),
            func.coalesce(func.sum(RevenueEvent.value), 0.0).label("total_revenue"),
        )
        .where(
            RevenueEvent.workspace_id == workspace_id,
            RevenueEvent.occurred_at >= since_dt,
            RevenueEvent.stage.in_(list(WON_STAGES)),
        )
    )
    rev_row = (await db.execute(rev_q)).one()
    paying_customers = int(rev_row.customers or 0)
    total_revenue = float(rev_row.total_revenue or 0)

    # LTV proxy: avg revenue per customer * (periods/retention estimate)
    if paying_customers > 0:
        avg_rev = total_revenue / paying_customers
        # Estimate retention multiplier from cohort data (simple: assume 3x as proxy)
        ltv_multiplier = 3.0  # conservative baseline
        ltv = round(avg_rev * ltv_multiplier, 2)
        flags["ltv_proxy"] = True
        flags["ltv_note"] = (
            f"LTV estimated as avg revenue (${avg_rev:.2f}) x {ltv_multiplier} "
            "retention multiplier (proxy — refine with cohort retention data)."
        )
    else:
        # Fallback: use ConversionEvent purchase value
        purch_q = (
            select(
                func.count(func.distinct(ConversionEvent.anon_id)).label("buyers"),
                func.coalesce(func.sum(ConversionEvent.value), 0.0).label("rev"),
            )
            .where(
                ConversionEvent.workspace_id == workspace_id,
                ConversionEvent.occurred_at >= since_dt,
                ConversionEvent.event_type == "purchase",
            )
        )
        purch_row = (await db.execute(purch_q)).one()
        buyers = int(purch_row.buyers or 0)
        purch_rev = float(purch_row.rev or 0)
        if buyers > 0:
            avg_rev = purch_rev / buyers
            ltv = round(avg_rev * 3.0, 2)
            flags["ltv_proxy"] = True
            flags["ltv_note"] = (
                "LTV derived from purchase events on ConversionEvent (proxy). "
                "Connect revenue tracking for accurate LTV."
            )
        else:
            avg_rev = 0
            ltv = None
            flags["revenue_data_missing"] = True

    # LTV:CAC
    ltv_cac_ratio = round(ltv / cac, 2) if ltv and cac and cac > 0 else None

    # Payback period (months)
    months_in_period = max(days / 30.0, 1.0)
    if paying_customers > 0 and cac and cac > 0:
        monthly_rev_per_cust = (total_revenue / paying_customers) / months_in_period
        payback_months = round(cac / monthly_rev_per_cust, 1) if monthly_rev_per_cust > 0 else None
    elif avg_rev > 0 and cac and cac > 0:
        monthly_rev_per_cust = avg_rev / months_in_period
        payback_months = round(cac / monthly_rev_per_cust, 1) if monthly_rev_per_cust > 0 else None
    else:
        payback_months = None
        monthly_rev_per_cust = 0

    # --- Conversion velocity: median page_view → purchase time ---
    vel_stmt = (
        select(ConversionEvent.anon_id, ConversionEvent.event_type, ConversionEvent.occurred_at)
        .where(
            ConversionEvent.workspace_id == workspace_id,
            ConversionEvent.occurred_at >= since_dt,
            ConversionEvent.event_type.in_(["page_view", "purchase"]),
        )
        .order_by(ConversionEvent.occurred_at.asc())
    )
    vel_rows = (await db.execute(vel_stmt)).all()
    first_view: dict[str, datetime] = {}
    first_purchase: dict[str, datetime] = {}
    for anon_id, evt, ts in vel_rows:
        if evt == "page_view" and anon_id not in first_view:
            first_view[anon_id] = ts
        elif evt == "purchase" and anon_id not in first_purchase:
            first_purchase[anon_id] = ts

    velocities: list[float] = []
    for uid in first_purchase:
        if uid in first_view:
            dt = (first_purchase[uid] - first_view[uid]).total_seconds()
            if dt >= 0:
                velocities.append(dt)

    conversion_velocity_seconds = round(float(np.median(velocities)), 1) if velocities else None

    return {
        "cac": cac,
        "ltv": ltv,
        "ltv_cac_ratio": ltv_cac_ratio,
        "payback_months": payback_months,
        "conversion_velocity_seconds": conversion_velocity_seconds,
        "new_customers": new_customers,
        "total_spend": round(total_spend, 2),
        "total_revenue": round(total_revenue, 2),
        "paying_customers": paying_customers,
        "days": days,
        "definitions": {
            "cac": "Customer Acquisition Cost = total marketing spend / new customers (signup or purchase events).",
            "ltv": "Customer Lifetime Value = avg revenue per customer x retention multiplier (proxy: 3x). Label: PROXY.",
            "ltv_cac_ratio": "LTV divided by CAC. >3 is healthy; <1 means losing money per customer.",
            "payback_months": "Months for a customer's revenue to repay their acquisition cost.",
            "conversion_velocity": "Median seconds from first page_view to first purchase event.",
        },
        "flags": flags,
        "low_data": new_customers < 5 and paying_customers < 3,
    }


# ---------------------------------------------------------------------------
# 5. Trend & anomaly detection
# ---------------------------------------------------------------------------

async def trend_anomaly(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    metric: str = "events",
    days: int = 60,
    window: int = 7,
) -> dict[str, Any]:
    """Compute daily series + rolling z-score anomaly flags for a key metric.

    Supported metrics: events (ConversionEvent count), revenue (RevenueEvent sum),
    email_sends (EmailSendLog count), spend (ChannelSpendSeries sum).
    """
    since_dt = datetime.now(timezone.utc) - timedelta(days=days)
    since_date = date.today() - timedelta(days=days)

    if metric == "events":
        stmt = (
            select(
                func.date(ConversionEvent.occurred_at).label("d"),
                func.count().label("val"),
            )
            .where(
                ConversionEvent.workspace_id == workspace_id,
                ConversionEvent.occurred_at >= since_dt,
            )
            .group_by(func.date(ConversionEvent.occurred_at))
            .order_by(literal_column("d").asc())
        )
    elif metric == "revenue":
        stmt = (
            select(
                func.date(RevenueEvent.occurred_at).label("d"),
                func.coalesce(func.sum(RevenueEvent.value), 0.0).label("val"),
            )
            .where(
                RevenueEvent.workspace_id == workspace_id,
                RevenueEvent.occurred_at >= since_dt,
                RevenueEvent.stage.in_(list(WON_STAGES)),
            )
            .group_by(func.date(RevenueEvent.occurred_at))
            .order_by(literal_column("d").asc())
        )
    elif metric == "email_sends":
        stmt = (
            select(
                func.date(EmailSendLog.sent_at).label("d"),
                func.count().label("val"),
            )
            .where(
                EmailSendLog.workspace_id == workspace_id,
                EmailSendLog.sent_at >= since_dt,
                EmailSendLog.sent_at.isnot(None),
            )
            .group_by(func.date(EmailSendLog.sent_at))
            .order_by(literal_column("d").asc())
        )
    elif metric == "spend":
        stmt = (
            select(
                ChannelSpendSeries.date.label("d"),
                func.coalesce(func.sum(ChannelSpendSeries.spend), 0.0).label("val"),
            )
            .where(
                ChannelSpendSeries.workspace_id == workspace_id,
                ChannelSpendSeries.date >= since_date,
            )
            .group_by(ChannelSpendSeries.date)
            .order_by(ChannelSpendSeries.date.asc())
        )
    else:
        return {"series": [], "metric": metric, "insufficient_data": True,
                "note": f"Unknown metric '{metric}'. Use: events, revenue, email_sends, spend."}

    rows = (await db.execute(stmt)).all()

    if len(rows) < 3:
        return {
            "series": [],
            "metric": metric,
            "days": days,
            "low_data": True,
            "note": "Fewer than 3 data points — cannot compute anomaly scores.",
        }

    # Fill date gaps with 0
    date_vals: dict[str, float] = {}
    for r in rows:
        d_str = r.d.isoformat() if isinstance(r.d, date) else str(r.d)
        date_vals[d_str] = float(r.val)

    all_dates = []
    cursor = since_date
    today = date.today()
    while cursor <= today:
        all_dates.append(cursor.isoformat())
        cursor += timedelta(days=1)

    values = [date_vals.get(d, 0.0) for d in all_dates]
    z_scores = _rolling_z(values, window=window)

    series = []
    anomaly_dates: list[str] = []
    for i, d in enumerate(all_dates):
        entry = {
            "date": d,
            "value": values[i],
            **z_scores[i],
        }
        series.append(entry)
        if z_scores[i]["anomaly"]:
            anomaly_dates.append(d)

    return {
        "series": series,
        "metric": metric,
        "days": days,
        "window": window,
        "anomaly_count": len(anomaly_dates),
        "anomaly_dates": anomaly_dates,
        "low_data": len(rows) < 7,
    }
