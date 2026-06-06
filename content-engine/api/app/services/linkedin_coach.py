"""LinkedIn AI Growth Coach - mode-aware real-time coaching engine."""
from __future__ import annotations
import json
from typing import Any
from app.llm.adapters import complete_json
from app.llm.vision_adapters import complete_vision_json, vision_configured
from app.services.linkedin_platform import (
    _live_fallback, _page_type_from_dom, _personalized_copy, _PRIORITY_BY_PAGE,
)

def _coach_mode(page_type, *, is_own_profile=False, composer_text=None, message_thread=None):
    if (composer_text or "").strip():
        return "content_composer"
    if page_type == "profile":
        return "own_profile" if is_own_profile else "lead_profile"
    if page_type == "messaging" or (message_thread or "").strip():
        return "messaging"
    if page_type in ("feed", "search", "jobs", "company"):
        return page_type
    return "other"

def _clamp(v, d=0):
    try: return max(0, min(100, int(round(float(v)))))
    except: return d

def _sys(mode):
    b = ("You are an elite LinkedIn AI Growth Coach. You watch what the human is viewing and coach them "
         "in real time. You NEVER click, automate, send, comment, like, connect or follow. You only observe, "
         "score, recommend, teach and draft copy for the human to use manually. Every recommendation must "
         "explain WHY, WHAT to change, expected OUTCOME, and confidence 0-100. Return STRICT JSON only.")
    x = {
        "own_profile": " Human is on THEIR OWN profile. Audit and return scores + concrete rewrite recommendations.",
        "lead_profile": (" Human is viewing SOMEONE ELSE's profile. Assess fit, intent, decision power, "
                         "surface signals, draft human non-spam outreach."),
        "content_composer": " Human is WRITING a post. Coach the draft: score and give sharper hooks, structure, CTAs.",
        "messaging": " Human is in a DM conversation. Classify stage, suggest next human reply.",
        "feed": " Human is browsing FEED. Surface trending topics, engagement opportunities, comment drafts.",
    }
    return b + x.get(mode, "")

def _prompt(mode, *, objective, memory, page_text, composer_text, message_thread, lead):
    mem = json.dumps(memory or {}, ensure_ascii=False, default=str)[:1500]
    h = f"USER OBJECTIVE: {objective}\nMEMORY: {mem}\nMODE: {mode}\n\n"
    sc = '"headline_action":{"action":str,"reasoning":str,"priority":"high|medium|low"},"insights":[str]'
    if mode == "own_profile":
        return h + f"PROFILE TEXT:\n{page_text[:6000]}\n\nReturn JSON: {{\"profile_scores\":{{\"overall\":0-100,\"recruiter\":0-100,\"brand\":0-100,\"seo\":0-100,\"ats\":0-100}},\"profile_recommendations\":[{{\"section\":str,\"current\":str,\"improved\":str,\"reason\":str,\"impact\":str,\"confidence\":0-100,\"priority\":\"high|medium|low\"}}],\"quick_wins\":[str],{sc}}}"
    if mode == "lead_profile":
        ld = json.dumps(lead or {}, ensure_ascii=False, default=str)[:2000]
        return h + f"LEAD: {ld}\nPROFILE TEXT:\n{page_text[:6000]}\n\nReturn JSON: {{\"lead_intel\":{{\"lead_score\":0-100,\"buying_intent\":0-100,\"decision_maker\":0-100,\"relationship_potential\":0-100,\"summary\":str}},\"signals\":[{{\"type\":str,\"label\":str,\"explanation\":str,\"confidence\":0-100}}],\"outreach\":{{\"connection_note\":str,\"first_message\":str,\"follow_up\":str,\"openers\":[str]}},{sc}}}"
    if mode == "content_composer":
        return h + f"POST DRAFT:\n{(composer_text or '')[:4000]}\n\nReturn JSON: {{\"content_coach\":{{\"post_score\":0-100,\"hook\":0-100,\"structure\":0-100,\"readability\":0-100,\"authority\":0-100,\"virality\":0-100,\"suggestions\":[str],\"alt_hooks\":[str],\"alt_cta\":[str]}},{sc}}}"
    if mode == "messaging":
        return h + f"CONVERSATION:\n{(message_thread or page_text)[:6000]}\n\nReturn JSON: {{\"conversation\":{{\"stage\":\"awareness|interest|discovery|evaluation|decision|closing\",\"interest\":0-100,\"intent\":0-100,\"objections\":[str],\"suggested_replies\":[str],\"suggested_questions\":[str],\"risk_alerts\":[str]}},{sc}}}"
    if mode == "feed":
        return h + f"FEED TEXT:\n{page_text[:6000]}\n\nReturn JSON: {{\"feed_intel\":{{\"trending\":[str],\"opportunities\":[str],\"comment_drafts\":[{{\"post_hint\":str,\"comment\":str}}]}},{sc}}}"
    return h + f"PAGE TEXT:\n{page_text[:5000]}\n\nReturn JSON: {{{sc}}}"

def _fallback(mode, objective, page_type, lead):
    base = _live_fallback(objective, page_type, lead)
    out = {"mode": mode, "page_type": page_type, "ai_mode": "deterministic",
           "headline_action": {"action": base["action"], "reasoning": base["reasoning"], "priority": base["priority"]},
           "insights": []}
    if mode == "lead_profile" and lead:
        out["outreach"] = {"connection_note": _personalized_copy(lead, "connect"),
                           "first_message": _personalized_copy(lead, "message"), "follow_up": None, "openers": []}
    return out

