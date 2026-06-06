"""Email tracking helpers: token signing, HTML instrumentation, pixel bytes."""
from __future__ import annotations

import hashlib
import hmac
import re
import uuid
from base64 import urlsafe_b64decode, urlsafe_b64encode
from urllib.parse import quote, urlencode

from app.config import settings

# 1×1 transparent GIF (43 bytes).
TRANSPARENT_GIF = (
    b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00"
    b"\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x00\x00\x00\x00"
    b"\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02"
    b"\x44\x01\x00\x3b"
)

_KEY = lambda: settings.jwt_secret.encode()


def mint_token(send_log_id: uuid.UUID) -> str:
    """Create an HMAC-signed, URL-safe token encoding a send-log UUID."""
    raw = send_log_id.bytes
    sig = hmac.new(_KEY(), raw, hashlib.sha256).digest()[:10]
    return urlsafe_b64encode(raw + sig).decode().rstrip("=")


def verify_token(token: str) -> uuid.UUID | None:
    """Verify + decode a tracking token. Returns the send-log UUID or None."""
    # Re-pad base64
    padded = token + "=" * (-len(token) % 4)
    try:
        data = urlsafe_b64decode(padded)
    except Exception:
        return None
    if len(data) != 26:  # 16 bytes UUID + 10 bytes sig
        return None
    raw, sig = data[:16], data[16:]
    expected = hmac.new(_KEY(), raw, hashlib.sha256).digest()[:10]
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        return uuid.UUID(bytes=raw)
    except Exception:
        return None


def tracking_base_url() -> str:
    """Return the public base for tracking URLs (no trailing slash)."""
    return settings.public_api_url.rstrip("/")


def open_pixel_url(token: str) -> str:
    base = tracking_base_url()
    return f"{base}/email/t/o/{token}.gif"


def click_url(token: str, original_url: str) -> str:
    base = tracking_base_url()
    return f"{base}/email/t/c/{token}?u={quote(original_url, safe='')}"


_HREF_RE = re.compile(r'(<a\b[^>]*\bhref\s*=\s*["\'])([^"\']+)(["\'])', re.IGNORECASE)


def instrument_html(html: str, token: str, base_url: str | None = None) -> str:
    """Append an open pixel and rewrite <a href> links for click tracking.

    Returns the modified HTML string.
    """
    if not html or not token:
        return html or ""

    # Rewrite links
    def _rewrite(m: re.Match) -> str:
        prefix, href, suffix = m.group(1), m.group(2), m.group(3)
        # Skip mailto:, tel:, and anchor links
        if href.startswith(("mailto:", "tel:", "#", "{{")):
            return m.group(0)
        return f"{prefix}{click_url(token, href)}{suffix}"

    out = _HREF_RE.sub(_rewrite, html)

    # Append open pixel before </body> or at end
    pixel = f'<img src="{open_pixel_url(token)}" width="1" height="1" alt="" style="display:none" />'
    if "</body>" in out.lower():
        out = re.sub(r"(</body>)", pixel + r"\1", out, count=1, flags=re.IGNORECASE)
    else:
        out += pixel

    return out
