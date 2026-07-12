-- CreateTable
CREATE TABLE "DescriptionFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "descriptionId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "isTrue" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DescriptionFeedback_descriptionId_fkey" FOREIGN KEY ("descriptionId") REFERENCES "NodeDescription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Node" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldId" TEXT NOT NULL,
    "protocolVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "genomeHex" TEXT NOT NULL,
    "chromosome0Hex" TEXT NOT NULL,
    "chromosome1Hex" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "isDead" BOOLEAN NOT NULL DEFAULT false,
    "recordsLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Node_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Node" ("chromosome0Hex", "chromosome1Hex", "createdAt", "generation", "genomeHex", "id", "name", "nameKey", "promptVersion", "protocolVersion", "type", "worldId") SELECT "chromosome0Hex", "chromosome1Hex", "createdAt", "generation", "genomeHex", "id", "name", "nameKey", "promptVersion", "protocolVersion", "type", "worldId" FROM "Node";
DROP TABLE "Node";
ALTER TABLE "new_Node" RENAME TO "Node";
CREATE UNIQUE INDEX "Node_genomeHex_key" ON "Node"("genomeHex");
CREATE INDEX "Node_worldId_generation_idx" ON "Node"("worldId", "generation");
CREATE UNIQUE INDEX "Node_worldId_nameKey_key" ON "Node"("worldId", "nameKey");
CREATE TABLE "new_NodeDescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "kind" TEXT NOT NULL DEFAULT 'STORY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeDescription_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NodeDescription" ("authorLabel", "body", "createdAt", "id", "nodeId", "status") SELECT "authorLabel", "body", "createdAt", "id", "nodeId", "status" FROM "NodeDescription";
DROP TABLE "NodeDescription";
ALTER TABLE "new_NodeDescription" RENAME TO "NodeDescription";
CREATE INDEX "NodeDescription_nodeId_createdAt_idx" ON "NodeDescription"("nodeId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DescriptionFeedback_descriptionId_idx" ON "DescriptionFeedback"("descriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "DescriptionFeedback_descriptionId_voterKey_key" ON "DescriptionFeedback"("descriptionId", "voterKey");

-- Recreate guards dropped by Prisma's SQLite table redefinition. Life status and
-- record locking remain mutable; hash-derived identity fields do not.
CREATE TRIGGER "Node_identity_immutable"
BEFORE UPDATE OF "worldId", "protocolVersion", "promptVersion", "type", "name", "nameKey", "genomeHex", "chromosome0Hex", "chromosome1Hex", "generation", "createdAt" ON "Node"
BEGIN
  SELECT RAISE(ABORT, 'Eros node identity is immutable');
END;

CREATE TRIGGER "NodeDescription_immutable"
BEFORE UPDATE OF "nodeId", "body", "authorLabel", "status", "kind", "createdAt" ON "NodeDescription"
BEGIN
  SELECT RAISE(ABORT, 'Eros descriptions are immutable');
END;
