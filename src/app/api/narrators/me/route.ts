import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { updateNarratorMessage } from "@/lib/hosted/narrator-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText } from "@/lib/security/text";

const schema = z.object({ message: z.string() }).strict();

export async function PATCH(request: Request) {
  try {
    enforceRateLimit(`narrator-message:${requestAddress(request)}`, 20, 60_000);
    const input = schema.parse(await request.json());
    return NextResponse.json({ narrator: await updateNarratorMessage(request, plainText(input.message)) }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) { return apiError(error); }
}
