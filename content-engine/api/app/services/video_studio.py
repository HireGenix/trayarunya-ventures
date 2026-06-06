"""AI video assembly: script -> b-roll -> voiceover -> captions -> MP4.

Orchestrates the whole short-form video pipeline and renders the final file
with ffmpeg:

1. ``video_agent.build_video_plan`` -> hook + voiceover script + scenes.
2. ``tts_adapters.synthesize_voiceover`` -> MP3 narration + exact transcript (gpt-audio).
3. ``transcript`` text is distributed across the measured narration duration for captions.
4. ``pexels.search_clips`` / ``download_clip`` -> one stock clip per scene.
5. ffmpeg -> per-scene normalize (scale/crop to format), concat, burn captions,
   mux narration -> H.264/AAC MP4.

Stored locally under ``settings.media_root/videos`` (or Azure Blob when
configured) and served via ``/api/v1/videos/{id}/raw``.

Requires the system ``ffmpeg``/``ffprobe`` binaries. When a dependency (ffmpeg,
Pexels key, TTS) is missing the caller gets a clear error instead of a broken
file; a scene whose Pexels query returns nothing falls back to a solid
background so one bad query never fails the whole render.
"""
from __future__ import annotations

import asyncio
import base64
import io
import os
import shutil
import subprocess
import tempfile
import uuid
from dataclasses import dataclass, field

from app.agents.video_agent import (
    build_video_plan,
    dims_for,
    normalize_quality,
    normalize_visuals,
)
from app.config import settings
from app.llm.image_adapters import generate_image, size_for_dims
from app.llm.tts_adapters import normalize_voice, synthesize_voiceover
from app.services import pexels


# --------------------------------------------------------------------------- #
# Quality (resolution + encode) and creative "Canva-style" template config.
# --------------------------------------------------------------------------- #

def _encode_for(quality: str | None) -> tuple[list[str], list[str]]:
    """Return ``(video_args, full_mux_args)`` tuned for the output quality."""
    q = normalize_quality(quality)
    if q == "720p":
        venc = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p"]
    elif q == "4k":
        venc = [
            "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
            "-maxrate", "45M", "-bufsize", "90M",
        ]
    else:  # 1080p
        venc = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p"]
    base = [*venc, "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart"]
    return venc, base


def _hex_to_rgb(value: str | None, default: tuple[int, int, int]) -> tuple[int, int, int]:
    try:
        s = (value or "").strip().lstrip("#")
        if len(s) == 3:
            s = "".join(c * 2 for c in s)
        if len(s) != 6:
            return default
        return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))
    except Exception:  # noqa: BLE001
        return default


@dataclass
class StyleSpec:
    name: str
    motion: bool       # Ken Burns pan on b-roll
    transitions: bool  # crossfade between scenes
    intro: bool        # opening title card
    outro: bool        # closing CTA card
    caption: str       # 'pill' | 'plain'
    scrim: bool        # legibility gradient overlays
    progress: bool     # brand progress bar
    watermark: bool    # logo / handle watermark


_STYLES: dict[str, StyleSpec] = {
    "clean": StyleSpec("clean", motion=True, transitions=False, intro=False,
                       outro=False, caption="plain", scrim=True, progress=False, watermark=True),
    "bold": StyleSpec("bold", motion=True, transitions=True, intro=True,
                      outro=True, caption="pill", scrim=True, progress=True, watermark=True),
    "dynamic": StyleSpec("dynamic", motion=True, transitions=True, intro=True,
                         outro=True, caption="pill", scrim=True, progress=True, watermark=True),
}


def normalize_style(value: str | None) -> StyleSpec:
    return _STYLES.get((value or "dynamic").lower().strip(), _STYLES["dynamic"])


@dataclass
class BrandKit:
    primary: tuple[int, int, int]
    accent: tuple[int, int, int]
    logo: object | None  # PIL RGBA image or None
    tagline: str | None


def _build_brandkit(brand: dict | None) -> BrandKit:
    b = brand or {}
    primary = _hex_to_rgb(b.get("primary_color"), (20, 124, 124))
    accent = _hex_to_rgb(b.get("accent_color"), (255, 175, 6))
    logo = None
    b64 = b.get("logo_b64")
    if b64:
        try:
            from PIL import Image

            raw = b64.split(",", 1)[1] if "," in b64 else b64
            logo = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGBA")
        except Exception:  # noqa: BLE001
            logo = None
    tagline = (b.get("value_prop") or b.get("mission") or None)
    if tagline:
        tagline = str(tagline).strip()[:60] or None
    return BrandKit(primary=primary, accent=accent, logo=logo, tagline=tagline)


def _rgb_hex(c: tuple[int, int, int]) -> str:
    return f"0x{c[0]:02x}{c[1]:02x}{c[2]:02x}"


def ffmpeg_available() -> bool:
    return bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


_subtitles_filter: bool | None = None


