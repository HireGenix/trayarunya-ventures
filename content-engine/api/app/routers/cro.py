"""CRO API — conversion telemetry ingest + funnel / scorecard analytics.

Two surfaces:

* **Public ingest** (``POST /cro/collect``, ``GET /cro/pixel.js``) — no bearer
  auth; the workspace id acts as a public *site key* (like a GA measurement id).
  The on-site pixel beacons events here. We only ever write rows, never read
  back, so exposure is limited to event insertion for a known workspace.
* **Authenticated analytics** (``GET /cro/funnel``, ``GET /cro/scorecard``) —
  workspace-scoped via the normal bearer + ``X-Workspace-Id`` path, returning the
  funnel and the single-source-of-truth CRO scorecard computed from real events.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import Experiment, Workspace
from app.models.conversion import EVENT_TYPES, ConversionEvent
from app.models.cro_action import AUTONOMY_LEVELS, CROAction
from app.services.cro_funnel import compute_funnel, compute_scorecard
from app.services.cro_experiments import (
    compute_conversion_variants,
    evaluate_conversion_experiment,
    recommend_allocation,
)
from app.services.cro_stats import enhanced_evaluate
from app.services.variant_assignment import ship_winner_live
from app.services.cro_segments import compute_segments
from app.services.cro_predict import predict_lift
from app.agents.cro_experimenter import design_experiment_for_leak
from app.agents import cro_agent
from app.services.automation import emit_event

router = APIRouter(prefix="/cro", tags=["cro"])


# --------------------------------------------------------------------------- #
# Public ingest
# --------------------------------------------------------------------------- #
class EventIn(BaseModel):
    anon_id: str = Field(min_length=1, max_length=120)
    event_type: str
    contact_ref: str | None = None
    session_id: str | None = None
    step: str | None = None
    url: str | None = None
    referrer: str | None = None
    device: str | None = None
    experiment_id: str | None = None
    variant_id: str | None = None
    campaign: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    value: float = 0.0
    currency: str = "USD"
    occurred_at: datetime | None = None
    meta: dict | None = None


class CollectIn(BaseModel):
    workspace_id: str = Field(description="Public site key (workspace id)")
    events: list[EventIn] = Field(min_length=1, max_length=200)


class CollectOut(BaseModel):
    accepted: int


def _coerce_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        return None


@router.post("/collect", response_model=CollectOut, status_code=status.HTTP_202_ACCEPTED)
async def collect_events(payload: CollectIn, db: AsyncSession = Depends(get_db)) -> CollectOut:
    ws_id = _coerce_uuid(payload.workspace_id)
    if ws_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid workspace_id")
    workspace = await db.get(Workspace, ws_id)
    if workspace is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown site key")

    now = datetime.now(timezone.utc)
    rows: list[ConversionEvent] = []
    for ev in payload.events:
        etype = ev.event_type if ev.event_type in EVENT_TYPES else "custom"
        rows.append(
            ConversionEvent(
                workspace_id=ws_id,
                anon_id=ev.anon_id[:120],
                contact_ref=(ev.contact_ref or None),
                session_id=(ev.session_id or None),
                event_type=etype,
                step=(ev.step or None),
                url=(ev.url or None),
                referrer=(ev.referrer or None),
                device=(ev.device or None),
                experiment_id=_coerce_uuid(ev.experiment_id),
                variant_id=(ev.variant_id or None),
                campaign=(ev.campaign or None),
                utm_source=(ev.utm_source or None),
                utm_medium=(ev.utm_medium or None),
                value=float(ev.value or 0.0),
                currency=(ev.currency or "USD")[:8],
                source="pixel",
                meta=ev.meta,
                occurred_at=ev.occurred_at or now,
            )
        )
    db.add_all(rows)
    await db.commit()
    return CollectOut(accepted=len(rows))


_PIXEL_JS = """(function(){
  var API=document.currentScript.getAttribute('data-api')||'';
  var W=document.currentScript.getAttribute('data-key')||'';
  if(!W){return;}
  function id(k){try{var m=document.cookie.match(new RegExp('(^| )'+k+'=([^;]+)'));
    if(m){return m[2];}var v=(Date.now().toString(36)+Math.random().toString(36).slice(2));
    document.cookie=k+'='+v+';path=/;max-age=31536000;SameSite=Lax';return v;}catch(e){return 'anon';}}
  var ANON=id('_cro_anon');var SESS=id('_cro_sess');
  var qs=new URLSearchParams(location.search);
  function send(type,extra){
    var ev=Object.assign({anon_id:ANON,session_id:SESS,event_type:type,url:location.href,
      referrer:document.referrer,device:(navigator.userAgent.indexOf('Mobi')>-1?'mobile':'desktop'),
      utm_source:qs.get('utm_source'),utm_medium:qs.get('utm_medium'),campaign:qs.get('utm_campaign')},extra||{});
    var body=JSON.stringify({workspace_id:W,events:[ev]});
    try{navigator.sendBeacon(API+'/cro/collect',new Blob([body],{type:'application/json'}));}
    catch(e){fetch(API+'/cro/collect',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true,mode:'no-cors'});}
  }
  window.cro=function(type,extra){send(type,extra);};
  send('page_view');
  document.addEventListener('click',function(e){
    var el=e.target.closest('[data-cro],a.cta,button.cta,[data-cta]');
    if(el){send('cta_click',{step:el.getAttribute('data-cro')||el.getAttribute('data-cta')||'cta'});}
  },true);
  document.addEventListener('submit',function(e){
    send('form_submit',{step:(e.target&&e.target.getAttribute('name'))||'form'});
  },true);
})();"""


@router.get("/pixel.js")
async def pixel_js() -> Response:
    return Response(
        content=_PIXEL_JS,
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# --------------------------------------------------------------------------- #
# Authenticated analytics
# --------------------------------------------------------------------------- #
@router.get("/funnel")
async def get_funnel(
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await compute_funnel(db, ctx.workspace.id, days)


@router.get("/scorecard")
async def get_scorecard(
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await compute_scorecard(db, ctx.workspace.id, days)


# --------------------------------------------------------------------------- #
# Phase 2 — Full-funnel experimentation (conversion-judged A/B tests)
# --------------------------------------------------------------------------- #
CRO_SURFACES = (
    "content", "landing_page", "cta", "headline", "email_subject",
    "audience", "offer", "price",
)


class CROVariantIn(BaseModel):
    key: str = Field(min_length=1, max_length=80)
    label: str | None = None
    payload: str | None = None
    is_control: bool = False


class CROExperimentIn(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    surface: str = "cta"
    hypothesis: str | None = None
    variants: list[CROVariantIn] = Field(min_length=2, max_length=4)


def _exp_summary(exp: Experiment) -> dict:
    return {
        "id": str(exp.id),
        "name": exp.name,
        "surface": getattr(exp, "surface", "content"),
        "status": exp.status,
        "hypothesis": exp.hypothesis,
        "success_metric": exp.success_metric,
        "winner_key": exp.winner_key,
        "variant_count": len(exp.variants or []),
        "started_at": exp.started_at.isoformat() if exp.started_at else None,
        "ended_at": exp.ended_at.isoformat() if exp.ended_at else None,
        "created_at": exp.created_at.isoformat() if exp.created_at else None,
    }


async def _get_owned_experiment(
    db: AsyncSession, experiment_id: uuid.UUID, workspace_id: uuid.UUID
) -> Experiment:
    exp = await db.get(Experiment, experiment_id)
    if exp is None or exp.workspace_id != workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Experiment not found")
    return exp


async def _experiment_detail(db: AsyncSession, exp: Experiment) -> dict:
    """Live, conversion-judged results for a CRO experiment."""
    variants = exp.variants or []
    variant_results = await compute_conversion_variants(
        db,
        workspace_id=exp.workspace_id,
        experiment_id=exp.id,
        variants=variants,
    )
    evaluation = evaluate_conversion_experiment(variant_results)
    evaluation = enhanced_evaluate(variant_results, evaluation)
    allocation = recommend_allocation(variant_results)
    revenue = round(sum(v.get("revenue", 0.0) for v in variant_results), 2)
    return {
        **_exp_summary(exp),
        "variants": variant_results,
        "evaluation": evaluation,
        "allocation": allocation,
        "total_revenue": revenue,
    }


@router.get("/experiments")
async def list_cro_experiments(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows = (
        await db.execute(
            select(Experiment)
            .where(Experiment.workspace_id == ctx.workspace.id)
            .order_by(Experiment.created_at.desc())
        )
    ).scalars().all()
    return {"experiments": [_exp_summary(e) for e in rows]}


@router.post("/experiments", status_code=status.HTTP_201_CREATED)
async def create_cro_experiment(
    body: CROExperimentIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    surface = body.surface if body.surface in CRO_SURFACES else "cta"
    variants = [v.model_dump() for v in body.variants]
    if not any(v["is_control"] for v in variants):
        variants[0]["is_control"] = True
    exp = Experiment(
        workspace_id=ctx.workspace.id,
        name=body.name.strip(),
        hypothesis=body.hypothesis,
        surface=surface,
        success_metric="conversion_rate",
        variants=variants,
        status="draft",
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return _exp_summary(exp)


@router.post("/experiments/auto", status_code=status.HTTP_201_CREATED)
async def auto_create_cro_experiment(
    days: int = Query(default=30, ge=1, le=365),
    launch: bool = Query(default=False),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Design + create an experiment for the workspace's biggest funnel leak."""
    scorecard = await compute_scorecard(db, ctx.workspace.id, days)
    leak = scorecard.get("biggest_leak")
    if not leak or (leak.get("drop", 0) or 0) <= 0:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No significant funnel leak found yet — collect more conversion data.",
        )
    brand = await cro_agent._load_brand(db, ctx.workspace.id)
    design = await design_experiment_for_leak(
        leak, brand=brand, aov=scorecard.get("avg_order_value", 0.0)
    )
    exp = Experiment(
        workspace_id=ctx.workspace.id,
        name=design["name"],
        hypothesis=design["hypothesis"],
        context={"origin": "cro_auto", "leak": leak},
        surface=design["surface"],
        success_metric="conversion_rate",
        variants=design["variants"],
        status="running" if launch else "draft",
    )
    if launch:
        exp.started_at = datetime.now(timezone.utc)
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return {**_exp_summary(exp), "design": design, "leak": leak}


