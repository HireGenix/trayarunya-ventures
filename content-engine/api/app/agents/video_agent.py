"""Video script + scene-plan agent.

Turns a topic/brief into a tight short-form video plan using GPT-5.5: a hook, a
spoken voiceover script, and an ordered list of scenes — each with a Pexels
b-roll search query, on-screen caption text, and an approximate duration. The
plan drives Pexels b-roll selection, TTS voiceover, and ffmpeg assembly.
"""
from __future__ import annotations

import re

from app.llm.adapters import complete_json

# Target spec per output format: (width, height, default_seconds, max_seconds).
FORMAT_SPEC: dict[str, tuple[int, int, int, int]] = {
    "youtube": (1920, 1080, 60, 180),
    "youtube_shorts": (1080, 1920, 30, 60),
    "reels": (1080, 1920, 30, 90),
    "tiktok": (1080, 1920, 30, 90),
}


def normalize_format(value: str | None) -> str:
    v = (value or "").lower().strip().replace("-", "_").replace(" ", "_")
    aliases = {
        "yt": "youtube",
        "shorts": "youtube_shorts",
        "yt_shorts": "youtube_shorts",
        "instagram": "reels",
        "reel": "reels",
        "ig_reels": "reels",
    }
    v = aliases.get(v, v)
    return v if v in FORMAT_SPEC else "reels"


def spec_for(fmt: str) -> tuple[int, int, int, int]:
    return FORMAT_SPEC[normalize_format(fmt)]


# Visual source mode: where each scene's imagery comes from.
VISUAL_MODES = {"stock", "ai", "hybrid"}


def normalize_visuals(value: str | None) -> str:
    v = (value or "").lower().strip().replace("-", "_").replace(" ", "_")
    aliases = {
        "stock_footage": "stock",
        "footage": "stock",
        "pexels": "stock",
        "ai_image": "ai",
        "ai_images": "ai",
        "generated": "ai",
        "image": "ai",
        "mixed": "hybrid",
        "auto": "hybrid",
        "both": "hybrid",
    }
    v = aliases.get(v, v)
    return v if v in VISUAL_MODES else "hybrid"


# Output quality -> short-side pixels (the long side follows the format aspect).
QUALITY_SHORT_SIDE: dict[str, int] = {"720p": 720, "1080p": 1080, "4k": 2160}


def normalize_quality(value: str | None) -> str:
    v = (value or "").lower().strip().replace(" ", "").replace("-", "")
    aliases = {
        "hd": "720p",
        "720": "720p",
        "fullhd": "1080p",
        "fhd": "1080p",
        "1080": "1080p",
        "1080phd": "1080p",
        "2160p": "4k",
        "2160": "4k",
        "uhd": "4k",
        "ultrahd": "4k",
    }
    v = aliases.get(v, v)
    return v if v in QUALITY_SHORT_SIDE else "1080p"


def _even(n: int) -> int:
    """ffmpeg/H.264 needs even dimensions."""
    n = int(round(n))
    return n - (n % 2)


def dims_for(fmt: str, quality: str | None = None) -> tuple[int, int]:
    """Output (width, height) for a format at the requested quality.

    Keeps the format's aspect ratio and scales the *short* side to the quality
    target (720 / 1080 / 2160), so vertical formats grow in width and landscape
    formats grow in height.
    """
    w, h, _, _ = spec_for(fmt)
    short = QUALITY_SHORT_SIDE[normalize_quality(quality)]
    if h >= w:  # portrait — short side is the width
        return _even(short), _even(short * h / w)
    return _even(short * w / h), _even(short)  # landscape — short side is height


_SYSTEM = """You are a senior short-form video director and copywriter for brand
social media (YouTube, YouTube Shorts, Instagram Reels, TikTok). You write
punchy, retention-optimized scripts and break them into visual scenes.

Each scene is illustrated one of two ways:
- "stock": licensed STOCK FOOTAGE from Pexels — best for concrete, real-world
  action that EXISTS as stock video (e.g. "city skyline at sunset", "person
  typing on laptop", "team meeting office").
- "ai": an AI-GENERATED still image — best for abstract concepts, data/ideas,
  stylised or branded visuals, surreal or specific compositions that stock
  libraries won't have. The image is animated with a slow Ken Burns motion.

Rules:
- Open with a 1-line scroll-stopping HOOK in the first scene.
- The voiceover must sound natural when spoken aloud (no hashtags, no emoji, no
  stage directions inside the spoken text).
- For every scene set "visual" to "stock" or "ai".
- If visual is "stock", give a concrete literal "broll_query" of real-world
  footage that EXISTS as stock video.
- If visual is "ai", give a rich, descriptive "image_prompt" (subject, setting,
  lighting, mood, composition, art style) for a text-to-image model. Keep it
  photographic/cinematic unless a graphic style is clearly wanted.
- on_screen_text is a SHORT caption (<= 6 words) reinforcing the line.
- Keep total spoken length within the requested duration (~2.5 words/second).
Return STRICT JSON only."""


