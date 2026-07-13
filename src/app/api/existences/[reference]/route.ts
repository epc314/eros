import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getHostedNodeByReference } from "@/lib/hosted/repository";
import { buildEntityImagePrompt } from "@/lib/protocol/prompt";
import { decodeGenome } from "@/lib/protocol/token-decoder";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const responseHeaders = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
  "x-content-type-options": "nosniff",
};

export async function GET(request: Request, context: { params: Promise<{ reference: string }> }) {
  try {
    enforceRateLimit(`existence-detail:${requestAddress(request)}`, 120, 60_000);
    const { reference } = await context.params;
    const detail = await getHostedNodeByReference(reference);
    const { node, reproduction, parents, children, images, descriptions } = detail;
    const tokens = decodeGenome(node.genomeHex, reproduction?.mutationMaskHex, node.promptVersion);
    const records = descriptions.map(({ trueCount, falseCount, ...record }) => ({
      ...record,
      feedback: { trueVotes: trueCount, falseVotes: falseCount, disputed: falseCount > trueCount },
    }));
    return NextResponse.json({
      schema: "eros-existence-detail-v1",
      generatedAt: new Date().toISOString(),
      existence: node,
      relationships: {
        parents: parents.map(({ id, name, type, generation, isDead, createdAt }) => ({ id, name, type, generation, status: isDead ? "dead" : "alive", createdAt })),
        children: children.map(({ id, name, type, generation, isDead, createdAt }) => ({ id, name, type, generation, status: isDead ? "dead" : "alive", createdAt })),
      },
      reproduction,
      tokens,
      prompt: buildEntityImagePrompt(tokens),
      images,
      records,
    }, { headers: responseHeaders });
  } catch (error) { return apiError(error); }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    ...responseHeaders,
    "access-control-allow-methods": "GET, OPTIONS",
  } });
}
