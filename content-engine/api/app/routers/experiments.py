"""Experiment Hub routes: create, manage and evaluate marketing experiments.

An experiment frames a hypothesis, defines competing variants (each optionally
tied to a published content item), and is judged by a single success metric.
Evaluation pulls *real* engagement from ``Metric`` rows, picks a winner, computes
lift, and emits a ``LearningSignal`` so the strategy loop can act on the result.

Lives in its own router (prefix ``/experiments``). The heavy lifting is in
``app.services.experiments``; this module stays thin.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.llm.adapters import complete_json
from app.models import Experiment, LearningSignal
from app.services.experiments import (
    SUPPORTED_METRICS,
    compute_variant_metrics,
    pick_winner,
    summarize_learning,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/experiments", tags=["experiments"])

_VALID_STATUS = {"draft", "running", "completed", "archived"}


# ───────────────────────── Pydantic models (inline) ─────────────────────────
class VariantIn(BaseModel):
    key: str
    label: str | None = None
    content_item_id: str | None = None
    notes: str | None = None


class ExperimentCreateIn(BaseModel):
    name: str
    hypothesis: str | None = None
    success_metric: str = "engagement_rate"
    context: dict[str, Any] | None = None
    variants: list[VariantIn] = Field(default_factory=list)


class ExperimentUpdateIn(BaseModel):
    name: str | None = None
    hypothesis: str | None = None
    success_metric: str | None = None
    context: dict[str, Any] | None = None
    variants: list[VariantIn] | None = None
    status: str | None = None
    learning: str | None = None


class ExperimentOut(BaseModel):
    id: str
    name: str
    hypothesis: str | None = None
    context: dict[str, Any] | None = None
    success_metric: str
    variants: list[dict[str, Any]] | None = None
    status: str
    winner_key: str | None = None
    result: dict[str, Any] | None = None
    learning: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def from_model(cls, e: Experiment) -> "ExperimentOut":
        return cls(
            id=str(e.id),
            name=e.name,
            hypothesis=e.hypothesis,
            context=e.context,
            success_metric=e.success_metric,
            variants=e.variants,
            status=e.status,
            winner_key=e.winner_key,
            result=e.result,
            learning=e.learning,
            started_at=e.started_at,
            ended_at=e.ended_at,
            created_at=e.created_at,
            updated_at=e.updated_at,
        )


# ─────────────────────────────── helpers ────────────────────────────────────
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _variants_to_dicts(variants: list[VariantIn]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for v in variants:
        d: dict[str, Any] = {"key": v.key.strip(), "label": (v.label or v.key).strip()}
        if v.content_item_id:
            d["content_item_id"] = str(v.content_item_id)
        if v.notes:
            d["notes"] = v.notes
        out.append(d)
    return out


async def _get_owned(
    db: AsyncSession, experiment_id: uuid.UUID, workspace_id: uuid.UUID
) -> Experiment:
    exp = await db.get(Experiment, experiment_id)
    if exp is None or exp.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Experiment not found")
    return exp


async def _suggest_variants(
    name: str, hypothesis: str | None, context: dict[str, Any] | None
) -> list[dict[str, Any]]:
    """Use the LLM to propose 2-3 variant angles. Falls back to nothing on error."""
    topic = name
    if context:
        topic_val = context.get("topic") or context.get("audience") or context.get("offer")
        if topic_val:
            topic = f"{name} — {topic_val}"
    prompt = (
        f"We are designing a marketing A/B experiment.\n"
        f"Name: {name}\n"
        f"Hypothesis: {hypothesis or 'n/a'}\n"
        f"Context: {context or {}}\n\n"
        "Propose 2-3 distinct content variant angles to test against each other. "
        'Return STRICT JSON: {"variants": [{"key": "a", "label": "short name", '
        '"notes": "what makes this angle different"}]}'
    )
    try:
        raw = await complete_json(
            messages=[{"role": "user", "content": prompt}],
            system=(
                "You are a marketing experimentation strategist. You design clear, "
                "testable content variants and return only strict JSON."
            ),
            provider=None,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("variant suggestion LLM call failed: %s", exc)
        return []

    if not isinstance(raw, dict) or raw.get("_parse_error"):
        return []
    items = raw.get("variants")
    if not isinstance(items, list):
        return []

    out: list[dict[str, Any]] = []
    fallback_keys = ["a", "b", "c", "d"]
    for idx, it in enumerate(items[:3]):
        if not isinstance(it, dict):
            continue
        key = str(it.get("key") or fallback_keys[idx if idx < len(fallback_keys) else 0]).strip()
        label = str(it.get("label") or f"Variant {key.upper()}").strip()
        variant: dict[str, Any] = {"key": key, "label": label}
        notes = it.get("notes")
        if notes:
            variant["notes"] = str(notes)
        out.append(variant)
    return out


# ─────────────────────────────── routes ─────────────────────────────────────
@router.get("", response_model=list[ExperimentOut])
async def list_experiments(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ExperimentOut]:
    res = await db.execute(
        select(Experiment)
        .where(Experiment.workspace_id == ctx.workspace.id)
        .order_by(Experiment.created_at.desc())
    )
    return [ExperimentOut.from_model(e) for e in res.scalars().all()]


@router.post("", response_model=ExperimentOut, status_code=status.HTTP_201_CREATED)
async def create_experiment(
    body: ExperimentCreateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ExperimentOut:
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Experiment name is required")

    metric = body.success_metric or "engagement_rate"
    if metric not in SUPPORTED_METRICS:
        metric = "engagement_rate"

    variants = _variants_to_dicts(body.variants)
    if not variants:
        # No variants provided — try to auto-suggest angles from the topic/context.
        suggested = await _suggest_variants(name, body.hypothesis, body.context)
        variants = suggested

    exp = Experiment(
        workspace_id=ctx.workspace.id,
        name=name,
        hypothesis=body.hypothesis,
        context=body.context,
        success_metric=metric,
        variants=variants or None,
        status="draft",
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return ExperimentOut.from_model(exp)


@router.get("/{experiment_id}", response_model=ExperimentOut)
async def get_experiment(
    experiment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ExperimentOut:
    exp = await _get_owned(db, experiment_id, ctx.workspace.id)
    return ExperimentOut.from_model(exp)


@router.patch("/{experiment_id}", response_model=ExperimentOut)
async def update_experiment(
    experiment_id: uuid.UUID,
    body: ExperimentUpdateIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ExperimentOut:
    exp = await _get_owned(db, experiment_id, ctx.workspace.id)

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Name cannot be empty")
        exp.name = name
    if body.hypothesis is not None:
        exp.hypothesis = body.hypothesis
    if body.context is not None:
        exp.context = body.context
    if body.success_metric is not None:
        if body.success_metric not in SUPPORTED_METRICS:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Unsupported success_metric. Use one of: {sorted(SUPPORTED_METRICS)}",
            )
        exp.success_metric = body.success_metric
    if body.variants is not None:
        exp.variants = _variants_to_dicts(body.variants) or None
    if body.learning is not None:
        exp.learning = body.learning

    if body.status is not None:
        new_status = body.status.strip().lower()
        if new_status not in _VALID_STATUS:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Invalid status. Use one of: {sorted(_VALID_STATUS)}",
            )
        if new_status == "running" and exp.started_at is None:
            exp.started_at = _now()
        if new_status == "completed" and exp.ended_at is None:
            exp.ended_at = _now()
        exp.status = new_status

    await db.commit()
    await db.refresh(exp)
    return ExperimentOut.from_model(exp)


@router.post("/{experiment_id}/evaluate", response_model=ExperimentOut)
async def evaluate_experiment(
    experiment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ExperimentOut:
    exp = await _get_owned(db, experiment_id, ctx.workspace.id)

    variants = exp.variants or []
    if not variants:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Experiment has no variants to evaluate"
        )

    variant_results = await compute_variant_metrics(
        db,
        workspace_id=ctx.workspace.id,
        variants=variants,
        success_metric=exp.success_metric,
    )
    result = pick_winner(variant_results, exp.success_metric)
    result["evaluated_at"] = _now().isoformat()

    exp.result = result

    if result.get("status") == "completed" and result.get("winner_key"):
        exp.winner_key = result["winner_key"]
        exp.status = "completed"
        if exp.ended_at is None:
            exp.ended_at = _now()

        learning = summarize_learning(
            experiment_name=exp.name,
            hypothesis=exp.hypothesis,
            result=result,
        )
        exp.learning = learning["detail"]

        signal = LearningSignal(
            workspace_id=ctx.workspace.id,
            kind="pattern",
            title=learning["title"],
            detail=learning["detail"],
            recommendation=learning["recommendation"],
            metric={
                "source": "experiment",
                "experiment_id": str(exp.id),
                "success_metric": result.get("success_metric"),
                "winner_key": result.get("winner_key"),
                "winner_value": result.get("winner_value"),
                "lift": result.get("lift"),
            },
        )
        db.add(signal)

    await db.commit()
    await db.refresh(exp)
    return ExperimentOut.from_model(exp)


@router.delete("/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experiment(
    experiment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    exp = await _get_owned(db, experiment_id, ctx.workspace.id)
    await db.delete(exp)
    await db.commit()
