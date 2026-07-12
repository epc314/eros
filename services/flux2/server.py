from __future__ import annotations

import base64
import io
import threading
import time
from contextlib import asynccontextmanager

import torch
import uvicorn
from diffusers import Flux2KleinPipeline
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


MODEL_ID = "black-forest-labs/FLUX.2-klein-4B"
SOURCE_SIZE = 192
OUTPUT_SIZE = SOURCE_SIZE
INFERENCE_STEPS = 2

pipeline: Flux2KleinPipeline | None = None
generation_lock = threading.Lock()


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=20_000)
    seed: int = Field(ge=0, le=2**63 - 1)


class GenerateResponse(BaseModel):
    imageBase64: str
    width: int
    height: int
    sourceWidth: int
    sourceHeight: int
    model: str
    seed: int
    steps: int
    generationSeconds: float


@asynccontextmanager
async def lifespan(_: FastAPI):
    global pipeline
    if not torch.backends.mps.is_available():
        raise RuntimeError("PyTorch MPS is not available")
    pipeline = Flux2KleinPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16).to("mps")
    torch.mps.synchronize()
    yield
    pipeline = None
    torch.mps.empty_cache()


app = FastAPI(title="Eros FLUX.2 Local Provider", lifespan=lifespan)


@app.get("/health")
def health():
    return {
        "ready": pipeline is not None,
        "model": MODEL_ID,
        "device": "mps",
        "dtype": "bfloat16",
        "sourceSize": [SOURCE_SIZE, SOURCE_SIZE],
        "outputSize": [OUTPUT_SIZE, OUTPUT_SIZE],
        "steps": INFERENCE_STEPS,
    }


@app.post("/generate", response_model=GenerateResponse)
def generate(request: GenerateRequest):
    if pipeline is None:
        raise HTTPException(status_code=503, detail="FLUX.2 pipeline is not ready")
    with generation_lock, torch.inference_mode():
        started = time.perf_counter()
        image = pipeline(
            prompt=request.prompt,
            width=SOURCE_SIZE,
            height=SOURCE_SIZE,
            num_inference_steps=INFERENCE_STEPS,
            guidance_scale=1.0,
            generator=torch.Generator(device="cpu").manual_seed(request.seed),
        ).images[0]
        torch.mps.synchronize()
        generation_seconds = time.perf_counter() - started

    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return GenerateResponse(
        imageBase64=base64.b64encode(buffer.getvalue()).decode("ascii"),
        width=OUTPUT_SIZE,
        height=OUTPUT_SIZE,
        sourceWidth=SOURCE_SIZE,
        sourceHeight=SOURCE_SIZE,
        model=MODEL_ID,
        seed=request.seed,
        steps=INFERENCE_STEPS,
        generationSeconds=round(generation_seconds, 3),
    )


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=7861, log_level="info")
