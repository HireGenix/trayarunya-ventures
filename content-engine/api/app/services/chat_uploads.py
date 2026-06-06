"""Chat attachment handling: store uploads in blob + extract context.

Images are returned as base64 data URLs so vision-capable models can read them
directly (the blob container is private). Documents (pdf / docx / txt / md) are
text-extracted server-side and the text is injected into the conversation.
"""
from __future__ import annotations

import base64
import io
import logging
import uuid

from app.services import blob_storage

log = logging.getLogger("chat_uploads")

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_DOC_BYTES = 15 * 1024 * 1024
DOC_TEXT_LIMIT = 12000

IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
DOC_EXT = {"pdf", "docx", "txt", "md", "csv"}


def _ext(name: str) -> str:
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    out: list[str] = []
    for page in reader.pages[:40]:
        try:
            out.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001
            continue
    return "\n".join(out)


def _extract_docx(data: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text)


def extract_text(filename: str, content_type: str, data: bytes) -> str:
    ext = _ext(filename)
    try:
        if ext == "pdf" or content_type == "application/pdf":
            return _extract_pdf(data)
        if ext == "docx" or "wordprocessingml" in content_type:
            return _extract_docx(data)
        if ext in {"txt", "md", "csv"} or content_type.startswith("text/"):
            return data.decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        log.warning("text extraction failed for %s: %s", filename, exc)
    return ""


async def process_upload(
    workspace_id: uuid.UUID,
    filename: str,
    content_type: str,
    data: bytes,
) -> dict:
    """Return an attachment ref for a single uploaded file.

    Shape: {name, kind: 'image'|'document', url, data_url?, text?, chars?}.
    ``data_url`` (images only) is held transiently by the client and sent back
    with the message for vision; it is NOT persisted in the message meta.
    """
    name = (filename or "file").strip()[:200]
    is_image = content_type in IMAGE_TYPES or _ext(name) in {"png", "jpg", "jpeg", "webp", "gif"}

    blob_url = ""
    try:
        blob_name = f"chat/{workspace_id}/{uuid.uuid4().hex}-{name}"
        blob_url = await blob_storage.upload_bytes(
            data, blob_name, content_type or "application/octet-stream"
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("blob upload failed for %s: %s", name, exc)

    if is_image:
        if len(data) > MAX_IMAGE_BYTES:
            raise ValueError("Image too large (max 8 MB).")
        ct = content_type if content_type in IMAGE_TYPES else "image/png"
        b64 = base64.b64encode(data).decode("ascii")
        return {
            "name": name,
            "kind": "image",
            "url": blob_url,
            "data_url": f"data:{ct};base64,{b64}",
        }

    if len(data) > MAX_DOC_BYTES:
        raise ValueError("Document too large (max 15 MB).")
    text = extract_text(name, content_type, data).strip()
    if len(text) > DOC_TEXT_LIMIT:
        text = text[:DOC_TEXT_LIMIT] + "\n…[truncated]"
    return {
        "name": name,
        "kind": "document",
        "url": blob_url,
        "text": text,
        "chars": len(text),
    }
