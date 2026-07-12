import { ApiFailure, apiError } from "@/lib/api";
import { getHostedEnv } from "@/lib/hosted/env";
import { getHostedImageRecord } from "@/lib/hosted/repository";

const THUMBNAIL_WIDTH = 384;
const THUMBNAIL_HEIGHT = 224;
const THUMBNAIL_QUALITY = 50;

function objectResponse(object: R2ObjectBody, fallbackType: string): Response {
  const headers = new Headers(); object.writeHttpMetadata(headers);
  headers.set("content-type", object.httpMetadata?.contentType ?? fallbackType);
  headers.set("content-length", String(object.size));
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const environment = getHostedEnv();
    const record = await getHostedImageRecord(id);
    if (!record?.r2Key) throw new ApiFailure("IMAGE_NOT_FOUND", "Image not found.", 404);
    const thumbnailKey = `thumbnails/${id}.webp`;
    const existing = await environment.EROS_IMAGES.get(thumbnailKey);
    if (existing) return objectResponse(existing, "image/webp");

    const source = await environment.EROS_IMAGES.get(record.r2Key);
    if (!source) throw new ApiFailure("IMAGE_NOT_FOUND", "Image not found.", 404);
    if (!environment.IMAGES) return objectResponse(source, record.contentType ?? "image/png");

    const transformed = await environment.IMAGES.input(source.body)
      .transform({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, fit: "contain", background: "#020617" })
      .output({ format: "image/webp", quality: THUMBNAIL_QUALITY });
    const response = await transformed.response();
    if (!response.ok) throw new Error(`Thumbnail transformation failed with HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    await environment.EROS_IMAGES.put(thumbnailKey, bytes, { httpMetadata: { contentType: "image/webp" } });
    const headers = new Headers(response.headers);
    headers.set("content-type", "image/webp");
    headers.set("content-length", String(bytes.byteLength));
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(bytes, { headers });
  } catch (error) { return apiError(error); }
}
