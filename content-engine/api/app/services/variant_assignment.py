"""Variant assignment service — deterministic hash-based bucketing.

Given an experiment with variants and traffic weights, assigns a visitor to a
variant deterministically using hash(visitor_id + experiment_id) → bucket by
cumulative weights. Records the assignment + impression in a single row.
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversion import ConversionEvent
from app.models.platform import Experiment
from app.models.variant_assignment import VariantAssignment


def _deterministic_bucket(
    visitor_id: str, experiment_id: str, variants: list[dict[str, Any]]
) -> str:
    """Hash-based deterministic variant assignment.

    Uses MD5 of (visitor_id + experiment_id) mapped to [0, 1) and walks the
    cumulative weight distribution to pick a bucket. Default weight is equal
    split when no explicit weights are provided.
    """
    digest = hashlib.md5(
        f"{visitor_id}:{experiment_id}".encode()
    ).hexdigest()
    bucket_value = int(digest[:8], 16) / 0xFFFFFFFF

    # Extract weights; default to equal split
    total_weight = 0.0
    weights: list[float] = []
    for v in variants:
        w = float(v.get("weight", 0) or 0)
        weights.append(w)
        total_weight += w

    if total_weight <= 0:
        # Equal split
        n = len(variants)
        weights = [1.0 / n] * n
        total_weight = 1.0

    # Normalize and walk cumulative distribution
    cumulative = 0.0
    for i, w in enumerate(weights):
        cumulative += w / total_weight
        if bucket_value < cumulative:
            return str(variants[i].get("key", f"v{i}"))

    # Fallback to last variant (rounding edge)
    return str(variants[-1].get("key", f"v{len(variants) - 1}"))


async def assign_variant(
    db: AsyncSession,
    *,
    experiment_id: uuid.UUID,
    visitor_id: str,
) -> dict[str, Any]:
    """Assign or retrieve a variant for a visitor on an experiment.

    Returns the assignment payload including variant key and any overrides.
    Records an impression (or increments existing).
    """
    exp = await db.get(Experiment, experiment_id)
    if exp is None:
        return {"error": "experiment_not_found"}
    if exp.status not in ("running", "completed"):
        return {"error": "experiment_not_active"}

    variants = exp.variants or []
    if not variants:
        return {"error": "no_variants"}

    # If experiment is completed with a winner, serve winner to 100%
    if exp.status == "completed" and exp.winner_key:
        variant_key = exp.winner_key
    else:
        # Check for existing assignment
        existing = await db.execute(
            select(VariantAssignment).where(
                VariantAssignment.experiment_id == experiment_id,
                VariantAssignment.visitor_id == visitor_id,
            )
        )
        found = existing.scalar_one_or_none()

        if found is not None:
            found.impressions = (found.impressions or 0) + 1
            await db.flush()
            variant_key = found.variant_key
        else:
            # Deterministic assignment
            variant_key = _deterministic_bucket(
                visitor_id, str(experiment_id), variants
            )
            assignment = VariantAssignment(
                experiment_id=experiment_id,
                visitor_id=visitor_id,
                variant_key=variant_key,
                workspace_id=exp.workspace_id,
            )
            db.add(assignment)

            # Also record an impression as a ConversionEvent
            db.add(ConversionEvent(
                workspace_id=exp.workspace_id,
                anon_id=visitor_id,
                event_type="page_view",
                experiment_id=experiment_id,
                variant_id=variant_key,
                source="assignment",
                occurred_at=datetime.now(timezone.utc),
            ))
            await db.flush()

    # Find variant details
    variant_detail = next(
        (v for v in variants if str(v.get("key")) == variant_key), None
    )

    return {
        "experiment_id": str(experiment_id),
        "variant_key": variant_key,
        "variant": variant_detail,
        "visitor_id": visitor_id,
    }


async def ship_winner_live(
    db: AsyncSession,
    experiment: Experiment,
    winner_key: str,
) -> None:
    """When a winner is shipped, ensure the experiment serves winner to 100%.

    Sets winner_key + completed status so all future assignments serve the winner.
    Also updates variant weights so winner gets 100% traffic.
    """
    experiment.winner_key = winner_key
    experiment.status = "completed"
    if experiment.ended_at is None:
        experiment.ended_at = datetime.now(timezone.utc)

    # Update variant weights: winner gets 100%
    variants = experiment.variants or []
    for v in variants:
        if isinstance(v, dict):
            v["weight"] = 100.0 if str(v.get("key")) == winner_key else 0.0
    experiment.variants = variants
    await db.flush()
