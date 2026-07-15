import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { deleteProposal, getProposal, setProposalPinned } from "@/lib/hosted/proposal-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const updateSchema = z.object({ pinned: z.boolean() }).strict();

function anonymousVoterKey(value: string | null): string | undefined {
  if (!value) return undefined;
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(value)) throw new ApiFailure("INVALID_VOTER_KEY", "匿名点赞标识无效。");
  return value;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const voterKey = anonymousVoterKey(new URL(request.url).searchParams.get("voterKey"));
    return NextResponse.json(await getProposal(request, id, voterKey), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`proposal-pin:${requestAddress(request)}`, 20, 60_000);
    const input = updateSchema.parse(await request.json());
    return NextResponse.json(await setProposalPinned(request, id, input.pinned), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`proposal-delete:${requestAddress(request)}`, 10, 60_000);
    return NextResponse.json(await deleteProposal(request, id), { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
