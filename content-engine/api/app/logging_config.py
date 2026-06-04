"""Centralised logging configuration with optional JSON output and PII redaction.

Production defaults to structured JSON logs so they can be shipped to a log
aggregator. A redaction filter scrubs obvious secrets (tokens, passwords, keys)
from log records to avoid leaking credentials.
"""
from __future__ import annotations

import json
import logging
import re
import sys

from app.config import settings

_SECRET_PATTERNS = [
    re.compile(r"(?i)(authorization\s*[:=]\s*)(bearer\s+)?[A-Za-z0-9\-_\.=]+"),
    re.compile(r"(?i)(api[_-]?key\s*[:=]\s*)[A-Za-z0-9\-_\.]+"),
    re.compile(r"(?i)(password\s*[:=]\s*)\S+"),
    re.compile(r"(?i)(secret\s*[:=]\s*)\S+"),
    re.compile(r"(?i)(token\s*[:=]\s*)[A-Za-z0-9\-_\.]+"),
    re.compile(r"sk-[A-Za-z0-9]{12,}"),
]


def _redact(message: str) -> str:
    for pat in _SECRET_PATTERNS:
        message = pat.sub(lambda m: (m.group(1) if m.lastindex else "") + "***", message)
    return message


class RedactionFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        try:
            if isinstance(record.msg, str):
                record.msg = _redact(record.msg)
        except Exception:  # noqa: BLE001
            pass
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # The access logger already emits JSON strings; pass them through.
        if record.name == "app.access" and isinstance(record.msg, str) and record.msg.startswith("{"):
            return record.getMessage()
        payload = {
            "ts": record.created,
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)


_CONFIGURED = False


def configure_logging() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    _CONFIGURED = True

    root = logging.getLogger()
    root.setLevel(logging.DEBUG if settings.debug else logging.INFO)

    # Remove existing handlers to avoid duplicate lines under reloaders.
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RedactionFilter())
    if settings.log_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
        )
    root.addHandler(handler)
