"""Azure Blob storage for generated media (videos/images).

Container Apps have an ephemeral filesystem, so rendered assets must live in
Blob storage to survive restarts/scale events. When
``AZURE_BLOB_CONNECTION_STRING`` is unset we fall back to local disk (dev mode).
"""
from __future__ import annotations

import asyncio
import logging

from app.config import settings

log = logging.getLogger("blob_storage")


def blob_enabled() -> bool:
    return bool(settings.azure_blob_connection_string)


def _upload_sync(local_path: str, blob_name: str, content_type: str) -> str:
    from azure.storage.blob import BlobServiceClient, ContentSettings

    svc = BlobServiceClient.from_connection_string(settings.azure_blob_connection_string or "")
    container = settings.azure_blob_container
    try:
        svc.create_container(container)
    except Exception:  # noqa: BLE001 — container usually already exists
        pass
    client = svc.get_blob_client(container=container, blob=blob_name)
    with open(local_path, "rb") as f:
        client.upload_blob(
            f, overwrite=True, content_settings=ContentSettings(content_type=content_type)
        )
    return client.url


async def upload_file(
    local_path: str, blob_name: str, content_type: str = "application/octet-stream"
) -> str:
    """Upload a local file to Blob storage and return its public URL."""
    return await asyncio.to_thread(_upload_sync, local_path, blob_name, content_type)


def _upload_bytes_sync(data: bytes, blob_name: str, content_type: str) -> str:
    from azure.storage.blob import BlobServiceClient, ContentSettings

    svc = BlobServiceClient.from_connection_string(settings.azure_blob_connection_string or "")
    container = settings.azure_blob_container
    try:
        svc.create_container(container)
    except Exception:  # noqa: BLE001 — container usually already exists
        pass
    client = svc.get_blob_client(container=container, blob=blob_name)
    client.upload_blob(
        data, overwrite=True, content_settings=ContentSettings(content_type=content_type)
    )
    return client.url


async def upload_bytes(
    data: bytes, blob_name: str, content_type: str = "application/octet-stream"
) -> str:
    """Upload raw bytes to Blob storage and return its URL (``""`` if disabled)."""
    if not blob_enabled():
        return ""
    return await asyncio.to_thread(_upload_bytes_sync, data, blob_name, content_type)