def subtitles_filter_available() -> bool:
    """True if this ffmpeg build has the libass-backed ``subtitles`` filter.

    Minimal ffmpeg builds ship without libass, so caption burning must degrade
    gracefully (mux narration without burned-in text) instead of hard-failing.
    Cached after the first probe.
    """
    global _subtitles_filter
    if _subtitles_filter is None:
        try:
            out = subprocess.run(
                ["ffmpeg", "-hide_banner", "-filters"],
                capture_output=True, text=True, timeout=10,
            ).stdout
            _subtitles_filter = any(
                line.split()[1] == "subtitles"
                for line in out.splitlines()
                if len(line.split()) > 1
            )
        except Exception:  # noqa: BLE001
            _subtitles_filter = False
    return _subtitles_filter


async def _run(*args: str) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    return proc.returncode or 0, (out or b"").decode("utf-8", "replace")


async def _probe_duration(path: str) -> float:
    code, out = await _run(
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    )
    try:
        return float(out.strip()) if code == 0 else 0.0
    except ValueError:
        return 0.0


@dataclass
class RenderResult:
    path: str
    width: int
    height: int
    duration_s: int
    captions_srt: str
    plan: dict
    voice: str
    provider: str = "pexels+gpt-4o-mini-tts"
    meta: dict = field(default_factory=dict)


def _srt_time(t: float) -> str:
    if t < 0:
        t = 0.0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        s += 1
        ms = 0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _captions_from_text(text: str, total: float, *, size: int = 4) -> list[tuple[float, float, str]]:
    """Distribute exact narration ``text`` evenly across ``total`` seconds.

    The gpt-audio voiceover returns the precise spoken transcript, so chunking
    it into ~``size``-word cues weighted by word count yields well-synced
    captions without any separate speech-to-text step.
    """
    words = [w for w in str(text or "").split() if w]
    if not words or total <= 0:
        return []
    chunks: list[list[str]] = [words[i : i + size] for i in range(0, len(words), size)]
    total_words = len(words)
    out: list[tuple[float, float, str]] = []
    t = 0.0
    for ch in chunks:
        dur = total * (len(ch) / total_words)
        out.append((t, min(t + dur, total), " ".join(ch)))
        t += dur
    return out


def _captions_from_scenes(scenes: list[dict], total: float) -> list[tuple[float, float, str]]:
    planned = sum(float(s.get("seconds", 4)) for s in scenes) or 1.0
    scale = total / planned
    out: list[tuple[float, float, str]] = []
    t = 0.0
    for s in scenes:
        dur = float(s.get("seconds", 4)) * scale
        text = str(s.get("on_screen_text") or s.get("vo_line") or "").strip()
        if text:
            out.append((t, t + dur, text))
        t += dur
    return out


def _build_srt(cues: list[tuple[float, float, str]]) -> str:
    lines = []
    for i, (start, end, text) in enumerate(cues, 1):
        if end <= start:
            end = start + 1.2
        lines.append(str(i))
        lines.append(f"{_srt_time(start)} --> {_srt_time(end)}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _load_font(size: int):
    from PIL import ImageFont

    for path in _FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:  # noqa: BLE001
                continue
    return ImageFont.load_default()


def _wrap_text(draw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def _render_caption_pngs(
    tmp: str, cues: list[tuple[float, float, str]], w: int, h: int
) -> list[tuple[str, float, float]]:
    """Render each caption cue to a full-frame transparent PNG (bottom-centered).

    Returns ``(png_path, start, end)`` tuples. Uses Pillow for text rendering so
    burned-in captions work on any ffmpeg build (no libass/freetype required) —
    the images are later composited with the universal ``overlay`` filter.
    """
    from PIL import Image, ImageDraw

    font_size = max(22, round(w * 0.046))
    line_h = round(font_size * 1.28)
    pad_x = round(w * 0.06)
    max_w = w - 2 * pad_x
    margin_bottom = round(h * 0.12)
    stroke = max(2, round(font_size * 0.09))

    out: list[tuple[str, float, float]] = []
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    font = _load_font(font_size)

    for i, (start, end, text) in enumerate(cues):
        text = (text or "").strip()
        if not text:
            continue
        lines = _wrap_text(probe, text.upper(), font, max_w)
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        block_h = line_h * len(lines)
        y = h - margin_bottom - block_h
        for line in lines:
            tw = draw.textlength(line, font=font)
            x = (w - tw) / 2
            draw.text(
                (x, y), line, font=font, fill=(255, 255, 255, 255),
                stroke_width=stroke, stroke_fill=(0, 0, 0, 235),
            )
            y += line_h
        path = os.path.join(tmp, f"cap_{i:03d}.png")
        img.save(path)
        out.append((path, float(start), float(end)))
    return out


# --------------------------------------------------------------------------- #
# Branded ("Canva-style") graphics: caption cards, title cards, static overlay.
# --------------------------------------------------------------------------- #

def _vertical_gradient(w: int, h: int, top: tuple, bottom: tuple):
    """A vertical RGBA gradient image from ``top`` to ``bottom`` colour."""
    from PIL import Image

    grad = Image.new("RGBA", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        grad.putpixel(
            (0, y),
            (
                int(top[0] + (bottom[0] - top[0]) * t),
                int(top[1] + (bottom[1] - top[1]) * t),
                int(top[2] + (bottom[2] - top[2]) * t),
                255,
            ),
        )
    return grad.resize((w, h))


def _shade(c: tuple[int, int, int], factor: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, int(v * factor))) for v in c)  # type: ignore[return-value]


def _readable_text(bg: tuple[int, int, int]) -> tuple[int, int, int]:
    """Black or white text depending on background luminance."""
    lum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]
    return (15, 17, 22) if lum > 150 else (255, 255, 255)


