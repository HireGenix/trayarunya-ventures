"""AI video routes — short-form videos for Reels / Shorts / TikTok / YouTube.

Generate an AI video (script + Pexels b-roll + Azure OpenAI voiceover + auto
captions), list/delete, regenerate with notes, and stream the rendered MP4.
"""
from __future__ import annotations

import os
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.models import ContentItem, ContentVideo
from app.schemas import VideoGenerateRequest, VideoOut, VideoRegenerateRequest
from app.services.video_studio import render_video
from app.services.blob_storage import blob_enabled, upload_file

router = APIRouter(prefix="/videos", tags=["videos"])

log = logging.getLogger("videos")


async def _persist_asset(local_path: str) -> tuple[str, str | None, str | None]:
    """Move a rendered file to Blob storage when configured.

    Returns ``(storage, path, url)`` — ``("blob", None, url)`` on success, else
    ``("local", local_path, None)`` so the API serves it from disk.
    """
    if blob_enabled():
        try:
            url = await upload_file(local_path, os.path.basename(local_path), "video/mp4")
            try:
                os.remove(local_path)
            except OSError:
                pass
            return "blob", None, url
        except Exception as exc:  # noqa: BLE001
            log.warning("Blob upload failed, serving from local disk: %s", exc)
    return "local", local_path, None


def _to_out(v: ContentVideo) -> VideoOut:
    return VideoOut(
        id=v.id,
        workspace_id=v.workspace_id,
        content_item_id=v.content_item_id,
        topic=v.topic,
        platform=v.platform,
        fmt=v.fmt,
        provider=v.provider,
        voice=v.voice,
        status=v.status,
        duration_s=v.duration_s,
        width=v.width,
        height=v.height,
        mime=v.mime,
        url=f"/api/v1/videos/{v.id}/raw",
        created_at=v.created_at,
    )


async def _brand_for(db: AsyncSession, workspace_id: uuid.UUID) -> dict | None:
    from app.routers.images import _load_brand

    return await _load_brand(db, workspace_id)


@router.post("/generate", response_model=VideoOut, status_code=status.HTTP_201_CREATED)
async def generate(
    data: VideoGenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> VideoOut:
    topic = data.topic
    platform = data.platform
    script = (data.script or "").strip() or None
    item: ContentItem | None = None
    if data.content_item_id:
        item = await db.get(ContentItem, data.content_item_id)
        if item is None or item.workspace_id != ctx.workspace.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Content item not found")
        topic = topic or item.title or (item.body[:200] if item.body else None)
        platform = platform or item.platform
        # Default: turn the existing post/script body into the video verbatim.
        if script is None and item.body and item.body.strip():
            script = item.body.strip()

    if not topic and not script:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide a topic, script, or content_item_id")
    if not topic and script:
        topic = script[:200]

    brand = await _brand_for(db, ctx.workspace.id) if data.use_brand else None

    try:
        result = await render_video(
            topic=topic,
            fmt=data.fmt,
            platform=platform,
            seconds=data.seconds,
            voice=data.voice,
            tone=data.tone,
            brand=brand,
            extra=data.extra,
            script=script,
            quality=data.quality,
            style=data.style,
            visuals=data.visuals,
        )
    except RuntimeError as exc:
        # Missing dependency / config (ffmpeg, Pexels key, TTS) — actionable 503.
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Video generation failed: {exc}")

    _storage, _path, _url = await _persist_asset(result.path)
    vid = ContentVideo(
        workspace_id=ctx.workspace.id,
        content_item_id=data.content_item_id,
        created_by=ctx.user.id,
        topic=topic,
        platform=platform,
        fmt=result.plan.get("fmt", data.fmt),
        provider=result.provider,
        voice=result.voice,
        status="ready",
        duration_s=result.duration_s,
        width=result.width,
        height=result.height,
        mime="video/mp4",
        storage=_storage,
        path=_path,
        url=_url,
        captions_srt=result.captions_srt,
        plan=result.plan,
        meta=result.meta,
    )
    db.add(vid)
    await db.flush()
    await db.commit()
    await db.refresh(vid)
    return _to_out(vid)


@router.post("/{video_id}/regenerate", response_model=VideoOut, status_code=status.HTTP_201_CREATED)
async def regenerate(
    video_id: uuid.UUID,
    data: VideoRegenerateRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> VideoOut:
    src = await db.get(ContentVideo, video_id)
    if src is None or src.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Video not found")

    brand = await _brand_for(db, ctx.workspace.id)
    extra = (data.notes or "").strip() or None
    # Preserve the original quality/style unless the caller overrides them.
    src_plan = src.plan or {}
    src_meta = src.meta or {}
    quality = data.quality or src_plan.get("quality")
    style = data.style or src_meta.get("style")
    visuals = data.visuals or src_plan.get("visuals") or src_meta.get("visuals")
    # If this video was built from a content item's script, keep narrating it verbatim.
    script: str | None = None
    if src.content_item_id:
        item = await db.get(ContentItem, src.content_item_id)
        if item is not None and item.body and item.body.strip():
            script = item.body.strip()
    try:
        result = await render_video(
            topic=src.topic or "brand video",
            fmt=src.fmt,
            platform=src.platform,
            seconds=src.duration_s,
            voice=data.voice or src.voice,
            tone=data.tone,
            brand=brand,
            extra=extra,
            script=script,
            quality=quality,
            style=style,
            visuals=visuals,
        )
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Video generation failed: {exc}")

    _storage, _path, _url = await _persist_asset(result.path)
    vid = ContentVideo(
        workspace_id=ctx.workspace.id,
        content_item_id=src.content_item_id,
        created_by=ctx.user.id,
        topic=src.topic,
        platform=src.platform,
        fmt=result.plan.get("fmt", src.fmt),
        provider=result.provider,
        voice=result.voice,
        status="ready",
        duration_s=result.duration_s,
        width=result.width,
        height=result.height,
        mime="video/mp4",
        storage=_storage,
        path=_path,
        url=_url,
        captions_srt=result.captions_srt,
        plan=result.plan,
        meta={**(result.meta or {}), "regenerated_from": str(src.id), "notes": extra},
    )
    db.add(vid)
    await db.flush()
    await db.commit()
    await db.refresh(vid)
    return _to_out(vid)


@router.get("", response_model=list[VideoOut])
async def list_videos(
    content_item_id: uuid.UUID | None = None,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[VideoOut]:
    stmt = select(ContentVideo).where(ContentVideo.workspace_id == ctx.workspace.id)
    if content_item_id:
        stmt = stmt.where(ContentVideo.content_item_id == content_item_id)
    stmt = stmt.order_by(ContentVideo.created_at.desc())
    res = await db.execute(stmt)
    return [_to_out(v) for v in res.scalars().all()]


@router.get("/{video_id}/raw")
async def raw_video(video_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    vid = await db.get(ContentVideo, video_id)
    if vid is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Video not found")
    if vid.storage == "blob" and vid.url:
        return RedirectResponse(vid.url)
    if not vid.path or not os.path.exists(vid.path):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Video file missing")
    return FileResponse(
        vid.path,
        media_type=vid.mime or "video/mp4",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
        filename=f"{video_id}.mp4",
    )


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_video(
    video_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> None:
    vid = await db.get(ContentVideo, video_id)
    if vid is None or vid.workspace_id != ctx.workspace.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Video not found")
    if vid.storage == "local" and vid.path and os.path.exists(vid.path):
        try:
            os.remove(vid.path)
        except OSError:
            pass
    await db.delete(vid)
    await db.commit()
