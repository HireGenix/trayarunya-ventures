"""Lead Scoring & Nurture service — all scoring math, 100% real, no randomness.

Every lead score is recomputed by summing the points of the workspace's active
:class:`ScoringRule` rows that actually match a lead's real activities/attributes.
Grades are assigned by deterministic thresholds. Nothing here fabricates data.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.leadscore import (
    ACTIVITY_KINDS,
    LEAD_STAGES,
    Lead,
    LeadActivity,
    ScoringRule,
)

# Score -> grade thresholds (inclusive lower bound), best first.
GRADE_THRESHOLDS: tuple[tuple[int, str], ...] = (
    (75, "A"),
    (50, "B"),
    (25, "C"),
    (0, "D"),
)

# Default points per activity weight when a lead has no matching rules yet —
# still real (derived from logged activity), just an out-of-the-box baseline.
DEFAULT_KIND_POINTS: dict[str, int] = {
    "page_view": 1,
    "email_open": 2,
    "email_click": 5,
    "form_submit": 10,
    "meeting": 20,
    "custom": 1,
}

# Stage order index for crossing detection.
_STAGE_INDEX = {s: i for i, s in enumerate(LEAD_STAGES)}


def grade_for_score(score: int) -> str:
    for floor, grade in GRADE_THRESHOLDS:
        if score >= floor:
            return grade
    return "D"


def _norm_kind(kind: str | None) -> str:
    return kind if kind in ACTIVITY_KINDS else "custom"


# --------------------------------------------------------------------------- #
# Reads
# --------------------------------------------------------------------------- #
async def list_leads(
    db: AsyncSession, ws_id: uuid.UUID, *, limit: int = 200
) -> list[Lead]:
    """Leads sorted by score (highest first), then most recent activity."""
    res = await db.execute(
        select(Lead)
        .where(Lead.workspace_id == ws_id)
        .order_by(Lead.score.desc(), Lead.created_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def get_lead(
    db: AsyncSession, ws_id: uuid.UUID, lead_id: uuid.UUID
) -> Lead | None:
    res = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.workspace_id == ws_id)
    )
    return res.scalar_one_or_none()


async def list_activities(
    db: AsyncSession, ws_id: uuid.UUID, lead_id: uuid.UUID, *, limit: int = 200
) -> list[LeadActivity]:
    res = await db.execute(
        select(LeadActivity)
        .where(
            LeadActivity.workspace_id == ws_id,
            LeadActivity.lead_id == lead_id,
        )
        .order_by(LeadActivity.occurred_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def list_rules(
    db: AsyncSession, ws_id: uuid.UUID, *, active_only: bool = False
) -> list[ScoringRule]:
    stmt = select(ScoringRule).where(ScoringRule.workspace_id == ws_id)
    if active_only:
        stmt = stmt.where(ScoringRule.is_active.is_(True))
    stmt = stmt.order_by(ScoringRule.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def activity_kind_counts(
    db: AsyncSession, ws_id: uuid.UUID, lead_id: uuid.UUID
) -> dict[str, int]:
    res = await db.execute(
        select(LeadActivity.kind, func.count(LeadActivity.id))
        .where(
            LeadActivity.workspace_id == ws_id,
            LeadActivity.lead_id == lead_id,
        )
        .group_by(LeadActivity.kind)
    )
    return {kind: int(n or 0) for kind, n in res.all()}


# --------------------------------------------------------------------------- #
# Writes
# --------------------------------------------------------------------------- #
async def create_lead(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    email: str,
    name: str | None = None,
    company: str | None = None,
    source: str | None = None,
    stage: str | None = None,
    attributes: dict | None = None,
) -> Lead:
    lead = Lead(
        workspace_id=ws_id,
        email=email.strip().lower(),
        name=(name or None),
        company=(company or None),
        source=(source or None),
        stage=stage if stage in LEAD_STAGES else "subscriber",
        attributes=attributes or {},
    )
    db.add(lead)
    await db.flush()
    return lead


async def record_activity(
    db: AsyncSession,
    ws_id: uuid.UUID,
    lead: Lead,
    *,
    kind: str,
    weight: int | None = None,
    occurred_at: datetime | None = None,
    meta: dict | None = None,
) -> LeadActivity:
    norm = _norm_kind(kind)
    act = LeadActivity(
        lead_id=lead.id,
        workspace_id=ws_id,
        kind=norm,
        weight=int(weight if weight is not None else 1),
        occurred_at=occurred_at or datetime.now(timezone.utc),
        meta=meta or {},
    )
    db.add(act)
    lead.last_activity_at = act.occurred_at
    await db.flush()
    return act


def _condition_matches(
    rule: ScoringRule, kind_counts: dict[str, int], attributes: dict
) -> bool:
    """Evaluate a rule's JSON condition against real lead data."""
    cond = rule.condition if isinstance(rule.condition, dict) else {}
    op = str(cond.get("op", "exists")).lower()
    value = cond.get("value")

    # Activity-based condition.
    activity_kind = cond.get("activity_kind")
    if activity_kind:
        count = int(kind_counts.get(str(activity_kind), 0))
        if op in ("exists", "occurred", "count_gte"):
            threshold = int(value) if value is not None else 1
            return count >= threshold
        if op == "count_gt":
            return count > int(value or 0)
        if op == "eq":
            return count == int(value or 0)
        return count >= 1

    # Attribute/field-based condition.
    field = cond.get("field")
    if field:
        actual = attributes.get(str(field))
        if op == "exists":
            return actual not in (None, "", [], {})
        if op == "eq":
            return str(actual).lower() == str(value).lower() if actual is not None else False
        if op in ("neq", "ne"):
            return str(actual).lower() != str(value).lower()
        if op == "contains":
            return value is not None and str(value).lower() in str(actual or "").lower()
        if op in ("gte", "gt", "lte", "lt"):
            try:
                a = float(actual)
                b = float(value)
            except (TypeError, ValueError):
                return False
            return {
                "gte": a >= b,
                "gt": a > b,
                "lte": a <= b,
                "lt": a < b,
            }[op]
        return actual not in (None, "", [], {})

    return False


