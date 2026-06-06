"""Segment evaluation engine.

Resolves a saved :class:`EmailSegment`'s ``rules`` JSONB into the concrete set of
:class:`EmailSubscriber` rows it currently matches. Behavioural conditions
(opened / clicked / not-opened within N days) are answered from the real
``email_send_logs`` telemetry — never fabricated.

Rule shape::

    {
      "match": "all" | "any",
      "conditions": [
        {"field": "status",    "op": "eq",           "value": "subscribed"},
        {"field": "tag",       "op": "contains",     "value": "vip"},
        {"field": "attribute", "op": "eq", "key": "plan", "value": "pro"},
        {"field": "opened",    "op": "in_last_days", "value": 30},
        {"field": "clicked",   "op": "in_last_days", "value": 14},
        {"field": "not_opened","op": "in_last_days", "value": 60}
      ]
    }
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email import EmailSegment, EmailSendLog, EmailSubscriber

# Behavioural fields are evaluated against email_send_logs, not subscriber columns.
_BEHAVIOUR_FIELDS = {"opened", "clicked", "not_opened"}


def _days_ago(days) -> datetime:
    try:
        n = int(days)
    except (TypeError, ValueError):
        n = 30
    return datetime.now(timezone.utc) - timedelta(days=max(n, 0))


def _build_attribute_clause(cond: dict):
    key = cond.get("key")
    value = cond.get("value")
    op = (cond.get("op") or "eq").lower()
    if not key:
        return None
    # attributes is JSONB; use the ->> text accessor for comparison.
    accessor = EmailSubscriber.attributes[key].astext
    if op == "eq":
        return accessor == (None if value is None else str(value))
    if op == "ne":
        return accessor != (None if value is None else str(value))
    if op == "contains":
        return accessor.ilike(f"%{value}%")
    if op == "exists":
        return accessor.isnot(None)
    return accessor == (None if value is None else str(value))


def _build_scalar_clause(cond: dict):
    """Build a clause for non-behavioural subscriber-column conditions."""
    field = (cond.get("field") or "").lower()
    op = (cond.get("op") or "eq").lower()
    value = cond.get("value")

    if field == "status":
        column = EmailSubscriber.status
    elif field in ("email", "name"):
        column = getattr(EmailSubscriber, field)
    elif field == "tag":
        # tags is a JSONB array; "contains" tests membership.
        if op in ("contains", "eq", "has"):
            return EmailSubscriber.tags.contains([value])
        if op == "not_contains":
            return ~EmailSubscriber.tags.contains([value])
        return EmailSubscriber.tags.contains([value])
    elif field == "attribute":
        return _build_attribute_clause(cond)
    else:
        return None

    if op == "eq":
        return column == value
    if op == "ne":
        return column != value
    if op == "in" and isinstance(value, (list, tuple)):
        return column.in_(list(value))
    if op == "contains":
        return column.ilike(f"%{value}%")
    return column == value


async def _behaviour_subscriber_ids(
    db: AsyncSession,
    ws_id: uuid.UUID,
    cond: dict,
) -> tuple[set[uuid.UUID], bool]:
    """Return (subscriber_ids, negate) for a behavioural condition.

    ``negate`` is True for ``not_opened`` — meaning the returned ids should be
    EXCLUDED rather than included.
    """
    field = (cond.get("field") or "").lower()
    since = _days_ago(cond.get("value"))

    stmt = select(EmailSendLog.subscriber_id).where(
        EmailSendLog.workspace_id == ws_id,
        EmailSendLog.subscriber_id.isnot(None),
    )

    if field in ("opened", "not_opened"):
        stmt = stmt.where(
            EmailSendLog.opened_at.isnot(None),
            EmailSendLog.opened_at >= since,
        )
    elif field == "clicked":
        stmt = stmt.where(
            EmailSendLog.clicked_at.isnot(None),
            EmailSendLog.clicked_at >= since,
        )

    rows = (await db.execute(stmt)).scalars().all()
    ids = {r for r in rows if r is not None}
    return ids, field == "not_opened"


async def evaluate_segment(
    db: AsyncSession, ws_id: uuid.UUID, segment_id: uuid.UUID
) -> list[EmailSubscriber]:
    """Resolve ``segment_id`` to the list of matching subscribers."""
    segment = (
        await db.execute(
            select(EmailSegment).where(
                EmailSegment.id == segment_id,
                EmailSegment.workspace_id == ws_id,
            )
        )
    ).scalar_one_or_none()
    if segment is None:
        return []

    rules = segment.rules or {}
    match = str(rules.get("match", "all")).lower()
    conditions = rules.get("conditions") or []
    use_any = match == "any"

    # Base query: workspace-scoped, optionally pinned to the segment's list.
    base_filters = [EmailSubscriber.workspace_id == ws_id]
    if segment.list_id is not None:
        base_filters.append(EmailSubscriber.list_id == segment.list_id)

    scalar_clauses = []
    include_sets: list[set[uuid.UUID]] = []
    exclude_ids: set[uuid.UUID] = set()
    behaviour_present = False

    for cond in conditions:
        if not isinstance(cond, dict):
            continue
        field = (cond.get("field") or "").lower()
        if field in _BEHAVIOUR_FIELDS:
            behaviour_present = True
            ids, negate = await _behaviour_subscriber_ids(db, ws_id, cond)
            if negate:
                exclude_ids |= ids
            else:
                include_sets.append(ids)
        else:
            clause = _build_scalar_clause(cond)
            if clause is not None:
                scalar_clauses.append(clause)

    stmt = select(EmailSubscriber).where(*base_filters)
    if scalar_clauses:
        combiner = or_ if use_any else and_
        stmt = stmt.where(combiner(*scalar_clauses))

    subscribers = list((await db.execute(stmt)).scalars().all())

    if not behaviour_present:
        return subscribers

    # Fold behavioural include/exclude sets into the candidate list.
    if use_any:
        # For "any": a behavioural include set alone can qualify a subscriber,
        # even if scalar clauses didn't match. Union scalar matches with includes.
        behaviour_union: set[uuid.UUID] = set()
        for s in include_sets:
            behaviour_union |= s
        # not_opened under "any" means "has NOT opened in window" — i.e. anyone
        # not in exclude_ids qualifies; gather those candidates too.
        if exclude_ids:
            allsubs = list(
                (await db.execute(select(EmailSubscriber).where(*base_filters))).scalars().all()
            )
            not_opened_ids = {s.id for s in allsubs if s.id not in exclude_ids}
            behaviour_union |= not_opened_ids
            id_to_sub = {s.id: s for s in allsubs}
        else:
            id_to_sub = {s.id: s for s in subscribers}
            for s in (
                await db.execute(select(EmailSubscriber).where(*base_filters))
            ).scalars().all():
                id_to_sub.setdefault(s.id, s)

        qualifying = {s.id for s in subscribers} | behaviour_union
        return [id_to_sub[i] for i in qualifying if i in id_to_sub]

    # For "all": every behavioural include set must contain the subscriber, and
    # the subscriber must not be in any exclude set.
    result = []
    for sub in subscribers:
        ok = True
        for s in include_sets:
            if sub.id not in s:
                ok = False
                break
        if ok and sub.id in exclude_ids:
            ok = False
        if ok:
            result.append(sub)
    return result


def _subscriber_brief(sub: EmailSubscriber) -> dict:
    return {
        "id": str(sub.id),
        "email": sub.email,
        "name": sub.name,
        "status": sub.status,
    }


async def preview_segment(
    db: AsyncSession, ws_id: uuid.UUID, segment_id: uuid.UUID
) -> dict:
    """Return the match count plus a small sample for UI preview."""
    matches = await evaluate_segment(db, ws_id, segment_id)
    return {
        "count": len(matches),
        "sample": [_subscriber_brief(s) for s in matches[:10]],
    }
