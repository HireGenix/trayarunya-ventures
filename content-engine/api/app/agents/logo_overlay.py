"""Brand-logo compositing for generated graphics.

Text-to-image models can't ingest the user's actual logo, so we overlay the real
uploaded logo onto the generated PNG with Pillow. The logo is analysed first:

  * a **light / white** logo gets a dark contrasting chip behind it,
  * a **dark / colourful** logo gets a light chip,

so the mark is always legible regardless of what the AI rendered underneath.

All helpers are best-effort and pure-bytes in / bytes out; any failure returns
the original image unchanged so generation never hard-fails on logo issues.
"""
from __future__ import annotations

import base64
import io
from dataclasses import dataclass

from PIL import Image, ImageDraw


@dataclass
class LogoProfile:
    is_light: bool          # True -> logo art is predominantly light/white
    has_alpha: bool         # True -> logo has real transparency
    avg_luma: float         # 0..1 average luminance of visible pixels


def _decode_logo(logo_b64: str | None, logo_bytes: bytes | None) -> Image.Image | None:
    raw: bytes | None = logo_bytes
    if raw is None and logo_b64:
        try:
            raw = base64.b64decode(logo_b64)
        except Exception:
            return None
    if not raw:
        return None
    try:
        return Image.open(io.BytesIO(raw)).convert("RGBA")
    except Exception:
        return None


def analyse_logo(logo: Image.Image) -> LogoProfile:
    """Inspect a logo's visible pixels to decide light vs. dark and transparency."""
    small = logo.copy()
    small.thumbnail((96, 96))
    px = small.load()
    w, h = small.size
    total_lum = 0.0
    visible = 0
    alpha_seen = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                alpha_seen = True
                continue
            if a < 250:
                alpha_seen = True
            # Rec. 601 luma
            total_lum += (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            visible += 1
    avg = (total_lum / visible) if visible else 0.5
    return LogoProfile(is_light=avg >= 0.6, has_alpha=alpha_seen, avg_luma=avg)


def composite_logo(
    image_png: bytes,
    *,
    logo_b64: str | None = None,
    logo_bytes: bytes | None = None,
    margin_ratio: float = 0.04,
    width_ratio: float = 0.20,
    corner: str = "bottom-right",
) -> bytes:
    """Overlay the brand logo onto ``image_png`` and return new PNG bytes.

    The logo is scaled to ``width_ratio`` of the base width and placed in the given
    corner over a contrasting rounded chip so it stays visible on any background.
    Returns the original bytes unchanged if the logo can't be read.
    """
    logo = _decode_logo(logo_b64, logo_bytes)
    if logo is None:
        return image_png

    try:
        base = Image.open(io.BytesIO(image_png)).convert("RGBA")
    except Exception:
        return image_png

    bw, bh = base.size
    profile = analyse_logo(logo)

    # Scale the logo to a sensible fraction of the canvas width.
    target_w = max(48, int(bw * width_ratio))
    scale = target_w / logo.width
    target_h = max(1, int(logo.height * scale))
    logo_resized = logo.resize((target_w, target_h), Image.LANCZOS)

    # Contrasting chip: dark behind light logos, light behind dark logos.
    pad = max(10, int(target_w * 0.14))
    chip_w = target_w + pad * 2
    chip_h = target_h + pad * 2
    if profile.is_light:
        chip_fill = (14, 23, 38, 235)        # deep navy
    else:
        chip_fill = (255, 255, 255, 235)     # white

    chip = Image.new("RGBA", (chip_w, chip_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(chip)
    radius = max(12, int(chip_h * 0.28))
    draw.rounded_rectangle([0, 0, chip_w - 1, chip_h - 1], radius=radius, fill=chip_fill)
    chip.paste(logo_resized, (pad, pad), logo_resized)

    margin = max(12, int(bw * margin_ratio))
    if corner == "bottom-left":
        pos = (margin, bh - chip_h - margin)
    elif corner == "top-right":
        pos = (bw - chip_w - margin, margin)
    elif corner == "top-left":
        pos = (margin, margin)
    else:  # bottom-right (default)
        pos = (bw - chip_w - margin, bh - chip_h - margin)

    base.alpha_composite(chip, dest=pos)

    out = io.BytesIO()
    base.convert("RGB").save(out, format="PNG", optimize=True)
    return out.getvalue()


def crop_to_banner(image_png: bytes, ratio: float = 2.0) -> bytes:
    """Center-crop an image to a wide banner aspect ratio (default 2:1 for emails)."""
    try:
        img = Image.open(io.BytesIO(image_png)).convert("RGB")
    except Exception:
        return image_png
    w, h = img.size
    target_h = int(w / ratio)
    if target_h >= h:
        return image_png
    top = (h - target_h) // 2
    cropped = img.crop((0, top, w, top + target_h))
    out = io.BytesIO()
    cropped.save(out, format="PNG", optimize=True)
    return out.getvalue()
