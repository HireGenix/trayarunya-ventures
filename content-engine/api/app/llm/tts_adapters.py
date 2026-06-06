"""Azure OpenAI audio adapters for AI video: voiceover (TTS) + transcript.

``gpt-audio`` style deployments expose both **TTS and STT** through the
chat/completions *audio modality* (``modalities: ["text", "audio"]``) rather
than the classic ``/audio/speech`` + Whisper endpoints. A single call returns
both the spoken MP3 **and** the exact ``transcript`` of what was said, so we get
perfectly accurate caption text for free — no separate Whisper deployment
needed.

- ``synthesize_voiceover()`` -> ``(mp3_bytes, transcript)`` for a script,
  optionally steered with a free-form ``tone`` delivery instruction.

Fails with a clear ``RuntimeError`` when audio config is unset, so the video
pipeline degrades gracefully instead of producing a broken file.
"""
from __future__ import annotations

import base64

import httpx

from app.config import settings

# Voiceover can take a while for longer scripts.
_TTS_TIMEOUT = httpx.Timeout(180.0, connect=20.0)

# gpt-audio supported voices.
VOICES = [
    "alloy", "ash", "ballad", "coral", "echo",
    "sage", "shimmer", "verse", "nova", "onyx", "fable",
]

_NARRATION_SYSTEM = (
    "You are a professional voiceover artist and TTS engine. Read the user's "
    "text aloud VERBATIM. Do not add, remove, summarize, translate, or answer "
    "— narrate only the exact words provided."
)


def normalize_voice(value: str | None) -> str:
    v = (value or "").lower().strip()
    return v if v in VOICES else settings.azure_tts_voice


def _tts_url() -> str:
    base = (settings.tts_endpoint or "").rstrip("/").split("/openai/")[0]
    return (
        f"{base}/openai/deployments/{settings.azure_tts_deployment}"
        f"/chat/completions?api-version={settings.azure_tts_api_version}"
    )


async def synthesize_voiceover(
    script: str,
    *,
    voice: str | None = None,
    tone: str | None = None,
    fmt: str = "mp3",
) -> tuple[bytes, str]:
    """Generate narration via the gpt-audio chat/completions audio modality.

    Returns ``(audio_bytes, transcript)`` where ``transcript`` is the exact
    text the model spoke (used for perfectly-synced caption text).
    """
    if not (settings.tts_endpoint and settings.tts_key):
        raise RuntimeError(
            "Voiceover unavailable: set AZURE_TTS_ENDPOINT/AZURE_TTS_KEY "
            "(or the AZURE_GPT5_* Azure OpenAI resource)."
        )
    if not script.strip():
        raise RuntimeError("Voiceover script is empty.")

    system = _NARRATION_SYSTEM
    if tone:
        system += f" Delivery style: {tone}."

    payload: dict = {
        "modalities": ["text", "audio"],
        "audio": {"voice": normalize_voice(voice), "format": fmt},
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": script},
        ],
    }

    async with httpx.AsyncClient(timeout=_TTS_TIMEOUT) as client:
        r = await client.post(
            _tts_url(),
            headers={"api-key": settings.tts_key or "", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"TTS failed ({r.status_code}): {r.text[:300]}")
        try:
            audio = r.json()["choices"][0]["message"]["audio"]
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"TTS returned no audio: {r.text[:300]}") from exc
        data = audio.get("data")
        if not data:
            raise RuntimeError("TTS response missing audio data.")
        transcript = str(audio.get("transcript") or "").strip()
        return base64.b64decode(data), transcript
