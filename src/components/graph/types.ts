export interface GraphNodeRecord {
  id: string;
  name: string;
  genomeHex: string;
  promptVersion: string;
  type: "GENESIS" | "DESCENDANT";
  generation: number;
  _count: { descriptions: number; images: number };
  images: Array<{ imageDataUrl?: string | null; imageUrl?: string | null; thumbnailUrl?: string | null }>;
  reproduction?: { mutationBitCount: number } | null;
}

export interface GraphEdgeRecord { id: string; parentNodeId: string; childNodeId: string }

export interface GraphPayload {
  world: { id: string; name: string; genesisTimestampMs: string; initializedAt: string };
  nodes: GraphNodeRecord[];
  edges: GraphEdgeRecord[];
}