def _norm(raw, mode, page_type, ai_mode, fb):
    ha = raw.get("headline_action")
    if not isinstance(ha, dict): ha = fb["headline_action"]
    p = ha.get("priority")
    if p not in ("high","medium","low"): p = _PRIORITY_BY_PAGE.get(page_type, "medium")
    out = {"mode": mode, "page_type": page_type, "ai_mode": ai_mode,
           "headline_action": {"action": ha.get("action") or fb["headline_action"]["action"],
                               "reasoning": ha.get("reasoning") or fb["headline_action"]["reasoning"], "priority": p},
           "insights": [str(i) for i in (raw.get("insights") or []) if i][:6]}
    if mode == "own_profile":
        ps = raw.get("profile_scores") or {}
        out["profile_scores"] = {k: _clamp(ps.get(k)) for k in ("overall","recruiter","brand","seo","ats")}
        recs = []
        for r in raw.get("profile_recommendations") or []:
            if not isinstance(r, dict): continue
            rp = r.get("priority")
            recs.append({"section": str(r.get("section") or "Profile"), "current": r.get("current"),
                         "improved": r.get("improved"), "reason": r.get("reason"), "impact": r.get("impact"),
                         "confidence": _clamp(r.get("confidence"), 70),
                         "priority": rp if rp in ("high","medium","low") else "medium"})
        out["profile_recommendations"] = recs[:12]
        out["quick_wins"] = [str(q) for q in (raw.get("quick_wins") or []) if q][:6]
    elif mode == "lead_profile":
        li = raw.get("lead_intel") or {}
        out["lead_intel"] = {k: _clamp(li.get(k)) for k in ("lead_score","buying_intent","decision_maker","relationship_potential")}
        out["lead_intel"]["summary"] = li.get("summary")
        sigs = []
        for s in raw.get("signals") or []:
            if isinstance(s, dict):
                sigs.append({"type": str(s.get("type") or "signal"), "label": str(s.get("label") or "Signal"),
                             "explanation": s.get("explanation"), "confidence": _clamp(s.get("confidence"), 60)})
        out["signals"] = sigs[:8]
        o = raw.get("outreach") or {}
        out["outreach"] = {"connection_note": o.get("connection_note"), "first_message": o.get("first_message"),
                           "follow_up": o.get("follow_up"), "openers": [str(x) for x in (o.get("openers") or []) if x][:5]}
    elif mode == "content_composer":
        cc = raw.get("content_coach") or {}
        out["content_coach"] = {k: _clamp(cc.get(k)) for k in ("post_score","hook","structure","readability","authority","virality")}
        out["content_coach"]["suggestions"] = [str(x) for x in (cc.get("suggestions") or []) if x][:8]
        out["content_coach"]["alt_hooks"] = [str(x) for x in (cc.get("alt_hooks") or []) if x][:5]
        out["content_coach"]["alt_cta"] = [str(x) for x in (cc.get("alt_cta") or []) if x][:5]
    elif mode == "messaging":
        cv = raw.get("conversation") or {}
        stage = cv.get("stage")
        valid = ("awareness","interest","discovery","evaluation","decision","closing")
        out["conversation"] = {"stage": stage if stage in valid else "interest",
                               "interest": _clamp(cv.get("interest")), "intent": _clamp(cv.get("intent")),
                               "objections": [str(x) for x in (cv.get("objections") or []) if x][:6],
                               "suggested_replies": [str(x) for x in (cv.get("suggested_replies") or []) if x][:5],
                               "suggested_questions": [str(x) for x in (cv.get("suggested_questions") or []) if x][:5],
                               "risk_alerts": [str(x) for x in (cv.get("risk_alerts") or []) if x][:5]}
    elif mode == "feed":
        fi = raw.get("feed_intel") or {}
        drafts = [{"post_hint": str(d.get("post_hint","")), "comment": str(d.get("comment",""))}
                  for d in (fi.get("comment_drafts") or []) if isinstance(d, dict)]
        out["feed_intel"] = {"trending": [str(x) for x in (fi.get("trending") or []) if x][:8],
                             "opportunities": [str(x) for x in (fi.get("opportunities") or []) if x][:8],
                             "comment_drafts": drafts[:6]}
    return out

async def coach_live_screen(objective, *, images=None, dom_text=None, dom=None,
                            is_own_profile=False, composer_text=None, message_thread=None,
                            lead=None, memory=None):
    """Mode-aware real-time LinkedIn coaching."""
    objective = (objective or "Grow on LinkedIn").strip()
    images = images or []
    page_type = _page_type_from_dom(dom, dom_text)
    mode = _coach_mode(page_type, is_own_profile=is_own_profile,
                       composer_text=composer_text, message_thread=message_thread)
    page_text = dom_text or (dom.get("bodyText") if isinstance(dom, dict) else None) or ""
    fb = _fallback(mode, objective, page_type, lead)
    if not page_text and not images: return fb
    system = _sys(mode)
    user = _prompt(mode, objective=objective, memory=memory, page_text=page_text,
                   composer_text=composer_text, message_thread=message_thread, lead=lead)
    raw = None; ai_mode = "deterministic"
    try:
        if images and vision_configured():
            raw = await complete_vision_json(user, images, system); ai_mode = "vision"
        elif page_text:
            raw = await complete_json([{"role": "user", "content": user}], system); ai_mode = "llm_text"
    except Exception: raw = None
    if not isinstance(raw, dict) or raw.get("_parse_error"): return fb
    return _norm(raw, mode, page_type, ai_mode, fb)
