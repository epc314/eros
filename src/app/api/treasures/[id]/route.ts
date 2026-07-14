import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiFailure, apiError } from "@/lib/api";
import { getCollectedTreasure, updateTreasureTitle } from "@/lib/hosted/treasure-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";

const updateSchema = z.object({ title: z.string() }).strict();

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getCollectedTreasure(id));
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`treasure-title:${requestAddress(request)}:${id}`, 20, 60_000);
    const input = updateSchema.parse(await request.json());
    const title = plainText(input.title);
    if (unicodeLength(title) > 64) throw new ApiFailure("INVALID_TREASURE_TITLE", "宝物称号不能超过 64 个字符。");
    return NextResponse.json(await updateTreasureTitle(id, title));
  } catch (error) { return apiError(error); }
}
