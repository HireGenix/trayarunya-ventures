"""ICP routes: discovery chat + manual get/save of the workspace ICP."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.icp_chat import run_icp_turn
from app.db import get_db
from app.deps import WorkspaceContext, get_workspace_ctx
from app.schemas import ICPChatRequest, ICPChatResponse, ICPOut, ICPUpdate
from app.services import icp_service

router = APIRouter(prefix="/icp", tags=["icp"])


@router.get("", response_model=ICPOut | None)
async def get_icp(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ICPOut | None:
    row = await icp_service.get_icp(db, ctx.workspace.id)
    return ICPOut.model_validate(row) if row else None


@router.put("", response_model=ICPOut)
async def save_icp(
    data: ICPUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ICPOut:
    payload = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    row = await icp_service.upsert_icp(db, ctx.workspace.id, payload)
    await db.commit()
    await db.refresh(row)
    return ICPOut.model_validate(row)


@router.patch("", response_model=ICPOut)
async def patch_icp(
    data: ICPUpdate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ICPOut:
    payload = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    row = await icp_service.upsert_icp(db, ctx.workspace.id, payload)
    await db.commit()
    await db.refresh(row)
    return ICPOut.model_validate(row)


@router.post("/chat", response_model=ICPChatResponse)
async def icp_chat(
    data: ICPChatRequest,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
) -> ICPChatResponse:
    existing = await icp_service.get_icp(db, ctx.workspace.id)
    existing_brief = icp_service.to_brief(existing) if existing else None

    result = await run_icp_turn(
        [m.model_dump() for m in data.messages],
        existing_brief,
    )

    if data.save and result.get("icp"):
        row = await icp_service.upsert_icp(
            db,
            ctx.workspace.id,
            result["icp"],
            raw=result["icp"],
            status="ready" if result.get("done") else "draft",
        )
        await db.commit()
        result["completeness"] = row.completeness

    return ICPChatResponse(
        message=result["message"],
        icp=result["icp"],
        completeness=result.get("completeness", 0),
        done=result.get("done", False),
    )
