import { ApiFailure, apiError } from "@/lib/api";
import { getHostedEnv } from "@/lib/hosted/env";
import { getHostedImageRecord } from "@/lib/hosted/repository";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const record = await getHostedImageRecord(id);
    if (!record?.r2Key) throw new ApiFailure("IMAGE_NOT_FOUND", "Image not found.", 404);
    const object = await getHostedEnv().EROS_IMAGES.get(record.r2Key);
    if (!object) throw new ApiFailure("IMAGE_NOT_FOUND", "Image not found.", 404);
    const headers = new Headers(); object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-length", String(object.size));
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(object.body, { headers });
  } catch (error) { return apiError(error); }
}
