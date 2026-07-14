import { BflImageProvider } from "../image/bfl-provider";
import { MockImageProvider } from "../image/mock-provider";
import type { ImageProvider } from "../image/types";
import { hexToBytes } from "../protocol/hex";
import { getHostedEnv } from "./env";
import {
  completeTreasureImage,
  countCompletedTreasureImages,
  createTreasurePendingImage,
  failTreasureImage,
  getTreasureInternal,
  listTreasureImages,
} from "./treasure-repository";

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

export async function generateTreasureImage(treasureId: string) {
  const treasure = await getTreasureInternal(treasureId);
  if (!treasure) throw new Error("TREASURE_NOT_FOUND");
  if (await countCompletedTreasureImages(treasureId)) return (await listTreasureImages(treasureId)).find(({ status }) => status === "COMPLETED") ?? null;
  const imageProvider = provider();
  const id = crypto.randomUUID();
  await createTreasurePendingImage({
    id,
    treasureId,
    provider: imageProvider.name,
    exactPrompt: treasure.exactPrompt,
    providerSeed: treasure.searchHashHex,
    variationId: "primary",
  });
  try {
    const image = await imageProvider.generate({
      prompt: treasure.exactPrompt,
      width: 720,
      height: 480,
      providerSeed: treasure.searchHashHex,
      variationId: "primary",
      nodeId: treasure.id,
      nodeName: treasure.name,
      genomeHex: treasure.searchHashHex,
      tokenIds: Array.from(hexToBytes(treasure.searchHashHex, 16)),
    });
    let r2Key: string | undefined;
    let contentType: string | undefined;
    if (image.imageDataUrl) {
      const decoded = decodeDataUrl(image.imageDataUrl);
      r2Key = `treasures/${id}.${decoded.extension}`;
      contentType = decoded.contentType;
      await getHostedEnv().EROS_IMAGES.put(r2Key, decoded.bytes, { httpMetadata: { contentType } });
    }
    return completeTreasureImage(id, {
      provider: image.provider,
      providerModel: image.providerModel,
      providerRequestId: image.providerRequestId,
      imageUrl: image.imageUrl,
      r2Key,
      contentType,
      width: image.width,
      height: image.height,
      isPrimary: true,
    });
  } catch (error) {
    await failTreasureImage(id, error instanceof Error ? error.message : "Image generation failed");
    throw error;
  }
}
