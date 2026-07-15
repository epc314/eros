import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getPublicNarrator } from "@/lib/hosted/narrator-repository";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json({ narrator: await getPublicNarrator(id) }, {
      headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) { return apiError(error); }
}
