"""CRO stats — Bayesian probability-to-be-best + sequential safety guard.

Adds a Bayesian Beta-Binomial P(best) computation alongside the existing
frequentist z-test in cro_experiments.py. Also provides a min-sample guard
for sequential testing safety.

Does NOT replace the existing z-test — these are additive helper functions.
"""
from __future__ import annotations

import math
import random
from typing import Any

# Minimum total sample before ANY winner call (sequential safety)
MIN_TOTAL_SAMPLE = 100
MIN_PER_ARM_SAMPLE = 30


def beta_prob_best(
    variants: list[dict[str, Any]], *, n_simulations: int = 10000
) -> list[dict[str, Any]]:
    """Compute P(best) for each variant via Monte-Carlo Beta-Binomial sampling.

    For each variant with (conversions, exposures), draw from
    Beta(1 + conversions, 1 + exposures - conversions) and count how often
    each variant produces the highest draw.

    Uses a fixed seed for reproducibility within a single call.
    """
    arms: list[dict[str, Any]] = []
    for v in variants:
        if not isinstance(v, dict):
            continue
        conv = int(v.get("conversions", 0) or 0)
        exp = int(v.get("exposures", 0) or 0)
        alpha = 1.0 + conv
        beta_param = 1.0 + max(0, exp - conv)
        arms.append({
            "key": v.get("key", ""),
            "label": v.get("label", v.get("key", "")),
            "alpha": alpha,
            "beta": beta_param,
            "conversions": conv,
            "exposures": exp,
        })

    if not arms:
        return []

    rng = random.Random(42)  # deterministic within a call
    win_counts = [0] * len(arms)

    for _ in range(n_simulations):
        draws = []
        for arm in arms:
            # Beta distribution via gamma sampling
            x = _beta_sample(rng, arm["alpha"], arm["beta"])
            draws.append(x)
        best_idx = max(range(len(draws)), key=lambda i: draws[i])
        win_counts[best_idx] += 1

    results: list[dict[str, Any]] = []
    for i, arm in enumerate(arms):
        p_best = win_counts[i] / n_simulations
        results.append({
            "key": arm["key"],
            "label": arm["label"],
            "prob_best": round(p_best, 4),
            "posterior_alpha": arm["alpha"],
            "posterior_beta": arm["beta"],
            "posterior_mean": round(arm["alpha"] / (arm["alpha"] + arm["beta"]), 4),
        })

    return results


def _beta_sample(rng: random.Random, alpha: float, beta: float) -> float:
    """Sample from Beta(alpha, beta) using the gamma method."""
    if alpha <= 0:
        alpha = 0.001
    if beta <= 0:
        beta = 0.001
    x = rng.gammavariate(alpha, 1.0)
    y = rng.gammavariate(beta, 1.0)
    if x + y == 0:
        return 0.5
    return x / (x + y)


def sequential_safety_check(
    variants: list[dict[str, Any]],
) -> dict[str, Any]:
    """Check if we have enough data for a valid winner declaration.

    Returns a guard result indicating whether it's safe to call a winner
    based on minimum sample requirements for sequential testing.
    """
    total_exposures = sum(
        int(v.get("exposures", 0) or 0) for v in variants if isinstance(v, dict)
    )
    per_arm_min = min(
        (int(v.get("exposures", 0) or 0) for v in variants if isinstance(v, dict)),
        default=0,
    )

    safe = total_exposures >= MIN_TOTAL_SAMPLE and per_arm_min >= MIN_PER_ARM_SAMPLE

    return {
        "safe_to_call": safe,
        "total_exposures": total_exposures,
        "min_per_arm": per_arm_min,
        "required_total": MIN_TOTAL_SAMPLE,
        "required_per_arm": MIN_PER_ARM_SAMPLE,
        "reason": (
            None if safe
            else (
                f"Need at least {MIN_TOTAL_SAMPLE} total and "
                f"{MIN_PER_ARM_SAMPLE} per arm. "
                f"Currently: {total_exposures} total, {per_arm_min} min per arm."
            )
        ),
    }


def enhanced_evaluate(
    variant_results: list[dict[str, Any]],
    z_test_evaluation: dict[str, Any],
) -> dict[str, Any]:
    """Enhance the existing z-test evaluation with Bayesian P(best) + safety.

    Takes the existing z-test evaluation result and adds:
    - bayesian_prob_best: P(best) for each variant
    - sequential_safety: whether we have enough data
    - enhanced_verdict: combined verdict respecting both checks
    """
    safety = sequential_safety_check(variant_results)
    bayesian = beta_prob_best(variant_results)

    # Enhanced verdict: only call winner if BOTH z-test significant AND safe
    z_verdict = z_test_evaluation.get("verdict", "needs_more_data")
    z_winner = z_test_evaluation.get("winner_key")

    if z_verdict == "significant" and safety["safe_to_call"] and z_winner:
        enhanced_verdict = "significant"
    elif not safety["safe_to_call"]:
        enhanced_verdict = "needs_more_data"
    else:
        enhanced_verdict = z_verdict

    return {
        **z_test_evaluation,
        "bayesian_prob_best": bayesian,
        "sequential_safety": safety,
        "enhanced_verdict": enhanced_verdict,
    }
