"""Revenue attribution engine.

Computes channel/campaign attribution and funnel analytics from ``RevenueEvent``
rows. Seven attribution models are supported:

- **first_touch**    — 100 % credit to the contact's earliest channel.
- **last_touch**     — 100 % credit to the channel on the won event (or latest touch).
- **linear**         — equal credit split across every distinct channel the contact
                       touched before winning.
- **time_decay**     — exponential recency-weighted credit (configurable half-life).
- **position_based** — 40 / 20 / 40 (U-shaped) across first / middle / last channels.
- **markov**         — absorbing Markov-chain removal-effect attribution from real
                       transition paths (pure numpy).
- **shapley**        — combinatorial Shapley value from coalition conversion rates.

Additionally:
- **path_explorer**: top conversion paths with counts, value, and distributions.
- **model_comparison**: side-by-side credit per channel across all seven models.

All numbers are derived from stored events — nothing is fabricated. Returns
plain dicts ready for JSON serialization.
"""
from __future__ import annotations

import math
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from itertools import combinations

import numpy as np

from app.models.attribution import PIPELINE_STAGES, WON_STAGES

# Minimum number of converting paths required for probabilistic models.
_MIN_PATHS_MARKOV = 5
_MIN_PATHS_SHAPLEY = 3
# Cap channel count in Shapley to stay tractable (2^n coalitions).
_SHAPLEY_MAX_CHANNELS = 12


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
        rev = self.attributed_revenue.get(model, 0.0)
        return round((rev - self.cost) / self.cost, 4)

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


# --------------------------------------------------------------------------- #
# Journey extraction
# --------------------------------------------------------------------------- #

def _build_journeys(events: list[_Event]):
    """Group events by contact, sort chronologically.

    Returns (by_contact, converting_journeys) where converting_journeys is a
    list of (journey_channels: list[str], won_value: float, timestamps) tuples.
    """
    by_contact: dict[str, list[_Event]] = defaultdict(list)
    for e in events:
        by_contact[e.contact_ref].append(e)

    converting: list[tuple[list[str], float, list[object]]] = []
    for _contact, evs in by_contact.items():
        evs_sorted = sorted(evs, key=lambda x: x.occurred_at)
        won = [e for e in evs_sorted if e.stage in WON_STAGES]
        if not won:
            continue
        won_value = sum(e.value for e in won)
        journey: list[str] = []
        timestamps: list[object] = []
        for e in evs_sorted:
            if e.channel not in journey:
                journey.append(e.channel)
                timestamps.append(e.occurred_at)
        if journey:
            converting.append((journey, won_value, timestamps))

    return by_contact, converting


# --------------------------------------------------------------------------- #
# Core attribution models
# --------------------------------------------------------------------------- #

def _attribute_basic(
    by_contact: dict[str, list[_Event]],
    stats: dict[str, ChannelStat],
):
    """First-touch, last-touch, linear (original three)."""
    def stat(channel: str) -> ChannelStat:
        s = stats[channel]
        if s.channel == "?":
            s.channel = channel
        return s

    for _contact, evs in by_contact.items():
        evs_sorted = sorted(evs, key=lambda x: x.occurred_at)
        won = [e for e in evs_sorted if e.stage in WON_STAGES]
        if not won:
            continue
        won_value = sum(e.value for e in won)
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


def _attribute_time_decay(
    converting: list[tuple[list[str], float, list[object]]],
    stats: dict[str, ChannelStat],
    half_life_days: float = 7.0,
):
    """Exponential recency-weighted credit."""
    def stat(channel: str) -> ChannelStat:
        s = stats[channel]
        if s.channel == "?":
            s.channel = channel
        return s

    decay_rate = math.log(2) / max(half_life_days, 0.001)

    for journey, won_value, timestamps in converting:
        if not journey:
            continue
        # Reference point: last touchpoint timestamp.
        last_ts = timestamps[-1]
        weights: list[float] = []
        for ts in timestamps:
            try:
                delta_days = (last_ts - ts).total_seconds() / 86400.0
            except Exception:
                delta_days = 0.0
            weights.append(math.exp(-decay_rate * max(delta_days, 0.0)))
        total_w = sum(weights)
        if total_w <= 0:
            total_w = 1.0
        for ch, w in zip(journey, weights):
            stat(ch).attributed_revenue.setdefault("time_decay", 0.0)
            stat(ch).attributed_revenue["time_decay"] += won_value * (w / total_w)


