import { NextResponse } from "next/server";
import { ApiFailure, apiError } from "@/lib/api";
import { getHostedEnv } from "@/lib/hosted/env";
import { clearHostedTreasures, listCollectedTreasures } from "@/lib/hosted/treasure-repository";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("query") ?? undefined;
    return NextResponse.json({ treasures: await listCollectedTreasures(query) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const expected = getHostedEnv().EROS_TREASURE_ADMIN_TOKEN;
    const supplied = request.headers.get("x-eros-treasure-admin-token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!expected || supplied !== expected) throw new ApiFailure("INVALID_TREASURE_ADMIN_TOKEN", "A valid treasure administration token is required.", 401);
    return NextResponse.json(await clearHostedTreasures());
  } catch (error) { return apiError(error); }
}