_SYSTEM_SCRIPT = """You are a senior short-form video director and editor. You are
GIVEN a finished voiceover script. Do NOT rewrite, summarize, shorten, or add to
the words — the narration must stay VERBATIM. Your only job is to break the given
script into sequential visual scenes.

Each scene is illustrated one of two ways:
- "stock": licensed STOCK FOOTAGE from Pexels — best for concrete real-world
  action that EXISTS as stock video.
- "ai": an AI-GENERATED still image (animated with Ken Burns motion) — best for
  abstract concepts, stylised/branded visuals, or specific compositions stock
  libraries won't have.

Rules:
- Split the script into consecutive chunks. Concatenating every "vo_line" in
  order MUST reproduce the original script word-for-word (you may only trim
  surrounding whitespace). Never invent or drop words.
- For every scene set "visual" to "stock" or "ai".
- If visual is "stock", give a concrete literal "broll_query" of real-world
  footage that EXISTS as stock video.
- If visual is "ai", give a rich descriptive "image_prompt" (subject, setting,
  lighting, mood, composition, art style) for a text-to-image model.
- on_screen_text is a SHORT caption (<= 6 words) drawn from that chunk.
- Each chunk should be one or two sentences (~2.5 words/second of speech).
Return STRICT JSON only."""


_CLEAN_PATTERNS = [
    (re.compile(r"!\[[^\]]*\]\([^)]*\)"), ""),          # markdown images
    (re.compile(r"\[([^\]]+)\]\([^)]*\)"), r"\1"),       # markdown links -> text
    (re.compile(r"https?://\S+"), ""),                    # bare urls
    (re.compile(r"[#*_`>~]+"), ""),                       # md emphasis / headings
    (re.compile(r"#\w+"), ""),                            # hashtags
    (re.compile(r"[\U0001F000-\U0001FAFF\u2600-\u27BF]"), ""),  # emoji
]


def clean_script(text: str) -> str:
    """Strip markdown, hashtags, URLs and emoji so a post body narrates cleanly."""
    out = text or ""
    for pat, repl in _CLEAN_PATTERNS:
        out = pat.sub(repl, out)
    out = re.sub(r"[ \t]+", " ", out)
    out = re.sub(r"\n{2,}", "\n", out)
    return out.strip()


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    return [p.strip() for p in parts if p.strip()]


