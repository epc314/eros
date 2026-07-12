import { afterEach, describe, expect, it, vi } from "vitest";
import { BflImageProvider } from "@/lib/image/bfl-provider";

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("BFL image provider", () => {
  afterEach(() => {
    delete process.env.BFL_API_KEY;
    vi.unstubAllGlobals();
  });

  it("uses the 9B preview endpoint, omits requested dimensions, and records native PNG dimensions", async () => {
    process.env.BFL_API_KEY = "test-key";
    const image = pngHeader(768, 1024);
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url === "https://api.bfl.ai/v1/flux-2-klein-9b-preview") {
        return Response.json({ id: "task-1", polling_url: "https://api.bfl.ai/v1/get_result?id=task-1" });
      }
      if (url.startsWith("https://api.bfl.ai/v1/get_result")) {
        return Response.json({ status: "Ready", result: { sample: "https://delivery.eu.bfl.ai/image.png" } });
      }
      if (url === "https://delivery.eu.bfl.ai/image.png") {
        return new Response(image.buffer.slice(0) as ArrayBuffer, { status: 200, headers: { "content-type": "image/png" } });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new BflImageProvider().generate({ prompt: "A mythic entity", width: 720, height: 480, genomeHex: "ab".repeat(64) });
    expect(result).toMatchObject({ provider: "bfl", providerModel: "flux-2-klein-9b-preview", providerRequestId: "task-1", width: 768, height: 1024 });
    expect(result.imageDataUrl).toMatch(/^data:image\/png;base64,/);
    const submit = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(submit[1]?.body));
    expect(payload).toMatchObject({ prompt: "A mythic entity", output_format: "png" });
    expect(payload.seed).toEqual(expect.any(Number));
    expect(payload).not.toHaveProperty("width");
    expect(payload).not.toHaveProperty("height");
  });

  it("requires a server-side API key", async () => {
    await expect(new BflImageProvider().generate({ prompt: "entity" })).rejects.toThrow("BFL_API_KEY");
  });
});
