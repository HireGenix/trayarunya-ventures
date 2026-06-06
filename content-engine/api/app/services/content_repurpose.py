"""Content repurposing / atomization pipeline.

Takes a source asset and produces channel-native variants using the LLM,
honoring brand voice and each channel's real constraints.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from app.llm.adapters import complete, _extract_json

logger = logging.getLogger(__name__)

# Real character / format constraints per channel
CHANNEL_CONSTRAINTS: dict[str, dict] = {
    "x_thread": {
        "label": "X Thread",
        "max_chars": 280,  # per tweet
        "format": "Thread of 3-7 tweets, each ≤280 chars. Number them 1/N. First tweet is the hook.",
        "tone": "Punchy, conversational, high-signal. Use line breaks within tweets.",
    },
    "linkedin_post": {
        "label": "LinkedIn Post",
        "max_chars": 3000,
        "format": "Single post ≤3000 chars. Hook line first (before 'see more'). Use short paragraphs, line breaks. End with a question or CTA.",
        "tone": "Professional but approachable. Authority-driven. No hashtag spam (max 3-5).",
    },
    "instagram_caption": {
        "label": "Instagram Caption",
        "max_chars": 2200,
        "format": "Caption ≤2200 chars. Hook in first line. Use emoji sparingly. Include 20-30 hashtags at the end separated by dots.",
        "tone": "Visual-first storytelling. Conversational, relatable.",
    },
    "newsletter_blurb": {
        "label": "Newsletter Blurb",
        "max_chars": 1500,
        "format": "Email-friendly blurb ≤1500 chars. Subject line + preview text + body. Clear CTA button text.",
        "tone": "Warm, direct, value-focused. Scannable with bold key phrases.",
    },
    "blog_summary": {
        "label": "Blog Summary",
        "max_chars": 500,
        "format": "SEO meta description (≤160 chars) + social share snippet (≤500 chars).",
        "tone": "Clear, keyword-rich, benefit-oriented.",
    },
    "ad_copy": {
        "label": "Ad Copy",
        "max_chars": 125,
        "format": "Headline (≤30 chars) + Primary text (≤125 chars) + Description (≤30 chars). Suitable for Facebook/Google ads.",
        "tone": "Benefit-driven, urgent, clear value proposition.",
    },
}

REPURPOSE_SYSTEM = """You are an expert content repurposing specialist. You take a source piece
of content and transform it into channel-native variants that feel native to each platform,
NOT like a lazy copy-paste.

Rules:
- Each variant must respect the channel's character limits STRICTLY.
- Preserve the core message and key insights but adapt voice, structure and length.
- Return STRICT JSON: {"variants": [{"channel": "<key>", "title": "<short title>", "body": "<the content>", "meta": {"char_count": N, "hashtags": [...], "subject_line": "..." (if email)}}]}
- Do NOT invent facts not in the source. Do NOT add emojis unless the channel spec says to.
"""


@dataclass
class RepurposedVariant:
    channel: str
    label: str
    title: str
    body: str
    char_count: int
    meta: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "channel": self.channel,
            "label": self.label,
            "title": self.title,
            "body": self.body,
            "char_count": self.char_count,
            "meta": self.meta,
        }


async def repurpose_content(
    source_text: str,
    source_title: str,
    channels: list[str],
    *,
    brand_voice_context: str = "",
    provider: str | None = None,
) -> list[RepurposedVariant]:
    """Transform source content into channel-native variants via LLM."""
    valid_channels = [c for c in channels if c in CHANNEL_CONSTRAINTS]
    if not valid_channels:
        return []

    channel_specs = "\n\n".join(
        f"Channel: {CHANNEL_CONSTRAINTS[c]['label']} (key={c})\n"
        f"Max chars: {CHANNEL_CONSTRAINTS[c]['max_chars']}\n"
        f"Format: {CHANNEL_CONSTRAINTS[c]['format']}\n"
        f"Tone: {CHANNEL_CONSTRAINTS[c]['tone']}"
        for c in valid_channels
    )

    user_msg = (
        f"SOURCE TITLE: {source_title}\n\n"
        f"SOURCE CONTENT:\n{source_text[:8000]}\n\n"
        f"TARGET CHANNELS:\n{channel_specs}"
    )
    if brand_voice_context:
        user_msg += f"\n\n{brand_voice_context}"

    system = REPURPOSE_SYSTEM
    try:
        raw = await complete(
            messages=[{"role": "user", "content": user_msg}],
            system=system,
            provider=provider,
        )
        parsed = json.loads(_extract_json(raw))
        variants_data = parsed.get("variants") or []
    except Exception as exc:
        logger.warning("Repurpose LLM call failed: %s", exc)
        return []

    results: list[RepurposedVariant] = []
    for v in variants_data:
        ch = v.get("channel", "")
        if ch not in CHANNEL_CONSTRAINTS:
            continue
        body = v.get("body") or ""
        results.append(RepurposedVariant(
            channel=ch,
            label=CHANNEL_CONSTRAINTS[ch]["label"],
            title=v.get("title") or source_title,
            body=body,
            char_count=len(body),
            meta=v.get("meta") or {},
        ))

    return results
