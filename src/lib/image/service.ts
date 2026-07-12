import { prisma } from "../db/prisma";
import { IMAGE_PROMPT_VERSION } from "../protocol/constants";
import { buildEntityImagePrompt } from "../protocol/prompt";
import { decodeGenome } from "../protocol/token-decoder";
import { newRecordId } from "../world";
import { getImageProvider } from "./provider-factory";

export async function generateNodeImage(nodeId: string, options: { providerSeed?: string; variationId?: string; lockSeed?: boolean } = {}) {
  const node = await prisma.node.findUnique({ where: { id: nodeId } });
  if (!node) throw new Error("NODE_NOT_FOUND");
  if (node.promptVersion !== IMAGE_PROMPT_VERSION) throw new Error("PROMPT_VERSION_MISMATCH");
  const tokens = decodeGenome(node.genomeHex, undefined, node.promptVersion);
  const exactPrompt = buildEntityImagePrompt(tokens);
  const provider = getImageProvider();
  const id = newRecordId();
  const variationId = options.variationId ?? id;
  const providerSeed = options.lockSeed ? (options.providerSeed ?? node.genomeHex) : options.providerSeed;
  const pending = await prisma.generatedImage.create({ data: {
    id, nodeId, provider: provider.name, exactPrompt, promptVersion: IMAGE_PROMPT_VERSION,
    providerSeed, variationId, status: "PENDING",
  } });
  try {
    const image = await provider.generate({ prompt: exactPrompt, width: 720, height: 480, providerSeed, variationId,
      nodeId, nodeName: node.name, genomeHex: node.genomeHex, tokenIds: tokens.map(({ tokenId }) => tokenId) });
    const primaryCount = await prisma.generatedImage.count({ where: { nodeId, status: "COMPLETED" } });
    return await prisma.generatedImage.update({ where: { id: pending.id }, data: {
      provider: image.provider, providerModel: image.providerModel, providerRequestId: image.providerRequestId,
      imageUrl: image.imageUrl, imageDataUrl: image.imageDataUrl, width: image.width, height: image.height,
      isPrimary: primaryCount === 0, status: "COMPLETED",
    } });
  } catch (error) {
    await prisma.generatedImage.update({ where: { id: pending.id }, data: {
      status: "FAILED", errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Image generation failed",
    } });
    throw error;
  }
}

export async function ensureInitialImages(nodeIds: string[]): Promise<void> {
  for (const nodeId of nodeIds) {
    const count = await prisma.generatedImage.count({ where: { nodeId, status: "COMPLETED" } });
    if (!count) await generateNodeImage(nodeId, { variationId: "primary" }).catch(() => undefined);
  }
}
