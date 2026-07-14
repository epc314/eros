import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiFailure, apiError } from "@/lib/api";
import { collectTreasure } from "@/lib/hosted/treasure-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";

const schema = z.object({ recorderName: z.string().optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`treasure-collect:${requestAddress(request)}:${id}`, 10, 60_000);
    const input = schema.parse(await request.json().catch(() => ({})));
    const recorderName = input.recorderName === undefined ? undefined : plainText(input.recorderName);
    if (recorderName && unicodeLength(recorderName) > 64)
      throw new ApiFailure("INVALID_RECORDER_NAME", "记述人的名字不能超过 64 个字符。");
    return NextResponse.json(await collectTreasure(id, recorderName));
  } catch (error) { return apiError(error); }
}
