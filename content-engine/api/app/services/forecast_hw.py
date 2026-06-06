"""Holt-Winters (triple exponential smoothing) forecasting in pure numpy.

Provides additive and multiplicative seasonal models, automatic period
detection, grid-based parameter optimisation, backtesting with accuracy
metrics (MAPE / MAE / RMSE), and residual-based prediction intervals.

All math is deterministic — no random seeds, no external solvers.
"""
from __future__ import annotations

import itertools
from math import sqrt
from typing import Literal

import numpy as np

# ── Minimum data requirements ──────────────────────────────────────────────
MIN_SEASONAL_PERIODS = 2   # need at least 2 full cycles for seasonal fit
MIN_BACKTEST_HOLDOUT = 3   # absolute minimum holdout for accuracy stats


# ── Holt-Winters core ─────────────────────────────────────────────────────
def _hw_fit(
    y: np.ndarray,
    period: int,
    alpha: float,
    beta: float,
    gamma: float,
    mode: Literal["additive", "multiplicative"] = "additive",
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Run Holt-Winters smoothing and return (level, trend, seasonal, fitted).

    ``y`` must have length >= 2 * period.  Returns arrays of length len(y).
    """
    n = len(y)
    level = np.zeros(n)
    trend = np.zeros(n)
    seasonal = np.zeros(n + period)  # extra room for look-back
    fitted = np.zeros(n)

    # ── Initialise ──
    # Level: mean of first period
    level[0] = np.mean(y[:period])
    # Trend: average slope across first two periods
    trend[0] = (np.mean(y[period : 2 * period]) - np.mean(y[:period])) / period

    if mode == "additive":
        for j in range(period):
            seasonal[j] = y[j] - level[0]
        fitted[0] = level[0] + trend[0] + seasonal[0]

        for t in range(1, n):
            s_prev = seasonal[t - 1] if t >= period else seasonal[t % period]
            # Use seasonal index from one full period back when available
            s_back = seasonal[t] if t >= period else seasonal[t % period]

            level[t] = alpha * (y[t] - s_back) + (1 - alpha) * (level[t - 1] + trend[t - 1])
            trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * trend[t - 1]
            seasonal[t + period] = gamma * (y[t] - level[t]) + (1 - gamma) * s_back
            fitted[t] = level[t] + trend[t] + seasonal[t + period]

    else:  # multiplicative
        for j in range(period):
            seasonal[j] = y[j] / level[0] if level[0] != 0 else 1.0
        fitted[0] = (level[0] + trend[0]) * seasonal[0]

        for t in range(1, n):
            s_back = seasonal[t] if t >= period else seasonal[t % period]
            denom = s_back if s_back != 0 else 1e-9

            level[t] = alpha * (y[t] / denom) + (1 - alpha) * (level[t - 1] + trend[t - 1])
            trend[t] = beta * (level[t] - level[t - 1]) + (1 - beta) * trend[t - 1]
            seasonal[t + period] = gamma * (y[t] / level[t] if level[t] != 0 else 1.0) + (1 - gamma) * s_back
            fitted[t] = (level[t] + trend[t]) * seasonal[t + period]

    return level, trend, seasonal, fitted


def _hw_forecast(
    level: np.ndarray,
    trend: np.ndarray,
    seasonal: np.ndarray,
    period: int,
    horizon: int,
    mode: Literal["additive", "multiplicative"] = "additive",
) -> np.ndarray:
    """Produce ``horizon`` steps of out-of-sample forecasts."""
    n = len(level)
    last_level = level[n - 1]
    last_trend = trend[n - 1]
    fc = np.zeros(horizon)

    for h in range(1, horizon + 1):
        s_idx = n + period - period + (h - 1) % period  # cycle through last seasonal values
        # Safer: grab the seasonal value for the corresponding phase
        phase = (n + h - 1) % period
        # Walk back to find the last seasonal estimate for this phase
        s_val = seasonal[n + phase] if (n + phase) < len(seasonal) else seasonal[phase]

        if mode == "additive":
            fc[h - 1] = last_level + h * last_trend + s_val
        else:
            fc[h - 1] = (last_level + h * last_trend) * s_val

    return fc


# ── Grid search for optimal parameters ────────────────────────────────────
_GRID_STEPS = [0.05, 0.15, 0.3, 0.5, 0.7, 0.9]


def _grid_search_params(
    y: np.ndarray,
    period: int,
    mode: Literal["additive", "multiplicative"] = "additive",
) -> tuple[float, float, float, float]:
    """Coarse grid search for (alpha, beta, gamma) minimising in-sample MSE.

    Returns ``(alpha, beta, gamma, mse)``.
    """
    best: tuple[float, float, float, float] = (0.3, 0.1, 0.3, float("inf"))

    for a, b, g in itertools.product(_GRID_STEPS, _GRID_STEPS, _GRID_STEPS):
        try:
            _, _, _, fitted = _hw_fit(y, period, a, b, g, mode)
            residuals = y - fitted
            mse = float(np.mean(residuals ** 2))
            if mse < best[3]:
                best = (a, b, g, mse)
        except Exception:
            continue

    return best


# ── Coordinate descent refinement ─────────────────────────────────────────
def _refine_params(
    y: np.ndarray,
    period: int,
    alpha0: float,
    beta0: float,
    gamma0: float,
    mode: Literal["additive", "multiplicative"] = "additive",
    steps: int = 5,
) -> tuple[float, float, float, float]:
    """Refine parameters via coordinate descent around the grid-search winner."""
    params = [alpha0, beta0, gamma0]
    best_mse = float("inf")

    for _ in range(steps):
        for idx in range(3):
            center = params[idx]
            candidates = np.clip(
                np.linspace(max(center - 0.1, 0.01), min(center + 0.1, 0.99), 11),
                0.01, 0.99,
            )
            for val in candidates:
                trial = list(params)
                trial[idx] = float(val)
                try:
                    _, _, _, fitted = _hw_fit(y, period, trial[0], trial[1], trial[2], mode)
                    mse = float(np.mean((y - fitted) ** 2))
                    if mse < best_mse:
                        best_mse = mse
                        params[idx] = float(val)
                except Exception:
                    continue

    return params[0], params[1], params[2], best_mse


# ── Period detection ───────────────────────────────────────────────────────
def detect_period(dates: list[str]) -> int | None:
    """Infer seasonal period from date cadence.

    Returns 7 (weekly seasonality) for daily data, 12 (yearly) for monthly,
    or ``None`` if indeterminate.
    """
    if len(dates) < 4:
        return None

    from datetime import date as dt_date

    parsed = [dt_date.fromisoformat(d) for d in dates]
    gaps = [(parsed[i + 1] - parsed[i]).days for i in range(len(parsed) - 1)]
    median_gap = float(np.median(gaps))

    if median_gap <= 2:
        return 7   # daily data → weekly seasonality
    if 25 <= median_gap <= 35:
        return 12  # monthly data → yearly seasonality
    return None


# ── Public forecast function ───────────────────────────────────────────────
def holt_winters_forecast(
    values: list[float],
    dates: list[str],
    horizon: int,
    period: int | None = None,
    mode: Literal["additive", "multiplicative"] | None = None,
) -> dict:
    """Run Holt-Winters and return forecast + diagnostics.

    Returns a dict with keys:
      - ``fitted``: in-sample fitted values (list[float])
      - ``forecast``: out-of-sample forecasts (list[float])
      - ``residual_std``: residual standard deviation (float)
      - ``residuals``: in-sample residuals (list[float])
      - ``period``: detected/used seasonal period (int)
      - ``mode``: "additive" or "multiplicative"
      - ``params``: {"alpha", "beta", "gamma"}
      - ``insufficient_history``: bool — True if not enough data for seasonality
    """
    y = np.array(values, dtype=np.float64)
    n = len(y)

    # Detect period if not given
    if period is None:
        period = detect_period(dates) or 7

    # Check for sufficient data
    if n < period * MIN_SEASONAL_PERIODS:
        return {
            "fitted": values,
            "forecast": [],
            "residual_std": 0.0,
            "residuals": [0.0] * n,
            "period": period,
            "mode": "additive",
            "params": {"alpha": 0.0, "beta": 0.0, "gamma": 0.0},
            "insufficient_history": True,
        }

    # Auto-select mode if not specified
    if mode is None:
        mode = "additive"
        # Use multiplicative when all values > 0 and variance grows with level
        if np.all(y > 0):
            half = n // 2
            cv_first = float(np.std(y[:half]) / (np.mean(y[:half]) + 1e-9))
            cv_second = float(np.std(y[half:]) / (np.mean(y[half:]) + 1e-9))
            if cv_second > cv_first * 1.5 and np.mean(y[half:]) > np.mean(y[:half]) * 1.2:
                mode = "multiplicative"

    # Grid search → refine
    a0, b0, g0, _ = _grid_search_params(y, period, mode)
    alpha, beta, gamma, _ = _refine_params(y, period, a0, b0, g0, mode)

    level, trend, seasonal, fitted = _hw_fit(y, period, alpha, beta, gamma, mode)
    fc = _hw_forecast(level, trend, seasonal, period, horizon, mode)

    residuals = y - fitted
    residual_std = float(np.std(residuals)) if n > 2 else 0.0

    # Clamp forecast values to >= 0 (counts can't go negative)
    fc = np.maximum(fc, 0.0)

    return {
        "fitted": fitted.tolist(),
        "forecast": fc.tolist(),
        "residual_std": residual_std,
        "residuals": residuals.tolist(),
        "period": int(period),
        "mode": mode,
        "params": {"alpha": round(alpha, 4), "beta": round(beta, 4), "gamma": round(gamma, 4)},
        "insufficient_history": False,
    }


# ── Backtesting + accuracy ─────────────────────────────────────────────────
def backtest(
    values: list[float],
    dates: list[str],
    holdout: int | None = None,
    period: int | None = None,
    mode: Literal["additive", "multiplicative"] | None = None,
) -> dict:
    """Hold out the last ``holdout`` points, forecast them, and score accuracy.

    Returns MAPE, MAE, RMSE, and the actual vs predicted arrays.
    When there is not enough data for a meaningful test, returns
    ``insufficient_history=True``.
    """
    n = len(values)
    if period is None:
        period = detect_period(dates) or 7

    # Default holdout: one full period, minimum MIN_BACKTEST_HOLDOUT
    if holdout is None:
        holdout = max(period, MIN_BACKTEST_HOLDOUT)

    min_train = period * MIN_SEASONAL_PERIODS
    if n < min_train + holdout:
        return {
            "insufficient_history": True,
            "holdout": holdout,
            "period": period,
            "mape": None,
            "mae": None,
            "rmse": None,
            "actuals": [],
            "predicted": [],
        }

    train_vals = values[: n - holdout]
    train_dates = dates[: n - holdout]
    actual = np.array(values[n - holdout :], dtype=np.float64)

    result = holt_winters_forecast(train_vals, train_dates, holdout, period, mode)

    if result["insufficient_history"]:
        return {
            "insufficient_history": True,
            "holdout": holdout,
            "period": period,
            "mape": None,
            "mae": None,
            "rmse": None,
            "actuals": actual.tolist(),
            "predicted": [],
        }

    predicted = np.array(result["forecast"], dtype=np.float64)

    errors = actual - predicted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors ** 2)))

    # MAPE: skip zeros in actual to avoid division by zero
    nonzero = actual != 0
    if np.any(nonzero):
        mape = float(np.mean(np.abs(errors[nonzero] / actual[nonzero])) * 100)
    else:
        mape = None  # can't compute MAPE when all actuals are 0

    return {
        "insufficient_history": False,
        "holdout": holdout,
        "period": period,
        "mape": round(mape, 2) if mape is not None else None,
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "actuals": actual.tolist(),
        "predicted": predicted.tolist(),
    }


def linear_backtest(
    values: list[float],
    holdout: int | None = None,
) -> dict:
    """Backtest the existing linear model for comparison."""
    n = len(values)
    if holdout is None:
        holdout = max(7, MIN_BACKTEST_HOLDOUT)

    if n < 7 + holdout:
        return {
            "insufficient_history": True,
            "holdout": holdout,
            "mape": None,
            "mae": None,
            "rmse": None,
            "actuals": [],
            "predicted": [],
        }

    train = values[: n - holdout]
    actual = np.array(values[n - holdout :], dtype=np.float64)

    # Simple linear regression on training set
    x_train = np.arange(len(train), dtype=np.float64)
    y_train = np.array(train, dtype=np.float64)
    n_train = len(train)
    mean_x = np.mean(x_train)
    mean_y = np.mean(y_train)
    var_x = np.sum((x_train - mean_x) ** 2)
    if var_x == 0:
        slope, intercept = 0.0, float(mean_y)
    else:
        slope = float(np.sum((x_train - mean_x) * (y_train - mean_y)) / var_x)
        intercept = float(mean_y - slope * mean_x)

    # Forecast holdout period
    x_fc = np.arange(n_train, n_train + holdout, dtype=np.float64)
    predicted = np.maximum(slope * x_fc + intercept, 0.0)

    errors = actual - predicted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors ** 2)))

    nonzero = actual != 0
    if np.any(nonzero):
        mape = float(np.mean(np.abs(errors[nonzero] / actual[nonzero])) * 100)
    else:
        mape = None

    return {
        "insufficient_history": False,
        "holdout": holdout,
        "mape": round(mape, 2) if mape is not None else None,
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "actuals": actual.tolist(),
        "predicted": predicted.tolist(),
    }


# ── Prediction intervals ──────────────────────────────────────────────────
def prediction_intervals(
    forecast: list[float],
    residual_std: float,
    z: float = 1.96,
) -> list[dict]:
    """Build upper/lower bands from residual variance, widening with horizon.

    Band width = z * residual_std * sqrt(h) to capture random-walk uncertainty.
    """
    intervals = []
    for h, val in enumerate(forecast, start=1):
        margin = z * residual_std * sqrt(h)
        intervals.append({
            "value": round(val, 2),
            "lower": round(max(val - margin, 0.0), 2),
            "upper": round(val + margin, 2),
        })
    return intervals


# ── Driver-based adjustment (light) ───────────────────────────────────────
def driver_adjustment(
    target_values: list[float],
    driver_values: list[float],
    forecast_driver: list[float],
    base_forecast: list[float],
) -> list[float]:
    """Simple driver-adjusted projection using correlation scaling.

    If a driver series (e.g. impressions) is correlated with the target
    (e.g. conversions), scale the base forecast proportionally to
    changes in the driver forecast vs the driver history mean.

    Returns adjusted forecast values.  Falls back to base_forecast if
    correlation is too weak (|r| < 0.3).
    """
    if len(target_values) < 5 or len(driver_values) < 5:
        return base_forecast

    t = np.array(target_values, dtype=np.float64)
    d = np.array(driver_values, dtype=np.float64)
    min_len = min(len(t), len(d))
    t, d = t[:min_len], d[:min_len]

    # Pearson correlation
    if np.std(t) == 0 or np.std(d) == 0:
        return base_forecast
    r = float(np.corrcoef(t, d)[0, 1])
    if abs(r) < 0.3:
        return base_forecast

    driver_mean = float(np.mean(d))
    if driver_mean == 0:
        return base_forecast

    adjusted = []
    for i, (bf, df) in enumerate(zip(base_forecast, forecast_driver)):
        scale = 1.0 + r * (df - driver_mean) / driver_mean * 0.5
        adjusted.append(round(max(bf * scale, 0.0), 2))

    return adjusted
