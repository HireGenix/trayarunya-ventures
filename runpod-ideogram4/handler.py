"""RunPod Serverless handler for Ideogram 4 FP8 text-to-image generation."""

import base64
import io
import os
import sys
import time
import threading

import runpod
import torch

_pipeline = None
_load_error = None
_load_event = threading.Event()

WEIGHTS_REPO = os.getenv("WEIGHTS_REPO", "ideogram-ai/ideogram-4-fp8")


def _load_pipeline():
    """Download and initialise the Ideogram 4 pipeline (background thread)."""
    global _pipeline, _load_error
    try:
        hf_token = os.environ.get("HF_TOKEN", "")
        if hf_token:
            os.environ["HF_TOKEN"] = hf_token

        # Vendored ideogram4 package is at /workspace/ideogram4
        vendor_dir = "/workspace"
        if vendor_dir not in sys.path:
            sys.path.insert(0, vendor_dir)

        from ideogram4 import Ideogram4Pipeline, Ideogram4PipelineConfig

        print(f"[loader] Loading {WEIGHTS_REPO} on cuda (bfloat16)...")
        config = Ideogram4PipelineConfig(weights_repo=WEIGHTS_REPO)
        _pipeline = Ideogram4Pipeline.from_pretrained(
            config=config, device="cuda", dtype=torch.bfloat16,
        )
        print("[loader] ✅ Pipeline ready")
    except Exception as exc:
        _load_error = exc
        import traceback
        traceback.print_exc()
        print(f"[loader] ❌ {exc}")
    finally:
        _load_event.set()


# Start loading immediately on container startup
print("[init] Starting background model load...")
threading.Thread(target=_load_pipeline, daemon=True).start()


def handler(job):
    """Generate an image from a text prompt."""
    inp = job.get("input", {})
    prompt = inp.get("prompt", "")
    if not prompt:
        return {"error": "input.prompt is required"}

    width = int(inp.get("width", 1024))
    height = int(inp.get("height", 1024))
    num_steps = int(inp.get("num_steps", 50))
    guidance_scale = float(inp.get("guidance_scale", 3.0))
    seed = int(inp.get("seed", 0))

    if not _load_event.is_set():
        print("[handler] Waiting for model to finish loading...")
        _load_event.wait(timeout=1800)

    if _load_error:
        return {"error": f"Model load failed: {_load_error}"}
    if _pipeline is None:
        return {"error": "Model not loaded (timeout)"}

    print(f"[handler] Generating: '{prompt[:80]}' ({width}x{height}, steps={num_steps})")
    t0 = time.time()

    images = _pipeline(
        prompts=prompt,
        height=height,
        width=width,
        num_steps=num_steps,
        guidance_scale=guidance_scale,
        seed=seed,
        raise_on_caption_issues=False,
    )

    elapsed = time.time() - t0
    print(f"[handler] Done in {elapsed:.1f}s")

    buf = io.BytesIO()
    images[0].save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "image_base64": img_b64,
        "format": "png",
        "width": width,
        "height": height,
        "elapsed_seconds": round(elapsed, 1),
    }


runpod.serverless.start({"handler": handler})
