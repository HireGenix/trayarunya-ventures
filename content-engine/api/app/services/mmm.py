"""Marketing Mix Modeling service — enterprise/Robyn-class regression on real DB rows.

Spend/revenue observations live in :class:`ChannelSpendSeries`. Fitting a model
applies **geometric adstock** (carryover decay) and **Hill saturation** transforms
per channel before solving ordinary least squares against per-date total revenue.
The hyper-parameters (theta, alpha, gamma per channel) are grid-searched to
maximise adjusted R².  Results include coefficient significance (SE, t-stat,
p-value, 95 % CI), decomposed contributions, ROI and marginal-ROI via the Hill
derivative, and a budget-optimizer / what-if simulator.

All math runs on the actual rows. With fewer than two usable observations per
channel we refuse to fabricate and mark the model ``awaiting_data``.
"""
from __future__ import annotations

import math
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ads import Metric
from app.models.attribution import RevenueEvent
from app.models.mmm import ChannelSpendSeries, IncrementalityTest, MmmModel

try:  # Use numpy when available for the linear algebra; fall back to pure python.
    import numpy as _np  # type: ignore
except Exception:  # noqa: BLE001
    _np = None


# --------------------------------------------------------------------------- #
# CRUD helpers
# --------------------------------------------------------------------------- #
async def list_models(db: AsyncSession, ws_id: uuid.UUID) -> list[MmmModel]:
    res = await db.execute(
        select(MmmModel).where(MmmModel.workspace_id == ws_id).order_by(MmmModel.created_at.desc())
    )
    return list(res.scalars().all())


async def get_model(db: AsyncSession, ws_id: uuid.UUID, model_id: uuid.UUID) -> MmmModel | None:
    res = await db.execute(
        select(MmmModel).where(MmmModel.workspace_id == ws_id, MmmModel.id == model_id)
    )
    return res.scalar_one_or_none()