@router.get("/experiments/{experiment_id}")
async def get_cro_experiment(
    experiment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    exp = await _get_owned_experiment(db, experiment_id, ctx.workspace.id)
    return await _experiment_detail(db, exp)


@router.post("/experiments/{experiment_id}/start")
async def start_cro_experiment(
    experiment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    exp = await _get_owned_experiment(db, experiment_id, ctx.workspace.id)
    exp.status = "running"
    if exp.started_at is None:
        exp.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(exp)
    return _exp_summary(exp)


@router.post("/experiments/{experiment_id}/ship-winner")
async def ship_cro_winner(
    experiment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Conclude an experiment on its statistically-significant winner."""
    exp = await _get_owned_experiment(db, experiment_id, ctx.workspace.id)
    detail = await _experiment_detail(db, exp)
    evaluation = detail["evaluation"]
    if evaluation.get("verdict") != "significant" or not evaluation.get("winner_key"):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "No statistically-significant winner yet. Let the test gather more "
            "traffic before shipping.",
        )
    winner_key = evaluation["winner_key"]
    # Actually flip the served variant: winner gets 100% of traffic
    await ship_winner_live(db, exp, winner_key)
    exp.result = evaluation
    best_comp = next(
        (c for c in evaluation.get("comparisons", []) if c.get("key") == winner_key),
        None,
    )
    exp.learning = (
        f"'{evaluation.get('winner_label')}' won on conversion rate"
        + (f" (+{best_comp['rel_lift_pct']}% rel. lift, p={best_comp['p_value']})" if best_comp else "")
        + "."
    )
    await emit_event(
        db,
        ctx.workspace.id,
        "cro.winner_shipped",
        {
            "experiment_id": str(exp.id),
            "name": exp.name,
            "winner_key": winner_key,
            "surface": getattr(exp, "surface", "content"),
        },
        source="cro",
    )
    # Close the loop on any agent action that spawned this experiment.
    actions = (
        await db.execute(
            select(CROAction).where(
                CROAction.workspace_id == ctx.workspace.id,
                CROAction.experiment_id == exp.id,
            )
        )
    ).scalars().all()
    for a in actions:
        a.status = "shipped"
        a.acted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(exp)
    return await _experiment_detail(db, exp)


@router.get("/experiments/{experiment_id}/allocation")
async def get_cro_allocation(
    experiment_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    exp = await _get_owned_experiment(db, experiment_id, ctx.workspace.id)
    variant_results = await compute_conversion_variants(
        db,
        workspace_id=exp.workspace_id,
        experiment_id=exp.id,
        variants=exp.variants or [],
    )
    return {"allocation": recommend_allocation(variant_results)}


# --------------------------------------------------------------------------- #
# Phase 3 — The CRO Agent (autonomous orchestrator)
# --------------------------------------------------------------------------- #
class CROSettingsIn(BaseModel):
    autonomy: str | None = None
    enabled: bool | None = None
    min_visitors: int | None = Field(default=None, ge=1, le=100000)
    max_active_experiments: int | None = Field(default=None, ge=1, le=50)


def _settings_out(s) -> dict:
    return {
        "autonomy": s.autonomy,
        "autonomy_levels": list(AUTONOMY_LEVELS),
        "enabled": s.enabled,
        "min_visitors": s.min_visitors,
        "max_active_experiments": s.max_active_experiments,
        "last_run_at": s.last_run_at.isoformat() if s.last_run_at else None,
    }


@router.get("/agent")
async def get_cro_agent(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    settings = await cro_agent.get_or_create_settings(db, ctx.workspace.id)
    await db.commit()
    actions = await cro_agent.next_best_actions(db, ctx.workspace.id)
    return {"settings": _settings_out(settings), "actions": actions}


@router.put("/agent/settings")
async def update_cro_settings(
    body: CROSettingsIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    s = await cro_agent.get_or_create_settings(db, ctx.workspace.id)
    if body.autonomy is not None and body.autonomy in AUTONOMY_LEVELS:
        s.autonomy = body.autonomy
    if body.enabled is not None:
        s.enabled = body.enabled
    if body.min_visitors is not None:
        s.min_visitors = body.min_visitors
    if body.max_active_experiments is not None:
        s.max_active_experiments = body.max_active_experiments
    await db.commit()
    await db.refresh(s)
    return _settings_out(s)


@router.post("/agent/run")
async def run_cro_agent(
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await cro_agent.run_cycle(db, ctx.workspace.id, days=days)


@router.get("/agent/actions")
async def list_cro_actions(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {"actions": await cro_agent.next_best_actions(db, ctx.workspace.id, limit=50)}


class CROActionDecision(BaseModel):
    decision: str = Field(description="approve | dismiss")


@router.post("/agent/actions/{action_id}/act")
async def act_on_cro_action(
    action_id: uuid.UUID,
    body: CROActionDecision,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    action = await db.get(CROAction, action_id)
    if action is None or action.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Action not found")

    if body.decision == "dismiss":
        action.status = "dismissed"
        action.acted_at = datetime.now(timezone.utc)
        await db.commit()
        return {"status": "dismissed", "id": str(action.id)}

    if body.decision == "approve":
        # If the action carries a designed experiment and none exists yet, create it.
        design = (action.meta or {}).get("design") if action.meta else None
        if action.experiment_id is None and design and design.get("variants"):
            exp = Experiment(
                workspace_id=ctx.workspace.id,
                name=design["name"],
                hypothesis=design.get("hypothesis"),
                context={"origin": "cro_agent_approved", "action_id": str(action.id)},
                surface=design.get("surface", "cta"),
                success_metric="conversion_rate",
                variants=design["variants"],
                status="running",
                started_at=datetime.now(timezone.utc),
            )
            db.add(exp)
            await db.flush()
            action.experiment_id = exp.id
            action.status = "running"
        else:
            action.status = "approved"
        action.acted_at = datetime.now(timezone.utc)
        await db.commit()
        return {
            "status": action.status,
            "id": str(action.id),
            "experiment_id": str(action.experiment_id) if action.experiment_id else None,
        }

    raise HTTPException(status.HTTP_400_BAD_REQUEST, "decision must be approve|dismiss")


# --------------------------------------------------------------------------- #
# Phase 4 — Segmentation + predictive lift
# --------------------------------------------------------------------------- #
@router.get("/segments")
async def get_cro_segments(
    dimension: str = Query(default="device"),
    days: int = Query(default=30, ge=1, le=365),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await compute_segments(db, ctx.workspace.id, dimension=dimension, days=days)


class PredictIn(BaseModel):
    text: str = Field(min_length=1)
    format: str | None = None
    platform: str | None = None


@router.post("/predict")
async def predict_cro_lift(
    body: PredictIn,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await predict_lift(
        db,
        ctx.workspace.id,
        text=body.text,
        fmt=body.format,
        platform=body.platform,
    )
