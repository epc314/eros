import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiFailure } from "@/lib/api";
import { composeFaustMessages } from "@/lib/faust";
import { getHostedEnv } from "@/lib/hosted/env";
import { hostedExistenceDetail } from "@/lib/hosted/existence-detail";
import { hostedWorldContext } from "@/lib/hosted/repository";
import { hostedTreasureContext } from "@/lib/hosted/treasure-repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";
import { formatStoryContextText } from "@/lib/story-context";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(3_000),
  existenceRefs: z.array(z.string().trim().min(1).max(128)).max(8).optional(),
}).superRefine((message, context) => {
  if (message.role === "assistant" && message.existenceRefs?.length) context.addIssue({
    code: z.ZodIssueCode.custom, message: "Only user messages may retrieve existences.", path: ["existenceRefs"],
  });
});

const requestSchema = z.object({ messages: z.array(messageSchema).min(1).max(30) });

interface DeepSeekResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export async function POST(request: Request) {
  try {
    enforceRateLimit(`faust-chat:${requestAddress(request)}`, 30, 3_600_000);
    const body = requestSchema.parse(await request.json());
    const env = getHostedEnv();
    const apiKey = env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) throw new ApiFailure("DEEPSEEK_NOT_CONFIGURED", "浮士德尚未苏醒：DeepSeek 服务尚未配置。", 503);

    const references = [...new Set(body.messages.flatMap((message) => message.existenceRefs ?? []))];
    if (references.length > 16) throw new ApiFailure("TOO_MANY_RETRIEVED_EXISTENCES", "A conversation may reference at most 16 unique existences.", 400);
    const [worldContext, treasureContext, ...details] = await Promise.all([
      hostedWorldContext({ language: "zh" }),
      hostedTreasureContext(),
      ...references.map((reference) => hostedExistenceDetail(reference)),
    ]);
    const detailsByReference = new Map(references.map((reference, index) => [reference, details[index]]));
    const messages = composeFaustMessages({
      worldContext: formatStoryContextText(worldContext),
      canonicalNames: worldContext.generations.flatMap((group) => group.existences.map((existence) => existence.name)),
      canonicalTreasureNames: treasureContext.names,
      treasureContext: treasureContext.text,
      conversation: body.messages,
      detailsByReference,
    });
    const model = env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-pro";
    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        thinking: { type: "disabled" },
        temperature: 0.9,
        max_tokens: 1_800,
        stream: false,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!upstream.ok) {
      const details = (await upstream.text()).slice(0, 500);
      console.error("DeepSeek request failed", upstream.status, details);
      throw new ApiFailure("DEEPSEEK_UNAVAILABLE", "浮士德暂时没有回应，请稍后再试。", 502);
    }
    const result = await upstream.json() as DeepSeekResponse;
    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) throw new ApiFailure("DEEPSEEK_EMPTY_RESPONSE", "浮士德沉默了，请稍后再试。", 502);
    return NextResponse.json({
      message: { role: "assistant", content },
      model: result.model ?? model,
      usage: result.usage ?? null,
    }, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) { return apiError(error); }
}
