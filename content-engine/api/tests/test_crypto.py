"""Token encryption + legacy plaintext fallback tests."""
from __future__ import annotations

from types import SimpleNamespace

from app.services import token_vault
from app.services.crypto import decrypt, encrypt


def test_encrypt_decrypt_round_trip():
    secret = "ya29.super-secret-oauth-token"
    token = encrypt(secret)
    assert token is not None
    assert token != secret  # actually encrypted
    assert decrypt(token) == secret


def test_encrypt_none_is_none():
    assert encrypt(None) is None
    assert encrypt("") is None


def test_decrypt_garbage_returns_none():
    assert decrypt("not-a-valid-fernet-token") is None
    assert decrypt(None) is None


def test_vault_round_trip_on_account_object():
    account = SimpleNamespace(access_token=None, refresh_token=None)
    token_vault.set_account_token(account, "access-123")
    token_vault.set_refresh(account, "refresh-456")
    # Stored ciphertext is not the plaintext.
    assert account.access_token != "access-123"
    assert account.refresh_token != "refresh-456"
    assert token_vault.get_account_token(account) == "access-123"
    assert token_vault.get_refresh(account) == "refresh-456"


def test_vault_reads_legacy_plaintext():
    # A row written before encryption was enabled holds raw plaintext.
    account = SimpleNamespace(access_token="legacy-plaintext-token", refresh_token=None)
    assert token_vault.get_account_token(account) == "legacy-plaintext-token"
