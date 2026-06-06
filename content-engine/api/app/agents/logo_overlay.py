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

from PIL import Image, ImageDraw, ImageFilter, ImageStat


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


def _region_busyness(base_l: Image.Image, box: tuple[int, int, int, int]) -> float:
    """Estimate how 'busy' a region is (text/detail = high, empty/flat = low).

    Combines luminance **standard deviation** (captures bold-text/graphic contrast
    — a big headline on a light card has very high variance even though its flat
    letter strokes have few edges) with **edge energy** (captures fine detail like
    icon clusters). Lower means a calmer, emptier area that is safe to drop a logo
    onto without overlapping content. ``base_l`` must already be grayscale ("L").
    """
    x0, y0, x1, y1 = box
    x0 = max(0, x0); y0 = max(0, y0)
    x1 = min(base_l.width, x1); y1 = min(base_l.height, y1)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return 1e9
    try:
        region = base_l.crop((x0, y0, x1, y1))
        region.thumbnail((128, 128))
        std = ImageStat.Stat(region).stddev[0]
        edges = region.filter(ImageFilter.FIND_EDGES)
        hist = edges.histogram()
        total = sum(hist) or 1
        energy = sum(i * c for i, c in enumerate(hist)) / total
        return float(std) + float(energy) * 0.5
    except Exception:
        return 1e9


def _best_corner(
    base: Image.Image,
    chip_w: int,
    chip_h: int,
    margin: int,
) -> tuple[str, tuple[int, int], float]:
    """Score the four corners and return the calmest one and its busyness.

    Returns ``(corner_name, (x, y), score)`` where a *low* score means the corner
    is empty enough to safely hold the logo. Callers can compare the score against
    a threshold to decide between a corner overlay and a dedicated brand bar.
    """
    bw, bh = base.size
    base_l = base.convert("L")
    spots = {
        "top-left": (margin, margin),
        "top-right": (bw - chip_w - margin, margin),
        "bottom-left": (margin, bh - chip_h - margin),
        "bottom-right": (bw - chip_w - margin, bh - chip_h - margin),
    }
    scores: dict[str, float] = {}
    for name, (x, y) in spots.items():
        scores[name] = _region_busyness(base_l, (x, y, x + chip_w, y + chip_h))
    # Mild aesthetic preference for the top corners when several are similar.
    scores["top-left"] *= 0.9
    scores["top-right"] *= 0.92
    best = min(scores, key=scores.get)
    return best, spots[best], scores[best]


# Above this corner-busyness score the image is considered too packed for a clean
# overlay, so the logo goes into its own added brand bar instead (no overlap).
_CORNER_BUSY_THRESHOLD = 30.0


def _add_brand_bar(
    base: Image.Image,
    logo: Image.Image,
    is_light_logo: bool,
    margin: int,
) -> Image.Image:
    """Extend the canvas with a clean brand bar at the top and place the logo in it.

    Used when every corner of the artwork is occupied (dense infographics). The
    generated artwork is never covered — a new solid strip is added above it and
    the real logo is left-aligned inside, so the mark is always crisp, on-brand,
    and can never overlap any text or graphic. Returns a new RGBA image.
    """
    bw, bh = base.size
    bar_h = max(72, int(bh * 0.11))
    bar_fill = (14, 23, 38, 255) if is_light_logo else (255, 255, 255, 255)
    accent = (255, 122, 60, 255)  # brand orange divider under the bar

    canvas = Image.new("RGBA", (bw, bh + bar_h), bar_fill)
    canvas.paste(base, (0, bar_h), base)

    # Thin accent divider between the bar and the artwork.
    div = Image.new("RGBA", (bw, max(2, bar_h // 28)), accent)
    canvas.alpha_composite(div, dest=(0, bar_h - div.height))

    # Scale the logo to sit comfortably inside the bar, left-aligned & centred.
    target_h = max(24, int(bar_h * 0.56))
    scale = target_h / logo.height
    target_w = max(1, int(logo.width * scale))
    logo_resized = logo.resize((target_w, target_h), Image.LANCZOS)
    ly = (bar_h - target_h) // 2
    canvas.alpha_composite(logo_resized, dest=(margin, ly))
    return canvas


def composite_logo(
    image_png: bytes,
    *,
    logo_b64: str | None = None,
    logo_bytes: bytes | None = None,
    margin_ratio: float = 0.04,
    width_ratio: float = 0.16,
    corner: str = "auto",
) -> bytes:
    """Overlay the brand logo onto ``image_png`` and return new PNG bytes.

    The logo is scaled to ``width_ratio`` of the base width and placed over a
    contrasting opaque rounded chip so it stays crisp on any background.

    ``corner`` may be ``top-left/top-right/bottom-left/bottom-right`` to force a
    fixed position, or ``auto`` (default) for smart placement: the four corners are
    scored for busyness and the calmest is used — but if *every* corner is occupied
    (dense infographics where a logo would overlap the headline), the logo is
    instead placed in a clean brand bar added above the artwork, so it can never
    overlap any text. Returns the original bytes unchanged if the logo can't be read.
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

    # Contrasting chip: dark behind light logos, light behind dark logos. Fully
    # opaque so the mark always reads as a clean solid badge (no text ghosting
    # through), even if the calmest available spot is still near some content.
    pad = max(10, int(target_w * 0.14))
    chip_w = target_w + pad * 2
    chip_h = target_h + pad * 2
    if profile.is_light:
        chip_fill = (14, 23, 38, 255)        # deep navy
    else:
        chip_fill = (255, 255, 255, 255)     # white

    chip = Image.new("RGBA", (chip_w, chip_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(chip)
    radius = max(12, int(chip_h * 0.28))
    draw.rounded_rectangle([0, 0, chip_w - 1, chip_h - 1], radius=radius, fill=chip_fill)
    chip.paste(logo_resized, (pad, pad), logo_resized)

    margin = max(12, int(bw * margin_ratio))

    if corner == "auto" or not corner:
        # Smart placement: calmest corner, or a clean brand bar if all are busy.
        _name, pos, score = _best_corner(base, chip_w, chip_h, margin)
        if score > _CORNER_BUSY_THRESHOLD:
            canvas = _add_brand_bar(base, logo, profile.is_light, margin)
            out = io.BytesIO()
            canvas.convert("RGB").save(out, format="PNG", optimize=True)
            return out.getvalue()
    elif corner == "bottom-left":
        pos = (margin, bh - chip_h - margin)
    elif corner == "top-right":
        pos = (bw - chip_w - margin, margin)
    elif corner == "top-left":
        pos = (margin, margin)
    else:  # bottom-right
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
