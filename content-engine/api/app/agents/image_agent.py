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


# --- Multi-slide assets (carousel / PDF document) -------------------------------

# Document/PDF slides read best in portrait; carousels are square.
def slide_size(fmt: str, platform: str | None) -> str:
    if fmt == "pdf":
        return "1024x1536"
    return "1024x1024"


def _slide_roles(count: int) -> list[str]:
    if count <= 1:
        return ["the single hero slide"]
    roles = ["the COVER slide: big bold title + subtle subtitle"]
    for i in range(1, count - 1):
        roles.append(f"key point #{i}: one idea, a short headline and a tight supporting line")
    roles.append("the final CTA slide: a clear call-to-action and the brand mark")
    return roles[:count]


async def create_slide_deck(
    *,
    topic: str,
    headline: str | None = None,
    platform: str | None = None,
    fmt: str = "carousel",
    slides: int = 3,
    style: str = "modern_gradient",
    brand: dict | None = None,
    extra: str | None = None,
    provider: str | None = None,
) -> list[tuple[bytes, str, str]]:
    """Generate a cohesive multi-slide deck. Returns a list of (png, provider, prompt).

    Best-effort per slide: a failed slide is skipped so the deck still ships.
    """
    slides = max(1, min(slides, 5))
    size = slide_size(fmt, platform)
    roles = _slide_roles(slides)
    series = (
        f"This is part of a cohesive {slides}-slide "
        f"{'document' if fmt == 'pdf' else 'carousel'} series — keep a consistent layout, "
        f"color system and typography across all slides."
    )
    out: list[tuple[bytes, str, str]] = []
    for idx, role in enumerate(roles, start=1):
        slide_headline = headline if idx == 1 else None
        prompt = build_image_prompt(
            topic=topic,
            headline=slide_headline,
            platform=platform,
            style=style,
            brand=brand,
            extra=f"{series} This is slide {idx} of {slides}: {role}. "
            + (extra or ""),
        )
        try:
            png, used = await generate_image(prompt, size=size, provider=provider)
            out.append((png, used, prompt))
        except Exception:  # noqa: BLE001 — skip failed slide, keep the rest.
            continue
    return out
