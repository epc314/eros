import { BflImageProvider } from "../image/bfl-provider";
import { MockImageProvider } from "../image/mock-provider";
import type { ImageProvider } from "../image/types";
import { IMAGE_PROMPT_VERSION } from "../protocol/constants";
import { buildEntityImagePrompt } from "../protocol/prompt";
import { decodeGenome } from "../protocol/token-decoder";
import { getHostedEnv } from "./env";
import {
  completeHostedImage, countHostedCompletedImages, createHostedPendingImage, failHostedImage,
  getHostedNodeForImage, newRecordId,
} from "./repository";

function provider(): ImageProvider {
  const environment = getHostedEnv();
  return environment.IMAGE_PROVIDER === "mock"
    ? new MockImageProvider()
    : new BflImageProvider(environment.BFL_API_KEY);
}

function decodeDataUrl(value: string): { bytes: Uint8Array; contentType: string; extension: string } {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value);
  if (!match) throw new Error("Image provider returned an unsupported data URL");
  const contentType = match[1];
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  const extension = contentType === "image/svg+xml" ? "svg" : contentType === "image/jpeg" ? "jpg" : "png";
  return { bytes, contentType, extension };
}

export async function generateHostedNodeImage(nodeId: string, options: { providerSeed?: string; variationId?: string; lockSeed?: boolean } = {}) {
  const node = await getHostedNodeForImage(nodeId);
  if (!node) throw new Error("NODE_NOT_FOUND");
  if (node.promptVersion !== IMAGE_PROMPT_VERSION) throw new Error("PROMPT_VERSION_MISMATCH");
  const tokens = decodeGenome(node.genomeHex, undefined, node.promptVersion);
  const exactPrompt = buildEntityImagePrompt(tokens);
  const imageProvider = provider();
  const id = newRecordId(); const variationId = options.variationId ?? id;
  const providerSeed = options.lockSeed ? (options.providerSeed ?? node.genomeHex) : options.providerSeed;
  await createHostedPendingImage({ id, nodeId, provider: imageProvider.name, exactPrompt, providerSeed, variationId });
  try {
    const image = await imageProvider.generate({ prompt: exactPrompt, width: 720, height: 480, providerSeed, variationId,
      nodeId, nodeName: node.name, genomeHex: node.genomeHex, tokenIds: tokens.map(({ tokenId }) => tokenId) });
    let r2Key: string | undefined; let contentType: string | undefined;
    if (image.imageDataUrl) {
      const decoded = decodeDataUrl(image.imageDataUrl);
      r2Key = `generated/${id}.${decoded.extension}`; contentType = decoded.contentType;
      await getHostedEnv().EROS_IMAGES.put(r2Key, decoded.bytes, { httpMetadata: { contentType } });
    }
    const primaryCount = await countHostedCompletedImages(nodeId);
    return await completeHostedImage(id, { provider: image.provider, providerModel: image.providerModel,
      providerRequestId: image.providerRequestId, imageUrl: image.imageUrl, r2Key, contentType,
      width: image.width, height: image.height, isPrimary: primaryCount === 0 });
  } catch (error) {
    await failHostedImage(id, error instanceof Error ? error.message : "Image generation failed");
    throw error;
  }
}

export async function ensureHostedInitialImages(nodeIds: string[]): Promise<void> {
  for (const nodeId of nodeIds) {
    if (await countHostedCompletedImages(nodeId) === 0)
      await generateHostedNodeImage(nodeId, { variationId: "primary" }).catch(() => undefined);
  }
}
