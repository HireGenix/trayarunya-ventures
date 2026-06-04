"""Revenue attribution engine math tests (pure, no DB)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.services.attribution import compute_attribution

BASE = datetime(2025, 1, 1, tzinfo=timezone.utc)


@dataclass
class Row:
    contact_ref: str
    channel: str
    stage: str
    value: float = 0.0
    cost: float = 0.0
    campaign: str | None = None
    occurred_at: datetime = BASE


def _t(days: int) -> datetime:
    return BASE + timedelta(days=days)


def test_empty_returns_zeroed_totals():
    out = compute_attribution([])
    assert out["channels"] == []
    assert out["totals"]["revenue"] == 0.0
    assert out["totals"]["blended_roi"] is None


def test_single_channel_first_last_linear_equal():
    rows = [
        Row("c1", "linkedin", "touch", cost=100, occurred_at=_t(0)),
        Row("c1", "linkedin", "lead", occurred_at=_t(1)),
        Row("c1", "linkedin", "closed_won", value=1000, occurred_at=_t(2)),
    ]
    out = compute_attribution(rows)
    ch = {c["channel"]: c for c in out["channels"]}
    li = ch["linkedin"]
    assert li["attributed_revenue"]["first_touch"] == 1000
    assert li["attributed_revenue"]["last_touch"] == 1000
    assert li["attributed_revenue"]["linear"] == 1000
    assert li["revenue"] == 1000
    assert li["roi_linear"] == 9.0  # (1000-100)/100


def test_multi_touch_linear_split_and_first_last():
    # Journey: content (first) -> linkedin -> ads (won)
    rows = [
        Row("c1", "content", "touch", cost=50, occurred_at=_t(0)),
        Row("c1", "linkedin", "lead", occurred_at=_t(1)),
        Row("c1", "ads", "closed_won", value=900, cost=300, occurred_at=_t(2)),
    ]
    out = compute_attribution(rows)
    ch = {c["channel"]: c for c in out["channels"]}
    # First touch -> content gets full 900
    assert ch["content"]["attributed_revenue"]["first_touch"] == 900
    # Last touch -> ads gets full 900
    assert ch["ads"]["attributed_revenue"]["last_touch"] == 900
    # Linear -> 3 distinct channels, 300 each
    assert ch["content"]["attributed_revenue"]["linear"] == 300
    assert ch["linkedin"]["attributed_revenue"]["linear"] == 300
    assert ch["ads"]["attributed_revenue"]["linear"] == 300


def test_funnel_counts_are_cumulative():
    rows = [
        Row("c1", "linkedin", "lead", occurred_at=_t(0)),
        Row("c2", "linkedin", "mql", occurred_at=_t(0)),
        Row("c3", "ads", "closed_won", value=500, occurred_at=_t(0)),
    ]
    out = compute_attribution(rows)
    f = out["funnel"]
    # c3 reached closed_won so counts at every earlier stage too.
    assert f["lead"] == 3
    assert f["mql"] == 2
    assert f["closed_won"] == 1


def test_open_pipeline_value():
    rows = [
        Row("c1", "linkedin", "opportunity", value=2000, occurred_at=_t(0)),
    ]
    out = compute_attribution(rows)
    assert out["totals"]["pipeline"] == 2000
    assert out["totals"]["revenue"] == 0.0


def test_lost_deals_do_not_attribute_revenue():
    rows = [
        Row("c1", "ads", "touch", cost=200, occurred_at=_t(0)),
        Row("c1", "ads", "closed_lost", value=0, occurred_at=_t(1)),
    ]
    out = compute_attribution(rows)
    ch = {c["channel"]: c for c in out["channels"]}
    assert ch["ads"]["attributed_revenue"]["linear"] == 0
    assert ch["ads"]["deals_won"] == 0
