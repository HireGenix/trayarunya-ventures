"""The CRO Agent — autonomous conversion-rate-optimization orchestrator.

A single cycle runs the full loop on a workspace:

    SENSE      -> read the real CRO scorecard (funnel, leaks, $ left on table)
    DIAGNOSE   -> rank what's costing the most money
    HYPOTHESIZE-> design a concrete experiment for the biggest leak (LLM + fallback)
    PLAN/ACT   -> persist recommendations as CROActions; at higher autonomy,
                  create / launch the experiment and emit automation events
    LEARN      -> recorded via CROAction status + (when shipped) LearningSignal

Everything is grounded in **real** ConversionEvent data. When there isn't enough
traffic (``low_data``) the agent says so and proposes instrumentation, never
fabricated wins. Three autonomy levels gate how far it acts:

    suggest -> log recommendations only
    approve -> also create the experiment as a draft awaiting sign-off
    auto    -> also launch the experiment and fire automation triggers
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.cro_experimenter import design_experiment_for_leak
from app.models import BrandBrain, CROAction, CROSettings, Experiment
from app.services.cro_funnel import compute_scorecard

log = logging.getLogger("cro_agent")

# Share of a leak's drop we assume is realistically recoverable.
RECOVERABLE_SHARE = 0.30
OPEN_STATUSES = ("suggested", "approved", "running")


async def get_or_create_settings(
    db: AsyncSession, workspace_id: uuid.UUID
) -> CROSettings:
    row = (
        await db.execute(
            select(CROSettings).where(CROSettings.workspace_id == workspace_id)
        )
    ).scalar_one_or_none()
    if row is None:
        row = CROSettings(workspace_id=workspace_id)
        db.add(row)
        await db.flush()
    return row


async def _load_brand(db: AsyncSession, workspace_id: uuid.UUID) -> dict[str, Any] | None:
    bb = (
        await db.execute(
            select(BrandBrain).where(BrandBrain.workspace_id == workspace_id)
        )
    ).scalar_one_or_none()
    if bb is None:
        return None
    voice = bb.voice if isinstance(bb.voice, dict) else {}
    audience = bb.audience if isinstance(bb.audience, dict) else {}
    return {
        "value_prop": bb.value_prop,
        "mission": bb.mission,
        "voice": voice.get("tone") or voice.get("voice"),
        "tone": voice.get("tone"),
        "audience": audience.get("primary") or audience.get("description"),
        "website": bb.website,
    }


async def _active_experiment_count(db: AsyncSession, workspace_id: uuid.UUID) -> int:
    return int(
        (
            await db.execute(
                select(func.count(Experiment.id)).where(
                    Experiment.workspace_id == workspace_id,
                    Experiment.status == "running",
                )
            )
        ).scalar_one()
        or 0
    )


def _leak_revenue(leak: dict[str, Any] | None, scorecard: dict[str, Any]) -> float:
    """Recoverable revenue if we plug ``leak`` (same model as scorecard)."""
    if not leak:
        return 0.0
    aov = scorecard.get("avg_order_value", 0.0) or 0.0
    overall_cvr = scorecard.get("overall_cvr", 0.0) or 0.0
    if aov <= 0:
        return 0.0
    recoverable = (leak.get("drop", 0) or 0) * RECOVERABLE_SHARE
    return round(recoverable * (overall_cvr / 100.0) * aov, 2)


def _leak_lift_pct(leak: dict[str, Any] | None, scorecard: dict[str, Any]) -> float | None:
    """Projected overall-CVR lift from recovering part of the leak."""
    if not leak:
        return None
    converted = scorecard.get("converted", 0) or 0
    overall_cvr = scorecard.get("overall_cvr", 0.0) or 0.0
    if converted <= 0:
        return None
    recovered_conversions = (leak.get("drop", 0) or 0) * RECOVERABLE_SHARE * (overall_cvr / 100.0)
    return round(recovered_conversions / converted * 100.0, 1)


async def _open_actions(db: AsyncSession, workspace_id: uuid.UUID) -> list[CROAction]:
    return list(
        (
            await db.execute(
                select(CROAction)
                .where(
                    CROAction.workspace_id == workspace_id,
                    CROAction.status.in_(OPEN_STATUSES),
                )
                .order_by(CROAction.created_at.desc())
            )
        ).scalars().all()
    )


async def run_cycle(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    days: int = 30,
    persist: bool = True,
) -> dict[str, Any]:
    """Run one full CRO agent cycle for a workspace. Returns a structured summary.

    Idempotent within a window: actions are de-duped via ``dedupe_key`` so re-runs
    refresh rather than spam. Honors the workspace autonomy + guardrails.
    """
    settings = await get_or_create_settings(db, workspace_id)
    scorecard = await compute_scorecard(db, workspace_id, days)
    brand = await _load_brand(db, workspace_id)

    visitors = scorecard.get("visitors", 0) or 0
    low_data = scorecard.get("low_data", True)
    leak = scorecard.get("biggest_leak")
    opportunities = scorecard.get("opportunities", []) or []

    existing = await _open_actions(db, workspace_id) if persist else []
    existing_by_key = {a.dedupe_key: a for a in existing if a.dedupe_key}

    created: list[dict[str, Any]] = []
    autonomy = settings.autonomy if settings.enabled else "suggest"

    # --- Guardrail: not enough traffic to act ------------------------------- #
    if low_data or visitors < settings.min_visitors:
        key = "cro:low_data"
        if persist and key not in existing_by_key:
            action = CROAction(
                workspace_id=workspace_id,
                kind="insight",
                status="suggested",
                priority="high",
                title="Install the CRO pixel to unlock autonomous optimization",
                detail=(
                    f"Only {visitors} visitors tracked in the last {days} days "
                    f"(need {settings.min_visitors}). Add the pixel to your site so "
                    "the agent can measure leaks and run experiments on real data."
                ),
                rationale="The agent never fabricates wins — it needs real traffic.",
                target_stage="visit",
                dedupe_key=key,
                meta={"visitors": visitors, "needed": settings.min_visitors},
            )
            db.add(action)
            created.append({"title": action.title, "kind": action.kind})
        settings.last_run_at = datetime.now(timezone.utc)
        if persist:
            await db.commit()
        return {
            "status": "low_data",
            "autonomy": autonomy,
            "visitors": visitors,
            "cro_score": scorecard.get("cro_score"),
            "created": created,
            "message": "Not enough real traffic yet — proposed instrumentation.",
        }

    # --- DIAGNOSE + HYPOTHESIZE: the biggest-$ leak ------------------------- #
    designed_experiment: dict[str, Any] | None = None
    experiment_id: uuid.UUID | None = None
    if leak and (leak.get("drop", 0) or 0) > 0:
        exp_revenue = _leak_revenue(leak, scorecard)
        exp_lift = _leak_lift_pct(leak, scorecard)
        dedupe = f"cro:leak:{leak.get('from_key')}-{leak.get('to_key')}"
        prior = existing_by_key.get(dedupe)

        design = await design_experiment_for_leak(leak, brand=brand, aov=scorecard.get("avg_order_value", 0.0))
        designed_experiment = design

        active = await _active_experiment_count(db, workspace_id)
        can_launch = active < settings.max_active_experiments

        # ACT per autonomy.
        action_status = "suggested"
        auto_executed = False
        if persist and autonomy in ("approve", "auto") and can_launch and prior is None:
            exp = Experiment(
                workspace_id=workspace_id,
                name=design["name"],
                hypothesis=design["hypothesis"],
                context={"origin": "cro_agent", "leak": leak},
                surface=design["surface"],
                success_metric="conversion_rate",
                variants=design["variants"],
                status="running" if autonomy == "auto" else "draft",
            )
            if autonomy == "auto":
                exp.started_at = datetime.now(timezone.utc)
            db.add(exp)
            await db.flush()
            experiment_id = exp.id
            action_status = "running" if autonomy == "auto" else "approved"
            auto_executed = autonomy == "auto"

        if persist and prior is not None:
            # Refresh the standing recommendation with the latest numbers.
            prior.expected_revenue = exp_revenue
            prior.expected_lift_pct = exp_lift
            prior.detail = (
                f"{leak.get('drop')} visitors ({leak.get('drop_pct')}%) drop from "
                f"{leak.get('from')} to {leak.get('to')}. Test the "
                f"{design['surface']} here."
            )
            prior.meta = {"design": design, "leak": leak}
            created.append({"title": prior.title, "kind": prior.kind, "refreshed": True})
        elif persist:
            action = CROAction(
                workspace_id=workspace_id,
                kind="experiment",
                status=action_status,
                priority="high",
                title=f"Experiment: fix {leak.get('from')} → {leak.get('to')} leak",
                detail=(
                    f"{leak.get('drop')} visitors ({leak.get('drop_pct')}%) drop from "
                    f"{leak.get('from')} to {leak.get('to')}. Test the "
                    f"{design['surface']} here with {len(design['variants'])} variants."
                ),
                rationale=design["hypothesis"],
                expected_revenue=exp_revenue,
                expected_lift_pct=exp_lift,
                confidence=0.6 if design.get("generated_by") == "llm" else 0.4,
                target_stage=leak.get("to_key"),
                experiment_id=experiment_id,
                dedupe_key=dedupe,
                auto_executed=auto_executed,
                acted_at=datetime.now(timezone.utc) if experiment_id else None,
                meta={"design": design, "leak": leak},
            )
            db.add(action)
            created.append(
                {
                    "title": action.title,
                    "kind": action.kind,
                    "status": action_status,
                    "experiment_id": str(experiment_id) if experiment_id else None,
                }
            )

    # --- Surface remaining opportunities as lighter actions ----------------- #
    for opp in opportunities[:3]:
        title = opp.get("title")
        if not title:
            continue
        dedupe = f"cro:opp:{title}"
        if persist and dedupe in existing_by_key:
            continue
        if persist:
            action = CROAction(
                workspace_id=workspace_id,
                kind="leak_fix",
                status="suggested",
                priority=opp.get("priority", "medium"),
                title=title,
                detail=opp.get("detail"),
                rationale="Surfaced from the CRO scorecard opportunities.",
                dedupe_key=dedupe,
                meta={"opportunity": opp},
            )
            db.add(action)
            created.append({"title": title, "kind": "leak_fix"})

    settings.last_run_at = datetime.now(timezone.utc)
    if persist:
        await db.commit()

    return {
        "status": "ok",
        "autonomy": autonomy,
        "visitors": visitors,
        "cro_score": scorecard.get("cro_score"),
        "biggest_leak": leak,
        "revenue_left_on_table": scorecard.get("revenue_left_on_table"),
        "designed_experiment": designed_experiment,
        "launched_experiment_id": str(experiment_id) if experiment_id else None,
        "created": created,
        "created_count": len(created),
    }


async def next_best_actions(
    db: AsyncSession, workspace_id: uuid.UUID, *, limit: int = 10
) -> list[dict[str, Any]]:
    """Open recommendations ranked by expected revenue, then priority."""
    actions = await _open_actions(db, workspace_id)
    prio_rank = {"high": 0, "medium": 1, "low": 2}

    def sort_key(a: CROAction) -> tuple[float, int]:
        return (-(a.expected_revenue or 0.0), prio_rank.get(a.priority, 1))

    actions.sort(key=sort_key)
    return [_serialize_action(a) for a in actions[:limit]]


def _serialize_action(a: CROAction) -> dict[str, Any]:
    return {
        "id": str(a.id),
        "kind": a.kind,
        "status": a.status,
        "priority": a.priority,
        "title": a.title,
        "detail": a.detail,
        "rationale": a.rationale,
        "expected_lift_pct": a.expected_lift_pct,
        "expected_revenue": a.expected_revenue,
        "confidence": a.confidence,
        "target_stage": a.target_stage,
        "experiment_id": str(a.experiment_id) if a.experiment_id else None,
        "auto_executed": a.auto_executed,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "acted_at": a.acted_at.isoformat() if a.acted_at else None,
        "meta": a.meta,
    }
