"""Production safety gate tests."""
from __future__ import annotations

from app.config import Settings


def test_development_is_safe_by_default():
    s = Settings(environment="development")
    assert s.is_production is False
    assert s.production_safety_errors() == []


def test_production_blocks_weak_jwt_and_local_db():
    s = Settings(environment="production")
    errors = s.production_safety_errors()
    assert s.is_production is True
    joined = " ".join(errors)
    assert "JWT_SECRET" in joined
    assert "DATABASE_URL" in joined


def test_production_passes_with_strong_config():
    s = Settings(
        environment="production",
        jwt_secret="x" * 48,
        encryption_key="a" * 44,
        database_url="postgresql+asyncpg://u:p@db.example.com:5432/app",
        cors_origins="https://app.example.com",
        oauth_redirect_base="https://api.example.com",
        debug=False,
    )
    assert s.production_safety_errors() == []


def test_production_rejects_debug_true():
    s = Settings(
        environment="production",
        jwt_secret="x" * 48,
        encryption_key="a" * 44,
        database_url="postgresql+asyncpg://u:p@db.example.com:5432/app",
        cors_origins="https://app.example.com",
        oauth_redirect_base="https://api.example.com",
        debug=True,
    )
    assert any("DEBUG" in e for e in s.production_safety_errors())


def test_production_rejects_insecure_cors():
    s = Settings(
        environment="production",
        jwt_secret="x" * 48,
        encryption_key="a" * 44,
        database_url="postgresql+asyncpg://u:p@db.example.com:5432/app",
        cors_origins="http://evil.example.com",
        oauth_redirect_base="https://api.example.com",
    )
    assert any("CORS" in e for e in s.production_safety_errors())
