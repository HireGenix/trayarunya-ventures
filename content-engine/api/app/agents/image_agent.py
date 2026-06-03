"""Image prompt agent — turns a content brief + brand into a Canva/Gamma-style
social graphic prompt, then generates the image."""
from __future__ import annotations

from app.llm.image_adapters import generate_image

# Visual styles the user can pick in Content Studio.
STYLE_PRESETS: dict[str, str] = {
    "modern_gradient": (
        "modern gradient background, bold sans-serif typography, clean geometric shapes, "
        "soft shadows, premium SaaS marketing aesthetic, lots of negative space"
    ),
    "flat_vector": (
        "flat vector illustration, simple iconography, friendly rounded shapes, "
        "limited color palette, editorial infographic style"
    ),
    "3d_render": (
        "soft 3d render, glossy isometric objects, subtle studio lighting, "
        "modern tech brand visual, depth and dimension"
    ),
    "minimal_editorial": (
        "minimal editorial layout, generous white space, refined serif/sans pairing, "
        "single hero motif, premium magazine feel"
    ),
    "bold_typographic": (
        "bold typographic poster, oversized headline as the hero, high contrast, "
        "confident color blocking, punchy social-first composition"
    ),
    "photo_realistic": (
        "photorealistic lifestyle scene, natural lighting, shallow depth of field, "
        "authentic and aspirational, brand-aligned color grade"
    ),
}

PLATFORM_SIZE: dict[str, str] = {
    "instagram": "1024x1024",
    "facebook": "1024x1024",
    "linkedin": "1024x1024",
    "x": "1536x1024",
    "twitter": "1536x1024",
    "youtube": "1536x1024",
    "blog": "1536x1024",
    "newsletter": "1024x1024",
    "quora": "1024x1024",
    "reddit": "1024x1024",
    "medium": "1536x1024",
}


def build_image_prompt(
    *,
    topic: str,
    headline: str | None = None,
    platform: str | None = None,
    style: str = "modern_gradient",
    brand: dict | None = None,
    extra: str | None = None,
) -> str:
    parts: list[str] = []
    style_desc = STYLE_PRESETS.get(style, STYLE_PRESETS["modern_gradient"])
    parts.append(
        f"Design a professional, scroll-stopping social media graphic for "
        f"{'the ' + platform if platform else 'social media'}."
    )
    parts.append(f"Topic: {topic}.")
    if headline:
        parts.append(
            f'Feature this short headline as crisp, perfectly-spelled on-image text: "{headline}".'
        )
    parts.append(f"Visual style: {style_desc}.")

    if brand:
        colors = [c for c in (brand.get("primary_color"), brand.get("accent_color")) if c]
        if colors:
            parts.append(f"Use the brand color palette: {', '.join(colors)}.")
        voice = brand.get("voice")
        if isinstance(voice, dict) and voice.get("tone"):
            parts.append(f"Match a {voice['tone']} brand tone.")
        elif isinstance(voice, str) and voice:
            parts.append(f"Match this brand tone: {voice}.")
        if brand.get("value_prop"):
            parts.append(f"Reflect the value proposition: {brand['value_prop']}.")

    if extra:
        parts.append(extra)

    parts.append(
        "Composition must be balanced and platform-ready, with a clear focal point, "
        "high visual hierarchy, and absolutely no gibberish or misspelled text. "
        "Avoid stock-photo clichés and watermarks."
    )
    return " ".join(parts)


def size_for_platform(platform: str | None, override: str | None = None) -> str:
    if override:
        return override
    if platform:
        return PLATFORM_SIZE.get(platform.lower(), "1024x1024")
    return "1024x1024"


async def create_social_image(
    *,
    topic: str,
    headline: str | None = None,
    platform: str | None = None,
    style: str = "modern_gradient",
    brand: dict | None = None,
    extra: str | None = None,
    size: str | None = None,
    provider: str | None = None,
) -> tuple[bytes, str, str]:
    """Returns (png_bytes, provider_used, final_prompt)."""
    prompt = build_image_prompt(
        topic=topic,
        headline=headline,
        platform=platform,
        style=style,
        brand=brand,
        extra=extra,
    )
    final_size = size_for_platform(platform, size)
    png, used = await generate_image(prompt, size=final_size, provider=provider)
    return png, used, prompt
