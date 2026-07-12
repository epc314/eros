import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { ensureInitialImages } from "../src/lib/image/service";
import { WORLD_ID } from "../src/lib/world";

async function main() {
  const nodes = await prisma.node.findMany({ where: { worldId: WORLD_ID }, select: { id: true } });
  await ensureInitialImages(nodes.map(({ id }) => id));
  const completed = await prisma.generatedImage.count({ where: { nodeId: { in: nodes.map(({ id }) => id) }, status: "COMPLETED" } });
  console.log(`Eros image backfill complete: ${completed}/${nodes.length} nodes have completed images.`);
}

main().finally(() => prisma.$disconnect());