async def recompute_score(
    db: AsyncSession, ws_id: uuid.UUID, lead: Lead
) -> tuple[int, str, int]:
    """Recompute ``lead.score``/``grade`` from real rules + activities.

    Returns ``(new_score, new_grade, old_score)``. When the workspace has no
    active rules yet we fall back to a deterministic activity-weight baseline so
    early leads still get a real, explainable score (never random).
    """
    old_score = int(lead.score or 0)
    kind_counts = await activity_kind_counts(db, ws_id, lead.id)
    attributes = lead.attributes if isinstance(lead.attributes, dict) else {}

    rules = await list_rules(db, ws_id, active_only=True)
    if rules:
        score = 0
        for rule in rules:
            if _condition_matches(rule, kind_counts, attributes):
                score += int(rule.points or 0)
    else:
        # Baseline: sum the real activity weights by configured default points.
        score = sum(
            DEFAULT_KIND_POINTS.get(kind, 1) * count
            for kind, count in kind_counts.items()
        )

    score = max(0, score)
    new_grade = grade_for_score(score)
    lead.score = score
    lead.grade = new_grade
    await db.flush()
    return score, new_grade, old_score


def stage_after_threshold(score: int, stage: str) -> str | None:
    """Suggested stage promotion when a score crosses qualification thresholds.

    Pure, deterministic mapping used by the agent to detect MQL->SQL crossings.
    Returns the higher stage if the score qualifies and it's an advance, else None.
    """
    target: str | None = None
    if score >= 75:
        target = "sql"
    elif score >= 50:
        target = "mql"
    if target is None:
        return None
    if _STAGE_INDEX.get(target, 0) > _STAGE_INDEX.get(stage, 0):
        return target
    return None


# --------------------------------------------------------------------------- #
# Aggregations
# --------------------------------------------------------------------------- #
async def funnel_counts(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, int]:
    res = await db.execute(
        select(Lead.stage, func.count(Lead.id))
        .where(Lead.workspace_id == ws_id)
        .group_by(Lead.stage)
    )
    counts = {stage: 0 for stage in LEAD_STAGES}
    for stage, n in res.all():
        counts[stage] = int(n or 0)
    return counts


async def grade_distribution(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, int]:
    res = await db.execute(
        select(Lead.grade, func.count(Lead.id))
        .where(Lead.workspace_id == ws_id)
        .group_by(Lead.grade)
    )
    dist = {g: 0 for g in ("A", "B", "C", "D")}
    for grade, n in res.all():
        if grade in dist:
            dist[grade] = int(n or 0)
    return dist


async def avg_score(db: AsyncSession, ws_id: uuid.UUID) -> float:
    res = await db.execute(
        select(func.avg(Lead.score)).where(Lead.workspace_id == ws_id)
    )
    val = res.scalar_one_or_none()
    return round(float(val), 1) if val is not None else 0.0


async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict:
    funnel = await funnel_counts(db, ws_id)
    grades = await grade_distribution(db, ws_id)
    avg = await avg_score(db, ws_id)
    total = sum(funnel.values())
    return {
        "total_leads": total,
        "funnel": funnel,
        "grade_distribution": grades,
        "avg_score": avg,
        "mqls": funnel.get("mql", 0),
        "sqls": funnel.get("sql", 0),
    }