def _attribute_position_based(
    converting: list[tuple[list[str], float, list[object]]],
    stats: dict[str, ChannelStat],
):
    """U-shaped 40/20/40 position-based model."""
    def stat(channel: str) -> ChannelStat:
        s = stats[channel]
        if s.channel == "?":
            s.channel = channel
        return s

    for journey, won_value, _ts in converting:
        n = len(journey)
        if n == 0:
            continue
        if n == 1:
            stat(journey[0]).attributed_revenue.setdefault("position_based", 0.0)
            stat(journey[0]).attributed_revenue["position_based"] += won_value
        elif n == 2:
            for ch in journey:
                stat(ch).attributed_revenue.setdefault("position_based", 0.0)
                stat(ch).attributed_revenue["position_based"] += won_value * 0.5
        else:
            middle_share = 0.2 / (n - 2) if n > 2 else 0.0
            for i, ch in enumerate(journey):
                stat(ch).attributed_revenue.setdefault("position_based", 0.0)
                if i == 0:
                    stat(ch).attributed_revenue["position_based"] += won_value * 0.4
                elif i == n - 1:
                    stat(ch).attributed_revenue["position_based"] += won_value * 0.4
                else:
                    stat(ch).attributed_revenue["position_based"] += won_value * middle_share


# --------------------------------------------------------------------------- #
# Markov chain attribution
# --------------------------------------------------------------------------- #

def _markov_attribution(
    by_contact: dict[str, list[_Event]],
) -> tuple[dict[str, float], bool]:
    """Absorbing Markov chain removal-effect attribution.

    States: START, channels…, CONVERSION, NULL.
    Returns (channel → normalised credit fraction, low_data flag).
    """
    paths: list[tuple[list[str], bool]] = []
    for _contact, evs in by_contact.items():
        evs_sorted = sorted(evs, key=lambda x: x.occurred_at)
        journey: list[str] = []
        for e in evs_sorted:
            if e.channel not in journey:
                journey.append(e.channel)
        if not journey:
            continue
        converted = any(e.stage in WON_STAGES for e in evs_sorted)
        paths.append((journey, converted))

    all_channels: set[str] = set()
    for p, _ in paths:
        all_channels.update(p)

    if len(paths) < _MIN_PATHS_MARKOV or len(all_channels) < 2:
        return {}, True

    # Build transition counts
    states = ["START"] + sorted(all_channels) + ["CONVERSION", "NULL"]
    idx = {s: i for i, s in enumerate(states)}
    n = len(states)
    trans = np.zeros((n, n), dtype=np.float64)

    for journey, converted in paths:
        prev = idx["START"]
        for ch in journey:
            cur = idx[ch]
            trans[prev, cur] += 1
            prev = cur
        end = idx["CONVERSION"] if converted else idx["NULL"]
        trans[prev, end] += 1

    # Normalise to transition matrix
    row_sums = trans.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1
    P = trans / row_sums

    # Baseline conversion probability (START → CONVERSION via absorbing chain)
    baseline_prob = _absorbing_conv_prob(P, idx, states)

    # Removal effect per channel
    removal: dict[str, float] = {}
    for ch in sorted(all_channels):
        P_mod = P.copy()
        ci = idx[ch]
        P_mod[ci, :] = 0
        P_mod[ci, idx["NULL"]] = 1.0
        prob = _absorbing_conv_prob(P_mod, idx, states)
        effect = max(baseline_prob - prob, 0.0)
        removal[ch] = effect

    total_effect = sum(removal.values())
    if total_effect <= 0:
        return {ch: 1.0 / len(all_channels) for ch in all_channels}, False

    credit = {ch: v / total_effect for ch, v in removal.items()}
    return credit, False


def _absorbing_conv_prob(P, idx, states) -> float:
    """Compute P(START → CONVERSION) from a transition matrix with absorbing states."""
    absorbing = {idx["CONVERSION"], idx["NULL"]}
    transient = [i for i in range(len(states)) if i not in absorbing]
    if not transient:
        return 0.0

    t_idx = {old: new for new, old in enumerate(transient)}
    Q = np.zeros((len(transient), len(transient)), dtype=np.float64)
    for i, ti in enumerate(transient):
        for j, tj in enumerate(transient):
            Q[i, j] = P[ti, tj]

    # Fundamental matrix N = (I - Q)^{-1}
    I = np.eye(len(transient), dtype=np.float64)
    try:
        N = np.linalg.inv(I - Q)
    except np.linalg.LinAlgError:
        return 0.0

    # B = N * R where R is transient-to-absorbing transition
    conv_col = idx["CONVERSION"]
    R_conv = np.array([P[ti, conv_col] for ti in transient], dtype=np.float64)
    B = N @ R_conv

    start_t = t_idx.get(idx["START"])
    if start_t is None:
        return 0.0
    return float(np.clip(B[start_t], 0.0, 1.0))


