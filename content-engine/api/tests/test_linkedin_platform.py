from __future__ import annotations

import pytest

from app.llm import vision_adapters as va
from app.services import linkedin_platform as svc


# --------------------------------------------------------------------------- #
# Stage transitions
# --------------------------------------------------------------------------- #
def test_stage_flow_allows_valid_forward_transition():
    assert svc.can_transition("new", "researching")
    assert svc.can_transition("warming_up", "connect_sent")
    assert svc.can_transition("in_conversation", "qualified")


def test_stage_flow_blocks_invalid_jump():
    assert not svc.can_transition("new", "won")
    assert not svc.can_transition("connect_sent", "qualified")


def test_stage_flow_allows_same_stage_and_unknown_from():
    assert svc.can_transition("new", "new")
    assert svc.can_transition(None, "researching")


def test_stage_flow_rejects_unknown_target():
    assert not svc.can_transition("new", "not_a_stage")


# --------------------------------------------------------------------------- #
# Cadence guardrails
# --------------------------------------------------------------------------- #
def test_cadence_within_cap_is_allowed():
    c = svc.cadence_check("connect", used_today=5, cap=15)
    assert c["allowed"] is True
    assert c["remaining"] == 10
    assert c["warning"] is None


def test_cadence_at_cap_blocks_and_warns():
    c = svc.cadence_check("message", used_today=25, cap=25)
    assert c["allowed"] is False
    assert c["remaining"] == 0
    assert "cap reached" in c["warning"]


# --------------------------------------------------------------------------- #
# Deterministic next-action
# --------------------------------------------------------------------------- #
def test_deterministic_next_action_research_for_new_lead():
    out = svc.deterministic_next_action({"full_name": "Jane Doe", "stage": "new"})
    assert out["task_type"] == "research"
    assert out["recommended_next_stage"] == "researching"
    assert out["ai_mode"] == "deterministic"


def test_deterministic_next_action_personalizes_connection_note():
    out = svc.deterministic_next_action(
        {"full_name": "John Smith", "stage": "warming_up", "company": "Acme"}
    )
    assert out["task_type"] == "connect"
    assert out["suggested_copy"]
    assert "John" in out["suggested_copy"]
    assert "Acme" in out["suggested_copy"]


def test_deterministic_next_action_policy_note_present():
    out = svc.deterministic_next_action({"full_name": "X", "stage": "connected"})
    assert "Manual action only" in out["policy_note"]


# --------------------------------------------------------------------------- #
# AI next-action (LLM + fallback)
# --------------------------------------------------------------------------- #
@pytest.mark.asyncio
async def test_ai_next_action_falls_back_when_llm_fails(monkeypatch):
    async def _raise(*args, **kwargs):
        raise RuntimeError("no llm")

    monkeypatch.setattr(svc, "complete_json", _raise)
    out = await svc.ai_next_action({"full_name": "Jane", "stage": "new"})
    assert out["ai_mode"] == "deterministic"
    assert out["task_type"] == "research"


@pytest.mark.asyncio
async def test_ai_next_action_uses_llm_when_available(monkeypatch):
    async def _json(*args, **kwargs):
        return {
            "task_type": "message",
            "title": "Send a tailored note",
            "detail": "Reference their recent post.",
            "priority": "high",
            "suggested_copy": "Hi Jane!",
            "recommended_next_stage": "in_conversation",
            "policy_note": "Manual only.",
        }

    monkeypatch.setattr(svc, "complete_json", _json)
    out = await svc.ai_next_action({"full_name": "Jane", "stage": "connected"})
    assert out["ai_mode"] == "llm_enhanced"
    assert out["task_type"] == "message"
    assert out["recommended_next_stage"] == "in_conversation"


@pytest.mark.asyncio
async def test_ai_next_action_rejects_invalid_stage_from_llm(monkeypatch):
    async def _json(*args, **kwargs):
        return {"task_type": "message", "recommended_next_stage": "bogus_stage"}

    monkeypatch.setattr(svc, "complete_json", _json)
    out = await svc.ai_next_action({"full_name": "Jane", "stage": "connected"})
    # Falls back to the deterministic recommended stage, never the invalid one.
    assert out["recommended_next_stage"] in svc.STAGES


