import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { narratorFromRequest } from "@/lib/hosted/narrator-repository";

export async function GET(request: Request) {
  try {
    return NextResponse.json({ narrator: await narratorFromRequest(request) }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
