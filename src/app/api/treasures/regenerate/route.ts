import { NextResponse } from "next/server";
import { ApiFailure, apiError } from "@/lib/api";
import { getHostedEnv } from "@/lib/hosted/env";
import { generateTreasureImage } from "@/lib/hosted/treasure-image-service";
import { prepareHostedTreasureRegeneration } from "@/lib/hosted/treasure-repository";

export async function POST(request: Request) {
  try {
    const expected = getHostedEnv().EROS_TREASURE_ADMIN_TOKEN;
    const supplied = request.headers.get("x-eros-treasure-admin-token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!expected || supplied !== expected) throw new ApiFailure("INVALID_TREASURE_ADMIN_TOKEN", "A valid treasure administration token is required.", 401);
    const prepared = await prepareHostedTreasureRegeneration();
    const generated: Array<{ id: string; name: string; imageId: string | null }> = [];
    const failures: Array<{ id: string; name: string; message: string }> = [];
    for (let index = 0; index < prepared.treasures.length; index += 2) {
      const batch = prepared.treasures.slice(index, index + 2);
      const results = await Promise.allSettled(batch.map(({ id }) => generateTreasureImage(id)));
      results.forEach((result, resultIndex) => {
        const treasure = batch[resultIndex];
        if (result.status === "fulfilled") generated.push({ id: treasure.id, name: treasure.name, imageId: result.value?.id ?? null });
        else failures.push({ id: treasure.id, name: treasure.name, message: result.reason instanceof Error ? result.reason.message : "Image generation failed" });
      });
    }
    return NextResponse.json({ regenerated: generated, failures, removedImages: prepared.removedImages, removedStoredImages: prepared.removedStoredImages }, { status: failures.length ? 207 : 200 });
  } catch (error) { return apiError(error); }
}
