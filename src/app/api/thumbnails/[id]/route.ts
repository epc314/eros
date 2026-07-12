import { ApiFailure, apiError } from "@/lib/api";
import { getHostedEnv } from "@/lib/hosted/env";
import { getHostedImageRecord } from "@/lib/hosted/repository";
import { createJpegThumbnail } from "@/lib/image/thumbnail";

const THUMBNAIL_WIDTH = 512;
const THUMBNAIL_HEIGHT = 320;
const THUMBNAIL_QUALITY = 55;

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
    const thumbnailKey = `thumbnails-v3/${id}.jpg`;
    const existing = await environment.EROS_IMAGES.get(thumbnailKey);
    if (existing) return objectResponse(existing, "image/jpeg");

    const source = await environment.EROS_IMAGES.get(record.r2Key);
    if (!source) throw new ApiFailure("IMAGE_NOT_FOUND", "Image not found.", 404);
    if ((record.contentType ?? source.httpMetadata?.contentType) !== "image/png")
      return objectResponse(source, record.contentType ?? "application/octet-stream");
    const bytes = createJpegThumbnail(await source.arrayBuffer(), THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, THUMBNAIL_QUALITY);
    await environment.EROS_IMAGES.put(thumbnailKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    const headers = new Headers();
    headers.set("content-type", "image/jpeg");
    headers.set("content-length", String(bytes.byteLength));
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(bytes as unknown as BodyInit, { headers });
  } catch (error) { return apiError(error); }
}
