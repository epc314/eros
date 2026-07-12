import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { previewHostedReproduction } from "@/lib/hosted/repository";
import { unicodeLength } from "@/lib/security/text";

const schema = z.object({ parentAId: z.string().min(1), parentBId: z.string().min(1), name: z.string() });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const length = unicodeLength(input.name.normalize("NFKC").trim());
    if (length < 1 || length > 128) throw new ApiFailure("INVALID_NODE_NAME", "Name must contain 1–128 Unicode characters.");
    return NextResponse.json(await previewHostedReproduction(input.parentAId, input.parentBId, input.name));
  } catch (error) { return apiError(error); }
}