def _render_caption_cards(
    tmp: str, cues: list[tuple[float, float, str]], w: int, h: int, kit: BrandKit
) -> list[tuple[str, float, float]]:
    """Branded caption: bold uppercase text on a rounded brand-accent pill."""
    from PIL import Image, ImageDraw

    font_size = max(24, round(w * 0.05))
    line_h = round(font_size * 1.22)
    pad_x = round(w * 0.08)
    max_w = w - 2 * pad_x
    margin_bottom = round(h * 0.16)
    text_col = _readable_text(kit.accent)

    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    font = _load_font(font_size)
    out: list[tuple[str, float, float]] = []

    for i, (start, end, text) in enumerate(cues):
        text = (text or "").strip()
        if not text:
            continue
        lines = _wrap_text(probe, text.upper(), font, max_w)
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        block_h = line_h * len(lines)
        pill_pad_y = round(font_size * 0.42)
        pill_pad_x = round(font_size * 0.6)
        widest = max((draw.textlength(ln, font=font) for ln in lines), default=0)
        pill_w = min(w - 2 * round(w * 0.04), int(widest) + 2 * pill_pad_x)
        pill_h = block_h + 2 * pill_pad_y
        pill_x = (w - pill_w) // 2
        pill_y = h - margin_bottom - pill_h
        radius = round(pill_h * 0.32)
        # accent pill + a darker shadow for depth
        draw.rounded_rectangle(
            [pill_x + 4, pill_y + 6, pill_x + pill_w + 4, pill_y + pill_h + 6],
            radius=radius, fill=(0, 0, 0, 80),
        )
        draw.rounded_rectangle(
            [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
            radius=radius, fill=(*kit.accent, 245),
        )
        y = pill_y + pill_pad_y
        for line in lines:
            tw = draw.textlength(line, font=font)
            draw.text(((w - tw) / 2, y), line, font=font, fill=(*text_col, 255))
            y += line_h
        path = os.path.join(tmp, f"cap_{i:03d}.png")
        img.save(path)
        out.append((path, float(start), float(end)))
    return out


def _render_static_overlay(tmp: str, w: int, h: int, kit: BrandKit, style: StyleSpec) -> str | None:
    """Full-frame RGBA overlay: legibility scrims + logo/tagline watermark."""
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

    if style.scrim:
        # Bottom scrim (captions) + lighter top scrim (watermark legibility).
        # Built as 1px-wide alpha columns then stretched — fast even at 4K.
        bh = round(h * 0.34)
        bottom = Image.new("RGBA", (1, bh), (0, 0, 0, 0))
        bd = bottom.load()
        for y in range(bh):
            bd[0, y] = (8, 10, 14, int(150 * (y / max(1, bh - 1)) ** 1.4))
        img.alpha_composite(bottom.resize((w, bh)), (0, h - bh))
        th = round(h * 0.18)
        top = Image.new("RGBA", (1, th), (0, 0, 0, 0))
        td = top.load()
        for y in range(th):
            td[0, y] = (8, 10, 14, int(110 * (1 - y / max(1, th - 1)) ** 1.4))
        img.alpha_composite(top.resize((w, th)), (0, 0))

    draw = ImageDraw.Draw(img)
    pad = round(w * 0.045)

    if style.watermark:
        placed = False
        if kit.logo is not None:
            try:
                lw = round(w * 0.16)
                ratio = kit.logo.height / max(1, kit.logo.width)
                logo = kit.logo.resize((lw, max(1, round(lw * ratio))))
                img.alpha_composite(logo, (pad, pad))
                placed = True
            except Exception:  # noqa: BLE001
                placed = False
        if not placed and kit.tagline:
            f = _load_font(max(18, round(w * 0.03)))
            draw.text((pad, pad), kit.tagline, font=f, fill=(255, 255, 255, 230),
                      stroke_width=2, stroke_fill=(0, 0, 0, 160))

    path = os.path.join(tmp, "overlay.png")
    img.save(path)
    return path


def _render_title_card(
    tmp: str, name: str, headline: str, sub: str | None, w: int, h: int, kit: BrandKit
) -> str:
    """Opaque brand-coloured intro/outro card with big headline + accent bar."""
    from PIL import Image, ImageDraw

    bg = _vertical_gradient(w, h, _shade(kit.primary, 1.0), _shade(kit.primary, 0.55))
    img = bg.convert("RGBA")
    draw = ImageDraw.Draw(img)
    text_col = _readable_text(kit.primary)
    pad_x = round(w * 0.1)
    max_w = w - 2 * pad_x

    head_font = _load_font(max(34, round(w * 0.085)))
    lines = _wrap_text(draw, headline.strip().upper(), head_font, max_w)[:5]
    line_h = round(head_font.size * 1.16)
    block_h = line_h * len(lines)

    # Accent bar above the headline (motion-graphic feel).
    bar_w = round(w * 0.16)
    bar_y = (h - block_h) // 2 - round(h * 0.06)
    draw.rounded_rectangle(
        [pad_x, bar_y, pad_x + bar_w, bar_y + round(h * 0.012)],
        radius=round(h * 0.006), fill=(*kit.accent, 255),
    )

    y = (h - block_h) // 2
    for line in lines:
        tw = draw.textlength(line, font=head_font)
        draw.text(((w - tw) / 2, y), line, font=head_font, fill=(*text_col, 255))
        y += line_h

    if sub:
        sub_font = _load_font(max(18, round(w * 0.032)))
        sublines = _wrap_text(draw, sub.strip(), sub_font, max_w)[:2]
        sy = y + round(h * 0.02)
        for line in sublines:
            tw = draw.textlength(line, font=sub_font)
            draw.text(((w - tw) / 2, sy), line, font=sub_font, fill=(*kit.accent, 255))
            sy += round(sub_font.size * 1.25)

    if kit.logo is not None:
        try:
            lw = round(w * 0.2)
            ratio = kit.logo.height / max(1, kit.logo.width)
            logo = kit.logo.resize((lw, max(1, round(lw * ratio))))
            img.alpha_composite(logo, ((w - lw) // 2, round(h * 0.1)))
        except Exception:  # noqa: BLE001
            pass

    path = os.path.join(tmp, f"card_{name}.png")
    img.convert("RGB").save(path)
    return path


async def _card_segment(
    *, tmp: str, name: str, png: str, seconds: float, w: int, h: int, venc: list[str]
) -> str | None:
    """Animate a still title card into a short silent segment (gentle zoom)."""
    seg = os.path.join(tmp, f"card_{name}.mp4")
    frames = max(2, int(seconds * 30))
    vf = (
        f"scale={w}:{h},zoompan=z='min(zoom+0.0010,1.08)':d={frames}:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=30,format=yuv420p"
    )
    code, _ = await _run(
        "ffmpeg", "-y", "-loop", "1", "-i", png, "-t", f"{seconds:.2f}",
        "-vf", vf, "-an", *venc, seg,
    )
    if code == 0 and os.path.exists(seg):
        return seg
    # Fallback: static (no zoom).
    code, _ = await _run(
        "ffmpeg", "-y", "-loop", "1", "-i", png, "-t", f"{seconds:.2f}",
        "-vf", f"scale={w}:{h},fps=30,format=yuv420p", "-an", *venc, seg,
    )
    return seg if code == 0 and os.path.exists(seg) else None


async def _scene_segment(
    *, tmp: str, idx: int, query: str, seconds: float, w: int, h: int,
    orientation: str, motion: bool, venc: list[str], min_h: int, target_h: int,
) -> str:
    """Produce a normalized, silent WxH segment for one scene.

    When ``motion`` is on, a slow Ken Burns-style pan is applied (the clip is
    over-scaled and the crop window drifts over time) so b-roll never feels
    static. Falls back to a plain scale/crop, then a solid colour, on failure.
    """
    seg = os.path.join(tmp, f"seg_{idx:03d}.mp4")
    plain_vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},fps=30,format=yuv420p"
    )
    if motion:
        # Over-scale ~18% and pan the crop window; direction alternates per scene.
        ow, oh = int(w * 1.18), int(h * 1.18)
        mx = ow - w
        my = oh - h
        if idx % 3 == 0:        # left -> right
            xexpr, yexpr = f"({mx})*(t/{seconds:.2f})", f"{my // 2}"
        elif idx % 3 == 1:      # right -> left
            xexpr, yexpr = f"({mx})*(1-t/{seconds:.2f})", f"{my // 2}"
        else:                   # top -> bottom drift
            xexpr, yexpr = f"{mx // 2}", f"({my})*(t/{seconds:.2f})"
        motion_vf = (
            f"scale={ow}:{oh}:force_original_aspect_ratio=increase,crop={ow}:{oh},"
            f"crop={w}:{h}:x='{xexpr}':y='{yexpr}',fps=30,format=yuv420p"
        )
    else:
        motion_vf = plain_vf

    clip_path: str | None = None
    try:
        clips = await pexels.search_clips(
            query, orientation=orientation, min_h=min_h, target_h=target_h
        )
        for c in clips:
            data = await pexels.download_clip(c["url"])
            if data:
                clip_path = os.path.join(tmp, f"raw_{idx:03d}.mp4")
                with open(clip_path, "wb") as f:
                    f.write(data)
                break
    except Exception:  # noqa: BLE001 — degrade to a color background.
        clip_path = None

    if clip_path:
        for vf in (motion_vf, plain_vf) if motion else (plain_vf,):
            code, _ = await _run(
                "ffmpeg", "-y", "-stream_loop", "-1", "-i", clip_path,
                "-t", f"{seconds:.2f}", "-vf", vf, "-an", *venc, seg,
            )
            if code == 0 and os.path.exists(seg):
                return seg

    # Fallback solid background.
    await _run(
        "ffmpeg", "-y", "-f", "lavfi",
        "-i", f"color=c=0x101418:s={w}x{h}:d={seconds:.2f}:r=30",
        "-vf", "format=yuv420p", "-an", *venc, seg,
    )
    return seg


async def _image_scene_segment(
    *, tmp: str, idx: int, image_prompt: str, seconds: float, w: int, h: int,
    quality: str, venc: list[str],
    # stock fallback params (reuse _scene_segment when image gen is unavailable)
    broll_query: str, orientation: str, motion: bool, min_h: int, target_h: int,
) -> str:
    """Render one scene from an AI-generated still, animated with Ken Burns.

    Generates a PNG via the Azure/Microsoft image models, then drives a slow
    ffmpeg ``zoompan`` push/drift so the still feels alive. On any failure
    (image gen off or errored) it degrades to a Pexels stock segment, which in
    turn falls back to a solid background — so a scene never hard-fails.
    """
    img_quality = "high" if quality in ("1080p", "4k") else "medium"
    png_path: str | None = None
    try:
        size = size_for_dims(w, h)
        png_bytes, _provider = await generate_image(
            image_prompt, size=size, quality=img_quality
        )
        if png_bytes:
            png_path = os.path.join(tmp, f"img_{idx:03d}.png")
            with open(png_path, "wb") as f:
                f.write(png_bytes)
    except Exception:  # noqa: BLE001 — fall back to stock footage below.
        png_path = None

    if png_path and os.path.exists(png_path):
        seg = os.path.join(tmp, f"seg_{idx:03d}.mp4")
        frames = max(2, int(round(seconds * 30)))
        # Upscale ~2x first (the classic zoompan anti-jitter trick), then push
        # the zoom in slowly. Pan direction alternates per scene for variety.
        up_w, up_h = w * 2, h * 2
        if idx % 3 == 0:        # drift toward top-left while zooming in
            xexpr, yexpr = "0", "0"
        elif idx % 3 == 1:      # toward bottom-right
            xexpr = "iw-(iw/zoom)"
            yexpr = "ih-(ih/zoom)"
        else:                   # centered push
            xexpr = "iw/2-(iw/zoom/2)"
            yexpr = "ih/2-(ih/zoom/2)"
        vf = (
            f"scale={up_w}:{up_h}:force_original_aspect_ratio=increase,"
            f"crop={up_w}:{up_h},"
            f"zoompan=z='min(zoom+0.0015,1.30)':d={frames}:"
            f"x='{xexpr}':y='{yexpr}':fps=30:s={w}x{h},"
            f"format=yuv420p"
        )
        plain_vf = (
            f"scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},format=yuv420p"
        )
        for filt in (vf, plain_vf):
            code, _ = await _run(
                "ffmpeg", "-y", "-loop", "1", "-i", png_path,
                "-t", f"{seconds:.2f}", "-r", "30", "-vf", filt, "-an", *venc, seg,
            )
            if code == 0 and os.path.exists(seg):
                return seg

    # Image generation/animation unavailable — degrade to stock footage.
    return await _scene_segment(
        tmp=tmp, idx=idx, query=broll_query, seconds=seconds, w=w, h=h,
        orientation=orientation, motion=motion, venc=venc,
        min_h=min_h, target_h=target_h,
    )


async def _assemble_scenes(
    tmp: str, segments: list[str], durations: list[float], w: int, h: int,
    venc: list[str], transitions: bool,
) -> str:
    """Join scene segments — crossfade when enabled, else concat. Returns path."""
    body = os.path.join(tmp, "body.mp4")
    if transitions and len(segments) >= 2:
        xfade = 0.4
        # Cycle through a few transition types so cuts feel kinetic, not static.
        kinds = ["fade", "slideleft", "wipeleft", "slideup", "smoothright", "circleopen"]
        inputs: list[str] = []
        for seg in segments:
            inputs += ["-i", os.path.basename(seg)]
        parts: list[str] = []
        prev = "0:v"
        offset = max(0.1, durations[0] - xfade)
        for k in range(1, len(segments)):
            label = f"x{k}"
            kind = kinds[(k - 1) % len(kinds)]
            parts.append(
                f"[{prev}][{k}:v]xfade=transition={kind}:duration={xfade}:"
                f"offset={offset:.2f}[{label}]"
            )
            prev = label
            offset += max(0.1, durations[k] - xfade)
        code, log = await _run_in(
            tmp, "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(parts),
            "-map", f"[{prev}]", *venc, "body.mp4",
        )
        if code == 0 and os.path.exists(body):
            return body

    # Concat fallback (stream copy, then re-encode if needed).
    concat_list = os.path.join(tmp, "list.txt")
    with open(concat_list, "w") as f:
        for seg in segments:
            f.write(f"file '{os.path.basename(seg)}'\n")
    code, _ = await _run_in(
        tmp, "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", "list.txt", "-c", "copy", "body.mp4",
    )
    if code == 0 and os.path.exists(body):
        return body
    code, log = await _run_in(
        tmp, "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", "list.txt", *venc, "body.mp4",
    )
    if code != 0 or not os.path.exists(body):
        raise RuntimeError(f"ffmpeg scene assembly failed: {log[-400:]}")
    return body


async def _brand_pass(
    tmp: str, base: str, *, kit: BrandKit, style: StyleSpec, w: int, h: int,
    total: float, venc: list[str],
) -> str:
    """Bake static brand overlays (scrims, watermark) + progress bar onto ``base``.

    Returns the branded basename, or ``base`` unchanged if nothing to do / it
    fails (so branding is best-effort and never blocks the render).
    """
    inputs: list[str] = ["ffmpeg", "-y", "-i", base]
    chain: list[str] = []
    v = "0:v"
    overlay_png: str | None = None
    if style.scrim or style.watermark:
        try:
            overlay_png = _render_static_overlay(tmp, w, h, kit, style)
        except Exception:  # noqa: BLE001
            overlay_png = None
    if overlay_png:
        inputs += ["-loop", "1", "-framerate", "30", "-i", os.path.basename(overlay_png)]
        chain.append(f"[{v}][1:v]overlay=0:0[bg]")
        v = "bg"
    if style.progress:
        pb = max(5, round(h * 0.008))
        chain.append(
            f"[{v}]drawbox=x=0:y=ih-{pb}:w='iw*min(t/{total:.2f}\\,1)':h={pb}:"
            f"color={_rgb_hex(kit.accent)}@0.95:t=fill[pb]"
        )
        v = "pb"
    if not chain:
        return base
    out = "branded.mp4"
    code, _ = await _run_in(
        tmp, *inputs, "-filter_complex", ";".join(chain),
        "-map", f"[{v}]", "-t", f"{total:.2f}", "-an", *venc, out,
    )
    return out if code == 0 and os.path.exists(os.path.join(tmp, out)) else base


async def _final_pass(
    tmp: str, base: str, *, cues: list[tuple[float, float, str]], audio: str,
    kit: BrandKit, style: StyleSpec, w: int, h: int, base_enc: list[str],
) -> tuple[str, str]:
    """Burn captions and mux narration onto ``base``. Returns (basename, mode)."""
    cap_pngs: list[tuple[str, float, float]] = []
    if cues:
        try:
            cap_pngs = (
                _render_caption_cards(tmp, cues, w, h, kit)
                if style.caption == "pill"
                else _render_caption_pngs(tmp, cues, w, h)
            )
        except Exception:  # noqa: BLE001
            cap_pngs = []

    # Tier 1 — composite branded/plain caption PNGs + audio.
    if cap_pngs:
        inputs: list[str] = ["ffmpeg", "-y", "-i", base]
        for png, _s, _e in cap_pngs:
            inputs += ["-loop", "1", "-framerate", "30", "-i", os.path.basename(png)]
        inputs += ["-i", audio]
        audio_idx = len(cap_pngs) + 1
        parts: list[str] = []
        prev = "0:v"
        for k, (_p, s, e) in enumerate(cap_pngs, start=1):
            label = f"v{k}"
            parts.append(f"[{prev}][{k}:v]overlay=enable='between(t,{s:.3f},{e:.3f})'[{label}]")
            prev = label
        code, _ = await _run_in(
            tmp, *inputs, "-filter_complex", ";".join(parts),
            "-map", f"[{prev}]", "-map", f"{audio_idx}:a:0", *base_enc, "final.mp4",
        )
        if code == 0 and os.path.exists(os.path.join(tmp, "final.mp4")):
            return "final.mp4", ("brandcards" if style.caption == "pill" else "overlay")

    # Tier 2 — libass subtitles (if this ffmpeg build supports it).
    if cues and subtitles_filter_available():
        sub_style = (
            "FontName=Arial,Fontsize=16,Bold=1,PrimaryColour=&H00FFFFFF,"
            "OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,"
            "Alignment=2,MarginV=60"
        )
        code, _ = await _run_in(
            tmp, "ffmpeg", "-y", "-i", base, "-i", audio,
            "-vf", f"subtitles=captions.srt:force_style='{sub_style}'",
            "-map", "0:v:0", "-map", "1:a:0", *base_enc, "final.mp4",
        )
        if code == 0 and os.path.exists(os.path.join(tmp, "final.mp4")):
            return "final.mp4", "libass"

    # Tier 3 — plain mux; captions survive as the SRT sidecar.
    code, log = await _run_in(
        tmp, "ffmpeg", "-y", "-i", base, "-i", audio,
        "-map", "0:v:0", "-map", "1:a:0", *base_enc, "final.mp4",
    )
    if code != 0 or not os.path.exists(os.path.join(tmp, "final.mp4")):
        raise RuntimeError(f"ffmpeg final render failed: {log[-400:]}")
    return "final.mp4", "none"


async def render_video(
    *,
    topic: str,
    fmt: str = "reels",
    platform: str | None = None,
    seconds: int | None = None,
    voice: str | None = None,
    tone: str | None = None,
    brand: dict | None = None,
    extra: str | None = None,
    script: str | None = None,
    quality: str | None = None,
    style: str | None = None,
    visuals: str | None = None,
    plan_override: dict | None = None,
) -> RenderResult:
    if not ffmpeg_available():
        raise RuntimeError(
            "Video rendering requires ffmpeg. Install it (e.g. `brew install ffmpeg` "
            "or add it to the container image) and retry."
        )
    if not (settings.tts_endpoint and settings.tts_key):
        raise RuntimeError(
            "Voiceover unavailable: configure Azure OpenAI TTS (AZURE_TTS_* or the "
            "AZURE_GPT5_* resource) to generate video narration."
        )

    quality_used = normalize_quality(quality)
    style_spec = normalize_style(style)
    visuals_used = normalize_visuals(visuals if visuals is not None else plan_override.get("visuals") if plan_override else None)
    image_ready = settings.image_configured or bool(
        settings.azure_mai_image_endpoint and settings.azure_mai_image_key
    ) or bool(settings.azure_flux_endpoint and settings.azure_flux_key)
    # Pure AI-image videos can run without Pexels; stock/hybrid need it (and AI
    # mode still benefits from Pexels as a per-scene fallback).
    if not settings.pexels_api_key and not (visuals_used == "ai" and image_ready):
        raise RuntimeError("Set PEXELS_API_KEY to source stock b-roll for videos.")
    if visuals_used == "ai" and not image_ready:
        raise RuntimeError(
            "AI image visuals need an image model: configure Azure image generation "
            "(AZURE_IMAGE_*, MAI-Image, or FLUX)."
        )

    kit = _build_brandkit(brand)
    venc, base_enc = _encode_for(quality_used)

    plan = plan_override or await build_video_plan(
        topic=topic, fmt=fmt, platform=platform, seconds=seconds,
        tone=tone, brand=brand, extra=extra, script=script, quality=quality_used,
        visuals=visuals_used,
    )
    w, h = int(plan.get("width") or 0), int(plan.get("height") or 0)
    if not (w and h):
        w, h = dims_for(fmt, quality_used)
    orientation = "portrait" if h >= w else "landscape"
    scenes: list[dict] = plan.get("scenes") or []
    voice_used = normalize_voice(voice or plan.get("voice"))
    tone_used = tone or plan.get("voice_tone")

    # Bias Pexels source resolution toward the output (esp. 4K).
    short_side = min(w, h)
    target_h = short_side
    min_h = max(540, int(short_side * 0.6))

    script = " ".join(str(s.get("vo_line", "")).strip() for s in scenes).strip()
    if not script:
        raise RuntimeError("Generated plan had no voiceover script.")

    media_dir = os.path.join(settings.media_root, "videos")
    os.makedirs(media_dir, exist_ok=True)
    out_name = f"{uuid.uuid4().hex}.mp4"
    out_path = os.path.join(media_dir, out_name)

    with tempfile.TemporaryDirectory(prefix="aivideo_") as tmp:
        # 1) Voiceover (returns spoken MP3 + exact transcript)
        vo_mp3 = os.path.join(tmp, "vo.mp3")
        audio_bytes, transcript = await synthesize_voiceover(
            script, voice=voice_used, tone=tone_used
        )
        with open(vo_mp3, "wb") as f:
            f.write(audio_bytes)
        vo_dur = await _probe_duration(vo_mp3)
        if vo_dur <= 0:
            vo_dur = float(plan.get("target_seconds") or 30)

        # 2) Per-scene visuals — AI image (Ken Burns zoompan) or Pexels b-roll —
        #    durations scaled so the timeline matches the narration length.
        planned_total = sum(float(s.get("seconds", 4)) for s in scenes) or 1.0
        scale = vo_dur / planned_total
        segments: list[str] = []
        durations: list[float] = []
        ai_scene_count = 0
        for i, s in enumerate(scenes):
            dur = max(1.5, float(s.get("seconds", 4)) * scale)
            broll_q = str(s.get("broll_query") or "background")
            use_ai = (str(s.get("visual") or "").lower() == "ai") and image_ready
            if use_ai:
                ai_scene_count += 1
                seg = await _image_scene_segment(
                    tmp=tmp, idx=i,
                    image_prompt=str(s.get("image_prompt") or broll_q),
                    seconds=dur, w=w, h=h, quality=quality_used, venc=venc,
                    broll_query=broll_q, orientation=orientation,
                    motion=style_spec.motion, min_h=min_h, target_h=target_h,
                )
            else:
                seg = await _scene_segment(
                    tmp=tmp, idx=i, query=broll_q,
                    seconds=dur, w=w, h=h, orientation=orientation,
                    motion=style_spec.motion, venc=venc, min_h=min_h, target_h=target_h,
                )
            segments.append(seg)
            durations.append(dur)

        body = await _assemble_scenes(
            tmp, segments, durations, w, h, venc, style_spec.transitions
        )

        # 3) Optional branded intro / outro title cards (silent, gentle zoom).
        intro_s = outro_s = 0.0
        timeline: list[str] = []
        if style_spec.intro:
            try:
                headline = str(plan.get("hook") or plan.get("title") or topic)[:90]
                png = _render_title_card(tmp, "intro", headline, kit.tagline, w, h, kit)
                seg = await _card_segment(
                    tmp=tmp, name="intro", png=png, seconds=1.5, w=w, h=h, venc=venc
                )
                if seg:
                    timeline.append(os.path.basename(seg))
                    intro_s = 1.5
            except Exception:  # noqa: BLE001
                intro_s = 0.0
        timeline.append(os.path.basename(body))
        if style_spec.outro:
            try:
                cta = kit.tagline or "Follow for more"
                png = _render_title_card(tmp, "outro", cta, "Thanks for watching", w, h, kit)
                seg = await _card_segment(
                    tmp=tmp, name="outro", png=png, seconds=1.8, w=w, h=h, venc=venc
                )
                if seg:
                    timeline.append(os.path.basename(seg))
                    outro_s = 1.8
            except Exception:  # noqa: BLE001
                outro_s = 0.0

        if len(timeline) > 1:
            tl = os.path.join(tmp, "timeline.txt")
            with open(tl, "w") as f:
                for seg in timeline:
                    f.write(f"file '{seg}'\n")
            code, _ = await _run_in(
                tmp, "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", "timeline.txt", *venc, "visual.mp4",
            )
            if code != 0 or not os.path.exists(os.path.join(tmp, "visual.mp4")):
                intro_s = outro_s = 0.0
                visual = os.path.basename(body)
            else:
                visual = "visual.mp4"
        else:
            visual = os.path.basename(body)

        total = intro_s + vo_dur + outro_s

        # 4) Captions: exact transcript across narration, shifted by the intro.
        cues = _captions_from_text(transcript, vo_dur)
        if not cues:
            cues = _captions_from_scenes(scenes, vo_dur)
        cues = [(s + intro_s, e + intro_s, t) for (s, e, t) in cues]
        srt_text = _build_srt(cues)
        with open(os.path.join(tmp, "captions.srt"), "w", encoding="utf-8") as f:
            f.write(srt_text)

        # 5) Narration audio — delayed past the intro and padded to total length.
        audio_name = "vo.mp3"
        if intro_s > 0 or outro_s > 0:
            delay_ms = int(intro_s * 1000)
            code, _ = await _run_in(
                tmp, "ffmpeg", "-y", "-i", "vo.mp3",
                "-af", f"adelay={delay_ms}|{delay_ms},apad",
                "-t", f"{total:.2f}", "-c:a", "aac", "-b:a", "192k", "audio.m4a",
            )
            if code == 0 and os.path.exists(os.path.join(tmp, "audio.m4a")):
                audio_name = "audio.m4a"
            else:
                # Couldn't offset audio — drop the cards so narration stays synced.
                visual = os.path.basename(body)
                intro_s = outro_s = 0.0
                total = vo_dur
                cues = _captions_from_text(transcript, vo_dur) or _captions_from_scenes(scenes, vo_dur)
                srt_text = _build_srt(cues)
                with open(os.path.join(tmp, "captions.srt"), "w", encoding="utf-8") as f:
                    f.write(srt_text)

        # 6) Brand overlays (scrims + watermark + progress bar) then captions+audio.
        branded = await _brand_pass(
            tmp, visual, kit=kit, style=style_spec, w=w, h=h, total=total, venc=venc
        )
        final_name, caption_mode = await _final_pass(
            tmp, branded, cues=cues, audio=audio_name, kit=kit, style=style_spec,
            w=w, h=h, base_enc=base_enc,
        )
        shutil.move(os.path.join(tmp, final_name), out_path)

    final_dur = int(round(await _probe_duration(out_path) or total))
    return RenderResult(
        path=out_path,
        width=w,
        height=h,
        duration_s=final_dur,
        captions_srt=srt_text,
        plan=plan,
        voice=voice_used,
        meta={
            "scenes": len(scenes),
            "quality": quality_used,
            "style": style_spec.name,
            "visuals": visuals_used,
            "ai_image_scenes": ai_scene_count,
            "motion": style_spec.motion,
            "transitions": style_spec.transitions,
            "intro": intro_s > 0,
            "outro": outro_s > 0,
            "caption_source": "transcript" if transcript.strip() else "scenes",
            "captions_burned": caption_mode not in ("none",),
            "caption_mode": caption_mode,
        },
    )


async def _run_in(cwd: str, *args: str) -> tuple[int, str]:
    proc = await asyncio.create_subprocess_exec(
        *args, cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    return proc.returncode or 0, (out or b"").decode("utf-8", "replace")
