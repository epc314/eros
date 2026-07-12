-- Protocol identity fields are append-only. Public APIs expose no update operation,
-- and these database guards also reject accidental internal identity rewrites.
CREATE TRIGGER "Node_identity_immutable"
BEFORE UPDATE OF "worldId", "protocolVersion", "promptVersion", "type", "name", "nameKey", "genomeHex", "chromosome0Hex", "chromosome1Hex", "generation", "createdAt" ON "Node"
BEGIN
  SELECT RAISE(ABORT, 'Eros node identity is immutable');
END;

CREATE TRIGGER "Reproduction_immutable"
BEFORE UPDATE ON "Reproduction"
BEGIN
  SELECT RAISE(ABORT, 'Eros reproduction records are immutable');
END;

CREATE TRIGGER "ParentEdge_immutable"
BEFORE UPDATE ON "ParentEdge"
BEGIN
  SELECT RAISE(ABORT, 'Eros parent edges are immutable');
END;

CREATE TRIGGER "World_genesis_immutable"
BEFORE UPDATE OF "protocolVersion", "genesisTimestampMs", "initializedAt" ON "World"
BEGIN
  SELECT RAISE(ABORT, 'Eros world genesis is immutable');
END;
