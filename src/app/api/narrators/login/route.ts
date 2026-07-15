import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { loginNarrator, setNarratorSessionCookie } from "@/lib/hosted/narrator-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

const schema = z.object({ name: z.string(), passphrase: z.string() }).strict();

export async function POST(request: Request) {
  try {
    enforceRateLimit(`narrator-login:${requestAddress(request)}`, 10, 15 * 60_000);
    const input = schema.parse(await request.json());
    const { narrator, session } = await loginNarrator(input.name, input.passphrase);
    const response = NextResponse.json({ narrator }, { headers: { "cache-control": "private, no-store" } });
    setNarratorSessionCookie(response, session);
    return response;
  } catch (error) { return apiError(error); }
}
