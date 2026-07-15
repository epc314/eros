import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { toggleProposalLike } from "@/lib/hosted/proposal-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const schema = z.object({ voterKey: z.string().optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`proposal-like:${requestAddress(request)}:${id}`, 30, 60_000);
    const input = schema.parse(await request.json());
    if (input.voterKey && !/^[a-zA-Z0-9-]{8,128}$/.test(input.voterKey))
      throw new ApiFailure("INVALID_VOTER_KEY", "匿名点赞标识无效。");
    return NextResponse.json(await toggleProposalLike(request, id, input.voterKey), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) { return apiError(error); }
}
