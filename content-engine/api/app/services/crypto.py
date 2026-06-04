"""Symmetric encryption for secrets at rest (OAuth/integration tokens).

Uses Fernet (AES-128-CBC + HMAC). The key comes from ``settings.encryption_key``
when set; otherwise a deterministic dev key is derived from ``jwt_secret`` so
local development works without extra setup. In production, always set
``ENCRYPTION_KEY`` to a stable urlsafe-base64 32-byte value.

Helpers degrade gracefully: ``encrypt(None)`` -> ``None`` and ``decrypt`` returns
``None`` on any failure so a bad/legacy value never crashes a request.
"""
from __future__ import annotations

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

log = logging.getLogger("crypto")


def _derive_key() -> bytes:
    raw = settings.encryption_key
    if raw:
        # Accept either a proper Fernet key or any string we can normalise.
        try:
            # Validate it is a usable Fernet key.
            Fernet(raw.encode())
            return raw.encode()
        except Exception:  # noqa: BLE001
            digest = hashlib.sha256(raw.encode()).digest()
            return base64.urlsafe_b64encode(digest)
    # Dev fallback: derive from jwt_secret (stable across restarts).
    digest = hashlib.sha256(f"enc:{settings.jwt_secret}".encode()).digest()
    return base64.urlsafe_b64encode(digest)


_fernet = Fernet(_derive_key())


def encrypt(value: str | None) -> str | None:
    """Encrypt a plaintext string -> urlsafe token, or ``None`` for empty input."""
    if not value:
        return None
    try:
        return _fernet.encrypt(value.encode()).decode()
    except Exception:  # noqa: BLE001
        log.exception("encrypt failed")
        return None


def decrypt(token: str | None) -> str | None:
    """Decrypt a token -> plaintext, or ``None`` if missing/invalid."""
    if not token:
        return None
    try:
        return _fernet.decrypt(token.encode()).decode()
    except (InvalidToken, Exception):  # noqa: BLE001
        return None
