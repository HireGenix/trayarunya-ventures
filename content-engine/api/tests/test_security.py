"""Security helpers: password hashing + JWT issue/verify tests."""
from __future__ import annotations

from app.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_round_trip():
    hashed = hash_password("S3cur3-Pass!")
    assert hashed != "S3cur3-Pass!"
    assert verify_password("S3cur3-Pass!", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_password_over_72_bytes_does_not_crash():
    long_pw = "a" * 200
    hashed = hash_password(long_pw)
    assert verify_password(long_pw, hashed) is True


def test_jwt_round_trip():
    token = create_access_token("user-123", extra={"workspace": "ws-1"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["workspace"] == "ws-1"
    assert payload["type"] == "access"


def test_decode_invalid_token_returns_none():
    assert decode_token("garbage.token.value") is None