def _apply_markov(
    converting: list[tuple[list[str], float, list[object]]],
    credit_fractions: dict[str, float],
    stats: dict[str, ChannelStat],
):
    """Distribute each converting journey's value per Markov credit fractions."""
    def stat(channel: str) -> ChannelStat:
        s = stats[channel]
        if s.channel == "?":
            s.channel = channel
        return s

    total_won = sum(v for _, v, _ in converting)
    for ch, frac in credit_fractions.items():
        stat(ch).attributed_revenue.setdefault("markov", 0.0)
        stat(ch).attributed_revenue["markov"] += total_won * frac


# --------------------------------------------------------------------------- #
# Shapley value attribution
# --------------------------------------------------------------------------- #

def _shapley_attribution(
    by_contact: dict[str, list[_Event]],
) -> tuple[dict[str, float], bool]:
    """Combinatorial Shapley value from coalition conversion rates.

    Returns (channel → normalised credit fraction, low_data flag).
    """
    paths: list[tuple[frozenset[str], bool]] = []
    for _contact, evs in by_contact.items():
        channels = frozenset(e.channel for e in evs)
        converted = any(e.stage in WON_STAGES for e in evs)
        if channels:
            paths.append((channels, converted))

    all_channels = set()
    for ch_set, _ in paths:
        all_channels.update(ch_set)

    if len(paths) < _MIN_PATHS_SHAPLEY or len(all_channels) < 2:
        return {}, True

    channel_list = sorted(all_channels)
    if len(channel_list) > _SHAPLEY_MAX_CHANNELS:
        # Keep only the most frequent channels
        freq: Counter[str] = Counter()
        for ch_set, _ in paths:
            for c in ch_set:
                freq[c] += 1
        channel_list = [c for c, _ in freq.most_common(_SHAPLEY_MAX_CHANNELS)]
        all_channels = set(channel_list)

    # Precompute conversion rate per coalition (subset of channels)
    coalition_data: dict[frozenset[str], tuple[int, int]] = defaultdict(lambda: (0, 0))
    for ch_set, converted in paths:
        filtered = frozenset(c for c in ch_set if c in all_channels)
        if not filtered:
            continue
        total, conv = coalition_data[filtered]
        coalition_data[filtered] = (total + 1, conv + (1 if converted else 0))

    def conv_rate(coalition: frozenset[str]) -> float:
        """Average conversion rate across paths whose channel set is a superset of coalition."""
        total = 0
        conv = 0
        for ch_set, (t, c) in coalition_data.items():
            if coalition.issubset(ch_set):
                total += t
                conv += c
        if total == 0:
            return 0.0
        return conv / total

    n = len(channel_list)
    shapley: dict[str, float] = {}
    others = set(channel_list)

    for ch in channel_list:
        others_list = sorted(others - {ch})
        sv = 0.0
        # Iterate over all subsets of other channels
        for size in range(len(others_list) + 1):
            for combo in combinations(others_list, size):
                S = frozenset(combo)
                S_with = S | {ch}
                marginal = conv_rate(S_with) - conv_rate(S)
                weight = (math.factorial(len(S)) * math.factorial(n - len(S) - 1)) / math.factorial(n)
                sv += weight * marginal
        shapley[ch] = max(sv, 0.0)

    total_sv = sum(shapley.values())
    if total_sv <= 0:
        return {ch: 1.0 / n for ch in channel_list}, False

    credit = {ch: v / total_sv for ch, v in shapley.items()}
    return credit, False


def _apply_shapley(
    converting: list[tuple[list[str], float, list[object]]],
    credit_fractions: dict[str, float],
    stats: dict[str, ChannelStat],
):
    """Distribute total won value per Shapley credit fractions."""
    def stat(channel: str) -> ChannelStat:
        s = stats[channel]
        if s.channel == "?":
            s.channel = channel
        return s

    total_won = sum(v for _, v, _ in converting)
    for ch, frac in credit_fractions.items():
        stat(ch).attributed_revenue.setdefault("shapley", 0.0)
        stat(ch).attributed_revenue["shapley"] += total_won * frac


# --------------------------------------------------------------------------- #
# Path explorer
# --------------------------------------------------------------------------- #

