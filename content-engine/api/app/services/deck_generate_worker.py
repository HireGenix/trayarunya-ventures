"""Async deck generation worker — runs deck creation in the background.

Used when the Redis queue picks up a 'deck_generate' job, or as a FastAPI
BackgroundTask fallback. Matches the pattern used by research_runner.
"""
from __future__ import annotations

import logging
from typing import Any

from app.db import AsyncSessionLocal

log = logging.getLogger("deck_generate_worker")


async def run_deck_generate(payload: dict[str, Any]) -> None:
    """Execute a deck generation job from a queued payload."""
    import uuid

    from app.models import Deck, Workspace
    from app.services import deck_service

    deck_id = uuid.UUID(payload["deck_id"])
    workspace_id = uuid.UUID(payload["workspace_id"])

    async with AsyncSessionLocal() as db:
        try:
            workspace = await db.get(Workspace, workspace_id)
            if workspace is None:
                log.error("deck_generate: workspace %s not found", workspace_id)
                return

            deck = await db.get(Deck, deck_id)
            if deck is None:
                log.error("deck_generate: deck %s not found", deck_id)
                return

            from app.services import chat_context, deck_media
            from app.agents import deck_designer

            ground = await chat_context.build_deck_grounding(
                db, workspace, payload.get("topic", ""), audience=payload.get("audience")
            )
            grounding = ground["grounding"]
            evidence_sources = ground.get("sources") or []

            designed = await deck_designer.design_deck(
                payload.get("topic", ""),
                grounding,
                audience=payload.get("audience"),
                tone=payload.get("tone"),
                slide_count=payload.get("slide_count"),
                model_key=payload.get("model_key"),
            )

            deck.title = designed["title"][:200] or deck.title
            deck.style = designed["style"]
            deck.theme = await deck_service.resolve_theme(
                db, workspace, designed["style"], theme_id=payload.get("theme_id"),
            )
            deck.meta = {
                "subtitle": designed.get("subtitle", ""),
                "image_provider": payload.get("image_provider"),
                "image_source": payload.get("image_source") or "ai",
            }
            deck.error = None

            slides = designed["slides"]
            slides = deck_service._ensure_references(slides, evidence_sources)
            try:
                slides = await deck_media.enrich_slides(
                    deck.id, slides, deck.theme,
                    provider=payload.get("image_provider"),
                    source=payload.get("image_source") or "ai",
                )
            except Exception:
                pass

            from app.models import DeckSlide

            for i, s in enumerate(slides):
                db.add(DeckSlide(
                    deck_id=deck.id,
                    position=i,
                    layout=s["layout"],
                    data=s["data"],
                    speaker_notes=s.get("speaker_notes"),
                ))

            deck.status = "ready"
            await db.commit()
            log.info("deck_generate: deck %s ready (%d slides)", deck_id, len(slides))

        except Exception as exc:
            log.exception("deck_generate: deck %s failed: %s", deck_id, exc)
            try:
                deck = await db.get(Deck, deck_id)
                if deck:
                    deck.status = "failed"
                    deck.error = str(exc)[:1000]
                    await db.commit()
            except Exception:
                pass
