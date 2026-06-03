"""Image prompt agent — turns a content brief + brand into a Canva/Gamma-style
social graphic prompt, then generates the image."""
from __future__ import annotations

from app.agents.logo_overlay import composite_logo, crop_to_banner
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

# Platform-native aspect ratios, mapped to the sizes gpt-image supports
# (1024x1024 square, 1536x1024 landscape, 1024x1536 portrait).
PLATFORM_SIZE: dict[str, str] = {
    "instagram": "1024x1024",   # square feed
    "facebook": "1536x1024",    # landscape link/feed
    "linkedin": "1536x1024",    # landscape post (~1.91:1)
    "x": "1536x1024",           # 16:9-ish
    "twitter": "1536x1024",
    "youtube": "1536x1024",     # 16:9 thumbnail
    "blog": "1536x1024",        # wide hero
    "medium": "1536x1024",
    "newsletter": "1536x1024",  # generated wide, then cropped to a 2:1 email banner
    "threads": "1024x1024",
    "quora": "1024x1024",
    "reddit": "1024x1024",
    "pinterest": "1024x1536",   # tall pin
    "tiktok": "1024x1536",      # vertical
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
    """Returns (png_bytes, provider_used, final_prompt).

    For newsletters the graphic is generated wide and cropped to a 2:1 email
    banner. The brand logo (if uploaded) is composited on top so the real mark
    always appears on the finished graphic, with a contrasting backing chip.
    """
    is_newsletter = (platform or "").lower() == "newsletter"
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

    # Crop the newsletter graphic to a wide email banner BEFORE placing the logo,
    # so the logo lands inside the visible banner area.
    if is_newsletter:
        png = crop_to_banner(png, ratio=2.0)

    logo_b64 = (brand or {}).get("logo_b64")
    if logo_b64:
        png = composite_logo(png, logo_b64=logo_b64, corner="bottom-right")

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


def _slide_text_directive(slide: dict, idx: int, total: int) -> str:
    """Turn a structured slide dict into an explicit on-image text instruction so the
    rendered graphic carries the REAL slide copy (not a generic placeholder)."""
    kind = (slide.get("kind") or "point").lower()
    heading = (slide.get("heading") or "").strip()
    body = (slide.get("body") or "").strip()
    role = {
        "cover": "the COVER slide",
        "cta": "the final CALL-TO-ACTION slide",
    }.get(kind, f"content slide {idx} of {total}")
    parts = [f"This is {role} in a cohesive {total}-slide series."]
    if heading:
        parts.append(
            f'Render this exact headline as large, perfectly-spelled on-image text: "{heading}".'
        )
    if body:
        parts.append(
            f'Render this supporting copy as smaller, clean, perfectly-spelled text: "{body}".'
        )
    parts.append(
        "Lay out the text with strong visual hierarchy; the text must be legible, "
        "correctly spelled and the visual focus of the slide."
    )
    return " ".join(parts)


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
    slide_specs: list[dict] | None = None,
) -> list[tuple[bytes, str, str]]:
    """Generate a cohesive multi-slide deck. Returns a list of (png, provider, prompt).

    When ``slide_specs`` (a list of ``{heading, body, kind}`` dicts) is provided, each
    slide is rendered with its REAL copy on-image so the deck matches the written
    content. Otherwise it falls back to generic role-based prompts.

    Best-effort per slide: a failed slide is skipped so the deck still ships.
    """
    if slide_specs:
        specs = slide_specs[:10]
    else:
        slides = max(1, min(slides, 8))
        specs = None
        roles = _slide_roles(slides)

    total = len(specs) if specs is not None else slides
    size = slide_size(fmt, platform)
    series = (
        f"This is part of a cohesive {total}-slide "
        f"{'document' if fmt == 'pdf' else 'carousel'} series — keep a consistent layout, "
        f"color system and typography across all slides."
    )
    out: list[tuple[bytes, str, str]] = []
    logo_b64 = (brand or {}).get("logo_b64")
    for idx in range(1, total + 1):
        if specs is not None:
            spec = specs[idx - 1]
            directive = _slide_text_directive(spec, idx, total)
            prompt = build_image_prompt(
                topic=topic,
                headline=None,
                platform=platform,
                style=style,
                brand=brand,
                extra=f"{series} {directive} " + (extra or ""),
            )
        else:
            role = roles[idx - 1]
            slide_headline = headline if idx == 1 else None
            prompt = build_image_prompt(
                topic=topic,
                headline=slide_headline,
                platform=platform,
                style=style,
                brand=brand,
                extra=f"{series} This is slide {idx} of {total}: {role}. " + (extra or ""),
            )
        try:
            png, used = await generate_image(prompt, size=size, provider=provider)
            if logo_b64:
                png = composite_logo(png, logo_b64=logo_b64, corner="bottom-right")
            out.append((png, used, prompt))
        except Exception:  # noqa: BLE001 — skip failed slide, keep the rest.
            continue
    return out
