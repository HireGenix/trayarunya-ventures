"""Render a newsletter into a brand-colored, email-client-safe HTML document.

Email clients strip <style> blocks and modern CSS, so we emit a table-based layout
with inline styles only. The markdown produced by the writer is converted to simple
HTML (headings, paragraphs, bold/italic, lists, hr) and wrapped in a branded shell
that uses the workspace's primary/accent colours and (optionally) a header image.
"""
from __future__ import annotations

import html
import re
from typing import Any

DEFAULT_PRIMARY = "#FFAF06"
DEFAULT_ACCENT = "#14BB87"
DEFAULT_NAME = "Trayarunya Ventures"


def _brand_bits(brand: dict[str, Any] | None) -> tuple[str, str, str]:
    primary = (brand or {}).get("primary_color") or DEFAULT_PRIMARY
    accent = (brand or {}).get("accent_color") or DEFAULT_ACCENT
    name = DEFAULT_NAME
    if brand:
        prof = brand.get("profile")
        if isinstance(prof, dict) and prof.get("name"):
            name = str(prof["name"])
        elif brand.get("name"):
            name = str(brand["name"])
    return str(primary), str(accent), name


def _inline(text: str) -> str:
    """Escape, then apply inline bold/italic/links on a single line of text."""
    out = html.escape(text)
    out = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" style="color:#1769ff;">\1</a>', out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", out)
    return out


def markdown_to_email_html(md: str, primary: str, accent: str) -> str:
    """Very small markdown -> inline-styled HTML for email bodies."""
    lines = (md or "").split("\n")
    html_parts: list[str] = []
    in_list = False

    def close_list() -> None:
        nonlocal in_list
        if in_list:
            html_parts.append("</ul>")
            in_list = False

    for raw in lines:
        line = raw.rstrip()
        if not line.strip():
            close_list()
            continue
        if re.match(r"^#\s+", line):
            close_list()
            html_parts.append(
                f'<h1 style="margin:24px 0 12px;font-size:24px;line-height:1.25;color:#0E1726;">{_inline(line[2:].strip())}</h1>'
            )
        elif re.match(r"^##\s+", line):
            close_list()
            html_parts.append(
                f'<h2 style="margin:22px 0 10px;font-size:19px;line-height:1.3;color:{primary};">{_inline(line[3:].strip())}</h2>'
            )
        elif re.match(r"^###\s+", line):
            close_list()
            html_parts.append(
                f'<h3 style="margin:18px 0 8px;font-size:16px;line-height:1.3;color:#0E1726;">{_inline(line[4:].strip())}</h3>'
            )
        elif re.match(r"^(\-\-\-|\*\*\*|___)\s*$", line):
            close_list()
            html_parts.append(
                f'<hr style="border:0;border-top:2px solid {accent};margin:24px 0;" />'
            )
        elif re.match(r"^[-*]\s+", line):
            if not in_list:
                html_parts.append('<ul style="margin:8px 0 8px 0;padding-left:22px;">')
                in_list = True
            html_parts.append(
                f'<li style="margin:4px 0;font-size:15px;line-height:1.6;color:#243049;">{_inline(line[2:].strip())}</li>'
            )
        else:
            close_list()
            html_parts.append(
                f'<p style="margin:10px 0;font-size:15px;line-height:1.7;color:#243049;">{_inline(line.strip())}</p>'
            )

    close_list()
    return "\n".join(html_parts)


def _readable_text_on(hex_color: str) -> str:
    """Pick black or white text for legibility on a given background colour."""
    c = (hex_color or "").lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    try:
        r, g, b = (int(c[i : i + 2], 16) for i in (0, 2, 4))
    except (ValueError, IndexError):
        return "#0E1726"
    # Rec.601 luma; bright backgrounds get dark text, dark backgrounds get white.
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    return "#0E1726" if luma >= 0.6 else "#FFFFFF"


def render_email_html(
    *,
    subject: str,
    markdown_body: str,
    header_image_url: str | None = None,
    brand: dict[str, Any] | None = None,
    cta_text: str | None = None,
    cta_url: str | None = None,
) -> str:
    """Return a complete, email-client-safe HTML document for the newsletter."""
    primary, accent, name = _brand_bits(brand)
    safe_subject = html.escape(subject or name)
    body_html = markdown_to_email_html(markdown_body, primary, accent)

    header_img = ""
    if header_image_url:
        header_img = (
            f'<tr><td style="padding:0;">'
            f'<img src="{html.escape(header_image_url)}" alt="" width="600" '
            f'style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></td></tr>'
        )

    # Always render a branded call-to-action button. Falls back to a sensible
    # default label and the brand website when the writer didn't supply a CTA.
    website = (brand or {}).get("website") if brand else None
    button_text = (cta_text or "Read more").strip()
    button_href = html.escape(cta_url or website or "#")
    btn_text_color = _readable_text_on(primary)
    cta_block = (
        f'<tr><td align="center" style="padding:8px 32px 32px;">'
        f'<a href="{button_href}" style="display:inline-block;background:{primary};color:{btn_text_color};'
        f'text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;">'
        f"{html.escape(button_text)}</a></td></tr>"
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>{safe_subject}</title>
</head>
<body style="margin:0;padding:0;background:#F1F3F8;-webkit-font-smoothing:antialiased;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F3F8;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(16,23,38,0.08);">
<tr><td style="height:6px;background:linear-gradient(90deg,{primary},{accent});font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px 32px 8px;">
<span style="display:inline-block;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:{accent};">{html.escape(name)}</span>
<h1 style="margin:8px 0 0;font-size:26px;line-height:1.25;color:#0E1726;">{safe_subject}</h1>
</td></tr>
{header_img}
<tr><td style="padding:16px 32px 8px;">
{body_html}
</td></tr>
{cta_block}
<tr><td style="padding:20px 32px;background:#0E1726;color:#AEB6C6;font-size:12px;line-height:1.6;">
You're receiving this because you subscribed to {html.escape(name)}.<br/>
&copy; {html.escape(name)}. All rights reserved.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""
