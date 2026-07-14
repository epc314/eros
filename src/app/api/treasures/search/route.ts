import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiFailure, apiError } from "@/lib/api";
import { hostedWorldGraph } from "@/lib/hosted/repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";
import { searchTreasures } from "@/lib/treasure/protocol";

const schema = z.object({ spell: z.string() }).strict();

export async function POST(request: Request) {
  try {
    enforceRateLimit(`treasure-search:${requestAddress(request)}`, 30, 60_000);
    const input = schema.parse(await request.json());
    const spell = plainText(input.spell);
    if (unicodeLength(spell) < 1 || unicodeLength(spell) > 1_000)
      throw new ApiFailure("INVALID_SPELL", "咒语必须包含 1–1000 个字符。");
    const timestampMs = Date.now().toString();
    const graph = await hostedWorldGraph();
    const result = searchTreasures(spell, timestampMs, graph.nodes);
    return NextResponse.json(result, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) { return apiError(error); }
}
