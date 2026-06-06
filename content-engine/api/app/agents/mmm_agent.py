"""MMM agent — the agentic brain over real regression output.

``interpret`` feeds a fitted model's *actual* coefficients, ROI, marginal-ROI,
adstock/Hill hyper-parameters and significance to the LLM and returns
plain-English insight plus concrete budget moves. ``run_cycle`` is the autonomy
loop: it refits models that have fresh data and flags channels that have crossed
their saturation point. Every path has a deterministic fallback that uses the
raw computed numbers, so the feature never hard-fails without an LLM.
"""
from __future__ import annotations

import json
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.mmm import ChannelSpendSeries, MmmModel
from app.services import mmm as svc

log = logging.getLogger("mmm_agent")

SYSTEM = (
    "You are an expert marketing-mix-modeling and media-investment strategist. "
    "You are given the REAL fitted output of a regression over a brand's own spend "
    "and revenue data — including adstock decay, Hill saturation, coefficient "
    "significance (p-values, CIs), marginal ROI and budget-optimiser results. "
    "Interpret it honestly and give budget guidance. "
    "Respond with strict JSON only."
)


def _deterministic_interpretation(model: MmmModel) -> dict:
    """Narrate the raw computed numbers without any LLM call."""
    results = model.results or {}
    roi = results.get("roi_by_channel", {}) or {}
    m_roi = results.get("marginal_roi", {}) or {}
    saturation = results.get("saturation", {}) or {}
    bvi = results.get("base_vs_incremental", {}) or {}
    significance = results.get("coefficient_significance", {}) or {}
    params = results.get("channel_params", {}) or {}

    scale, cut, hold = [], [], []
    for channel, r in sorted(roi.items(), key=lambda kv: kv[1], reverse=True):
        sat = (saturation.get(channel) or {}).get("saturated", False)
        sig = significance.get(channel, {})
        p_val = sig.get("p_value", 1.0) if sig else 1.0
        if r > 1.0 and not sat:
            scale.append(channel)
        elif r < 1.0 or sat:
            cut.append(channel)
        else:
            hold.append(channel)

    best = max(roi, key=roi.get) if roi else None
    summary_bits = []
    if best is not None:
        summary_bits.append(f"{best} delivers the strongest ROI at {roi[best]:.2f}x.")
    if bvi:
        summary_bits.append(
            f"Incremental media drives {bvi.get('incremental_pct', 0)}% of modeled revenue; "
            f"{bvi.get('base_pct', 0)}% is base demand."
        )
    if model.r_squared is not None:
        adj = results.get("adj_r_squared")
        r2_str = f"R-squared is {model.r_squared}"
        if adj is not None:
            r2_str += f" (adjusted {adj})"
        summary_bits.append(f"Model fit {r2_str}.")
    if results.get("low_data"):
        summary_bits.append("Note: limited observations — interpret with caution.")

    recs = []
    for c in scale:
        p = (significance.get(c) or {}).get("p_value")
        note = f" (p={p:.3f})" if p is not None else ""
        mr = m_roi.get(c)
        mr_note = f", marginal ROI {mr:.4f}" if mr is not None else ""
        recs.append({
            "channel": c, "action": "scale",
            "reason": f"ROI {roi[c]:.2f}x with headroom before saturation{mr_note}{note}.",
        })
    for c in cut:
        sat = (saturation.get(c) or {}).get("saturated", False)
        reason = "past saturation" if sat else f"ROI {roi.get(c, 0):.2f}x below break-even"
        recs.append({"channel": c, "action": "cut", "reason": f"Reallocate spend — {reason}."})
    for c in hold:
        recs.append({"channel": c, "action": "hold", "reason": "Maintain current allocation."})

    return {
        "summary": " ".join(summary_bits) or "Model fitted on real data; see channel ROI.",
        "recommendations": recs,
        "scale": scale,
        "cut": cut,
        "hold": hold,
        "source": "deterministic",
    }


async def interpret(db: AsyncSession, ws_id: uuid.UUID, model_id: uuid.UUID) -> dict:
    """Return AI insight + budget recommendations grounded in the fitted model."""
    model = await svc.get_model(db, ws_id, model_id)
    if model is None:
        return {"error": "model_not_found"}
    if model.status != "ready" or not model.results:
        return {
            "status": model.status,
            "summary": "Model has no fitted results yet — run it or sync data first.",
            "recommendations": [],
            "source": "deterministic",
        }

    fallback = _deterministic_interpretation(model)
    results = model.results or {}
    user = (
        "Fitted marketing-mix model output (real, from the brand's own rows):\n"
        f"R_squared: {model.r_squared}\n"
        f"Adjusted R_squared: {results.get('adj_r_squared')}\n"
        f"ROI by channel: {json.dumps(results.get('roi_by_channel', {}))}\n"
        f"Marginal ROI: {json.dumps(results.get('marginal_roi', {}))}\n"
        f"Contributions: {json.dumps(results.get('contributions', {}))}\n"
        f"Base vs incremental: {json.dumps(results.get('base_vs_incremental', {}))}\n"
        f"Saturation read: {json.dumps(results.get('saturation', {}))}\n"
        f"Channel params (adstock/Hill): {json.dumps(results.get('channel_params', {}))}\n"
        f"Coefficient significance: {json.dumps(results.get('coefficient_significance', {}))}\n"
        f"Observations: {results.get('observations')}\n"
        f"Low data flag: {results.get('low_data', False)}\n\n"
        "Task: explain in plain English which channels to scale and which to cut, "
        "and why, considering ROI, marginal ROI, saturation and statistical significance. "
        "Flag any channels where the coefficient is not statistically significant (p > 0.05). "
        'Return JSON: {"summary": str, "recommendations": '
        '[{"channel": str, "action": "scale"|"cut"|"hold", "reason": str}], '
        '"scale": [str], "cut": [str], "hold": [str]}'
    )
    try:
        data = await complete_json([{"role": "user", "content": user}], system=SYSTEM)
        if not data or data.get("_parse_error") or "summary" not in data:
            return fallback
        data.setdefault("recommendations", fallback["recommendations"])
        data.setdefault("scale", fallback["scale"])
        data.setdefault("cut", fallback["cut"])
        data["source"] = "llm"
        return data
    except Exception as exc:  # noqa: BLE001
        log.warning("interpret LLM failed, using deterministic fallback: %s", exc)
        return fallback


async def run_cycle(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    """Autonomy loop: refit models with fresh data and flag saturated channels."""
    res = await db.execute(select(MmmModel).where(MmmModel.workspace_id == ws_id))
    models = list(res.scalars().all())

    refit = 0
    flagged: list[dict] = []
    for model in models:
        if model.status in ("draft", "awaiting_data", "ready"):
            # Refit only if there is at least some data to fit against.
            count = await db.scalar(
                select(ChannelSpendSeries.id)
                .where(ChannelSpendSeries.workspace_id == ws_id)
                .limit(1)
            )
            if count is None:
                continue
            fitted = await svc.fit_model(db, ws_id, model)
            refit += 1
            sat = (fitted.results or {}).get("saturation", {}) or {}
            for channel, info in sat.items():
                if info.get("saturated"):
                    flagged.append(
                        {
                            "model_id": str(fitted.id),
                            "channel": channel,
                            "saturation_fraction": info.get("saturation_fraction"),
                        }
                    )

    return {"refit": refit, "saturated_flags": flagged}