# --------------------------------------------------------------------------- #
# Live vision analysis
# --------------------------------------------------------------------------- #
@pytest.mark.asyncio
async def test_analyze_live_view_without_images_uses_fallback(monkeypatch):
    monkeypatch.setattr(svc, "vision_configured", lambda: False)
    out = await svc.analyze_live_view({"full_name": "Jane", "stage": "new"}, images=[], dom_text=None)
    assert "recommended_action" in out
    assert out["recommended_action"]["task_type"] == "research"
    assert "Manual action only" in out["policy_note"]


@pytest.mark.asyncio
async def test_analyze_live_view_uses_vision_when_images_present(monkeypatch):
    async def _vjson(text, images, system, provider=None):
        return {
            "summary": "Lead recently posted about scaling.",
            "signals": {"intent_level": "high"},
            "recommended_action": {
                "task_type": "message",
                "title": "Comment then DM",
                "detail": "Engage on the scaling post first.",
                "suggested_copy": "Great post!",
                "recommended_next_stage": "in_conversation",
            },
            "policy_note": "Human acts.",
        }

    monkeypatch.setattr(svc, "vision_configured", lambda: True)
    monkeypatch.setattr(svc, "complete_vision_json", _vjson)
    out = await svc.analyze_live_view(
        {"full_name": "Jane", "stage": "connected"},
        images=["data:image/png;base64,AAAA"],
        dom_text="Jane posted about scaling",
    )
    assert out["ai_mode"] == "vision"
    assert out["recommended_action"]["task_type"] == "message"
    assert out["signals"]["intent_level"] == "high"


# --------------------------------------------------------------------------- #
# CSV import parsing
# --------------------------------------------------------------------------- #
def test_parse_leads_csv_maps_aliased_headers():
    csv_text = "Name,Company,LinkedIn URL,Title\nJane Doe,Acme,https://linkedin.com/in/jane,CEO\n"
    rows = svc.parse_leads_csv(csv_text)
    assert len(rows) == 1
    assert rows[0]["full_name"] == "Jane Doe"
    assert rows[0]["company"] == "Acme"
    assert rows[0]["profile_url"] == "https://linkedin.com/in/jane"
    assert rows[0]["headline"] == "CEO"


def test_parse_leads_csv_skips_rows_without_name():
    csv_text = "Name,Company\n,Acme\nJohn,Beta\n"
    rows = svc.parse_leads_csv(csv_text)
    assert len(rows) == 1
    assert rows[0]["full_name"] == "John"


def test_parse_leads_csv_keeps_unknown_columns_as_enrichment():
    csv_text = "Name,Industry,Revenue\nJane,SaaS,10M\n"
    rows = svc.parse_leads_csv(csv_text)
    assert rows[0]["enrichment"]["Industry"] == "SaaS"
    assert rows[0]["enrichment"]["Revenue"] == "10M"


def test_parse_leads_csv_handles_empty_input():
    assert svc.parse_leads_csv("") == []


# --------------------------------------------------------------------------- #
# Playbook
# --------------------------------------------------------------------------- #
def test_playbook_exposes_stages_and_guardrails():
    pb = svc.playbook()
    assert pb["mode"] == "human_in_the_loop"
    assert "new" in pb["stages"]
    assert any("never" in g.lower() or "no automated" in g.lower() for g in pb["guardrails"])
    assert "connect" in pb["default_caps"]


# --------------------------------------------------------------------------- #
# Vision adapter data-url normalization
# --------------------------------------------------------------------------- #
def test_normalize_data_url_passthrough_for_data_url():
    url, media, body = va._normalize_data_url("data:image/jpeg;base64,QUJD")
    assert url.startswith("data:image/jpeg;base64,")
    assert media == "image/jpeg"
    assert body == "QUJD"


def test_normalize_data_url_wraps_raw_base64_as_png():
    url, media, body = va._normalize_data_url("QUJD")
    assert url == "data:image/png;base64,QUJD"
    assert media == "image/png"
    assert body == "QUJD"
