"""Block-to-HTML email compiler.

Turns a list of structured ``body_blocks`` (the same JSONB shape persisted on
``EmailTemplate`` / ``EmailCampaign``) into a complete, table-based, inline-styled
HTML email document that renders reliably across legacy and modern clients.

Design constraints (deliberate, for email-client safety):

* Everything is laid out with ``<table>`` elements — no flexbox/grid.
* Every visual property is an inline ``style`` attribute (no external/`<style>`
  rules beyond a tiny responsive ``@media`` block in ``<head>``).
* 600px max-width body, centered on a neutral background.
* ``{{merge_tags}}`` are passed through untouched; they are resolved later by
  :func:`apply_merge_tags` at send time.
* Conditional blocks are wrapped in HTML comment markers so the send-time
  resolver can keep or strip them per-recipient.

The module is intentionally dependency-free and synchronous so it can run inside
workers, request handlers, or preview endpoints alike.
"""
from __future__ import annotations

import html
import re

# ---------------------------------------------------------------------------
# Defaults / brand resolution
# ---------------------------------------------------------------------------

_DEFAULT_BRAND: dict[str, str] = {
    "primary_color": "#2563eb",
    "secondary_color": "#1e293b",
    "logo_url": "",
    "font_family": "Arial, Helvetica, sans-serif",
    "company_name": "",
    "address": "",
}

_CONTENT_WIDTH = 600
_BODY_BG = "#f4f4f7"
_CONTENT_BG = "#ffffff"
_TEXT_COLOR = "#1f2933"
_ALIGNS = {"left", "center", "right"}


def _brand(brand: dict | None) -> dict:
    merged = dict(_DEFAULT_BRAND)
    if brand:
        for key, value in brand.items():
            if value is not None:
                merged[key] = value
    return merged


def _align(value: str | None, default: str = "left") -> str:
    value = (value or default).lower()
    return value if value in _ALIGNS else default


def _esc(text: object) -> str:
    """Escape text but preserve ``{{merge_tag}}`` braces verbatim."""
    return html.escape(str(text if text is not None else ""), quote=False)


# ---------------------------------------------------------------------------
# Conditional-block markers
# ---------------------------------------------------------------------------

def _condition_open(condition: dict) -> str:
    """Open marker for a conditional block.

    Encodes the raw condition so the send-time resolver can decide, per
    recipient, whether to keep the wrapped HTML. Stripping these comments (and
    their contents when the condition fails) is the resolver's job.
    """
    import json

    payload = json.dumps(condition, separators=(",", ":"), sort_keys=True)
    return f"<!--[if-condition {_esc(payload)}]-->"


def _condition_close() -> str:
    return "<!--[end-condition]-->"


# ---------------------------------------------------------------------------
# Individual block renderers
# ---------------------------------------------------------------------------

def _render_heading(block: dict, brand: dict) -> str:
    level = block.get("level", 2)
    try:
        level = int(level)
    except (TypeError, ValueError):
        level = 2
    level = min(max(level, 1), 3)
    sizes = {1: 30, 2: 24, 3: 19}
    size = sizes[level]
    align = _align(block.get("align"), "left")
    text = _esc(block.get("text", ""))
    return (
        f'<h{level} style="margin:0 0 16px 0;font-family:{brand["font_family"]};'
        f'font-size:{size}px;line-height:1.3;font-weight:bold;color:{brand["secondary_color"]};'
        f'text-align:{align};">{text}</h{level}>'
    )


def _render_text(block: dict, brand: dict) -> str:
    align = _align(block.get("align"), "left")
    # Content may already contain basic HTML; pass through as-is.
    content = str(block.get("content", "") or "")
    return (
        f'<p style="margin:0 0 16px 0;font-family:{brand["font_family"]};'
        f'font-size:15px;line-height:1.6;color:{_TEXT_COLOR};text-align:{align};">'
        f"{content}</p>"
    )


def _render_image(block: dict, brand: dict) -> str:
    src = _esc(block.get("src", ""))
    alt = _esc(block.get("alt", ""))
    width = str(block.get("width", "") or "")
    width_attr = f' width="{_esc(width)}"' if width else ""
    style = (
        "display:block;border:0;outline:none;text-decoration:none;"
        "max-width:100%;height:auto;margin:0 auto;"
    )
    if width:
        style += f"width:{_esc(width)};"
    img = f'<img src="{src}" alt="{alt}"{width_attr} style="{style}" />'
    link = block.get("link")
    if link:
        img = f'<a href="{_esc(link)}" target="_blank" style="text-decoration:none;">{img}</a>'
    return f'<div style="margin:0 0 16px 0;">{img}</div>'


