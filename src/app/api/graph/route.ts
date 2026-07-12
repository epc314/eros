import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { hostedWorldGraph } from "@/lib/hosted/repository";

export async function GET() {
  try {
    return NextResponse.json(await hostedWorldGraph());
  } catch (error) { return apiError(error); }
}
