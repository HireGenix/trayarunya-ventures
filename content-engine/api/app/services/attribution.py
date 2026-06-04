"""Revenue attribution engine.

Computes channel/campaign attribution and funnel analytics from ``RevenueEvent``
rows. Three attribution models are supported per won deal:

- **first_touch**  — 100% credit to the contact's earliest channel.
- **last_touch**   — 100% credit to the channel on the won event (or latest touch).
- **linear**       — equal credit split across every distinct channel the contact
                     touched before winning.

All numbers are derived from stored events — nothing is fabricated. Returns
plain dicts ready for JSON serialization.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field

from app.models.attribution import PIPELINE_STAGES, WON_STAGES


@dataclass
class _Event:
    contact_ref: str
    channel: str
    campaign: str | None
    stage: str
    value: float
    cost: float
    occurred_at: object  # datetime; only compared/ordered


@dataclass
class ChannelStat:
    channel: str
    touches: int = 0
    leads: int = 0
    deals_won: int = 0
    revenue: float = 0.0
    pipeline: float = 0.0
    cost: float = 0.0
    attributed_revenue: dict[str, float] = field(
        default_factory=lambda: {"first_touch": 0.0, "last_touch": 0.0, "linear": 0.0}
    )

    def roi(self, model: str = "linear") -> float | None:
        if self.cost <= 0:
            return None
        return round((self.attributed_revenue[model] - self.cost) / self.cost, 4)

    def to_dict(self) -> dict:
        return {
            "channel": self.channel,
            "touches": self.touches,
            "leads": self.leads,
            "deals_won": self.deals_won,
            "revenue": round(self.revenue, 2),
            "pipeline": round(self.pipeline, 2),
            "cost": round(self.cost, 2),
            "attributed_revenue": {
                k: round(v, 2) for k, v in self.attributed_revenue.items()
            },
            "roi_linear": self.roi("linear"),
            "roi_last_touch": self.roi("last_touch"),
        }


def _to_events(rows) -> list[_Event]:
    out: list[_Event] = []
    for r in rows:
        out.append(
            _Event(
                contact_ref=r.contact_ref,
                channel=r.channel,
                campaign=r.campaign,
                stage=r.stage,
                value=float(r.value or 0.0),
                cost=float(r.cost or 0.0),
                occurred_at=r.occurred_at,
            )
        )
    return out


def compute_attribution(rows) -> dict:
    """Build channel attribution + funnel from a list of RevenueEvent-like rows.

    ``rows`` only needs the attributes: contact_ref, channel, campaign, stage,
    value, cost, occurred_at. Works with ORM rows or any duck-typed object.
    """
    events = _to_events(rows)
    stats: dict[str, ChannelStat] = defaultdict(lambda: ChannelStat(channel="?"))

    def stat(channel: str) -> ChannelStat:
        s = stats[channel]
        if s.channel == "?":
            s.channel = channel
        return s

    # Per-channel raw aggregates.
    for e in events:
        s = stat(e.channel)
        s.cost += e.cost
        if e.stage == "touch":
            s.touches += 1
        elif e.stage == "lead":
            s.leads += 1
        if e.stage in PIPELINE_STAGES:
            s.pipeline += e.value
        if e.stage in WON_STAGES:
            s.deals_won += 1
            s.revenue += e.value

    # Group events by contact to attribute won revenue across touch journey.
    by_contact: dict[str, list[_Event]] = defaultdict(list)
    for e in events:
        by_contact[e.contact_ref].append(e)

    for contact, evs in by_contact.items():
        evs_sorted = sorted(evs, key=lambda x: x.occurred_at)
        won = [e for e in evs_sorted if e.stage in WON_STAGES]
        if not won:
            continue
        won_value = sum(e.value for e in won)
        # Distinct channels in journey order (first occurrence wins).
        journey: list[str] = []
        for e in evs_sorted:
            if e.channel not in journey:
                journey.append(e.channel)
        if not journey:
            continue

        first = journey[0]
        last = won[-1].channel if won[-1].channel else journey[-1]

        stat(first).attributed_revenue["first_touch"] += won_value
        stat(last).attributed_revenue["last_touch"] += won_value
        share = won_value / len(journey)
        for ch in journey:
            stat(ch).attributed_revenue["linear"] += share

    channels = sorted(
        (s.to_dict() for s in stats.values()),
        key=lambda d: d["attributed_revenue"]["linear"],
        reverse=True,
    )

    # Funnel totals across all contacts.
    funnel = _funnel(events)
    totals = {
        "revenue": round(sum(s.revenue for s in stats.values()), 2),
        "pipeline": round(sum(s.pipeline for s in stats.values()), 2),
        "cost": round(sum(s.cost for s in stats.values()), 2),
        "deals_won": sum(s.deals_won for s in stats.values()),
        "leads": sum(s.leads for s in stats.values()),
    }
    blended_roi = None
    if totals["cost"] > 0:
        blended_roi = round((totals["revenue"] - totals["cost"]) / totals["cost"], 4)
    totals["blended_roi"] = blended_roi

    return {"channels": channels, "funnel": funnel, "totals": totals}


def _funnel(events: list[_Event]) -> dict:
    """Distinct contacts that reached each stage (max stage per contact counts)."""
    order = ["lead", "mql", "sql", "opportunity", "closed_won"]
    rank = {s: i for i, s in enumerate(order)}
    best: dict[str, int] = {}
    for e in events:
        if e.stage in rank:
            r = rank[e.stage]
            if e.contact_ref not in best or r > best[e.contact_ref]:
                best[e.contact_ref] = r
    counts = {s: 0 for s in order}
    for _, r in best.items():
        # A contact at stage r counts toward that stage and all earlier ones.
        for i in range(r + 1):
            counts[order[i]] += 1
    return counts
