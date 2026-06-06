"""Model Registry — the single source of truth for every LLM the platform can use.

Instead of hard-coding model names/endpoints in backend adapters and the frontend
picker, every usable model is a row here. The table is seeded from environment
variables on startup (so existing env/secret config keeps working) and can be
managed live by a superadmin from the dashboard — add, edit, enable/disable or
reorder models with no code change or redeploy.

The ``kind`` column tells the generic adapter which API shape to speak:
  - ``responses``         -> Azure OpenAI Responses API (GPT-5.5, gpt-chat-latest)
  - ``anthropic``         -> Azure Anthropic Messages API (Claude Opus/Sonnet)
  - ``chat_completions``  -> Azure AI model-inference chat/completions (Grok, etc.)

``api_key`` is stored ENCRYPTED at rest (see ``app.services.crypto``); it is never
returned to the frontend.
"""
from __future__ import annotations

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

# API-shape identifiers the generic adapter understands.
MODEL_KINDS = ("responses", "anthropic", "chat_completions")


class ModelRegistry(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "model_registry"

    # Stable identifier used by callers/UI (e.g. "gpt-5.5", "grok-4.3").
    key: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    # Human label shown in the picker (e.g. "Grok 4.3").
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    # API shape: responses | anthropic | chat_completions.
    kind: Mapped[str] = mapped_column(String(30), nullable=False)

    # Provider wiring.
    endpoint: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    api_version: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # Lifecycle / presentation.
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    # Where the row came from: "env" (seeded) or "manual" (superadmin-created).
    source: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)
