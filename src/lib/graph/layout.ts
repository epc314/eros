import type { Edge, Node } from "@xyflow/react";

const WIDTH = 268;
const HEIGHT = 250;
const COLUMN_GAP = 48;
const ROW_GAP = 110;

/**
 * Eros generations are semantic data, not ranks inferred from the currently
 * visible edges. Keep every generation on one immutable row so filtering or
 * adding a node never makes the remaining cards jump between generations.
 */
export function layoutGraph<T extends Record<string, unknown>>(nodes: Node<T>[], _edges: Edge[]): Node<T>[] {
  void _edges;
  const rows = new Map<number, Node<T>[]>();

  for (const node of nodes) {
    const rawGeneration = Number(node.data.generation);
    const generation = Number.isFinite(rawGeneration) ? Math.max(0, Math.trunc(rawGeneration)) : 0;
    const row = rows.get(generation) ?? [];
    row.push(node);
    rows.set(generation, row);
  }

  const positioned = new Map<string, { x: number; y: number }>();
  for (const [generation, row] of rows) {
    row.sort((left, right) => {
      const nameOrder = String(left.data.name ?? "").localeCompare(String(right.data.name ?? ""), "zh-CN");
      return nameOrder || left.id.localeCompare(right.id);
    });
    const rowWidth = row.length * WIDTH + Math.max(0, row.length - 1) * COLUMN_GAP;
    row.forEach((node, index) => positioned.set(node.id, {
      x: index * (WIDTH + COLUMN_GAP) - rowWidth / 2,
      y: generation * (HEIGHT + ROW_GAP),
    }));
  }

  return nodes.map((node) => ({ ...node, position: positioned.get(node.id) ?? { x: 0, y: 0 } }));
}
