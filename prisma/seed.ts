import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { ensureInitialImages } from "../src/lib/image/service";
import { initializeWorld } from "../src/lib/world";

async function main() {
  const result = await initializeWorld(prisma);
  await ensureInitialImages(result.nodes.map(({ id }) => id));
  console.log(`Eros world ready: ${result.nodes.length} genesis nodes (${result.created ? "created" : "existing"}).`);
}

main().finally(() => prisma.$disconnect());
