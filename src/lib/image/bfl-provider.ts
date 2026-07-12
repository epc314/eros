import { createHash } from "node:crypto";
import type { GeneratedImage, ImageGenerationInput, ImageProvider } from "./types";

const MODEL = "flux-2-klein-9b-preview";
const ENDPOINT = `https://api.bfl.ai/v1/${MODEL}`;
const POLL_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

interface SubmitResponse {
  id?: string;
  polling_url?: string;
}

interface PollResponse {
  status?: string;
  result?: { sample?: string };
  details?: unknown;
}

function deriveSeed(input: ImageGenerationInput): number {
  const identity = input.providerSeed ?? `${input.genomeHex ?? input.nodeId ?? input.prompt}\u0000${input.variationId ?? "primary"}`;
  return createHash("sha256").update(identity).digest().readUInt32BE(0);
}

function trustedBflUrl(raw: string, label: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !(url.hostname === "bfl.ai" || url.hostname.endsWith(".bfl.ai"))) {
    throw new Error(`BFL returned an untrusted ${label} URL`);
  }
  return url;
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || signature.some((value, index) => bytes[index] !== value)) {
    throw new Error("BFL did not return the requested PNG image");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (!width || !height) throw new Error("BFL returned a PNG with invalid dimensions");
  return { width, height };
}

async function errorMessage(response: Response, prefix: string): Promise<Error> {
  const body = await response.text().catch(() => "");
  const detail = body.slice(0, 300).replace(/\s+/g, " ");
  return new Error(`${prefix} returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
}

export class BflImageProvider implements ImageProvider {
  readonly name = "bfl";

  constructor(private readonly configuredApiKey?: string) {}

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const apiKey = this.configuredApiKey?.trim() || process.env.BFL_API_KEY?.trim();
    if (!apiKey) throw new Error("BFL image provider requires BFL_API_KEY");

    const headers = { accept: "application/json", "content-type": "application/json", "x-key": apiKey };
    const submitted = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      // Deliberately omit width and height: preserve the model's native output size.
      body: JSON.stringify({ prompt: input.prompt, seed: deriveSeed(input), output_format: "png" }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!submitted.ok) throw await errorMessage(submitted, "BFL generation request");
    const task = await submitted.json() as SubmitResponse;
    if (!task.id || !task.polling_url) throw new Error("BFL generation response did not include id and polling_url");
    const pollingUrl = trustedBflUrl(task.polling_url, "polling");

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let imageUrl: string | undefined;
    while (Date.now() < deadline) {
      const response = await fetch(pollingUrl, {
        headers: { accept: "application/json", "x-key": apiKey },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw await errorMessage(response, "BFL result polling");
      const result = await response.json() as PollResponse;
      if (result.status === "Ready") {
        imageUrl = result.result?.sample;
        break;
      }
      if (["Error", "Failed", "Task not found", "Request Moderated", "Content Moderated"].includes(result.status ?? "")) {
        throw new Error(`BFL generation ended with status ${result.status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!imageUrl) throw new Error("BFL generation timed out before an image was ready");

    const deliveryUrl = trustedBflUrl(imageUrl, "delivery");
    const downloaded = await fetch(deliveryUrl, { signal: AbortSignal.timeout(30_000) });
    if (!downloaded.ok) throw await errorMessage(downloaded, "BFL image download");
    const contentLength = Number(downloaded.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_BYTES) throw new Error("BFL image exceeded the 50 MB download limit");
    const bytes = new Uint8Array(await downloaded.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("BFL image exceeded the 50 MB download limit");
    const { width, height } = pngDimensions(bytes);

    return {
      provider: this.name,
      providerModel: MODEL,
      providerRequestId: task.id,
      imageDataUrl: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`,
      width,
      height,
    };
  }
}
