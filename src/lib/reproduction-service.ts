import { Prisma } from "@prisma/client";
import { prisma } from "./db/prisma";
import { IMAGE_PROMPT_VERSION, PROTOCOL_VERSION } from "./protocol/constants";
import { splitGenome } from "./protocol/chromosomes";
import { createNameKey, normalizeName } from "./protocol/normalization";
import { reproduce } from "./protocol/reproduction";
import { calculateMutationStats } from "./protocol/token-decoder";
import { ApiFailure } from "./api";
import { newRecordId, WORLD_ID } from "./world";
import { descendantBirthRecord } from "./story";

export async function previewReproduction(parentAId: string, parentBId: string, name: string) {
  if (parentAId === parentBId) throw new ApiFailure("PARENTS_MUST_BE_DIFFERENT", "Choose two different nodes.");
  const parents = await prisma.node.findMany({ where: { id: { in: [parentAId, parentBId] }, worldId: WORLD_ID } });
  if (parents.length !== 2) throw new ApiFailure("PARENT_NOT_FOUND", "Both nodes must already exist.", 404);
  const parentA = parents.find(({ id }) => id === parentAId)!;
  const parentB = parents.find(({ id }) => id === parentBId)!;
  if (parentA.isDead || parentB.isDead) throw new ApiFailure("DEAD_PARENT", "死亡节点不能参与繁衍。", 409);
  const result = reproduce(parentA, parentB, name);
  return { result, mutationStats: calculateMutationStats(result.baseGenomeHex, result.childGenomeHex, result.flippedBitPositions) };
}

export async function createDescendant(parentAId: string, parentBId: string, rawName: string, suppliedDescription?: string) {
  const normalizedName = normalizeName(rawName);
  const nameKey = createNameKey(normalizedName);
  const preview = await previewReproduction(parentAId, parentBId, normalizedName);
  const { result } = preview;
  const existingName = await prisma.node.findUnique({ where: { worldId_nameKey: { worldId: WORLD_ID, nameKey } }, include: { reproduction: true, images: true } });
  if (existingName) {
    const same = existingName.id === result.childNodeId && existingName.reproduction?.parentLowId === result.parentLowId &&
      existingName.reproduction?.parentHighId === result.parentHighId;
    if (same) return { node: existingName, ...preview, created: false };
    throw new ApiFailure("NODE_NAME_ALREADY_EXISTS", "This normalized name is already in use.", 409, { existingNodeId: existingName.id });
  }
  const collision = await prisma.node.findUnique({ where: { genomeHex: result.childGenomeHex } });
  if (collision) {
    console.error("GENOME_COLLISION", { existingNodeId: collision.id, computedNodeId: result.childNodeId });
    throw new ApiFailure("GENOME_COLLISION", "A genome collision prevented node creation.", 409);
  }
  const chromosomes = splitGenome(result.childGenomeHex);
  try {
    const node = await prisma.$transaction(async (tx) => {
      const parentRecords = await tx.node.findMany({ where: { id: { in: [result.parentLowId, result.parentHighId] } } });
      const generation = Math.max(...parentRecords.map((parent) => parent.generation)) + 1;
      const parentA = parentRecords.find((parent) => parent.id === parentAId)!;
      const parentB = parentRecords.find((parent) => parent.id === parentBId)!;
      const created = await tx.node.create({ data: {
        id: result.childNodeId, worldId: WORLD_ID, protocolVersion: PROTOCOL_VERSION,
        promptVersion: IMAGE_PROMPT_VERSION, type: "DESCENDANT", name: normalizedName, nameKey,
        genomeHex: result.childGenomeHex, chromosome0Hex: chromosomes.chromosome0,
        chromosome1Hex: chromosomes.chromosome1, generation,
        descriptions: { create: { id: newRecordId(), body: descendantBirthRecord(normalizedName, parentA.name, parentB.name, suppliedDescription), kind: "BIRTH" } },
      } });
      await tx.reproduction.create({ data: {
        id: newRecordId(), childNodeId: created.id, parentLowId: result.parentLowId, parentHighId: result.parentHighId,
        lowChoice: result.lowChoice, highChoice: result.highChoice, lowSelectedHex: result.lowSelectedHex,
        lowUnusedHex: result.lowUnusedHex, highSelectedHex: result.highSelectedHex, highUnusedHex: result.highUnusedHex,
        baseGenomeHex: result.baseGenomeHex, hammingDistance: result.similarity.hammingDistance,
        sameBitCount: result.similarity.sameBitCount, similarityRatio: result.similarity.similarityRatio,
        similarityMaskHex: result.similarity.similarityMaskHex, requestedMutationBits: result.requestedMutationBits,
        mutationBitCount: result.mutationBitCount, mutationSeedHex: result.mutationSeedHex,
        mutationMaskHex: result.mutationMaskHex, flippedBitPositionsJson: JSON.stringify(result.flippedBitPositions),
        changedTokenPositionsJson: JSON.stringify(preview.mutationStats.changedTokenPositions),
      } });
      await tx.parentEdge.createMany({ data: [
        { id: newRecordId(), parentNodeId: result.parentLowId, childNodeId: created.id },
        { id: newRecordId(), parentNodeId: result.parentHighId, childNodeId: created.id },
      ] });
      return created;
    });
    return { node, ...preview, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.node.findUnique({ where: { worldId_nameKey: { worldId: WORLD_ID, nameKey } }, include: { reproduction: true } });
      if (raced?.id === result.childNodeId) return { node: raced, ...preview, created: false };
      throw new ApiFailure("NODE_NAME_ALREADY_EXISTS", "This normalized name is already in use.", 409, { existingNodeId: raced?.id });
    }
    throw error;
  }
}
