import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { generateHostedNodeImage } from "@/lib/hosted/image-service";
import { createHostedDescendant } from "@/lib/hosted/repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";

const schema = z.object({ parentAId: z.string().min(1), parentBId: z.string().min(1), name: z.string(), description: z.string().optional() }).strict();

export async function POST(request: Request) {
  try {
    enforceRateLimit(`reproduce:${requestAddress(request)}`, 20, 60_000);
    const input = schema.parse(await request.json());
    const length = unicodeLength(input.name.normalize("NFKC").trim());
    if (length < 1 || length > 128) throw new ApiFailure("INVALID_NODE_NAME", "Name must contain 1–128 Unicode characters.");
    const description = input.description === undefined ? undefined : plainText(input.description);
    if (description && unicodeLength(description) > 500) throw new ApiFailure("INVALID_DESCRIPTION", "Description must not exceed 500 Unicode characters.");
    const result = await createHostedDescendant(input.parentAId, input.parentBId, input.name, description);
    const image = result.created ? await generateHostedNodeImage(result.node.id, { variationId: "primary" }).catch(() => null) : null;
    return NextResponse.json({ ...result, image }, { status: result.created ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