async def create_model(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    period_start: date | None,
    period_end: date | None,
    channels: list[str] | None,
) -> MmmModel:
    obj = MmmModel(
        workspace_id=ws_id,
        name=name,
        period_start=period_start,
        period_end=period_end,
        channels=channels or [],
        status="draft",
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def list_incrementality(db: AsyncSession, ws_id: uuid.UUID) -> list[IncrementalityTest]:
    res = await db.execute(
        select(IncrementalityTest)
        .where(IncrementalityTest.workspace_id == ws_id)
        .order_by(IncrementalityTest.created_at.desc())
    )
    return list(res.scalars().all())


async def create_incrementality(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    channel: str,
    method: str,
    lift_pct: float | None,
    confidence: float | None,
    detail: dict | None,
) -> IncrementalityTest:
    obj = IncrementalityTest(
        workspace_id=ws_id,
        channel=channel,
        method=method,
        lift_pct=lift_pct,
        confidence=confidence,
        status="recorded" if lift_pct is not None else "pending",
        detail=detail or {},
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


# --------------------------------------------------------------------------- #
# Ingestion
# --------------------------------------------------------------------------- #
async def ingest_spend(db: AsyncSession, ws_id: uuid.UUID, rows: list[dict]) -> int:
    """Persist manual spend/revenue observations. Returns the count inserted."""
    inserted = 0
    for r in rows:
        d = r.get("date")
        if isinstance(d, str):
            d = date.fromisoformat(d)
        if d is None or not r.get("channel"):
            continue
        db.add(
            ChannelSpendSeries(
                workspace_id=ws_id,
                channel=str(r["channel"]),
                date=d,
                spend=float(r.get("spend") or 0.0),
                conversions=(int(r["conversions"]) if r.get("conversions") is not None else None),
                revenue=(float(r["revenue"]) if r.get("revenue") is not None else None),
                source=r.get("source") or "manual",
            )
        )
        inserted += 1
    if inserted:
        await db.commit()
    return inserted


async def sync_from_platform(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Pull real spend from ads ``Metric`` rows and revenue from ``RevenueEvent``.

    Builds ``ChannelSpendSeries`` observations from the workspace's own data:
    spend per channel/day from ad metrics, revenue per channel/day from closed
    revenue events. Existing synced rows are not duplicated within this call.
    """
    # Spend by (channel=source, day) from ad metrics.
    spend_res = await db.execute(
        select(Metric.source, Metric.metric_date, func.sum(Metric.spend), func.sum(Metric.conversions))
        .where(Metric.workspace_id == ws_id)
        .group_by(Metric.source, Metric.metric_date)
    )
    # Revenue by (channel, day) from won revenue events.
    rev_res = await db.execute(
        select(RevenueEvent.channel, func.date(RevenueEvent.occurred_at), func.sum(RevenueEvent.value))
        .where(RevenueEvent.workspace_id == ws_id, RevenueEvent.stage == "closed_won")
        .group_by(RevenueEvent.channel, func.date(RevenueEvent.occurred_at))
    )

    merged: dict[tuple[str, date], dict] = {}
    for channel, d, spend, conv in spend_res.all():
        if channel is None or d is None:
            continue
        merged[(str(channel), d)] = {
            "spend": float(spend or 0.0),
            "conversions": int(conv or 0),
            "revenue": None,
        }
    for channel, d, rev in rev_res.all():
        if channel is None or d is None:
            continue
        key = (str(channel), d)
        slot = merged.setdefault(key, {"spend": 0.0, "conversions": None, "revenue": None})
        slot["revenue"] = float(rev or 0.0)

    written = 0
    for (channel, d), vals in merged.items():
        db.add(
            ChannelSpendSeries(
                workspace_id=ws_id,
                channel=channel,
                date=d,
                spend=vals["spend"],
                conversions=vals.get("conversions"),
                revenue=vals.get("revenue"),
                source="sync",
            )
        )
        written += 1
    if written:
        await db.commit()
    return {"observations": written, "channels": sorted({c for c, _ in merged.keys()})}


# --------------------------------------------------------------------------- #
# Regression (pure-python least squares, numpy-accelerated when present)
# --------------------------------------------------------------------------- #
def _solve_normal_equations(xtx: list[list[float]], xty: list[float]) -> list[float] | None:
    """Solve (XtX) b = Xty via Gauss-Jordan with tiny ridge for stability."""
    n = len(xtx)
    a = [row[:] + [xty[i]] for i, row in enumerate(xtx)]
    for i in range(n):
        a[i][i] += 1e-8  # ridge regularisation guards near-singular matrices
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < 1e-12:
            return None
        a[col], a[pivot] = a[pivot], a[col]
        piv = a[col][col]
        a[col] = [v / piv for v in a[col]]
        for r in range(n):
            if r == col:
                continue
            factor = a[r][col]
            if factor:
                a[r] = [v - factor * a[col][i] for i, v in enumerate(a[r])]
    return [a[i][n] for i in range(n)]


def _ols(features: list[list[float]], target: list[float]) -> tuple[list[float], float] | None:
    """Fit target = b0 + sum(b_k * x_k). Returns (coeffs incl intercept, r_squared)."""
    m = len(target)
    if m == 0:
        return None
    k = len(features[0]) if features else 0
    design = [[1.0] + features[i] for i in range(m)]

    if _np is not None:
        X = _np.array(design, dtype=float)
        y = _np.array(target, dtype=float)
        coef, *_ = _np.linalg.lstsq(X, y, rcond=None)
        pred = X @ coef
        ss_res = float(((y - pred) ** 2).sum())
        ss_tot = float(((y - y.mean()) ** 2).sum())
        r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else 0.0
        return [float(c) for c in coef], max(min(r2, 1.0), -1.0)

    cols = k + 1
    xtx = [[0.0] * cols for _ in range(cols)]
    xty = [0.0] * cols
    for i in range(m):
        row = design[i]
        for a in range(cols):
            xty[a] += row[a] * target[i]
            for b in range(cols):
                xtx[a][b] += row[a] * row[b]
    coef = _solve_normal_equations(xtx, xty)
    if coef is None:
        return None
    mean_y = sum(target) / m
    ss_res = 0.0
    ss_tot = 0.0
    for i in range(m):
        pred = sum(coef[j] * design[i][j] for j in range(cols))
        ss_res += (target[i] - pred) ** 2
        ss_tot += (target[i] - mean_y) ** 2
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-12 else 0.0
    return coef, max(min(r2, 1.0), -1.0)


async def _load_observations(
    db: AsyncSession, ws_id: uuid.UUID, model: MmmModel
) -> tuple[list[str], dict[date, dict[str, float]], dict[date, float]]:
    """Return (channels, spend_by_date, revenue_by_date) within the model window."""
    q = select(ChannelSpendSeries).where(ChannelSpendSeries.workspace_id == ws_id)
    if model.period_start:
        q = q.where(ChannelSpendSeries.date >= model.period_start)
    if model.period_end:
        q = q.where(ChannelSpendSeries.date <= model.period_end)
    res = await db.execute(q)
    rows = list(res.scalars().all())

    wanted = set(model.channels or [])
    spend_by_date: dict[date, dict[str, float]] = {}
    revenue_by_date: dict[date, float] = {}
    channels: set[str] = set()
    for row in rows:
        if wanted and row.channel not in wanted:
            continue
        channels.add(row.channel)
        spend_by_date.setdefault(row.date, {})
        spend_by_date[row.date][row.channel] = spend_by_date[row.date].get(row.channel, 0.0) + float(
            row.spend or 0.0
        )
        if row.revenue is not None:
            revenue_by_date[row.date] = revenue_by_date.get(row.date, 0.0) + float(row.revenue)
    return sorted(channels), spend_by_date, revenue_by_date


# --------------------------------------------------------------------------- #
# Adstock + Hill transforms (enterprise pipeline)
# --------------------------------------------------------------------------- #
def _geometric_adstock(series: list[float], theta: float) -> list[float]:
    """Geometric (carry-over) adstock: x_t' = x_t + theta * x_{t-1}'.

    ``theta`` in [0, 1). Higher theta → longer carry-over.
    """
    if theta <= 0.0:
        return list(series)
    out = [0.0] * len(series)
    out[0] = series[0]
    for i in range(1, len(series)):
        out[i] = series[i] + theta * out[i - 1]
    return out


def _hill_transform(x: float, alpha: float, gamma: float) -> float:
    """Hill saturation: x^alpha / (x^alpha + gamma^alpha).

    Numerically stable: guards gamma <= 0, x <= 0 and huge exponents.
    ``alpha`` > 0 controls steepness; ``gamma`` > 0 is the half-saturation point.
    """
    if x <= 0.0 or gamma <= 0.0 or alpha <= 0.0:
        return 0.0
    log_x = alpha * math.log(x)
    log_g = alpha * math.log(gamma)
    # Avoid overflow by normalising
    m = max(log_x, log_g)
    num = math.exp(log_x - m)
    den = math.exp(log_x - m) + math.exp(log_g - m)
    return num / den if den > 0.0 else 0.0


def _hill_transform_vec(xs: list[float], alpha: float, gamma: float) -> list[float]:
    return [_hill_transform(x, alpha, gamma) for x in xs]


def _hill_marginal(x: float, alpha: float, gamma: float) -> float:
    """Derivative of Hill at x: d/dx [x^a / (x^a + g^a)].

    = alpha * gamma^alpha * x^(alpha-1) / (x^alpha + gamma^alpha)^2
    """
    if x <= 0.0 or gamma <= 0.0 or alpha <= 0.0:
        return 0.0
    xa = x ** alpha
    ga = gamma ** alpha
    denom = (xa + ga) ** 2
    if denom < 1e-30:
        return 0.0
    return alpha * ga * (x ** (alpha - 1)) / denom


# --------------------------------------------------------------------------- #
# Adjusted R² helper
# --------------------------------------------------------------------------- #
def _adj_r2(r2: float, n: int, k: int) -> float:
    """Adjusted R² with denominator guard."""
    if n - k - 1 <= 0:
        return r2
    return 1.0 - (1.0 - r2) * (n - 1) / (n - k - 1)


# --------------------------------------------------------------------------- #
# Coefficient significance (SE, t-stat, p-value, CI)
# --------------------------------------------------------------------------- #
def _t_cdf_approx(t: float, df: int) -> float:
    """Approximate two-tailed p-value from a t-statistic using the normal approx.

    For df > 30 the t-distribution is ≈ normal. For smaller df we use the
    Abramowitz & Stegun rational approximation of the standard-normal CDF and
    apply a Welch-Satterthwaite correction factor.
    """
    if df <= 0:
        return 1.0
    # Correct t for small df via Hill approximation: z ≈ t*(1 - 1/(4*df))
    z = abs(t) * (1.0 - 0.25 / max(df, 1))
    # Normal CDF via A&S 26.2.17
    p = 0.2316419
    b1, b2, b3, b4, b5 = 0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429
    tt = 1.0 / (1.0 + p * z)
    pdf = math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)
    cdf = 1.0 - pdf * (b1 * tt + b2 * tt**2 + b3 * tt**3 + b4 * tt**4 + b5 * tt**5)
    return 2.0 * (1.0 - cdf)


# Approximate t critical value for 95 % two-tailed
_T_CRIT_95 = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042, 40: 2.021,
    60: 2.000, 120: 1.980,
}


def _t_critical(df: int) -> float:
    if df <= 0:
        return 1.96
    if df in _T_CRIT_95:
        return _T_CRIT_95[df]
    # Interpolate between known values
    keys = sorted(_T_CRIT_95.keys())
    if df < keys[0]:
        return _T_CRIT_95[keys[0]]
    if df > keys[-1]:
        return 1.96
    for i in range(len(keys) - 1):
        if keys[i] <= df <= keys[i + 1]:
            frac = (df - keys[i]) / (keys[i + 1] - keys[i])
            return _T_CRIT_95[keys[i]] * (1 - frac) + _T_CRIT_95[keys[i + 1]] * frac
    return 1.96


def _coefficient_stats(
    design: list[list[float]], target: list[float], coef: list[float],
) -> list[dict]:
    """Compute SE, t-stat, p-value and 95 % CI for each coefficient.

    Uses residual variance and (XᵀX)⁻¹ diagonal.
    """
    n = len(target)
    p = len(coef)
    dof = n - p
    if dof <= 0:
        return [
            {"se": None, "t_stat": None, "p_value": None, "ci_lower": None, "ci_upper": None, "low_data": True}
            for _ in coef
        ]

    if _np is not None:
        X = _np.array(design, dtype=float)
        y = _np.array(target, dtype=float)
        b = _np.array(coef, dtype=float)
        residuals = y - X @ b
        s2 = float((residuals ** 2).sum()) / dof
        try:
            xtx_inv = _np.linalg.inv(X.T @ X + _np.eye(p) * 1e-10)
        except _np.linalg.LinAlgError:
            return [
                {"se": None, "t_stat": None, "p_value": None, "ci_lower": None, "ci_upper": None, "low_data": True}
                for _ in coef
            ]
        var_b = s2 * _np.diag(xtx_inv)
        se = [float(math.sqrt(max(v, 0.0))) for v in var_b]
    else:
        # Pure-python path
        pred = [sum(coef[j] * design[i][j] for j in range(p)) for i in range(n)]
        ss_res = sum((target[i] - pred[i]) ** 2 for i in range(n))
        s2 = ss_res / dof
        # Build XᵀX
        xtx = [[sum(design[i][a] * design[i][b] for i in range(n)) for b in range(p)] for a in range(p)]
        for i in range(p):
            xtx[i][i] += 1e-10
        # Invert via Gauss-Jordan
        aug = [xtx[i][:] + [1.0 if j == i else 0.0 for j in range(p)] for i in range(p)]
        for col in range(p):
            pivot = max(range(col, p), key=lambda r: abs(aug[r][col]))
            aug[col], aug[pivot] = aug[pivot], aug[col]
            piv_val = aug[col][col]
            if abs(piv_val) < 1e-15:
                return [
                    {"se": None, "t_stat": None, "p_value": None, "ci_lower": None, "ci_upper": None, "low_data": True}
                    for _ in coef
                ]
            aug[col] = [v / piv_val for v in aug[col]]
            for r in range(p):
                if r == col:
                    continue
                f = aug[r][col]
                aug[r] = [aug[r][j] - f * aug[col][j] for j in range(2 * p)]
        diag_inv = [aug[i][p + i] for i in range(p)]
        se = [math.sqrt(max(s2 * diag_inv[i], 0.0)) for i in range(p)]

    t_crit = _t_critical(dof)
    stats = []
    for i, b in enumerate(coef):
        if se[i] > 1e-15:
            t_stat = b / se[i]
            p_val = _t_cdf_approx(t_stat, dof)
            ci_lo = b - t_crit * se[i]
            ci_hi = b + t_crit * se[i]
        else:
            t_stat, p_val, ci_lo, ci_hi = 0.0, 1.0, b, b
        stats.append({
            "se": round(se[i], 8),
            "t_stat": round(t_stat, 4),
            "p_value": round(p_val, 6),
            "ci_lower": round(ci_lo, 6),
            "ci_upper": round(ci_hi, 6),
        })
    return stats


# --------------------------------------------------------------------------- #
# Hyper-parameter grid search (adstock theta + Hill alpha/gamma)
# --------------------------------------------------------------------------- #
_THETA_GRID = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
_ALPHA_GRID = [0.5, 1.0, 1.5, 2.0, 3.0]
_GAMMA_QUANTILES = [0.25, 0.5, 0.75]  # gamma searched as quantiles of adstocked spend


def _fit_with_transforms(
    raw_spend_matrix: list[list[float]],
    target: list[float],
    n_channels: int,
) -> tuple[
    list[float],  # coef (intercept + channels)
    float,  # r2
    float,  # adj_r2
    list[list[float]],  # final design matrix
    dict[int, dict],  # per-channel hyper-params {idx: {theta, alpha, gamma}}
]:
    """Grid-search adstock theta and Hill alpha/gamma per channel, then OLS.

    For each channel independently: try all theta values and Hill (alpha, gamma)
    combos; pick the combination that maximises adjusted R² over the full model.
    This is a coordinate-descent approach: iterate channels, holding others fixed.
    """
    n = len(target)
    # Start with raw spend (no transform)
    best_transformed = [row[:] for row in raw_spend_matrix]
    best_params: dict[int, dict] = {
        ci: {"theta": 0.0, "alpha": 1.0, "gamma": 1.0} for ci in range(n_channels)
    }

    # Initial fit
    fit0 = _ols(best_transformed, target)
    if fit0 is None:
        # If even raw data doesn't converge, bail
        return [], 0.0, 0.0, [], best_params
    best_coef, best_r2 = fit0
    best_adj = _adj_r2(best_r2, n, n_channels)

    # Coordinate descent: 2 passes to allow interactions to stabilise
    for _pass in range(2):
        for ci in range(n_channels):
            raw_col = [raw_spend_matrix[t][ci] for t in range(n)]
            local_best_adj = best_adj
            local_best_theta = best_params[ci]["theta"]
            local_best_alpha = best_params[ci]["alpha"]
            local_best_gamma = best_params[ci]["gamma"]
            local_best_col: list[float] | None = None

            for theta in _THETA_GRID:
                adstocked = _geometric_adstock(raw_col, theta)
                # Compute gamma candidates from quantiles of positive adstocked spend
                pos_vals = sorted(v for v in adstocked if v > 0)
                if not pos_vals:
                    continue
                gamma_candidates = []
                for q in _GAMMA_QUANTILES:
                    idx = min(int(q * len(pos_vals)), len(pos_vals) - 1)
                    gamma_candidates.append(pos_vals[idx])
                gamma_candidates = list(set(g for g in gamma_candidates if g > 0))
                if not gamma_candidates:
                    gamma_candidates = [1.0]

                for alpha in _ALPHA_GRID:
                    for gamma in gamma_candidates:
                        transformed_col = _hill_transform_vec(adstocked, alpha, gamma)
                        # Build trial feature matrix
                        trial = [row[:] for row in best_transformed]
                        for t in range(n):
                            trial[t][ci] = transformed_col[t]
                        trial_fit = _ols(trial, target)
                        if trial_fit is None:
                            continue
                        _, trial_r2 = trial_fit
                        trial_adj = _adj_r2(trial_r2, n, n_channels)
                        if trial_adj > local_best_adj + 1e-6:
                            local_best_adj = trial_adj
                            local_best_theta = theta
                            local_best_alpha = alpha
                            local_best_gamma = gamma
                            local_best_col = transformed_col

            if local_best_col is not None:
                for t in range(n):
                    best_transformed[t][ci] = local_best_col[t]
                best_params[ci] = {
                    "theta": local_best_theta,
                    "alpha": local_best_alpha,
                    "gamma": local_best_gamma,
                }
                refit = _ols(best_transformed, target)
                if refit is not None:
                    best_coef, best_r2 = refit
                    best_adj = _adj_r2(best_r2, n, n_channels)

    return best_coef, best_r2, best_adj, best_transformed, best_params


# --------------------------------------------------------------------------- #
# Legacy saturation helper (kept for backward compat in results JSON)
# --------------------------------------------------------------------------- #
def _saturation(channel_spends: list[float], revenue: list[float], beta: float) -> dict:
    """Single-variable log/Hill read of diminishing returns for one channel."""
    pairs = [(s, r) for s, r in zip(channel_spends, revenue) if s > 0]
    avg_spend = sum(s for s, _ in pairs) / len(pairs) if pairs else 0.0
    spends_sorted = sorted(s for s, _ in pairs)
    if spends_sorted:
        mid = len(spends_sorted) // 2
        k = (
            spends_sorted[mid]
            if len(spends_sorted) % 2
            else (spends_sorted[mid - 1] + spends_sorted[mid]) / 2
        )
    else:
        k = 0.0
    sat_fraction = (avg_spend / (avg_spend + k)) if (avg_spend + k) > 0 else 0.0
    marginal = beta / (1.0 + avg_spend) if avg_spend >= 0 else beta
    return {
        "avg_spend": round(avg_spend, 4),
        "half_saturation_k": round(k, 4),
        "saturation_fraction": round(sat_fraction, 4),
        "marginal_return": round(marginal, 6),
        "saturated": sat_fraction >= 0.66,
    }


# --------------------------------------------------------------------------- #
# Response-curve points for frontend charts
# --------------------------------------------------------------------------- #
def _response_curve(alpha: float, gamma: float, beta: float, max_spend: float, n_points: int = 50) -> list[dict]:
    """Generate (spend, response) curve points for a channel's fitted Hill."""
    if max_spend <= 0:
        return []
    points = []
    for i in range(n_points + 1):
        x = max_spend * i / n_points
        h = _hill_transform(x, alpha, gamma)
        points.append({
            "spend": round(x, 2),
            "response": round(beta * h, 4),
            "marginal": round(beta * _hill_marginal(x, alpha, gamma), 6),
        })
    return points


# --------------------------------------------------------------------------- #
# fit_model — enterprise version with adstock + Hill + significance
# --------------------------------------------------------------------------- #
async def fit_model(db: AsyncSession, ws_id: uuid.UUID, model: MmmModel) -> MmmModel:
    """Fit the MMM on real rows and persist results. Never fabricates numbers.

    Pipeline: load → adstock (geometric, grid-search theta) → Hill saturation
    (grid-search alpha/gamma) → OLS → coefficient stats → decomposition + ROI.
    """
    channels, spend_by_date, revenue_by_date = await _load_observations(db, ws_id, model)
    model.channels = channels

    dates = sorted(d for d in spend_by_date if d in revenue_by_date)
    valid_per_channel = {
        c: sum(1 for d in dates if spend_by_date[d].get(c, 0.0) > 0) for c in channels
    }
    enough = [c for c in channels if valid_per_channel.get(c, 0) >= 2]

    if len(dates) < 2 or not enough:
        model.status = "awaiting_data"
        model.results = {
            "reason": "Need at least 2 dated revenue observations and 2 spend points per channel.",
            "dates": len(dates),
            "valid_per_channel": valid_per_channel,
        }
        model.r_squared = None
        await db.commit()
        await db.refresh(model)
        return model

    feat_channels = enough
    n_channels = len(feat_channels)
    raw_features = [[spend_by_date[d].get(c, 0.0) for c in feat_channels] for d in dates]
    target = [revenue_by_date[d] for d in dates]
    n_obs = len(dates)

    # --- Enterprise pipeline: adstock + Hill + OLS ---
    coef, r2, adj_r2_val, design_transformed, hyper_params = _fit_with_transforms(
        raw_features, target, n_channels,
    )

    if not coef:
        # Fallback: plain OLS without transforms
        fit = _ols(raw_features, target)
        if fit is None:
            model.status = "failed"
            model.results = {"reason": "Regression did not converge on the provided rows."}
            model.r_squared = None
            await db.commit()
            await db.refresh(model)
            return model
        coef, r2 = fit
        adj_r2_val = _adj_r2(r2, n_obs, n_channels)
        design_transformed = raw_features
        hyper_params = {ci: {"theta": 0.0, "alpha": 1.0, "gamma": 1.0} for ci in range(n_channels)}

    base = coef[0]
    betas = {c: coef[i + 1] for i, c in enumerate(feat_channels)}

    # Build the full design matrix (with intercept) for coefficient stats
    full_design = [[1.0] + design_transformed[t] for t in range(n_obs)]
    coef_stats = _coefficient_stats(full_design, target, coef)

    # --- Decomposition ---
    # Contribution per channel per period: beta_c * transformed_spend_c(t)
    total_spend_by_channel = {
        c: sum(spend_by_date[d].get(c, 0.0) for d in dates) for c in feat_channels
    }

    # Contribution = sum over dates of beta_c * Hill(adstocked_spend_c(t))
    contributions: dict[str, float] = {}
    for ci, c in enumerate(feat_channels):
        contrib = sum(betas[c] * design_transformed[t][ci] for t in range(n_obs))
        contributions[c] = contrib

    base_total = base * n_obs
    incremental_total = sum(contributions.values())
    total_modeled = base_total + incremental_total

    roi_by_channel = {
        c: (contributions[c] / total_spend_by_channel[c]) if total_spend_by_channel[c] > 0 else 0.0
        for c in feat_channels
    }

    # --- Channel hyper-params + Hill saturation info + response curves ---
    channel_params: dict[str, dict] = {}
    response_curves: dict[str, list[dict]] = {}
    saturation: dict[str, dict] = {}
    marginal_roi: dict[str, float] = {}

    for ci, c in enumerate(feat_channels):
        hp = hyper_params.get(ci, {"theta": 0.0, "alpha": 1.0, "gamma": 1.0})
        alpha = hp["alpha"]
        gamma = hp["gamma"]
        theta = hp["theta"]
        avg_raw = total_spend_by_channel[c] / n_obs if n_obs > 0 else 0.0
        max_raw = max((spend_by_date[d].get(c, 0.0) for d in dates), default=0.0)

        channel_params[c] = {
            "theta": round(theta, 2),
            "alpha": round(alpha, 2),
            "gamma": round(gamma, 4),
        }

        # Hill saturation at average spend (after adstock)
        adstocked_col = _geometric_adstock(
            [spend_by_date[d].get(c, 0.0) for d in dates], theta
        )
        avg_adstocked = sum(adstocked_col) / n_obs if n_obs > 0 else 0.0
        sat_frac = _hill_transform(avg_adstocked, alpha, gamma)
        m_roi = betas[c] * _hill_marginal(avg_adstocked, alpha, gamma)
        marginal_roi[c] = m_roi

        saturation[c] = {
            "avg_spend": round(avg_raw, 4),
            "avg_adstocked_spend": round(avg_adstocked, 4),
            "half_saturation_gamma": round(gamma, 4),
            "saturation_fraction": round(sat_frac, 4),
            "marginal_return": round(m_roi, 6),
            "saturated": sat_frac >= 0.66,
            "theta": round(theta, 2),
            "alpha": round(alpha, 2),
        }

        # Response curve for chart
        curve_max = max(max_raw * 2.0, avg_raw * 3.0, 1.0)
        adstock_at_curve = curve_max  # approximate: at steady-state adstock ≈ spend/(1-theta)
        response_curves[c] = _response_curve(alpha, gamma, betas[c], curve_max, n_points=40)

    # --- Coefficient significance dict ---
    significance: dict[str, dict] = {}
    significance["_intercept"] = coef_stats[0] if coef_stats else {}
    for ci, c in enumerate(feat_channels):
        significance[c] = coef_stats[ci + 1] if ci + 1 < len(coef_stats) else {}

    # --- Legacy saturation compat ---
    legacy_saturation = {
        c: _saturation(
            [spend_by_date[d].get(c, 0.0) for d in dates],
            target,
            betas[c],
        )
        for c in feat_channels
    }

    denom = total_modeled if abs(total_modeled) > 1e-9 else 1.0
    low_data = n_obs < (n_channels + 2) * 3

    model.status = "ready"
    model.r_squared = round(r2, 4)
    model.results = {
        "base_sales": round(base_total, 2),
        "intercept_per_period": round(base, 4),
        "contributions": {c: round(v, 2) for c, v in contributions.items()},
        "roi_by_channel": {c: round(v, 4) for c, v in roi_by_channel.items()},
        "marginal_roi": {c: round(v, 6) for c, v in marginal_roi.items()},
        "coefficients": {c: round(betas[c], 6) for c in feat_channels},
        "coefficient_significance": significance,
        "total_spend_by_channel": {c: round(v, 2) for c, v in total_spend_by_channel.items()},
        "base_vs_incremental": {
            "base": round(base_total, 2),
            "incremental": round(incremental_total, 2),
            "base_pct": round(100.0 * base_total / denom, 2),
            "incremental_pct": round(100.0 * incremental_total / denom, 2),
        },
        "saturation": saturation,
        "channel_params": channel_params,
        "response_curves": response_curves,
        "adj_r_squared": round(adj_r2_val, 4),
        "observations": n_obs,
        "low_data": low_data,
        "fitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.commit()
    await db.refresh(model)
    return model


# --------------------------------------------------------------------------- #
# Budget optimizer — marginal-ROI equalisation
# --------------------------------------------------------------------------- #
def optimize_budget(results: dict, total_budget: float) -> dict:
    """Allocate ``total_budget`` to maximise predicted response via fitted Hill curves.

    Uses marginal-ROI equalisation: iteratively allocates a small slice of budget
    to the channel with the highest marginal return until the budget is exhausted.
    Pure numpy-free hill-climb.
    """
    channels = list((results.get("coefficients") or {}).keys())
    params = results.get("channel_params") or {}
    coefficients = results.get("coefficients") or {}
    current_spend = results.get("total_spend_by_channel") or {}
    n_obs = results.get("observations") or 1

    if not channels or total_budget <= 0:
        return {
            "allocated": {},
            "predicted_response": 0.0,
            "current_response": 0.0,
            "lift_pct": 0.0,
            "insufficient_data": not channels,
        }

    # Predicted response at a spend level for one period
    def _channel_response(ch: str, spend: float) -> float:
        hp = params.get(ch, {})
        alpha = hp.get("alpha", 1.0)
        gamma = hp.get("gamma", 1.0)
        beta = coefficients.get(ch, 0.0)
        return beta * _hill_transform(spend, alpha, gamma)

    def _channel_marginal(ch: str, spend: float) -> float:
        hp = params.get(ch, {})
        alpha = hp.get("alpha", 1.0)
        gamma = hp.get("gamma", 1.0)
        beta = coefficients.get(ch, 0.0)
        return beta * _hill_marginal(spend, alpha, gamma)

    # Hill-climb: allocate budget in small slices
    alloc = {c: 0.0 for c in channels}
    slice_size = total_budget / 200.0  # 200 iterations
    remaining = total_budget

    for _ in range(200):
        if remaining <= 0:
            break
        chunk = min(slice_size, remaining)
        # Find channel with highest marginal return at current allocation
        best_ch = None
        best_mr = -1e30
        for c in channels:
            mr = _channel_marginal(c, alloc[c])
            if mr > best_mr:
                best_mr = mr
                best_ch = c
        if best_ch is None or best_mr <= 0:
            # Spread remaining equally
            per_ch = remaining / len(channels)
            for c in channels:
                alloc[c] += per_ch
            remaining = 0
            break
        alloc[best_ch] += chunk
        remaining -= chunk

    # Compute predicted responses
    predicted = sum(_channel_response(c, alloc[c]) for c in channels)
    current_per_period = {c: current_spend.get(c, 0.0) / max(n_obs, 1) for c in channels}
    current_response = sum(_channel_response(c, current_per_period[c]) for c in channels)

    lift_pct = (
        ((predicted - current_response) / current_response * 100.0)
        if current_response > 1e-9
        else 0.0
    )

    return {
        "total_budget": round(total_budget, 2),
        "allocated": {c: round(v, 2) for c, v in alloc.items()},
        "predicted_response": round(predicted, 2),
        "current_response": round(current_response, 2),
        "lift_pct": round(lift_pct, 2),
        "per_channel": {
            c: {
                "spend": round(alloc[c], 2),
                "predicted_response": round(_channel_response(c, alloc[c]), 4),
                "marginal_roi_at_allocation": round(_channel_marginal(c, alloc[c]), 6),
            }
            for c in channels
        },
    }


# --------------------------------------------------------------------------- #
# What-if simulator
# --------------------------------------------------------------------------- #
def what_if(results: dict, spend_scenario: dict[str, float]) -> dict:
    """Given arbitrary per-channel spends, predict total response + CI band.

    CI band uses the coefficient SEs to produce ± 1.96σ bounds.
    """
    params = results.get("channel_params") or {}
    coefficients = results.get("coefficients") or {}
    significance = results.get("coefficient_significance") or {}
    intercept = results.get("intercept_per_period") or 0.0
    intercept_sig = significance.get("_intercept") or {}

    base = intercept
    total = base
    channel_detail: dict[str, dict] = {}
    var_total = 0.0

    # Intercept variance
    se_int = intercept_sig.get("se") or 0.0
    var_total += se_int ** 2

    for ch, spend in spend_scenario.items():
        hp = params.get(ch, {})
        alpha = hp.get("alpha", 1.0)
        gamma = hp.get("gamma", 1.0)
        beta = coefficients.get(ch, 0.0)
        h = _hill_transform(spend, alpha, gamma)
        response = beta * h
        total += response

        ch_sig = significance.get(ch) or {}
        se = ch_sig.get("se") or 0.0
        var_total += (h * se) ** 2  # delta-method variance: Var[beta*h] ≈ h²*Var[beta]

        channel_detail[ch] = {
            "spend": round(spend, 2),
            "response": round(response, 4),
            "hill_output": round(h, 6),
            "marginal_roi": round(beta * _hill_marginal(spend, alpha, gamma), 6),
        }

    se_total = math.sqrt(var_total) if var_total > 0 else 0.0
    return {
        "predicted_response": round(total, 2),
        "ci_lower": round(total - 1.96 * se_total, 2),
        "ci_upper": round(total + 1.96 * se_total, 2),
        "base": round(base, 4),
        "channels": channel_detail,
    }


# --------------------------------------------------------------------------- #
# Overview
# --------------------------------------------------------------------------- #
async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Roll up the latest ready model: top ROI channel, base/incremental %, R²."""
    res = await db.execute(
        select(MmmModel)
        .where(MmmModel.workspace_id == ws_id, MmmModel.status == "ready")
        .order_by(MmmModel.created_at.desc())
    )
    model = res.scalars().first()

    total_models = await db.scalar(
        select(func.count()).select_from(MmmModel).where(MmmModel.workspace_id == ws_id)
    )
    total_obs = await db.scalar(
        select(func.count())
        .select_from(ChannelSpendSeries)
        .where(ChannelSpendSeries.workspace_id == ws_id)
    )

    if model is None or not model.results:
        return {
            "has_model": False,
            "models": int(total_models or 0),
            "observations": int(total_obs or 0),
            "best_roi_channel": None,
            "best_roi": None,
            "base_pct": None,
            "incremental_pct": None,
            "r_squared": None,
        }

    roi = model.results.get("roi_by_channel", {}) or {}
    best_channel = max(roi, key=roi.get) if roi else None
    bvi = model.results.get("base_vs_incremental", {}) or {}
    return {
        "has_model": True,
        "model_id": str(model.id),
        "model_name": model.name,
        "models": int(total_models or 0),
        "observations": int(total_obs or 0),
        "best_roi_channel": best_channel,
        "best_roi": roi.get(best_channel) if best_channel else None,
        "base_pct": bvi.get("base_pct"),
        "incremental_pct": bvi.get("incremental_pct"),
        "r_squared": model.r_squared,
        "contributions": model.results.get("contributions", {}),
        "roi_by_channel": roi,
    }
