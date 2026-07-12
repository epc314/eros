import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createAdditionalGenesis } from "@/lib/genesis-service";
import { GENESIS_NODE_NAMES } from "@/lib/protocol/constants";
import { createGenesisGenome } from "@/lib/protocol/genesis";
import { bytesToHex } from "@/lib/protocol/hex";
import { initializeWorld } from "@/lib/world";

async function clear() {
  await prisma.descriptionFeedback.deleteMany(); await prisma.generatedImage.deleteMany(); await prisma.nodeDescription.deleteMany(); await prisma.parentEdge.deleteMany();
  await prisma.reproduction.deleteMany(); await prisma.node.deleteMany(); await prisma.world.deleteMany();
}

describe("world initialization", () => {
  beforeEach(async () => { delete process.env.EROS_WORLD_GENESIS_TIMESTAMP_MS; await clear(); });
  afterAll(async () => { await clear(); await prisma.$disconnect(); });
  it("creates seven generation-zero nodes with one shared saved timestamp", async () => {
    const result = await initializeWorld(prisma, () => 1_700_000_000_123);
    expect(result.created).toBe(true); expect(result.nodes).toHaveLength(7);
    expect(new Set(result.nodes.map(({ generation }) => generation))).toEqual(new Set([0]));
    expect(result.nodes.map(({ name }) => name).sort()).toEqual([...GENESIS_NODE_NAMES].sort());
    for (const node of result.nodes) expect(node.genomeHex).toBe(bytesToHex(createGenesisGenome({ name: node.name, timestampMs: 1_700_000_000_123n })));
    const eros = await prisma.node.findFirstOrThrow({ where: { nameKey: "eros" }, include: { descriptions: { orderBy: { createdAt: "asc" } } } });
    expect(eros).toMatchObject({ isDead: true, recordsLocked: true });
    expect(eros.descriptions.map(({ kind }) => kind)).toEqual(["BIRTH", "DEATH"]);
    expect(await prisma.node.count({ where: { isDead: false, recordsLocked: false } })).toBe(6);
  });
  it("is idempotent and never recalculates the timestamp", async () => {
    const first = await initializeWorld(prisma, () => 1000);
    const second = await initializeWorld(prisma, () => 2000);
    expect(second.created).toBe(false); expect(second.world.genesisTimestampMs).toBe(first.world.genesisTimestampMs);
    expect(await prisma.node.count()).toBe(7);
  });
  it("adds a deterministic generation-zero root using the saved world timestamp", async () => {
    const initialized = await initializeWorld(prisma, () => 1234);
    const first = await createAdditionalGenesis("Nova");
    const second = await createAdditionalGenesis(" Nova ");
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.node.id).toBe(second.node.id);
    expect(first.node.type).toBe("GENESIS");
    expect(first.node.generation).toBe(0);
    expect(first.node.genomeHex).toBe(bytesToHex(createGenesisGenome({ name: "Nova", timestampMs: BigInt(initialized.world.genesisTimestampMs) })));
    expect(await prisma.parentEdge.count({ where: { childNodeId: first.node.id } })).toBe(0);
  });
  it("rejects changes to an existing node name at the database layer", async () => {
    const result = await initializeWorld(prisma, () => 1000);
    await expect(prisma.node.update({ where: { id: result.nodes[0].id }, data: { name: "Changed" } })).rejects.toThrow();
  });
});
