"""RunPod Serverless handler for Ideogram 4 FP8 text-to-image generation.

Optimised: RunPod model caching + FlashBoot, 20 steps, cuDNN benchmark,
CUDA warm-up, JPEG output.
"""

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

# RunPod model caching: models are pre-cached on host at this path.
# Setting HF_HOME tells huggingface_hub to look here first (no download).
RUNPOD_CACHE = "/runpod-volume/huggingface-cache"
if os.path.isdir(RUNPOD_CACHE):
    os.environ["HF_HOME"] = RUNPOD_CACHE
    print(f"[init] Using RunPod cached models at {RUNPOD_CACHE}")
else:
    print("[init] No RunPod model cache found, will download from HuggingFace")


def _load_pipeline():
    """Load the Ideogram 4 pipeline (from cache or HuggingFace)."""
    global _pipeline, _load_error
    try:
        hf_token = os.environ.get("HF_TOKEN", "")
        if hf_token:
            os.environ["HF_TOKEN"] = hf_token

        vendor_dir = "/workspace"
        if vendor_dir not in sys.path:
            sys.path.insert(0, vendor_dir)

        from ideogram4 import Ideogram4Pipeline, Ideogram4PipelineConfig

        t_start = time.time()
        print(f"[loader] Loading {WEIGHTS_REPO} on cuda (bfloat16)...")
        config = Ideogram4PipelineConfig(weights_repo=WEIGHTS_REPO)
        _pipeline = Ideogram4Pipeline.from_pretrained(
            config=config, device="cuda", dtype=torch.bfloat16,
        )
        print(f"[loader] Model loaded in {time.time() - t_start:.1f}s")

        torch.backends.cudnn.benchmark = True

        # Warm-up: primes CUDA kernels so first real request is fast
        print("[loader] Warm-up inference...")
        t0 = time.time()
        _pipeline(
            prompts="warmup", height=1024, width=1024,
            num_steps=2, guidance_scale=3.0, seed=0,
            raise_on_caption_issues=False,
        )
        print(f"[loader] Warm-up done in {time.time() - t0:.1f}s")
        print("[loader] ✅ Pipeline ready")
    except Exception as exc:
        _load_error = exc
        import traceback
        traceback.print_exc()
        print(f"[loader] ❌ {exc}")
    finally:
        _load_event.set()


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
    num_steps = int(inp.get("num_steps", 20))
    guidance_scale = float(inp.get("guidance_scale", 5.0))
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
    images[0].save(buf, format="JPEG", quality=90)
    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "image_base64": img_b64,
        "format": "jpeg",
        "width": width,
        "height": height,
        "elapsed_seconds": round(elapsed, 1),
    }


runpod.serverless.start({"handler": handler})
