import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { registerNarrator, setNarratorSessionCookie } from "@/lib/hosted/narrator-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string(),
  passphrase: z.string(),
  passphraseConfirmation: z.string(),
}).strict();

export async function POST(request: Request) {
  try {
    enforceRateLimit(`narrator-register:${requestAddress(request)}`, 5, 15 * 60_000);
    const input = schema.parse(await request.json());
    if (input.passphrase !== input.passphraseConfirmation)
      throw new ApiFailure("PASSPHRASE_CONFIRMATION_MISMATCH", "两次输入的密语不一致。", 400);
    const { narrator, session } = await registerNarrator(input.name, input.passphrase);
    const response = NextResponse.json({ narrator }, { status: 201, headers: { "cache-control": "private, no-store" } });
    setNarratorSessionCookie(response, session);
    return response;
  } catch (error) { return apiError(error); }
}
