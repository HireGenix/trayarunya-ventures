"""Encrypt social/ad account tokens at rest.

Tokens (OAuth access + refresh) are stored encrypted using the Fernet-based
:mod:`app.services.crypto` helpers. Ciphertext is written back into the same
columns the models already expose (``access_token`` / ``refresh_token``), so no
schema change is required.

Reads are backward-compatible: :func:`get_account_token` tries to decrypt and,
if decryption fails (a legacy plaintext row written before encryption was
enabled), falls back to the raw stored value. This keeps existing rows working
while all new writes are encrypted.

These helpers are model-agnostic: ``account`` can be a ``SocialAccount`` or an
``AdAccount`` (both expose ``access_token``/``refresh_token`` attributes).
"""
from __future__ import annotations

from typing import Any

from app.services.crypto import decrypt, encrypt


def _read(account: Any, column: str) -> str | None:
    """Decrypt ``column`` on ``account``; fall back to raw legacy plaintext."""
    stored = getattr(account, column, None)
    if not stored:
        return None
    plain = decrypt(stored)
    if plain is not None:
        return plain
    # Legacy/plaintext value written before encryption was enabled.
    return stored


def _write(account: Any, column: str, raw: str | None) -> None:
    setattr(account, column, encrypt(raw))


def set_account_token(account: Any, raw: str | None) -> None:
    """Encrypt and store the access token on ``account`` (no-op safe for None)."""
    _write(account, "access_token", raw)


def get_account_token(account: Any) -> str | None:
    """Return the decrypted access token, or None. Legacy plaintext supported."""
    return _read(account, "access_token")


def set_refresh(account: Any, raw: str | None) -> None:
    """Encrypt and store the refresh token on ``account``."""
    _write(account, "refresh_token", raw)


def get_refresh(account: Any) -> str | None:
    """Return the decrypted refresh token, or None. Legacy plaintext supported."""
    return _read(account, "refresh_token")
