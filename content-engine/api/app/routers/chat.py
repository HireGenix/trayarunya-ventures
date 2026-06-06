"""Team chat routes — workspace-grounded conversations + messages."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.team_assistant import run_chat, title_for
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.schemas import (
    ChatAttachmentOut,
    ChatSendRequest,
    ChatSendResponse,
    ConversationCreate,
    ConversationDetail,
    ConversationUpdate,
    ConversationWithPreview,
)
from app.services import chat_context, chat_service, chat_uploads, chat_websearch

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations", response_model=list[ConversationWithPreview])
async def list_conversations(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationWithPreview]:
    convos = await chat_service.list_conversations(db, ctx.workspace.id)
    out: list[ConversationWithPreview] = []
    for c in convos:
        preview = await chat_service.last_message_preview(db, c.id)
        item = ConversationWithPreview.model_validate(c)
        item.preview = preview
        out.append(item)
    return out


@router.post("/conversations", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    convo = await chat_service.create_conversation(
        db, ctx.workspace.id, ctx.user.id,
        title=data.title or "New chat",
        model_key=data.model_key,
    )
    # Optionally seed with a first user message + assistant reply.
    if data.message and data.message.strip():
        await _exchange(
            db, ctx, convo, data.message.strip(), data.model_key,
            web_search=data.web_search,
            attachments=[a.model_dump() for a in data.attachments],
        )
    await db.commit()
    await db.refresh(convo)
    messages = await chat_service.list_messages(db, convo.id)
    detail = ConversationDetail.model_validate(convo)
    detail.messages = messages  # type: ignore[assignment]
    return detail


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    convo = await chat_service.get_conversation(db, ctx.workspace.id, conversation_id)
    if convo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    messages = await chat_service.list_messages(db, convo.id)
    detail = ConversationDetail.model_validate(convo)
    detail.messages = messages  # type: ignore[assignment]
    return detail


@router.patch("/conversations/{conversation_id}", response_model=ConversationDetail)
async def update_conversation(
    conversation_id: uuid.UUID,
    data: ConversationUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ConversationDetail:
    convo = await chat_service.get_conversation(db, ctx.workspace.id, conversation_id)
    if convo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(convo, field, value)
    await db.commit()
    await db.refresh(convo)
    messages = await chat_service.list_messages(db, convo.id)
    detail = ConversationDetail.model_validate(convo)
    detail.messages = messages  # type: ignore[assignment]
    return detail


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> Response:
    convo = await chat_service.get_conversation(db, ctx.workspace.id, conversation_id)
    if convo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    await chat_service.delete_conversation(db, convo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/conversations/{conversation_id}/messages", response_model=ChatSendResponse)
async def send_message(
    conversation_id: uuid.UUID,
    data: ChatSendRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ChatSendResponse:
    convo = await chat_service.get_conversation(db, ctx.workspace.id, conversation_id)
    if convo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    assistant_msg = await _exchange(
        db, ctx, convo, data.text.strip(), data.model_key,
        web_search=data.web_search,
        attachments=[a.model_dump() for a in data.attachments],
    )
    await db.commit()
    await db.refresh(assistant_msg)
    return ChatSendResponse(
        conversation_id=convo.id,
        message=assistant_msg,  # type: ignore[arg-type]
        title=convo.title,
    )


@router.post("/upload", response_model=ChatAttachmentOut)
async def upload_attachment(
    file: UploadFile = File(...),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
) -> ChatAttachmentOut:
    data = await file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    try:
        ref = await chat_uploads.process_upload(
            ctx.workspace.id, file.filename or "file",
            file.content_type or "application/octet-stream", data,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return ChatAttachmentOut(**ref)


async def _exchange(
    db, ctx, convo, user_text: str, model_key: str | None,
    *, web_search: bool = False, attachments: list[dict] | None = None,
):
    """Persist the user message, generate + persist the assistant reply.

    Handles document text injection, image vision and inbuilt web search.
    """
    model = model_key or convo.model_key
    if model and model != convo.model_key:
        convo.model_key = model

    attachments = attachments or []
    images = [a["data_url"] for a in attachments if a.get("kind") == "image" and a.get("data_url")]
    docs = [a for a in attachments if a.get("kind") == "document" and a.get("text")]

    # The text actually sent to the model: user message + any document context.
    model_text = user_text
    if docs:
        doc_blocks = "\n\n".join(
            f"[Attached document: {d.get('name')}]\n{d.get('text')}" for d in docs
        )
        model_text = f"{user_text}\n\n---\nATTACHED FILES:\n{doc_blocks}"

    # Persisted meta (no base64) so the UI can re-render attachment chips.
    persisted_atts = [
        {"name": a.get("name"), "kind": a.get("kind"), "url": a.get("url")}
        for a in attachments
    ]
    user_meta: dict = {}
    if persisted_atts:
        user_meta["attachments"] = persisted_atts

    await chat_service.add_message(
        db, convo.id, "user", user_text, meta=user_meta or None
    )

    # Build grounding (+ optional live web results).
    grounding = await chat_context.build_workspace_grounding(db, ctx.workspace)
    used_web = False
    if web_search or chat_websearch.wants_web_search(user_text):
        block, results = await chat_websearch.run_web_search(user_text)
        if block:
            grounding = f"{grounding}\n\n{block}"
            used_web = bool(results)

    history = await chat_service.list_messages(db, convo.id)
    transcript = [{"role": m.role, "content": m.content} for m in history]
    if transcript and model_text != user_text:
        transcript[-1]["content"] = model_text  # inject doc text for the model only

    reply = await run_chat(transcript, grounding, model, images=images or None)

    assistant_meta: dict = {}
    if model:
        assistant_meta["model"] = model
    if used_web:
        assistant_meta["web_search"] = True
    assistant_msg = await chat_service.add_message(
        db, convo.id, "assistant", reply, meta=assistant_meta or None
    )

    # Auto-title on first exchange.
    if convo.title in ("New chat", "", None):
        convo.title = await title_for(user_text, model)

    await db.flush()
    return assistant_msg
