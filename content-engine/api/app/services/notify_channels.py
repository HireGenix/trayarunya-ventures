"""External notification channels: email (SMTP) + Slack.

In-app notifications are created by :mod:`app.services.notifications`. This
module fans those out to the operator's external channels so important alerts
(errors / warnings) surface where the team actually works. Every function is
defensive: a misconfigured or down channel must never break the caller, so all
failures are caught, logged and reported as ``False``/``None``.
"""
from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import settings

log = logging.getLogger("notify_channels")

_HTTP_TIMEOUT = 15.0


def _send_email_blocking(to: str, subject: str, body: str) -> bool:
    """Synchronous SMTP send; run via ``asyncio.to_thread``."""
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body or "")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=_HTTP_TIMEOUT) as server:
        server.ehlo()
        try:
            server.starttls()
            server.ehlo()
        except smtplib.SMTPException:
            # Server may not support STARTTLS (e.g. local relay) — continue.
            pass
        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)
    return True


async def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email via SMTP.

    Returns ``False`` when email is not configured or any error occurs.
    """
    if not settings.email_configured:
        return False
    if not to:
        return False
    try:
        return await asyncio.to_thread(_send_email_blocking, to, subject, body)
    except Exception:  # noqa: BLE001 — a mail outage must never break the caller
        log.exception("send_email failed (to=%s subject=%s)", to, subject)
        return False


async def send_slack(text: str) -> bool:
    """POST a message to the configured Slack incoming webhook.

    Returns ``False`` when Slack is not configured or any error occurs.
    """
    if not settings.slack_configured:
        return False
    if not text:
        return False
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            res = await client.post(settings.slack_webhook_url, json={"text": text})
        res.raise_for_status()
        return True
    except Exception:  # noqa: BLE001 — Slack downtime must never break the caller
        log.exception("send_slack failed")
        return False


async def fan_out(level: str, title: str, body: str | None = None, *, email: str | None = None) -> None:
    """Fan a notification out to external channels. Never raises.

    - Slack: always attempted (when configured), for any level.
    - Email: only for ``error``/``warning`` levels, and only when an ``email``
      recipient (e.g. the workspace owner) is supplied.
    """
    try:
        lvl = (level or "").lower()
        slack_text = f"[{lvl or 'info'}] {title}"
        if body:
            slack_text += f"\n{body}"
        await send_slack(slack_text)

        if lvl in ("error", "warning") and email:
            subject = f"[{lvl}] {title}"
            await send_email(email, subject, body or title)
    except Exception:  # noqa: BLE001 — fan-out is best-effort, never fatal
        log.exception("fan_out failed (level=%s title=%s)", level, title)
