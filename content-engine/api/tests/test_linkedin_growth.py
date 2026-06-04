from __future__ import annotations

import pytest

from app.services import linkedin_growth as lg


def test_browser_session_is_human_controlled_and_policy_safe():
    session = lg.browser_session("https://www.linkedin.com/in/example/")
    assert session["url"].endswith("/example/")
    assert session["mode"] == "human_controlled_window"
    assert any("No mass scraping" in g for g in session["guardrails"])
    assert any("Open LinkedIn" in step for step in session["capture_steps"])


def test_grade_thresholds():
    assert lg.grade_for(90) == "lead_machine"
    assert lg.grade_for(75) == "strong"
    assert lg.grade_for(55) == "developing"
    assert lg.grade_for(20) == "needs_work"


@pytest.mark.asyncio
async def test_audit_profile_fallback_scores_strong_snapshot(monkeypatch):
    async def _raise(*args, **kwargs):
        raise RuntimeError("no llm")

    monkeypatch.setattr(lg, "complete_json", _raise)
    result = await lg.audit_profile(
        {
            "headline": "I help B2B founders generate qualified LinkedIn pipeline",
            "banner_notes": "Outcome, proof, and CTA to book an audit",
            "about": "I help B2B founders solve pipeline pain with strategy, proof, ROI, and case-driven content. Book an audit call.",
            "featured": "Case study, LinkedIn playbook, profile audit offer",
            "experience": "Generated $500k pipeline and improved conversion by 30% with LinkedIn growth systems",
            "proof": "Client case study: 42% more qualified leads and measurable ROI",
            "recent_posts": "Framework posts, case lessons, mistakes, playbook, comment PROFILE for audit",
            "cta": "DM PROFILE for an audit",
        },
        {"icp": {"role": "B2B founders"}, "offer": "generate qualified LinkedIn pipeline"},
    )
    assert result["score"] >= 70
    assert result["grade"] in {"strong", "lead_machine"}
    assert result["compliance"]["allowed_mode"].startswith("human-in-the-loop")


@pytest.mark.asyncio
async def test_audit_profile_fallback_creates_high_priority_recommendations(monkeypatch):
    async def _raise(*args, **kwargs):
        raise RuntimeError("no llm")

    monkeypatch.setattr(lg, "complete_json", _raise)
    result = await lg.audit_profile(
        {"headline": "Founder", "about": "", "recent_posts": ""},
        {"icp": {"role": "CFOs"}, "offer": "book high-ticket sales calls"},
    )
    assert result["score"] < 50
    assert result["grade"] == "needs_work"
    assert result["recommendations"]
    assert any(r["priority"] == "high" for r in result["recommendations"])
    assert "auto-DM" in result["compliance"]["blocked_automation"]


@pytest.mark.asyncio
async def test_audit_profile_uses_llm_when_available(monkeypatch):
    async def _json(*args, **kwargs):
        return {
            "score": 88,
            "findings": {"summary": "excellent"},
            "recommendations": [{"section": "headline", "priority": "medium", "title": "Tune headline"}],
            "drafts": {"headline_options": ["A"]},
            "compliance": {"risk_level": "safe"},
        }

    monkeypatch.setattr(lg, "complete_json", _json)
    result = await lg.audit_profile({"headline": "x"}, {"icp": "founders"})
    assert result["score"] == 88
    assert result["grade"] == "lead_machine"
    assert result["ai_mode"] == "llm_enhanced"


def test_objective_normalization():
    assert lg.normalize_objective("partnerships") == "partnerships"
    assert lg.normalize_objective("bad") == "high_ticket_leads"
    assert lg.normalize_objective(None) == "high_ticket_leads"
