import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { clearNarratorSessionCookie, logoutNarrator } from "@/lib/hosted/narrator-repository";

export async function POST(request: Request) {
  try {
    await logoutNarrator(request);
    const response = NextResponse.json({ loggedOut: true }, { headers: { "cache-control": "private, no-store" } });
    clearNarratorSessionCookie(response);
    return response;
  } catch (error) { return apiError(error); }
}
