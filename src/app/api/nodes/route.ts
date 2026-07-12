import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { listHostedNodes } from "@/lib/hosted/repository";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get("query")?.normalize("NFKC").trim() ?? "";
    const generationRaw = params.get("generation");
    const type = params.get("type");
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const nodeType = type === "GENESIS" || type === "DESCENDANT" ? type : undefined;
    return NextResponse.json(await listHostedNodes({ query: query || undefined,
      generation: generationRaw !== null && /^\d+$/.test(generationRaw) ? Number(generationRaw) : undefined,
      type: nodeType, page }));
  } catch (error) { return apiError(error); }
}
