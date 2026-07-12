import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { ensureInitialImages } from "../src/lib/image/service";
import { initializeWorld, WORLD_ID } from "../src/lib/world";

async function main() {
  const existing = await prisma.world.findUnique({ where: { id: WORLD_ID } });
  const preservedTimestamp = existing?.genesisTimestampMs;

  await prisma.$transaction(async (tx) => {
    await tx.descriptionFeedback.deleteMany();
    await tx.generatedImage.deleteMany();
    await tx.nodeDescription.deleteMany();
    await tx.parentEdge.deleteMany();
    await tx.reproduction.deleteMany();
    await tx.node.deleteMany();
    await tx.world.deleteMany();
  });

  const previousTimestamp = process.env.EROS_WORLD_GENESIS_TIMESTAMP_MS;
  if (preservedTimestamp) process.env.EROS_WORLD_GENESIS_TIMESTAMP_MS = preservedTimestamp;
  try {
    const result = await initializeWorld(prisma);
    await ensureInitialImages(result.nodes.map(({ id }) => id));
    console.log(`Eros reset complete: ${result.nodes.length} genesis nodes, protocol ${result.world.protocolVersion}, timestamp ${result.world.genesisTimestampMs}.`);
  } finally {
    if (previousTimestamp === undefined) delete process.env.EROS_WORLD_GENESIS_TIMESTAMP_MS;
    else process.env.EROS_WORLD_GENESIS_TIMESTAMP_MS = previousTimestamp;
  }
}

main().finally(() => prisma.$disconnect());
