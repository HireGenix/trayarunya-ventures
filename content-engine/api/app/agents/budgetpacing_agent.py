"""Budget pacing agent — the agentic AI brain.

SENSE (real pacing + per-channel efficiency + marginal ROI) -> DIAGNOSE
(over/underspend vs seasonal target) -> PLAN (marginal-ROI equalisation
reallocation with MMM or local diminishing-returns) -> ACT (persist
PacingAlerts + ReallocationProposals, honoring workspace autonomy).
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.adapters import complete_json
from app.models.budgetpacing import Budget, PacingAlert, ReallocationProposal
from app.services import budgetpacing as svc

log = logging.getLogger("budgetpacing_agent")

SYSTEM = (
    "You are an expert performance-marketing budget strategist. You reallocate "
    "cross-channel ad budget using marginal-ROI equalisation: shift spend from "
    "channels with low marginal return to channels with high marginal return. "
    "Respond with strict JSON only."
)


async def recommend_reallocation(
    db: AsyncSession, ws_id: uuid.UUID, budget_id: uuid.UUID
) -> dict:
    """Produce a reallocation proposal grounded in real marginal-ROI data.

    Priority: MMM marginal-ROI > local diminishing-returns fit > ROAS proxy.
    """
    budget = await svc.get_budget(db, ws_id, budget_id)
    if budget is None:
        return {"moves": [], "projected_lift": 0.0, "rationale": "Budget not found."}

    pacing = await svc.compute_pacing(db, ws_id, budget)
    efficiency = await svc.channel_efficiency(db, ws_id, budget)

    if not efficiency:
        return {"moves": [], "projected_lift": 0.0, "rationale": "No channel data."}

    current_alloc = budget.channels or {}
    if not current_alloc or sum(current_alloc.values()) <= 0:
        return {"moves": [], "projected_lift": 0.0,
                "rationale": "No channel allocation to reallocate."}

    # Try MMM marginal-ROI first
    mmm_params = await svc._get_mmm_marginal_roi(db, ws_id)
    if mmm_params:
        # Map MMM channel names to budget channels where possible
        mapped: dict[str, dict] = {}
        for ch in current_alloc:
            if ch in mmm_params:
                mapped[ch] = mmm_params[ch]
            else:
                roas = efficiency.get(ch, {}).get("roas", 0.0)
                mapped[ch] = {
                    "marginal_roi": roas * 0.7,
                    "beta": roas,
                    "alpha": 1.0,
                    "gamma": 1.0,
                    "source": "roas_proxy",
                    "low_data": True,
                }
        marginal_params = mapped
        log.info("Using MMM marginal-ROI for reallocation")
    else:
        marginal_params = await svc._build_local_marginal_roi(
            db, ws_id, efficiency, budget,
        )
        log.info("Using local diminishing-returns fit for reallocation")

    result = svc.marginal_roi_reallocation(
        current_alloc, marginal_params, max_shift_pct=0.25,
    )

    # Optionally enhance rationale with LLM
    if result.get("moves"):
        try:
            user = (
                f"Budget '{budget.name}' total={pacing['total_amount']}.\n"
                f"Pacing: {pacing['status']}, pace_ratio={pacing['pace_ratio']}.\n"
                f"Marginal-ROI reallocation computed: {result['moves']}\n"
                f"Projected lift: {result['projected_lift']}%.\n"
                f"Channel efficiency: {efficiency}.\n"
                "Provide a concise rationale for this reallocation.\n"
                'Return JSON: {"rationale": str}'
            )
            data = await complete_json(
                [{"role": "user", "content": user}], system=SYSTEM
            )
            if data.get("rationale"):
                result["rationale"] = str(data["rationale"])
        except Exception:  # noqa: BLE001
            log.debug("LLM rationale enhancement skipped")

    return result


async def _persist_proposal(
    db: AsyncSession,
    ws_id: uuid.UUID,
    budget: Budget,
    proposal_data: dict,
    *,
    autonomy: str,
) -> ReallocationProposal | None:
    moves = proposal_data.get("moves") or []
    if not moves:
        return None
    status = "approved" if autonomy in ("approve", "auto") else "suggested"
    obj = ReallocationProposal(
        workspace_id=ws_id,
        budget_id=budget.id,
        moves=moves,
        projected_lift=proposal_data.get("projected_lift"),
        status=status,
        rationale=proposal_data.get("rationale"),
    )
    db.add(obj)
    await db.flush()
    if autonomy == "auto":
        await svc.apply_proposal(db, ws_id, obj)
    return obj


async def run_cycle(
    db: AsyncSession, ws_id: uuid.UUID, *, autonomy: str = "suggest"
) -> dict:
    """Recompute pacing for every active budget, raise PacingAlerts and create
    ReallocationProposals. Honors autonomy: suggest / approve / auto."""
    budgets = await svc.list_budgets(db, ws_id)
    raised_alerts = 0
    created_proposals = 0
    applied = 0

    for budget in budgets:
        if budget.status != "active":
            continue
        pacing = await svc.compute_pacing(db, ws_id, budget)

        # Detect pacing alerts vs seasonal target
        new_alerts = await svc.detect_pacing_alerts(db, ws_id, budget, pacing)
        raised_alerts += len(new_alerts)

        if pacing["status"] in ("overspend", "underspend"):
            proposal_data = await recommend_reallocation(db, ws_id, budget.id)
            obj = await _persist_proposal(
                db, ws_id, budget, proposal_data, autonomy=autonomy
            )
            if obj is not None:
                created_proposals += 1
                if obj.status == "applied":
                    applied += 1
                db.add(
                    PacingAlert(
                        workspace_id=ws_id,
                        budget_id=budget.id,
                        kind="reallocate",
                        detail=proposal_data.get("rationale", "Reallocation proposed."),
                        severity="warning",
                        status="open",
                    )
                )
                await db.flush()
                raised_alerts += 1

    return {
        "budgets_evaluated": sum(1 for b in budgets if b.status == "active"),
        "alerts_raised": raised_alerts,
        "proposals_created": created_proposals,
        "auto_applied": applied,
        "autonomy": autonomy,
    }
