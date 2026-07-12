import type { GeneratedImage, ImageGenerationInput, ImageProvider } from "./types";

export class RealImageProvider implements ImageProvider {
  readonly name = "remote";

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const apiKey = process.env.IMAGE_API_KEY;
    const endpoint = process.env.IMAGE_API_URL;
    if (!apiKey || !endpoint) throw new Error("Real image provider requires IMAGE_API_KEY and IMAGE_API_URL");
    const model = process.env.IMAGE_MODEL;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt: input.prompt, width: input.width, height: input.height,
        seed: input.providerSeed, variation_id: input.variationId, ...(model ? { model } : {}) }),
    });
    if (!response.ok) throw new Error(`Image provider returned HTTP ${response.status}`);
    const body = await response.json() as { id?: string; data?: Array<{ url?: string; b64_json?: string }>; url?: string };
    const image = body.data?.[0];
    const imageUrl = image?.url ?? body.url;
    const imageDataUrl = image?.b64_json ? `data:image/png;base64,${image.b64_json}` : undefined;
    if (!imageUrl && !imageDataUrl) throw new Error("Image provider response did not include image data");
    return { provider: this.name, providerModel: model, providerRequestId: body.id,
      imageUrl, imageDataUrl, width: input.width, height: input.height };
  }
}
