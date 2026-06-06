"""Guardrails service: policy CRUD, deterministic content scans, aggregation.

All numbers come from real ``GuardrailCheck`` / ``GuardrailPolicy`` rows. The
deterministic scans (banned terms, required-disclaimer presence, reading level)
are pure functions over the submitted text — never random. The AI voice/claims
evaluation lives in :mod:`app.agents.guardrails_agent` and is merged on top.
"""
from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.guardrails import GuardrailCheck, GuardrailPolicy

_WORD_RE = re.compile(r"[A-Za-z0-9']+")
_SENTENCE_RE = re.compile(r"[.!?]+")


# --------------------------------------------------------------------------- #
# Policy CRUD
# --------------------------------------------------------------------------- #
async def list_policies(db: AsyncSession, ws_id: uuid.UUID) -> list[GuardrailPolicy]:
    res = await db.execute(
        select(GuardrailPolicy)
        .where(GuardrailPolicy.workspace_id == ws_id)
        .order_by(GuardrailPolicy.created_at.desc())
    )
    return list(res.scalars().all())


async def active_policies(db: AsyncSession, ws_id: uuid.UUID) -> list[GuardrailPolicy]:
    res = await db.execute(
        select(GuardrailPolicy).where(
            GuardrailPolicy.workspace_id == ws_id,
            GuardrailPolicy.is_active.is_(True),
        )
    )
    return list(res.scalars().all())


async def get_policy(
    db: AsyncSession, ws_id: uuid.UUID, policy_id: uuid.UUID
) -> GuardrailPolicy | None:
    res = await db.execute(
        select(GuardrailPolicy).where(
            GuardrailPolicy.id == policy_id,
            GuardrailPolicy.workspace_id == ws_id,
        )
    )
    return res.scalar_one_or_none()


async def create_policy(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    name: str,
    kind: str,
    config: dict | None,
    severity: str,
    is_active: bool = True,
) -> GuardrailPolicy:
    obj = GuardrailPolicy(
        workspace_id=ws_id,
        name=name,
        kind=kind,
        config=config or {},
        severity=severity,
        is_active=is_active,
    )
    db.add(obj)
    await db.flush()
    return obj


async def update_policy(
    db: AsyncSession, policy: GuardrailPolicy, changes: dict[str, Any]
) -> GuardrailPolicy:
    for field in ("name", "kind", "config", "severity", "is_active"):
        if field in changes and changes[field] is not None:
            setattr(policy, field, changes[field])
    await db.flush()
    return policy


# --------------------------------------------------------------------------- #
# Deterministic scans — pure, real, never random
# --------------------------------------------------------------------------- #
def reading_level(text: str) -> dict[str, float]:
    """A simple Flesch-Kincaid grade estimate via word/sentence/syllable counts."""
    words = _WORD_RE.findall(text)
    n_words = len(words)
    sentences = [s for s in _SENTENCE_RE.split(text) if s.strip()]
    n_sentences = max(1, len(sentences))
    syllables = sum(_count_syllables(w) for w in words) or n_words
    if n_words == 0:
        return {"grade": 0.0, "words": 0, "sentences": 0, "avg_sentence_words": 0.0}
    grade = (
        0.39 * (n_words / n_sentences)
        + 11.8 * (syllables / n_words)
        - 15.59
    )
    return {
        "grade": round(max(0.0, grade), 1),
        "words": float(n_words),
        "sentences": float(n_sentences),
        "avg_sentence_words": round(n_words / n_sentences, 1),
    }


def _count_syllables(word: str) -> int:
    word = word.lower()
    vowels = "aeiouy"
    count, prev = 0, False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev:
            count += 1
        prev = is_vowel
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)


def _find_span(text: str, needle: str) -> list[int] | None:
    idx = text.lower().find(needle.lower())
    if idx < 0:
        return None
    return [idx, idx + len(needle)]