def _segment_script_fallback(script: str, fmt: str, seconds: int) -> dict:
    """Local scene split when the model is unavailable — keeps words verbatim."""
    sents = _sentences(script) or [script.strip()]
    groups: list[str] = []
    buf: list[str] = []
    for s in sents:
        buf.append(s)
        if len(buf) >= 2:
            groups.append(" ".join(buf))
            buf = []
    if buf:
        groups.append(" ".join(buf))
    max_scenes = max(2, min(len(groups), seconds // 4 or 3))
    if len(groups) > max_scenes:
        head = groups[: max_scenes - 1]
        tail = " ".join(groups[max_scenes - 1 :])
        groups = head + [tail]
    per = max(2.0, round(seconds / max(1, len(groups)), 1))
    generic = [
        "diverse people community", "hands helping volunteers", "city lifestyle people",
        "team meeting office", "nature landscape sunrise", "person using laptop",
    ]
    scenes = []
    for i, g in enumerate(groups):
        scenes.append(
            {
                "vo_line": g,
                "broll_query": generic[i % len(generic)],
                "on_screen_text": " ".join(g.split()[:6]),
                "seconds": per,
            }
        )
    return {
        "title": (script[:80] or "Untitled video"),
        "hook": sents[0][:120] if sents else script[:120],
        "voice_tone": "natural, warm, confident",
        "music_mood": "uplifting",
        "scenes": scenes,
    }


def _fallback_plan(topic: str, fmt: str, seconds: int) -> dict:
    line = topic.strip() or "Your brand, in motion."
    return {
        "title": topic[:80] or "Untitled video",
        "hook": line,
        "voice_tone": "energetic, confident, friendly",
        "music_mood": "upbeat",
        "scenes": [
            {
                "vo_line": line,
                "broll_query": "abstract motion background",
                "on_screen_text": line[:40],
                "seconds": max(3, seconds // 2),
            },
            {
                "vo_line": "Follow for more.",
                "broll_query": "city lifestyle people",
                "on_screen_text": "Follow for more",
                "seconds": max(3, seconds // 2),
            },
        ],
    }


async def build_video_plan(
    *,
    topic: str,
    fmt: str = "reels",
    platform: str | None = None,
    seconds: int | None = None,
    tone: str | None = None,
    brand: dict | None = None,
    extra: str | None = None,
    script: str | None = None,
    quality: str | None = None,
    visuals: str | None = None,
) -> dict:
    """Return a structured video plan (see module docstring).

    When ``script`` is given, the model only segments that finished script into
    scenes — the narration stays verbatim (used to turn an existing content-item
    body / post into a video). ``quality`` selects the output resolution
    (720p / 1080p / 4k) while keeping the format aspect ratio. ``visuals`` selects
    the imagery source: ``stock`` (Pexels footage), ``ai`` (generated images) or
    ``hybrid`` (the director chooses per scene).
    """
    fmt = normalize_format(fmt)
    visuals_mode = normalize_visuals(visuals)
    _bw, _bh, default_s, max_s = spec_for(fmt)
    w, h = dims_for(fmt, quality)
    orientation = "portrait" if h >= w else "landscape"

    if visuals_mode == "stock":
        _visual_rule = 'Set "visual" to "stock" for EVERY scene.'
    elif visuals_mode == "ai":
        _visual_rule = (
            'Set "visual" to "ai" for EVERY scene and always include a rich '
            '"image_prompt".'
        )
    else:
        _visual_rule = (
            'For each scene pick "visual": "stock" for concrete real-world action, '
            '"ai" for abstract/conceptual/branded visuals (and add "image_prompt").'
        )

    script_clean = clean_script(script) if script else ""
    if script_clean:
        # Duration tracks the actual script length (~2.5 words/sec), capped.
        words = max(1, len(script_clean.split()))
        est = int(round(words / 2.5))
        target = min(seconds or est or default_s, max_s)
        user = f"""Break this finished voiceover script into scenes for a
{fmt.replace('_', ' ')} video ({orientation}). Keep the words VERBATIM.
Platform: {platform or fmt}
{f'Delivery tone: {tone}' if tone else ''}
{f'Extra notes: {extra}' if extra else ''}
Visuals: {_visual_rule}

SCRIPT (narrate exactly, do not change wording):
\"\"\"{script_clean}\"\"\"

Return JSON with exactly this shape:
{{
  "title": "string",
  "hook": "the opening spoken line, taken from the script",
  "voice_tone": "short delivery instruction for the voice actor",
  "music_mood": "one or two words",
  "scenes": [
    {{"vo_line": "exact consecutive chunk of the script",
      "visual": "stock" | "ai",
      "broll_query": "literal Pexels stock-footage search (when visual=stock)",
      "image_prompt": "rich text-to-image prompt (when visual=ai)",
      "on_screen_text": "<=6 word caption",
      "seconds": number}}
  ]
}}
Concatenating every vo_line in order must reproduce the script word-for-word."""
        data = await complete_json(
            [{"role": "user", "content": user}], system=_SYSTEM_SCRIPT
        )
        if not isinstance(data, dict) or data.get("_parse_error") or not data.get("scenes"):
            data = _segment_script_fallback(script_clean, fmt, target)
    else:
        target = min(seconds or default_s, max_s)
        brand_ctx = ""
        if brand:
            bits = [
                f"Brand voice: {brand.get('voice')}" if brand.get("voice") else "",
                f"Value prop: {brand.get('value_prop')}" if brand.get("value_prop") else "",
                f"Mission: {brand.get('mission')}" if brand.get("mission") else "",
            ]
            brand_ctx = "\n".join(b for b in bits if b)

        user = f"""Create a {target}-second {fmt.replace('_', ' ')} video ({orientation}).
Topic / brief: {topic}
Platform: {platform or fmt}
{f'Desired tone: {tone}' if tone else ''}
{f'Extra notes: {extra}' if extra else ''}
{brand_ctx}
Visuals: {_visual_rule}

Return JSON with exactly this shape:
{{
  "title": "string",
  "hook": "string (the opening spoken line)",
  "voice_tone": "short delivery instruction for the voice actor",
  "music_mood": "one or two words",
  "scenes": [
    {{"vo_line": "spoken sentence",
      "visual": "stock" | "ai",
      "broll_query": "literal Pexels stock-footage search (when visual=stock)",
      "image_prompt": "rich text-to-image prompt (when visual=ai)",
      "on_screen_text": "<=6 word caption",
      "seconds": number}}
  ]
}}
Aim for {max(2, target // 6)}-{max(3, target // 4)} scenes that sum to ~{target} seconds."""

        data = await complete_json([{"role": "user", "content": user}], system=_SYSTEM)
        if not isinstance(data, dict) or data.get("_parse_error") or not data.get("scenes"):
            return _finalize_plan(
                _fallback_plan(topic, fmt, target), fmt, w, h, quality,
                target, tone, topic, visuals_mode,
            )

    # Sanitize scenes.
    scenes = []
    _generic_q = [
        "diverse people community", "hands helping volunteers", "city lifestyle people",
        "team meeting office", "nature landscape sunrise", "person using laptop",
    ]
    for s in data.get("scenes", []):
        if not isinstance(s, dict):
            continue
        vo = (s.get("vo_line") or "").strip()
        q = (s.get("broll_query") or "").strip()
        if not vo:
            continue
        # Per-scene visual source, honouring a forced global mode.
        if visuals_mode == "ai":
            visual = "ai"
        elif visuals_mode == "stock":
            visual = "stock"
        else:
            visual = "ai" if (s.get("visual") or "").lower().strip() == "ai" else "stock"
        img_prompt = (s.get("image_prompt") or "").strip()
        if visual == "ai" and not img_prompt:
            # Build a usable prompt from the line/caption so AI scenes never blank out.
            img_prompt = (s.get("on_screen_text") or vo).strip()
            img_prompt = (
                f"Cinematic, high-detail visual illustrating: {img_prompt}. "
                "Professional brand social media aesthetic, dramatic lighting."
            )
        if visual == "stock" and not q:  # keep narration intact — never drop words
            q = _generic_q[len(scenes) % len(_generic_q)]
        try:
            secs = float(s.get("seconds") or 4)
        except (TypeError, ValueError):
            secs = 4.0
        scenes.append(
            {
                "vo_line": vo,
                "visual": visual,
                "broll_query": q or _generic_q[len(scenes) % len(_generic_q)],
                "image_prompt": img_prompt,
                "on_screen_text": (s.get("on_screen_text") or vo)[:60],
                "seconds": max(2.0, min(secs, 20.0)),
            }
        )
    if not scenes:
        return _finalize_plan(
            _fallback_plan(topic, fmt, target), fmt, w, h, quality,
            target, tone, topic, visuals_mode,
        )

    data["scenes"] = scenes
    return _finalize_plan(data, fmt, w, h, quality, target, tone, topic, visuals_mode)


def _finalize_plan(
    data: dict, fmt: str, w: int, h: int, quality: str | None,
    target: int, tone: str | None, topic: str, visuals_mode: str,
) -> dict:
    """Attach output metadata and normalize scene visual fields on any plan."""
    norm_scenes = []
    _generic_q = [
        "diverse people community", "hands helping volunteers", "city lifestyle people",
        "team meeting office", "nature landscape sunrise", "person using laptop",
    ]
    for i, s in enumerate(data.get("scenes", []) or []):
        if not isinstance(s, dict):
            continue
        vo = (s.get("vo_line") or "").strip()
        if not vo:
            continue
        if visuals_mode == "ai":
            visual = "ai"
        elif visuals_mode == "stock":
            visual = "stock"
        else:
            visual = "ai" if (s.get("visual") or "").lower().strip() == "ai" else "stock"
        img_prompt = (s.get("image_prompt") or "").strip()
        if visual == "ai" and not img_prompt:
            img_prompt = (
                f"Cinematic, high-detail visual illustrating: "
                f"{(s.get('on_screen_text') or vo).strip()}. "
                "Professional brand social media aesthetic, dramatic lighting."
            )
        norm_scenes.append(
            {
                "vo_line": vo,
                "visual": visual,
                "broll_query": (s.get("broll_query") or "").strip()
                or _generic_q[i % len(_generic_q)],
                "image_prompt": img_prompt,
                "on_screen_text": (s.get("on_screen_text") or vo)[:60],
                "seconds": s.get("seconds", 4),
            }
        )
    if norm_scenes:
        data["scenes"] = norm_scenes
    data["fmt"] = fmt
    data["width"] = w
    data["height"] = h
    data["quality"] = normalize_quality(quality)
    data["visuals"] = visuals_mode
    data["target_seconds"] = target
    data.setdefault("voice_tone", tone or "energetic, confident")
    data.setdefault("title", topic[:80] or "Untitled video")
    return data