def compute_path_explorer(rows) -> dict:
    """Top conversion paths, path-length distribution, time-to-convert distribution."""
    events = _to_events(rows)
    by_contact: dict[str, list[_Event]] = defaultdict(list)
    for e in events:
        by_contact[e.contact_ref].append(e)

    path_counter: Counter[tuple[str, ...]] = Counter()
    path_value: dict[tuple[str, ...], float] = defaultdict(float)
    path_lengths: list[int] = []
    time_to_convert: list[float] = []  # days

    for _contact, evs in by_contact.items():
        evs_sorted = sorted(evs, key=lambda x: x.occurred_at)
        won = [e for e in evs_sorted if e.stage in WON_STAGES]
        if not won:
            continue
        journey: list[str] = []
        for e in evs_sorted:
            if e.channel not in journey:
                journey.append(e.channel)
        if not journey:
            continue
        won_value = sum(e.value for e in won)
        path_key = tuple(journey)
        path_counter[path_key] += 1
        path_value[path_key] += won_value
        path_lengths.append(len(journey))

        try:
            first_ts = evs_sorted[0].occurred_at
            last_won_ts = won[-1].occurred_at
            days = (last_won_ts - first_ts).total_seconds() / 86400.0
            time_to_convert.append(max(days, 0.0))
        except Exception:
            pass

    # Top paths
    top_paths = []
    for path, count in path_counter.most_common(50):
        top_paths.append({
            "path": list(path),
            "conversions": count,
            "value": round(path_value[path], 2),
        })

    # Path length distribution
    length_dist: dict[int, int] = {}
    for pl in path_lengths:
        length_dist[pl] = length_dist.get(pl, 0) + 1
    length_distribution = [
        {"length": k, "count": v} for k, v in sorted(length_dist.items())
    ]

    # Time-to-convert distribution (bucket into ranges)
    ttc_buckets = _bucket_times(time_to_convert)

    return {
        "top_paths": top_paths,
        "total_converting_paths": len(path_lengths),
        "path_length_distribution": length_distribution,
        "time_to_convert_distribution": ttc_buckets,
        "avg_path_length": round(sum(path_lengths) / max(len(path_lengths), 1), 2),
        "avg_time_to_convert_days": round(
            sum(time_to_convert) / max(len(time_to_convert), 1), 2
        ),
    }


def _bucket_times(days_list: list[float]) -> list[dict]:
    """Bucket time-to-convert days into human-readable ranges."""
    buckets = [
        ("Same day", 0, 1),
        ("1-3 days", 1, 3),
        ("3-7 days", 3, 7),
        ("1-2 weeks", 7, 14),
        ("2-4 weeks", 14, 28),
        ("1-3 months", 28, 90),
        ("3-6 months", 90, 180),
        ("6+ months", 180, float("inf")),
    ]
    counts = {label: 0 for label, _, _ in buckets}
    for d in days_list:
        for label, lo, hi in buckets:
            if lo <= d < hi:
                counts[label] += 1
                break
    return [{"range": label, "count": c} for label, c in counts.items() if c > 0]


# --------------------------------------------------------------------------- #
# Model comparison
# --------------------------------------------------------------------------- #

def compute_model_comparison(rows, half_life_days: float = 7.0) -> dict:
    """Side-by-side credit per channel across all seven models."""
    full = compute_attribution(rows, half_life_days=half_life_days)
    channels = full["channels"]

    models = [
        "first_touch", "last_touch", "linear",
        "time_decay", "position_based", "markov", "shapley",
    ]
    model_labels = {
        "first_touch": "First Touch",
        "last_touch": "Last Touch",
        "linear": "Linear",
        "time_decay": "Time Decay",
        "position_based": "Position Based",
        "markov": "Markov Chain",
        "shapley": "Shapley Value",
    }

    comparison: list[dict] = []
    for ch_data in channels:
        row: dict = {"channel": ch_data["channel"]}
        for m in models:
            row[m] = ch_data["attributed_revenue"].get(m, 0.0)
        comparison.append(row)

    return {
        "channels": comparison,
        "models": models,
        "model_labels": model_labels,
        "low_data": full.get("low_data", {}),
    }


# --------------------------------------------------------------------------- #
# Main entry point
# --------------------------------------------------------------------------- #

def compute_attribution(rows, *, half_life_days: float = 7.0) -> dict:
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

    by_contact, converting = _build_journeys(events)

    # Original three models
    _attribute_basic(by_contact, stats)
    # Time decay
    _attribute_time_decay(converting, stats, half_life_days=half_life_days)
    # Position based (U-shaped)
    _attribute_position_based(converting, stats)

    # Markov chain
    low_data: dict[str, bool] = {}
    markov_credit, markov_low = _markov_attribution(by_contact)
    low_data["markov"] = markov_low
    if not markov_low:
        _apply_markov(converting, markov_credit, stats)
    else:
        for ch in stats:
            stats[ch].attributed_revenue.setdefault("markov", 0.0)

    # Shapley value
    shapley_credit, shapley_low = _shapley_attribution(by_contact)
    low_data["shapley"] = shapley_low
    if not shapley_low:
        _apply_shapley(converting, shapley_credit, stats)
    else:
        for ch in stats:
            stats[ch].attributed_revenue.setdefault("shapley", 0.0)

    channels = sorted(
        (s.to_dict() for s in stats.values()),
        key=lambda d: d["attributed_revenue"]["linear"],
        reverse=True,
    )

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

    return {
        "channels": channels,
        "funnel": funnel,
        "totals": totals,
        "low_data": low_data,
    }


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
        for i in range(r + 1):
            counts[order[i]] += 1
    return counts
