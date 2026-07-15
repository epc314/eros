import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { addProposalReply } from "@/lib/hosted/proposal-repository";
import { validateProposalReply } from "@/lib/proposal/validation";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const schema = z.object({ body: z.string() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`proposal-reply:${requestAddress(request)}:${id}`, 15, 60_000);
    const input = schema.parse(await request.json());
    return NextResponse.json({ reply: await addProposalReply(request, id, validateProposalReply(input.body)) }, {
      status: 201,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) { return apiError(error); }
}
