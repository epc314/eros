import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiFailure, apiError } from "@/lib/api";
import { generateTreasureImage } from "@/lib/hosted/treasure-image-service";
import { createOrGetTreasureCandidate, getCollectedTreasure } from "@/lib/hosted/treasure-repository";
import { hostedWorldGraph } from "@/lib/hosted/repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { plainText, unicodeLength } from "@/lib/security/text";
import { buildTreasureImagePrompt, createTreasureName, decodeTreasure, searchTreasures } from "@/lib/treasure/protocol";

const schema = z.object({
  spell: z.string(),
  timestampMs: z.string().regex(/^\d{1,20}$/),
  ownerNodeId: z.string().min(1).max(128),
}).strict();

export async function POST(request: Request) {
  try {
    enforceRateLimit(`treasure-generate:${requestAddress(request)}`, 6, 3_600_000);
    const input = schema.parse(await request.json());
    const spell = plainText(input.spell);
    if (unicodeLength(spell) < 1 || unicodeLength(spell) > 1_000)
      throw new ApiFailure("INVALID_SPELL", "咒语必须包含 1–1000 个字符。");
    const graph = await hostedWorldGraph();
    const search = searchTreasures(spell, input.timestampMs, graph.nodes);
    const ownerMatch = search.matches.find(({ id }) => id === input.ownerNodeId);
    if (!search.success || !ownerMatch)
      throw new ApiFailure("TREASURE_MATCH_INVALID", "这名存在没有通过该次咒语的匹配，无法借其命运寻找宝物。", 409);
    const owner = graph.nodes.find(({ id }) => id === input.ownerNodeId)!;
    const decoded = decodeTreasure(search.finalHashHex);
    const name = createTreasureName(owner.name, decoded.subjectName);
    const exactPrompt = buildTreasureImagePrompt(decoded.subjectName, owner.name, decoded.tokens);
    const attempt = search.attempts.at(-1)?.attempt ?? 1;
    const candidate = await createOrGetTreasureCandidate({
      ownerNodeId: owner.id,
      name,
      subjectIndex: decoded.subjectIndex,
      subjectName: decoded.subjectName,
      subjectGroup: decoded.subjectGroup,
      searchTimestampMs: search.timestampMs,
      searchAttempt: attempt,
      searchHashHex: search.finalHashHex,
      matchScore: ownerMatch.score,
      ownerFeatureHex: ownerMatch.featureHex,
      tokens: decoded.tokens,
      exactPrompt,
    });
    if (candidate.treasure.status === "COLLECTED") {
      return NextResponse.json({ alreadyCollected: true, ...(await getCollectedTreasure(candidate.treasure.id)) });
    }
    const image = await generateTreasureImage(candidate.treasure.id);
    const { tokensJson, ...publicTreasure } = candidate.treasure;
    return NextResponse.json({
      alreadyCollected: false,
      treasure: { ...publicTreasure, tokens: JSON.parse(tokensJson) },
      images: image ? [image] : [],
    }, { status: candidate.created ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
