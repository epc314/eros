import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { listCollectedTreasures } from "@/lib/hosted/treasure-repository";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("query") ?? undefined;
    return NextResponse.json({ treasures: await listCollectedTreasures(query) });
  } catch (error) { return apiError(error); }
}