def _render_button(block: dict, brand: dict) -> str:
    align = _align(block.get("align"), "center")
    text = _esc(block.get("text", "Click here"))
    url = _esc(block.get("url", "#"))
    color = _esc(block.get("color") or brand["primary_color"])
    text_color = _esc(block.get("textColor") or "#ffffff")
    button = (
        f'<a href="{url}" target="_blank" style="display:inline-block;'
        f'font-family:{brand["font_family"]};font-size:15px;font-weight:bold;'
        f'color:{text_color};background-color:{color};text-decoration:none;'
        f'padding:13px 28px;border-radius:6px;mso-padding-alt:0;">{text}</a>'
    )
    return (
        f'<div style="margin:0 0 16px 0;text-align:{align};">{button}</div>'
    )


def _render_divider(block: dict, brand: dict) -> str:
    return (
        '<div style="margin:0 0 16px 0;">'
        '<hr style="border:0;border-top:1px solid #e2e8f0;height:1px;line-height:1px;margin:0;" />'
        "</div>"
    )


def _render_spacer(block: dict, brand: dict) -> str:
    height = block.get("height", 24)
    try:
        height = int(height)
    except (TypeError, ValueError):
        height = 24
    height = max(height, 0)
    return (
        f'<div style="line-height:{height}px;height:{height}px;font-size:1px;">&nbsp;</div>'
    )


def _render_columns(block: dict, brand: dict) -> str:
    columns = block.get("columns") or []
    if not columns:
        return ""
    # Cap at two columns for reliable rendering.
    columns = columns[:2]
    cell_width = _CONTENT_WIDTH // max(len(columns), 1)
    cells = []
    for col in columns:
        inner = _render_blocks(col.get("blocks") or [], brand)
        cells.append(
            f'<td valign="top" width="{cell_width}" '
            f'style="width:{cell_width}px;padding:0 8px;vertical-align:top;" '
            f'class="email-col">{inner}</td>'
        )
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        'width="100%" style="margin:0 0 16px 0;border-collapse:collapse;"><tr>'
        + "".join(cells)
        + "</tr></table>"
    )


_RENDERERS = {
    "heading": _render_heading,
    "text": _render_text,
    "image": _render_image,
    "button": _render_button,
    "divider": _render_divider,
    "spacer": _render_spacer,
    "columns": _render_columns,
}


def _render_block(block: dict, brand: dict) -> str:
    if not isinstance(block, dict):
        return ""
    renderer = _RENDERERS.get(str(block.get("type", "")).lower())
    if renderer is None:
        return ""
    rendered = renderer(block, brand)
    condition = block.get("condition")
    if condition and isinstance(condition, dict):
        return _condition_open(condition) + rendered + _condition_close()
    return rendered


def _render_blocks(blocks: list[dict], brand: dict) -> str:
    return "".join(_render_block(b, brand) for b in blocks or [])


# ---------------------------------------------------------------------------
# Document assembly
# ---------------------------------------------------------------------------

def compile_blocks(blocks: list[dict], brand: dict | None = None) -> str:
    """Compile ``blocks`` into a complete, email-safe HTML document.

    ``brand`` may carry: ``primary_color``, ``secondary_color``, ``logo_url``,
    ``font_family``, ``company_name``, ``address``. Missing keys fall back to
    sensible defaults. ``{{merge_tags}}`` are preserved for later resolution.
    """
    b = _brand(brand)
    inner = _render_blocks(blocks or [], b)

    header = ""
    if b["logo_url"]:
        header = (
            '<tr><td align="center" style="padding:24px 24px 0 24px;">'
            f'<img src="{_esc(b["logo_url"])}" alt="{_esc(b["company_name"])}" '
            'style="display:block;border:0;max-height:48px;height:auto;" />'
            "</td></tr>"
        )

    return (
        "<!DOCTYPE html>\n"
        '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">\n'
        "<head>\n"
        '<meta charset="utf-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        '<meta http-equiv="X-UA-Compatible" content="IE=edge" />\n'
        "<title></title>\n"
        "<style>\n"
        "  body { margin:0; padding:0; width:100% !important; }\n"
        "  img { -ms-interpolation-mode:bicubic; }\n"
        "  @media only screen and (max-width:620px) {\n"
        "    .email-container { width:100% !important; }\n"
        "    .email-col { display:block !important; width:100% !important; }\n"
        "  }\n"
        "</style>\n"
        "</head>\n"
        f'<body style="margin:0;padding:0;background-color:{_BODY_BG};">\n'
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        f'width="100%" style="background-color:{_BODY_BG};border-collapse:collapse;">\n'
        '<tr><td align="center" style="padding:24px 12px;">\n'
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        f'width="{_CONTENT_WIDTH}" class="email-container" '
        f'style="width:{_CONTENT_WIDTH}px;max-width:{_CONTENT_WIDTH}px;'
        f'background-color:{_CONTENT_BG};border-radius:8px;border-collapse:collapse;">\n'
        f"{header}"
        '<tr><td style="padding:24px;">\n'
        f"{inner}\n"
        "</td></tr>\n"
        "</table>\n"
        "</td></tr>\n"
        "</table>\n"
        "</body>\n"
        "</html>"
    )


