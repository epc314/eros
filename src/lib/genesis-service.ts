import { Prisma } from "@prisma/client";
import { ApiFailure } from "./api";
import { prisma } from "./db/prisma";
import { splitGenome } from "./protocol/chromosomes";
import { IMAGE_PROMPT_VERSION, PROTOCOL_VERSION } from "./protocol/constants";
import { createGenesisGenome, createNodeId } from "./protocol/genesis";
import { bytesToHex } from "./protocol/hex";
import { createNameKey, normalizeName } from "./protocol/normalization";
import { WORLD_ID } from "./world";

/** Create an additional generation-0 root using the world's permanent genesis timestamp. */
export async function createAdditionalGenesis(rawName: string) {
  const world = await prisma.world.findUnique({ where: { id: WORLD_ID } });
  if (!world) throw new ApiFailure("WORLD_NOT_FOUND", "The Eros world has not been initialized.", 404);

  const name = normalizeName(rawName);
  const nameKey = createNameKey(name);
  const genome = createGenesisGenome({ name, timestampMs: BigInt(world.genesisTimestampMs) });
  const genomeHex = bytesToHex(genome);
  const id = createNodeId(genome);

  const existingName = await prisma.node.findUnique({
    where: { worldId_nameKey: { worldId: WORLD_ID, nameKey } },
    include: { images: true },
  });
  if (existingName) {
    if (existingName.type === "GENESIS" && existingName.id === id) return { node: existingName, created: false };
    throw new ApiFailure("NODE_NAME_ALREADY_EXISTS", "This normalized name is already in use.", 409, { existingNodeId: existingName.id });
  }

  const collision = await prisma.node.findUnique({ where: { genomeHex } });
  if (collision) {
    if (collision.type === "GENESIS" && collision.id === id) return { node: collision, created: false };
    console.error("GENOME_COLLISION", { existingNodeId: collision.id, computedNodeId: id });
    throw new ApiFailure("GENOME_COLLISION", "A genome collision prevented node creation.", 409);
  }

  const chromosomes = splitGenome(genomeHex);
  try {
    const node = await prisma.node.create({ data: {
      id,
      worldId: WORLD_ID,
      protocolVersion: PROTOCOL_VERSION,
      promptVersion: IMAGE_PROMPT_VERSION,
      type: "GENESIS",
      name,
      nameKey,
      genomeHex,
      chromosome0Hex: chromosomes.chromosome0,
      chromosome1Hex: chromosomes.chromosome1,
      generation: 0,
    } });
    return { node, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.node.findUnique({ where: { worldId_nameKey: { worldId: WORLD_ID, nameKey } } });
      if (raced?.type === "GENESIS" && raced.id === id) return { node: raced, created: false };
      throw new ApiFailure("NODE_NAME_ALREADY_EXISTS", "This normalized name is already in use.", 409, { existingNodeId: raced?.id });
    }
    throw error;
  }
}
