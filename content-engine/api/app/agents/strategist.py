"""Strategy agent — turns a research brief into a master content + social strategy.

Uses DSPy when available (GPT-5.5 backend) for a typed, optimizable Signature, and
falls back to a strict-JSON LLM call when DSPy/credentials are absent so the endpoint
always works.
"""
from __future__ import annotations

import json
from datetime import date
from typing import Any

from app.llm.adapters import _extract_json, complete
from app.llm.dspy_config import configure_dspy

STRATEGY_SYSTEM = (
    "You are the Chief Strategy Officer of an elite B2B/B2C/D2C marketing partner. "
    "You treat the client's growth as your own. From the research brief, design a "
    "complete, execution-ready content + social strategy. Be specific and opinionated.\n\n"
    "Return STRICT JSON:\n"
    "{\n"
    '  "title": "...",\n'
    '  "positioning": "one-paragraph positioning statement",\n'
    '  "pillars": [{"name": "...", "why": "...", "angles": ["..."]}],\n'
    '  "channel_plan": {"linkedin": {"cadence": "...", "formats": ["..."]},\n'
    '                    "x": {...}, "blog": {...}, "newsletter": {...}},\n'
    '  "funnel": {"awareness": ["..."], "consideration": ["..."], "decision": ["..."]},\n'
    '  "lead_magnets": [{"title": "...", "format": "...", "promise": "..."}],\n'
    '  "content_calendar": [{"week": 1, "theme": "...",\n'
    '      "items": [{"platform": "...", "type": "...", "hook": "..."}]}],\n'
    '  "kpis": [{"metric": "...", "target": "..."}]\n'
    "}\n"
    "Make content_calendar cover 4 weeks. Ground every choice in the research."
)


def _research_to_prompt(brief: dict[str, Any], objective: str | None) -> str:
    today = date.today()
    return (
        f"TODAY'S DATE: {today.isoformat()} ({today.strftime('%A, %d %B %Y')}). "
        f"Anchor the calendar and timing to this date.\n\n"
        f"Objective: {objective or 'Grow qualified pipeline and authority.'}\n\n"
        f"Research brief (JSON):\n{json.dumps(brief, ensure_ascii=False)[:40000]}"
    )


async def _llm_strategy(brief: dict[str, Any], objective: str | None) -> dict[str, Any]:
    raw = await complete(
        [{"role": "user", "content": _research_to_prompt(brief, objective)}],
        STRATEGY_SYSTEM,
    )
    try:
        return json.loads(_extract_json(raw))
    except json.JSONDecodeError:
        return {"title": "Strategy", "positioning": raw[:2000]}


def _dspy_strategy(brief: dict[str, Any], objective: str | None) -> dict[str, Any] | None:
    """Optional DSPy path. Returns None if DSPy is unavailable."""
    if not configure_dspy():
        return None
    try:
        import dspy

        class StrategySignature(dspy.Signature):
            """Design a complete, execution-ready B2B content + social strategy as JSON."""

            objective: str = dspy.InputField()
            research_brief: str = dspy.InputField(desc="JSON research brief")
            strategy_json: str = dspy.OutputField(desc="Strict JSON per the required schema")

        predictor = dspy.Predict(StrategySignature)
        out = predictor(
            objective=objective or "Grow qualified pipeline and authority.",
            research_brief=json.dumps(brief, ensure_ascii=False)[:40000],
        )
        return json.loads(_extract_json(out.strategy_json))
    except Exception:
        return None


async def run_strategy(brief: dict[str, Any], objective: str | None = None) -> dict[str, Any]:
    data = _dspy_strategy(brief, objective)
    if not data:
        data = await _llm_strategy(brief, objective)
    data.setdefault("title", "Content & Social Strategy")
    return data
