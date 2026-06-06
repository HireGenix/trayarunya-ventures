"""Branded transactional email templates (HTML + plain text).

Kept dependency-free and defensive: callers should treat sending as
best-effort. The :func:`send_welcome_email` helper composes the message and
hands it to :mod:`app.services.notify_channels`.
"""
from __future__ import annotations

import logging

from app.config import settings
from app.services.notify_channels import send_email

log = logging.getLogger("emails")

_AMBER = "#FFAF06"
_TEAL = "#14BB87"
_INK = "#0E1116"


def _shell(title: str, body_html: str, *, cta_label: str | None = None, cta_url: str | None = None) -> str:
    cta = ""
    if cta_label and cta_url:
        cta = (
            f'<tr><td style="padding:8px 0 4px;">'
            f'<a href="{cta_url}" '
            f'style="display:inline-block;background:linear-gradient(135deg,{_AMBER},{_TEAL});'
            f'color:#0E1116;text-decoration:none;font-weight:700;font-size:15px;'
            f'padding:13px 26px;border-radius:10px;">{cta_label}</a>'
            f"</td></tr>"
        )
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F6F7F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{_INK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(14,17,22,0.08);">
<tr><td style="background:{_INK};padding:22px 32px;">
<span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">Market<span style="color:{_AMBER};">iQ</span> <span style="color:{_TEAL};font-size:13px;">AI</span></span>
</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-0.02em;">{title}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.6;color:#384047;">
{body_html}
{cta}
</table>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #EDEFF2;font-size:12px;color:#8A929B;">
You're receiving this because an account was created for you on MarketiQ AI.<br>
&copy; MarketiQ AI &middot; <a href="{settings.public_web_url}" style="color:{_TEAL};text-decoration:none;">{settings.public_web_url.replace('https://','').replace('http://','')}</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


async def send_welcome_email(
    *,
    to: str,
    full_name: str,
    org_name: str,
    plan_name: str,
    temp_password: str | None = None,
) -> bool:
    """Send the branded welcome email. Returns False if not configured / failed."""
    if not settings.email_configured:
        return False

    login_url = f"{settings.public_web_url.rstrip('/')}/login"
    first = (full_name or "there").split(" ")[0]

    rows = [
        f'<tr><td style="padding:4px 0;">Hi {first}, your MarketiQ AI workspace '
        f'<b>{org_name}</b> is ready on the <b>{plan_name}</b> plan.</td></tr>'
    ]
    if temp_password:
        rows.append(
            '<tr><td style="padding:14px 0 4px;">'
            '<table role="presentation" cellpadding="0" cellspacing="0" '
            'style="background:#F6F7F9;border-radius:10px;padding:14px 16px;width:100%;">'
            f'<tr><td style="font-size:13px;color:#8A929B;padding-bottom:4px;">Email</td></tr>'
            f'<tr><td style="font-size:15px;font-weight:600;padding-bottom:10px;">{to}</td></tr>'
            f'<tr><td style="font-size:13px;color:#8A929B;padding-bottom:4px;">Temporary password</td></tr>'
            f'<tr><td style="font-size:15px;font-weight:700;font-family:monospace;">{temp_password}</td></tr>'
            '</table></td></tr>'
            '<tr><td style="padding:10px 0 4px;font-size:13px;color:#8A929B;">'
            'For your security, change this password after your first sign-in.</td></tr>'
        )
    else:
        rows.append(
            '<tr><td style="padding:10px 0 4px;">Sign in any time to start planning, '
            'researching and shipping campaigns with your agentic marketing team.</td></tr>'
        )

    body_html = "\n".join(rows)
    html = _shell(
        "Welcome to MarketiQ AI",
        body_html,
        cta_label="Open your workspace",
        cta_url=login_url,
    )

    text_lines = [
        f"Hi {first},",
        "",
        f"Your MarketiQ AI workspace '{org_name}' is ready on the {plan_name} plan.",
    ]
    if temp_password:
        text_lines += [
            "",
            f"Email: {to}",
            f"Temporary password: {temp_password}",
            "Please change this password after your first sign-in.",
        ]
    text_lines += ["", f"Sign in: {login_url}", "", "— The MarketiQ AI team"]
    text = "\n".join(text_lines)

    return await send_email(to, "Welcome to MarketiQ AI", text, html=html)
