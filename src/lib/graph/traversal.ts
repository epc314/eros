export interface SimpleEdge { parentNodeId: string; childNodeId: string }

function traverse(startId: string, edges: SimpleEdge[], direction: "up" | "down"): Set<string> {
  const found = new Set([startId]);
  const queue = [startId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of edges) {
      const next = direction === "up" && edge.childNodeId === current ? edge.parentNodeId :
        direction === "down" && edge.parentNodeId === current ? edge.childNodeId : undefined;
      if (next && !found.has(next)) { found.add(next); queue.push(next); }
    }
  }
  return found;
}

export const ancestorIds = (id: string, edges: SimpleEdge[]) => traverse(id, edges, "up");
export const descendantIds = (id: string, edges: SimpleEdge[]) => traverse(id, edges, "down");
