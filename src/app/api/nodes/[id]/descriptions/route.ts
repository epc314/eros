import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { addHostedDescription } from "@/lib/hosted/repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";

const schema = z.object({ body: z.string(), authorLabel: z.string().optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    enforceRateLimit(`description:${requestAddress(request)}:${id}`, 8, 60_000);
    const input = schema.parse(await request.json());
    const body = plainText(input.body);
    const authorLabel = input.authorLabel === undefined ? undefined : plainText(input.authorLabel);
    if (unicodeLength(body) < 1 || unicodeLength(body) > 500) throw new ApiFailure("INVALID_DESCRIPTION", "Description must contain 1–500 Unicode characters.");
    if (authorLabel && unicodeLength(authorLabel) > 64) throw new ApiFailure("INVALID_AUTHOR_LABEL", "Author label must not exceed 64 Unicode characters.");
    const description = await addHostedDescription(id, body, authorLabel);
    return NextResponse.json({ description }, { status: 201 });
  } catch (error) { return apiError(error); }
}
