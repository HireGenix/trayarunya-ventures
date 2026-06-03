"""DSPy configuration backed by the Azure OpenAI GPT-5.5 deployment.

DSPy talks to Azure OpenAI via LiteLLM-style model strings. We configure it lazily
so importing the module never fails when DSPy/credentials are absent (e.g. in CI).
"""
from __future__ import annotations

from app.config import settings

_configured = False


def configure_dspy() -> bool:
    """Configure the global DSPy LM once. Returns True if DSPy is usable."""
    global _configured
    if _configured:
        return True
    if not settings.gpt5_configured:
        return False
    try:
        import dspy  # noqa: WPS433 (lazy import)
    except Exception:
        return False

    endpoint = (settings.azure_gpt5_endpoint or "").rstrip("/")
    lm = dspy.LM(
        model=f"azure/{settings.azure_gpt5_deployment}",
        api_base=endpoint,
        api_key=settings.azure_gpt5_key,
        api_version=settings.azure_gpt5_api_version,
        max_tokens=16000,
    )
    dspy.configure(lm=lm)
    _configured = True
    return True
