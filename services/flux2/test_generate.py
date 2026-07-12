from __future__ import annotations

import argparse
import json
import resource
import time
from pathlib import Path

import torch
from diffusers import Flux2KleinPipeline
from PIL import Image


MODEL_ID = "black-forest-labs/FLUX.2-klein-4B"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local FLUX.2 Klein 4B MPS smoke test")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", type=Path, default=Path("services/flux2/output"))
    parser.add_argument("--width", type=int, default=512)
    parser.add_argument("--height", type=int, default=512)
    parser.add_argument("--pixel-size", type=int, default=128)
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--dtype", choices=("float16", "bfloat16"), default="bfloat16")
    return parser.parse_args()


def synchronize() -> None:
    if torch.backends.mps.is_available():
        torch.mps.synchronize()


def main() -> None:
    args = parse_args()
    if not torch.backends.mps.is_available():
        raise RuntimeError("PyTorch MPS is not available")
    if args.width % 16 or args.height % 16:
        raise ValueError("Width and height must be divisible by 16")

    dtype = torch.bfloat16 if args.dtype == "bfloat16" else torch.float16
    args.output.mkdir(parents=True, exist_ok=True)

    load_started = time.perf_counter()
    pipeline = Flux2KleinPipeline.from_pretrained(MODEL_ID, torch_dtype=dtype)
    pipeline = pipeline.to("mps")
    synchronize()
    load_seconds = time.perf_counter() - load_started

    generation_started = time.perf_counter()
    with torch.inference_mode():
        image = pipeline(
            prompt=args.prompt,
            height=args.height,
            width=args.width,
            guidance_scale=1.0,
            num_inference_steps=args.steps,
            generator=torch.Generator(device="cpu").manual_seed(args.seed),
        ).images[0]
    synchronize()
    generation_seconds = time.perf_counter() - generation_started

    full_path = args.output / "flux2-full.png"
    pixel_path = args.output / "flux2-pixel.png"
    image.save(full_path)
    image.resize((args.pixel_size, args.pixel_size), Image.Resampling.NEAREST).save(pixel_path)

    report = {
        "model": MODEL_ID,
        "device": "mps",
        "dtype": args.dtype,
        "sourceSize": [args.width, args.height],
        "pixelSize": [args.pixel_size, args.pixel_size],
        "steps": args.steps,
        "seed": args.seed,
        "loadSeconds": round(load_seconds, 3),
        "generationSeconds": round(generation_seconds, 3),
        "maxResidentMemoryGiB": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024**3, 3),
        "mpsCurrentAllocatedGiB": round(torch.mps.current_allocated_memory() / 1024**3, 3),
        "mpsDriverAllocatedGiB": round(torch.mps.driver_allocated_memory() / 1024**3, 3),
        "fullImage": str(full_path.resolve()),
        "pixelImage": str(pixel_path.resolve()),
    }
    (args.output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
