from __future__ import annotations

import json
import time
from pathlib import Path

import torch
from diffusers import Flux2KleinPipeline


MODEL_ID = "black-forest-labs/FLUX.2-klein-4B"
PROMPT = "A single slime entity influenced by fire, water, and lightning; solid faceted form, luminous reflective surface, abstract isolated entity, no text"
CASES = [
    (512, 512, 4),
    (256, 256, 4),
    (128, 128, 4),
    (256, 256, 2),
    (256, 256, 1),
    (192, 192, 2),
    (192, 192, 1),
    (128, 128, 2),
    (128, 128, 1),
]


def generate(pipeline: Flux2KleinPipeline, width: int, height: int, steps: int, seed: int):
    started = time.perf_counter()
    with torch.inference_mode():
        image = pipeline(
            prompt=PROMPT,
            width=width,
            height=height,
            num_inference_steps=steps,
            guidance_scale=1.0,
            generator=torch.Generator(device="cpu").manual_seed(seed),
        ).images[0]
    torch.mps.synchronize()
    return image, time.perf_counter() - started


def main() -> None:
    output = Path("services/flux2/output/benchmark")
    output.mkdir(parents=True, exist_ok=True)
    pipeline = Flux2KleinPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16).to("mps")
    torch.mps.synchronize()

    results = []
    for width, height, steps in CASES:
        _, compile_seconds = generate(pipeline, width, height, steps, 42)
        image, warm_seconds = generate(pipeline, width, height, steps, 42)
        path = output / f"flux2-{width}x{height}-{steps}steps.png"
        image.save(path)
        results.append({
            "width": width,
            "height": height,
            "steps": steps,
            "firstRunSeconds": round(compile_seconds, 3),
            "warmRunSeconds": round(warm_seconds, 3),
            "output": str(path.resolve()),
        })

    report = {
        "model": MODEL_ID,
        "device": "mps",
        "dtype": "bfloat16",
        "mpsCurrentAllocatedGiB": round(torch.mps.current_allocated_memory() / 1024**3, 3),
        "mpsDriverAllocatedGiB": round(torch.mps.driver_allocated_memory() / 1024**3, 3),
        "cases": results,
    }
    (output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
