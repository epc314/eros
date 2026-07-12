import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { generateHostedNodeImage } from "@/lib/hosted/image-service";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const schema = z.object({ lockSeed: z.boolean().optional(), providerSeed: z.string().max(128).optional(), variationId: z.string().max(128).optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`image:${requestAddress(request)}:${id}`, 6, 60_000);
    const body = await request.json().catch(() => ({}));
    const input = schema.parse(body);
    return NextResponse.json({ image: await generateHostedNodeImage(id, input) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
