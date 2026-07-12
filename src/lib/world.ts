import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { GENESIS_NODE_NAMES, IMAGE_PROMPT_VERSION, PROJECT_NAME, PROTOCOL_VERSION } from "./protocol/constants";
import { splitGenome } from "./protocol/chromosomes";
import { createGenesisGenome, createNodeId } from "./protocol/genesis";
import { bytesToHex } from "./protocol/hex";
import { createNameKey, normalizeName } from "./protocol/normalization";
import { EROS_BIRTH_RECORD, EROS_DEATH_RECORD, genesisBirthRecord } from "./story";

export const WORLD_ID = "eros-world";
type Db = PrismaClient | Prisma.TransactionClient;

function configuredTimestamp(): bigint | undefined {
  const raw = process.env.EROS_WORLD_GENESIS_TIMESTAMP_MS?.trim();
  if (!raw) return undefined;
  const value = BigInt(raw);
  if (value < 0n) throw new Error("EROS_WORLD_GENESIS_TIMESTAMP_MS must be unsigned");
  return value;
}

export async function initializeWorld(client: PrismaClient, now: () => number = Date.now) {
  const existing = await client.world.findUnique({ where: { id: WORLD_ID }, include: { nodes: { orderBy: { name: "asc" } } } });
  if (existing) return { world: existing, nodes: existing.nodes, created: false };

  return client.$transaction(async (tx) => {
    const raced = await tx.world.findUnique({ where: { id: WORLD_ID }, include: { nodes: true } });
    if (raced) return { world: raced, nodes: raced.nodes, created: false };
    const timestampMs = configuredTimestamp() ?? BigInt(now());
    const world = await tx.world.create({ data: {
      id: WORLD_ID, name: PROJECT_NAME, protocolVersion: PROTOCOL_VERSION,
      genesisTimestampMs: timestampMs.toString(),
    } });
    const nodes = [];
    for (const rawName of GENESIS_NODE_NAMES) {
      const name = normalizeName(rawName);
      const nameKey = createNameKey(name);
      const genome = createGenesisGenome({ name, timestampMs });
      const genomeHex = bytesToHex(genome);
      const chromosomes = splitGenome(genomeHex);
      const isEros = nameKey === "eros";
      nodes.push(await tx.node.create({ data: {
        id: createNodeId(genome), worldId: world.id, protocolVersion: PROTOCOL_VERSION,
        promptVersion: IMAGE_PROMPT_VERSION, type: "GENESIS", name, nameKey,
        genomeHex, chromosome0Hex: chromosomes.chromosome0, chromosome1Hex: chromosomes.chromosome1,
        generation: 0, isDead: isEros, recordsLocked: isEros,
        descriptions: { create: isEros ? [
          { id: newRecordId(), body: EROS_BIRTH_RECORD, kind: "BIRTH" },
          { id: newRecordId(), body: EROS_DEATH_RECORD, kind: "DEATH", createdAt: new Date(Date.now() + 1_000) },
        ] : [{ id: newRecordId(), body: genesisBirthRecord(name), kind: "BIRTH" }] },
      } }));
    }
    return { world, nodes, created: true };
  });
}

export async function worldGraph(db: Db) {
  const world = await db.world.findUnique({ where: { id: WORLD_ID } });
  if (!world) return null;
  const [nodes, edges] = await Promise.all([
    db.node.findMany({ where: { worldId: WORLD_ID }, orderBy: [{ generation: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { descriptions: true, images: true } }, reproduction: true,
        images: { where: { status: "COMPLETED" }, orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }], take: 1 } } }),
    db.parentEdge.findMany({ where: { child: { worldId: WORLD_ID } }, orderBy: { createdAt: "asc" } }),
  ]);
  return { world, nodes, edges };
}

export const newRecordId = () => randomUUID();
