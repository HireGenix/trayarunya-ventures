"""Ads optimizer agent — turns recent performance into prioritized, agentic actions.

Given a campaign's plan and its recent KPIs, it produces a ranked list of
concrete optimization actions (scale / cut / fix), a one-line health verdict and
a suggested budget move. An LLM produces nuanced reasoning when configured; a
deterministic heuristic engine guarantees a useful result either way.
"""
from __future__ import annotations

import json
from typing import Any

from app.llm.adapters import _extract_json, complete
from app.services.ads_connectors import PLATFORM_BASELINES, PLATFORM_LABELS

OPTIMIZER_SYSTEM = (
    "You are an autonomous paid-media optimization agent. Given a campaign and its "
    "recent performance vs platform benchmarks, decide what to do next. Be specific, "
    "quantified and prioritized. Return STRICT JSON:\n"
    "{\n"
    '  "health": "excellent|good|needs_attention|underperforming",\n'
    '  "summary": "one or two sentence verdict",\n'
    '  "budget_recommendation": {"action": "increase|decrease|hold", "change_pct": 0, "rationale": "..."},\n'
    '  "actions": [\n'
    '    {"priority": "high|medium|low", "type": "scale|cut|creative|targeting|bid|budget|tracking", "action": "what to do", "expected_impact": "..."}\n'
    "  ],\n"
    '  "tests_to_run": ["A/B test ideas"]\n'
    "}\n"
)


def _heuristic(platform: str, kpis: dict[str, float], totals: dict[str, float]) -> dict[str, Any]:
    base = PLATFORM_BASELINES.get(platform, PLATFORM_BASELINES["google_ads"])
    bench_ctr = base["ctr"] * 100
    bench_cvr = base["cvr"] * 100
    bench_cpc = base["cpc"]

    ctr = kpis.get("ctr", 0.0)
    cvr = kpis.get("conversion_rate", 0.0)
    cpc = kpis.get("cpc", 0.0)
    conv = totals.get("conversions", 0.0)

    actions: list[dict[str, Any]] = []
    score = 0

    if ctr < bench_ctr * 0.7:
        score -= 2
        actions.append({
            "priority": "high", "type": "creative",
            "action": f"CTR {ctr:.2f}% is below the {bench_ctr:.2f}% benchmark — refresh ad creative/headlines and test new hooks.",
            "expected_impact": "Higher CTR lowers CPC and improves quality/relevance.",
        })
    elif ctr > bench_ctr * 1.15:
        score += 1

    if cpc > bench_cpc * 1.25 and cpc > 0:
        score -= 1
        actions.append({
            "priority": "medium", "type": "bid",
            "action": f"CPC ${cpc:.2f} is above the ${bench_cpc:.2f} benchmark — tighten targeting, add negatives and review bid strategy.",
            "expected_impact": "Lower CPC stretches budget for more clicks.",
        })

    if cvr < bench_cvr * 0.7:
        score -= 2
        actions.append({
            "priority": "high", "type": "tracking",
            "action": f"Conversion rate {cvr:.2f}% trails the {bench_cvr:.2f}% benchmark — audit landing page, offer and conversion tracking.",
            "expected_impact": "Recovering CVR directly cuts CPA.",
        })
    elif cvr > bench_cvr * 1.15:
        score += 2

    if conv >= 1 and cvr >= bench_cvr and ctr >= bench_ctr:
        actions.insert(0, {
            "priority": "high", "type": "scale",
            "action": "Strong efficiency across CTR and CVR — increase daily budget ~20% on the top ad set/group.",
            "expected_impact": "Capture more volume while economics are favorable.",
        })

    if not actions:
        actions.append({
            "priority": "low", "type": "budget",
            "action": "Performance is tracking near benchmarks — hold budget and continue creative testing.",
            "expected_impact": "Maintain stable, efficient delivery.",
        })

    if score >= 2:
        health, action, pct = "excellent", "increase", 20
    elif score >= 1:
        health, action, pct = "good", "increase", 10
    elif score <= -3:
        health, action, pct = "underperforming", "decrease", -25
    elif score < 0:
        health, action, pct = "needs_attention", "hold", 0
    else:
        health, action, pct = "good", "hold", 0

    return {
        "health": health,
        "summary": (
            f"{PLATFORM_LABELS.get(platform, platform)}: CTR {ctr:.2f}% vs {bench_ctr:.2f}%, "
            f"CVR {cvr:.2f}% vs {bench_cvr:.2f}%, CPA ${kpis.get('cpa', 0):.2f}."
        ),
        "budget_recommendation": {
            "action": action,
            "change_pct": pct,
            "rationale": "Based on performance vs platform benchmarks.",
        },
        "actions": actions,
        "tests_to_run": [
            "Test 3 new primary headlines against the current best performer.",
            "Split a tightly-themed audience/keyword segment into its own ad set/group.",
        ],
        "engine": "heuristic",
    }


async def optimize_campaign(
    *,
    platform: str,
    campaign_name: str,
    objective: str | None,
    plan: dict[str, Any] | None,
    kpis: dict[str, float],
    totals: dict[str, float],
    days: int,
) -> dict[str, Any]:
    fallback = _heuristic(platform, kpis, totals)

    prompt = (
        f"PLATFORM: {platform}\n"
        f"CAMPAIGN: {campaign_name}\n"
        f"OBJECTIVE: {objective or 'n/a'}\n"
        f"WINDOW_DAYS: {days}\n"
        f"BENCHMARKS: {json.dumps(PLATFORM_BASELINES.get(platform, {}))}\n"
        f"TOTALS: {json.dumps(totals)}\n"
        f"KPIS: {json.dumps(kpis)}\n"
        f"PLAN_SUMMARY: {json.dumps(plan, ensure_ascii=False)[:3000] if plan else 'n/a'}\n"
    )
    try:
        raw = await complete([{"role": "user", "content": prompt}], OPTIMIZER_SYSTEM)
        result = json.loads(_extract_json(raw))
        if isinstance(result, dict) and result.get("actions"):
            result.setdefault("health", fallback["health"])
            result.setdefault("summary", fallback["summary"])
            result.setdefault("budget_recommendation", fallback["budget_recommendation"])
            result.setdefault("tests_to_run", fallback["tests_to_run"])
            result["engine"] = "ai"
            result["benchmarks"] = PLATFORM_BASELINES.get(platform, {})
            return result
    except Exception:  # noqa: BLE001 — fall back to deterministic engine
        pass

    fallback["benchmarks"] = PLATFORM_BASELINES.get(platform, {})
    return fallback
