import { NextResponse } from "next/server";
import { apiError, ApiFailure } from "@/lib/api";
import { hostedWorldContext } from "@/lib/hosted/repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { formatStoryContextText, type StoryContextLanguage } from "@/lib/story-context";

const responseHeaders = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
  "x-content-type-options": "nosniff",
};

function choice<T extends string>(value: string | null, allowed: readonly T[], fallback: T, name: string): T {
  if (value === null) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new ApiFailure("INVALID_QUERY", `${name} must be one of: ${allowed.join(", ")}.`, 400);
}

export async function GET(request: Request) {
  try {
    enforceRateLimit(`world-context:${requestAddress(request)}`, 120, 60_000);
    const params = new URL(request.url).searchParams;
    const format = choice(params.get("format"), ["json", "text"] as const, "json", "format");
    const language = choice(params.get("lang"), ["zh", "en", "both"] as const, "zh", "lang") as StoryContextLanguage;
    const context = await hostedWorldContext({ language });
    if (format === "text") return new Response(formatStoryContextText(context), { headers: {
      ...responseHeaders, "content-type": "text/plain; charset=utf-8",
    } });
    return NextResponse.json(context, { headers: responseHeaders });
  } catch (error) { return apiError(error); }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    ...responseHeaders,
    "access-control-allow-methods": "GET, OPTIONS",
  } });
}
