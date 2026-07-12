import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getHostedNode } from "@/lib/hosted/repository";
import { buildEntityImagePrompt } from "@/lib/protocol/prompt";
import { decodeGenome } from "@/lib/protocol/token-decoder";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const detail = await getHostedNode(id);
    const { node, reproduction, parents, children, images, descriptions } = detail;
    const tokens = decodeGenome(node.genomeHex, reproduction?.mutationMaskHex, node.promptVersion);
    const prompt = buildEntityImagePrompt(tokens);
    return NextResponse.json({ node, parents, children, reproduction, tokens, prompt, images, descriptions });
  } catch (error) { return apiError(error); }
}
