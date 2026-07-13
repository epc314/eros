import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { hostedExistenceDetail } from "@/lib/hosted/existence-detail";
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
    return NextResponse.json(await hostedExistenceDetail(reference), { headers: responseHeaders });
  } catch (error) { return apiError(error); }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    ...responseHeaders,
    "access-control-allow-methods": "GET, OPTIONS",
  } });
}
