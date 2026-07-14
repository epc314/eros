import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getCollectedTreasure } from "@/lib/hosted/treasure-repository";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await getCollectedTreasure(id));
  } catch (error) { return apiError(error); }
}