# ---------------------------------------------------------------------------
# Merge tags
# ---------------------------------------------------------------------------

_MERGE_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|([^}]*))?\}\}")


def _lookup_merge(key: str, subscriber: dict) -> str | None:
    key = key.strip()
    if key.startswith("attributes."):
        attr_key = key.split(".", 1)[1]
        attrs = subscriber.get("attributes") or {}
        if isinstance(attrs, dict):
            val = attrs.get(attr_key)
            return None if val is None else str(val)
        return None
    # Common direct fields, including a derived first_name.
    if key in ("first_name", "firstName"):
        name = subscriber.get("first_name")
        if name:
            return str(name)
        full = subscriber.get("name")
        if full:
            return str(full).strip().split(" ", 1)[0]
        return None
    val = subscriber.get(key)
    return None if val is None else str(val)


def apply_merge_tags(text: str, subscriber: dict, fallback_char: str = "|") -> str:
    """Resolve ``{{tag}}`` / ``{{tag|fallback}}`` placeholders in ``text``.

    Supports ``{{first_name}}``, ``{{email}}``, ``{{name}}`` and nested
    ``{{attributes.x}}`` lookups. The ``fallback_char`` separates a tag from its
    default value (``{{first_name|there}}`` -> ``there`` when unknown).
    """
    if not text:
        return text or ""
    subscriber = subscriber or {}

    def _sub(match: re.Match) -> str:
        key = match.group(1)
        fallback = match.group(2)
        # Honour a custom fallback character if it isn't the default "|" (the
        # regex already split on "|"; for other chars re-parse the raw key).
        if fallback_char != "|" and fallback is None and fallback_char in key:
            key, fallback = key.split(fallback_char, 1)
        value = _lookup_merge(key, subscriber)
        if value is not None and value != "":
            return value
        return fallback if fallback is not None else ""

    return _MERGE_RE.sub(_sub, text)


# ---------------------------------------------------------------------------
# CAN-SPAM footer
# ---------------------------------------------------------------------------

def add_canspam_footer(html: str, unsubscribe_url: str, address: str = "") -> str:
    """Append a CAN-SPAM compliant footer (unsubscribe link + physical address).

    Idempotent: if the document already contains an "unsubscribe" link the
    original HTML is returned unchanged.
    """
    html = html or ""
    if "unsubscribe" in html.lower():
        return html

    addr_html = ""
    if address:
        addr_html = (
            f'<div style="margin:0 0 6px 0;">{_esc(address)}</div>'
        )

    footer = (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" '
        f'width="100%" style="background-color:{_BODY_BG};border-collapse:collapse;">\n'
        '<tr><td align="center" style="padding:16px 12px 28px 12px;">\n'
        '<div style="font-family:Arial, Helvetica, sans-serif;font-size:12px;'
        'line-height:1.6;color:#8a94a6;text-align:center;max-width:600px;">'
        f"{addr_html}"
        '<div>You are receiving this email because you opted in. '
        f'<a href="{_esc(unsubscribe_url)}" target="_blank" '
        'style="color:#8a94a6;text-decoration:underline;">Unsubscribe</a>'
        "</div>"
        "</div>\n"
        "</td></tr>\n"
        "</table>"
    )

    if "</body>" in html:
        return html.replace("</body>", footer + "\n</body>", 1)
    return html + "\n" + footer
