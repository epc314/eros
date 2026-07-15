import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { createProposal, listProposalPosts, type ProposalSort } from "@/lib/hosted/proposal-repository";
import { validateProposalContent, validateProposalTitle } from "@/lib/proposal/validation";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const createSchema = z.object({ title: z.string(), content: z.string().optional() }).strict();

function anonymousVoterKey(value: string | null): string | undefined {
  if (!value) return undefined;
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(value)) throw new ApiFailure("INVALID_VOTER_KEY", "匿名点赞标识无效。");
  return value;
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const sort = params.get("sort") ?? "latest";
    if (sort !== "latest" && sort !== "likes") throw new ApiFailure("INVALID_PROPOSAL_SORT", "建言排序方式无效。");
    const cursor = params.get("cursor") ?? undefined;
    if (cursor && cursor.length > 128) throw new ApiFailure("INVALID_PROPOSAL_CURSOR", "建言分页位置无效。");
    const result = await listProposalPosts(request, sort as ProposalSort, cursor, anonymousVoterKey(params.get("voterKey")));
    return NextResponse.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(`proposal-create:${requestAddress(request)}`, 8, 60_000);
    const input = createSchema.parse(await request.json());
    const proposal = await createProposal(request, validateProposalTitle(input.title), validateProposalContent(input.content ?? ""));
    return NextResponse.json({ proposal }, { status: 201, headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