def scan_policy(text: str, policy: GuardrailPolicy) -> list[dict[str, Any]]:
    """Run the deterministic checks for one policy. Returns violation dicts."""
    cfg = policy.config or {}
    out: list[dict[str, Any]] = []
    sev = policy.severity or "medium"

    # Banned terms (literal, case-insensitive)
    for term in cfg.get("banned_words", []) or []:
        term = str(term).strip()
        if not term:
            continue
        span = _find_span(text, term)
        if span is not None:
            out.append(
                {
                    "policy": policy.name,
                    "severity": sev,
                    "span": span,
                    "message": f"Banned term '{term}' is not allowed by policy '{policy.name}'.",
                    "suggestion": f"Remove or replace '{term}' with an on-brand alternative.",
                }
            )

    # Required disclaimers must be present somewhere in the text
    for disc in cfg.get("required_disclaimers", []) or []:
        disc = str(disc).strip()
        if not disc:
            continue
        if disc.lower() not in text.lower():
            out.append(
                {
                    "policy": policy.name,
                    "severity": sev,
                    "span": None,
                    "message": f"Required disclaimer is missing: \"{disc[:80]}\".",
                    "suggestion": f"Append the disclaimer: \"{disc}\".",
                }
            )

    # Reading-level ceiling
    target = cfg.get("reading_level")
    if isinstance(target, (int, float)) and target > 0:
        rl = reading_level(text)
        if rl["grade"] > float(target):
            out.append(
                {
                    "policy": policy.name,
                    "severity": sev,
                    "span": None,
                    "message": (
                        f"Reading level grade {rl['grade']} exceeds the target of "
                        f"{target} (avg {rl['avg_sentence_words']} words/sentence)."
                    ),
                    "suggestion": "Shorten sentences and prefer simpler words.",
                }
            )

    return out


def deterministic_scan(
    text: str, policies: list[GuardrailPolicy]
) -> list[dict[str, Any]]:
    violations: list[dict[str, Any]] = []
    for p in policies:
        violations.extend(scan_policy(text, p))
    return violations


_SEVERITY_WEIGHT = {"low": 6, "medium": 12, "high": 22, "critical": 35}


def score_from_violations(violations: list[dict[str, Any]]) -> int:
    penalty = sum(_SEVERITY_WEIGHT.get(str(v.get("severity", "medium")), 12) for v in violations)
    return int(max(0, min(100, 100 - penalty)))


# --------------------------------------------------------------------------- #
# Check persistence + reads
# --------------------------------------------------------------------------- #
async def list_checks(
    db: AsyncSession, ws_id: uuid.UUID, limit: int = 50
) -> list[GuardrailCheck]:
    res = await db.execute(
        select(GuardrailCheck)
        .where(GuardrailCheck.workspace_id == ws_id)
        .order_by(GuardrailCheck.created_at.desc())
        .limit(limit)
    )
    return list(res.scalars().all())


async def get_check(
    db: AsyncSession, ws_id: uuid.UUID, check_id: uuid.UUID
) -> GuardrailCheck | None:
    res = await db.execute(
        select(GuardrailCheck).where(
            GuardrailCheck.id == check_id,
            GuardrailCheck.workspace_id == ws_id,
        )
    )
    return res.scalar_one_or_none()


async def save_check(
    db: AsyncSession,
    ws_id: uuid.UUID,
    *,
    content_text: str,
    content_ref: str | None,
    policies_run: list[str],
    score: int,
    passed: bool,
    violations: list[dict[str, Any]],
    status: str = "complete",
) -> GuardrailCheck:
    obj = GuardrailCheck(
        workspace_id=ws_id,
        content_ref=content_ref,
        content_text=content_text,
        policies_run=policies_run,
        score=score,
        passed=passed,
        violations=violations,
        status=status,
    )
    db.add(obj)
    await db.flush()
    return obj


# --------------------------------------------------------------------------- #
# Aggregation — real rollups from stored checks
# --------------------------------------------------------------------------- #
async def overview(db: AsyncSession, ws_id: uuid.UUID) -> dict[str, Any]:
    rows = (
        await db.execute(
            select(GuardrailCheck).where(GuardrailCheck.workspace_id == ws_id)
        )
    ).scalars().all()

    total = len(rows)
    passed = sum(1 for r in rows if r.passed)
    avg_score = round(sum(r.score for r in rows) / total, 1) if total else 0.0
    pass_rate = round(100.0 * passed / total, 1) if total else 0.0

    # Count violations by policy/message for the "top violations" panel.
    counter: dict[str, dict[str, Any]] = {}
    open_violations = 0
    for r in rows:
        for v in r.violations or []:
            open_violations += 1
            key = str(v.get("policy") or v.get("message") or "unknown")
            entry = counter.setdefault(
                key,
                {"policy": key, "count": 0, "severity": v.get("severity", "medium")},
            )
            entry["count"] += 1

    top = sorted(counter.values(), key=lambda e: e["count"], reverse=True)[:8]

    active_count = (
        await db.execute(
            select(func.count())
            .select_from(GuardrailPolicy)
            .where(
                GuardrailPolicy.workspace_id == ws_id,
                GuardrailPolicy.is_active.is_(True),
            )
        )
    ).scalar_one()

    return {
        "checks_run": total,
        "passed": passed,
        "pass_rate": pass_rate,
        "avg_brand_fit": avg_score,
        "open_violations": open_violations,
        "active_policies": int(active_count or 0),
        "top_violations": top,
    }
