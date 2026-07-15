import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiFailure, apiError } from "@/lib/api";
import { addTreasureDescription } from "@/lib/hosted/treasure-repository";
import { resolveNarratorAttribution } from "@/lib/hosted/narrator-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";

const schema = z.object({
  body: z.string(),
  authorMode: z.enum(["narrator", "custom"]).optional(),
  authorLabel: z.string().optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`treasure-description:${requestAddress(request)}:${id}`, 8, 60_000);
    const input = schema.parse(await request.json());
    const body = plainText(input.body);
    const authorLabel = input.authorLabel === undefined ? undefined : plainText(input.authorLabel);
    if (unicodeLength(body) < 1 || unicodeLength(body) > 500)
      throw new ApiFailure("INVALID_DESCRIPTION", "记述必须包含 1–500 个字符。");
    if (authorLabel && unicodeLength(authorLabel) > 64)
      throw new ApiFailure("INVALID_AUTHOR_LABEL", "署名不能超过 64 个字符。");
    const attribution = await resolveNarratorAttribution(request, input.authorMode, authorLabel);
    return NextResponse.json({ description: await addTreasureDescription(id, body, attribution) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
