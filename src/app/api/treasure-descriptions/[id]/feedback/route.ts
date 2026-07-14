import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiFailure, apiError } from "@/lib/api";
import { setTreasureDescriptionFeedback } from "@/lib/hosted/treasure-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const schema = z.object({ voterKey: z.string(), isTrue: z.boolean() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`treasure-feedback:${requestAddress(request)}:${id}`, 30, 60_000);
    const input = schema.parse(await request.json());
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(input.voterKey))
      throw new ApiFailure("INVALID_VOTER_KEY", "匿名评价标识无效。");
    return NextResponse.json(await setTreasureDescriptionFeedback(id, input.voterKey, input.isTrue));
  } catch (error) { return apiError(error); }
}
