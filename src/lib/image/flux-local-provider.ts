import { createHash } from "node:crypto";
import type { GeneratedImage, ImageGenerationInput, ImageProvider } from "./types";

interface FluxResponse {
  imageBase64: string;
  width: number;
  height: number;
  model: string;
  seed: number;
  steps: number;
  generationSeconds: number;
}

function deriveSeed(input: ImageGenerationInput): number {
  const identity = input.providerSeed ?? `${input.genomeHex ?? input.nodeId ?? input.prompt}\u0000${input.variationId ?? "primary"}`;
  const bytes = createHash("sha256").update(identity).digest();
  return Number(bytes.readBigUInt64BE(0) & 0x1f_ffff_ffff_ffffn);
}

export class FluxLocalImageProvider implements ImageProvider {
  readonly name = "flux2-local";

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const endpoint = process.env.FLUX2_LOCAL_URL ?? "http://127.0.0.1:7861";
    const response = await fetch(`${endpoint}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: input.prompt, seed: deriveSeed(input) }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Local FLUX.2 provider returned HTTP ${response.status}`);
    const image = await response.json() as FluxResponse;
    if (!image.imageBase64) throw new Error("Local FLUX.2 provider returned no image data");
    return {
      provider: this.name,
      providerModel: image.model,
      providerRequestId: `seed:${image.seed};steps:${image.steps};seconds:${image.generationSeconds}`,
      imageDataUrl: `data:image/png;base64,${image.imageBase64}`,
      width: image.width,
      height: image.height,
    };
  }
}
