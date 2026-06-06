"""ICP service — fetch, merge and persist the per-workspace Ideal Customer Profile.

The discovery chat emits ``update_icp`` deltas; we merge them into a single
profile (union lists, overwrite scalars), compute a completeness score, and
expose a compact brief used to ground research / strategy / calendar prompts.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ICPProfile

# Typed columns that mirror keys in ``raw``. Scalars overwrite; the list/dict
# fields are merged specially in ``merge_icp_delta``.
_SCALAR_FIELDS = (
    "segment", "industry", "company_name", "website", "company_summary",
    "value_prop", "offer", "target_customer", "brand_voice",
)
_LIST_FIELDS = (
    "personas", "pains", "goals", "geographies", "channels", "keywords", "competitors",
)


def _norm_segment(value: Any) -> str | None:
    if not value:
        return None
    v = str(value).strip().upper().replace("-", "").replace(" ", "")
    if v in ("B2B", "B2C", "D2C"):
        return v
    return None


def _dedupe_list(items: list[Any]) -> list[Any]:
    """Union a list of strings/dicts, preserving order, dropping duplicates."""
    out: list[Any] = []
    seen: set[str] = set()
    for it in items:
        key = it.strip().lower() if isinstance(it, str) else str(
            it.get("name") or it.get("title") or it
        ).strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out


def merge_icp_delta(existing: dict[str, Any] | None, delta: dict[str, Any]) -> dict[str, Any]:
    """Apply one ``update_icp`` delta onto the accumulated ICP dict."""
    merged: dict[str, Any] = dict(existing or {})
    for field, value in (delta or {}).items():
        if value is None or value == "" or value == [] or value == {}:
            continue
        if field == "segment":
            seg = _norm_segment(value)
            if seg:
                merged["segment"] = seg
            continue
        if field in _LIST_FIELDS:
            cur = merged.get(field) or []
            incoming = value if isinstance(value, list) else [value]
            merged[field] = _dedupe_list([*cur, *incoming])
        elif field == "b2b":
            cur = merged.get("b2b") or {}
            if isinstance(value, dict):
                cur = {**cur, **{k: v for k, v in value.items() if v}}
                merged["b2b"] = cur
        else:
            merged[field] = value
    return merged


def compute_completeness(icp: dict[str, Any]) -> int:
    """0-100 readiness score; >=70 considered 'ready' for research."""
    checks = [
        bool(icp.get("segment")),
        bool(icp.get("industry")),
        bool(icp.get("company_summary")),
        bool(icp.get("target_customer")),
        bool(icp.get("value_prop") or icp.get("offer")),
        bool(icp.get("personas")),
        bool(icp.get("pains")),
        bool(icp.get("goals")),
        bool(icp.get("channels")),
    ]
    if not checks:
        return 0
    return round(100 * sum(1 for c in checks if c) / len(checks))


async def get_icp(db: AsyncSession, workspace_id: uuid.UUID) -> ICPProfile | None:
    res = await db.execute(
        select(ICPProfile).where(ICPProfile.workspace_id == workspace_id)
    )
    return res.scalar_one_or_none()


def _apply_to_row(row: ICPProfile, data: dict[str, Any]) -> None:
    for field in _SCALAR_FIELDS:
        if field in data and data[field] is not None:
            setattr(row, field, data[field])
    for field in _LIST_FIELDS:
        if field in data and data[field] is not None:
            setattr(row, field, data[field])
    if data.get("b2b") is not None:
        row.b2b = data["b2b"]
    if data.get("status"):
        row.status = data["status"]


async def upsert_icp(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    data: dict[str, Any],
    *,
    raw: dict[str, Any] | None = None,
    status: str | None = None,
) -> ICPProfile:
    """Create or update the workspace ICP from a dict of fields."""
    row = await get_icp(db, workspace_id)
    if row is None:
        row = ICPProfile(workspace_id=workspace_id)
        db.add(row)
    _apply_to_row(row, data)
    if raw is not None:
        row.raw = raw
    if status:
        row.status = status
    # Keep completeness in sync from the merged raw (preferred) or typed columns.
    basis = raw if raw is not None else {
        **{f: getattr(row, f) for f in _SCALAR_FIELDS},
        **{f: getattr(row, f) for f in _LIST_FIELDS},
    }
    row.completeness = compute_completeness(basis)
    if row.completeness >= 70 and row.status == "draft":
        row.status = "ready"
    await db.flush()
    return row


def to_brief(icp: ICPProfile | None) -> dict[str, Any] | None:
    """Compact ICP context injected into research/strategy/calendar prompts."""
    if icp is None:
        return None
    brief = {
        "segment": icp.segment,
        "industry": icp.industry,
        "company": icp.company_name,
        "company_summary": icp.company_summary,
        "value_prop": icp.value_prop,
        "offer": icp.offer,
        "target_customer": icp.target_customer,
        "personas": icp.personas,
        "pains": icp.pains,
        "goals": icp.goals,
        "geographies": icp.geographies,
        "channels": icp.channels,
        "keywords": icp.keywords,
        "competitors": icp.competitors,
        "b2b": icp.b2b,
        "brand_voice": icp.brand_voice,
    }
    return {k: v for k, v in brief.items() if v}
