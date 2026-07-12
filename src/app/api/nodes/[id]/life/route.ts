import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { setHostedNodeLifeStatus } from "@/lib/hosted/repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";

const schema = z.object({ action: z.enum(["die", "revive"]), description: z.string() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`life:${requestAddress(request)}:${id}`, 8, 60_000);
    const input = schema.parse(await request.json());
    const description = plainText(input.description);
    if (unicodeLength(description) < 1 || unicodeLength(description) > 500)
      throw new ApiFailure("INVALID_LIFE_DESCRIPTION", "死亡或复活记述必须包含 1–500 个字符。");
    return NextResponse.json(await setHostedNodeLifeStatus(id, input.action, description));
  } catch (error) { return apiError(error); }
}
