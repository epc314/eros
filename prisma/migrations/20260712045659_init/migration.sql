-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "protocolVersion" TEXT NOT NULL,
    "genesisTimestampMs" TEXT NOT NULL,
    "initializedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Node" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Node_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reproduction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childNodeId" TEXT NOT NULL,
    "parentLowId" TEXT NOT NULL,
    "parentHighId" TEXT NOT NULL,
    "lowChoice" INTEGER NOT NULL,
    "highChoice" INTEGER NOT NULL,
    "lowSelectedHex" TEXT NOT NULL,
    "lowUnusedHex" TEXT NOT NULL,
    "highSelectedHex" TEXT NOT NULL,
    "highUnusedHex" TEXT NOT NULL,
    "baseGenomeHex" TEXT NOT NULL,
    "hammingDistance" INTEGER NOT NULL,
    "sameBitCount" INTEGER NOT NULL,
    "similarityRatio" REAL NOT NULL,
    "similarityMaskHex" TEXT NOT NULL,
    "requestedMutationBits" INTEGER NOT NULL,
    "mutationBitCount" INTEGER NOT NULL,
    "mutationSeedHex" TEXT NOT NULL,
    "mutationMaskHex" TEXT NOT NULL,
    "flippedBitPositionsJson" TEXT NOT NULL,
    "changedTokenPositionsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reproduction_childNodeId_fkey" FOREIGN KEY ("childNodeId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reproduction_parentLowId_fkey" FOREIGN KEY ("parentLowId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reproduction_parentHighId_fkey" FOREIGN KEY ("parentHighId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentNodeId" TEXT NOT NULL,
    "childNodeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentEdge_parentNodeId_fkey" FOREIGN KEY ("parentNodeId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParentEdge_childNodeId_fkey" FOREIGN KEY ("childNodeId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NodeDescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeDescription_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerModel" TEXT,
    "providerRequestId" TEXT,
    "exactPrompt" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "providerSeed" TEXT,
    "variationId" TEXT,
    "imageUrl" TEXT,
    "localPath" TEXT,
    "imageDataUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedImage_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Node_genomeHex_key" ON "Node"("genomeHex");

-- CreateIndex
CREATE INDEX "Node_worldId_generation_idx" ON "Node"("worldId", "generation");

-- CreateIndex
CREATE UNIQUE INDEX "Node_worldId_nameKey_key" ON "Node"("worldId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Reproduction_childNodeId_key" ON "Reproduction"("childNodeId");

-- CreateIndex
CREATE INDEX "ParentEdge_childNodeId_idx" ON "ParentEdge"("childNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentEdge_parentNodeId_childNodeId_key" ON "ParentEdge"("parentNodeId", "childNodeId");

-- CreateIndex
CREATE INDEX "NodeDescription_nodeId_createdAt_idx" ON "NodeDescription"("nodeId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedImage_nodeId_createdAt_idx" ON "GeneratedImage"("nodeId", "createdAt");
