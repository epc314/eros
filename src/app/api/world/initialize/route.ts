import { NextResponse } from "next/server";
import { apiError, ApiFailure } from "@/lib/api";
import { getHostedEnv } from "@/lib/hosted/env";
import { ensureHostedInitialImages } from "@/lib/hosted/image-service";
import { initializeHostedWorld } from "@/lib/hosted/repository";

export async function POST(request: Request) {
  try {
    const expected = getHostedEnv().EROS_SETUP_TOKEN;
    const supplied = request.headers.get("x-eros-setup-token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!expected || supplied !== expected) throw new ApiFailure("INVALID_SETUP_TOKEN", "A valid setup token is required.", 401);
    const result = await initializeHostedWorld();
    await ensureHostedInitialImages(result.nodes.map(({ id }) => id));
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
