import type { Edge, Node } from "@xyflow/react";

export const GRAPH_NODE_WIDTH = 268;
const GRAPH_NODE_HEIGHT = 280;
const COLUMN_GAP = 58;
const ROW_GAP = 156;
const JUNCTION_SIZE = 20;
const JUNCTION_LANES = [0, 2, 4, 1, 3];

export interface PedigreeJunctionData extends Record<string, unknown> {
  kind: "junction";
  generation: number;
  childId: string;
  parentNames: string[];
}

function generationOf(node: Node<Record<string, unknown>>) {
  const rawGeneration = Number(node.data.generation);
  return Number.isFinite(rawGeneration) ? Math.max(0, Math.trunc(rawGeneration)) : 0;
}

function nameOrder(left: Node<Record<string, unknown>>, right: Node<Record<string, unknown>>) {
  return String(left.data.name ?? "").localeCompare(String(right.data.name ?? ""), "zh-CN") || left.id.localeCompare(right.id);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Find the closest non-overlapping centers to the requested centers while
 * preserving the row order. This is a small isotonic regression: subtracting
 * the minimum card spacing turns the constraint into a monotonic sequence.
 */
function spreadCenters(desired: number[], spacing: number) {
  const blocks = desired.map((value, index) => ({ start: index, end: index, sum: value - index * spacing, count: 1 }));
  for (let index = 0; index < blocks.length - 1;) {
    const left = blocks[index];
    const right = blocks[index + 1];
    if (left.sum / left.count <= right.sum / right.count) {
      index += 1;
      continue;
    }
    blocks.splice(index, 2, {
      start: left.start,
      end: right.end,
      sum: left.sum + right.sum,
      count: left.count + right.count,
    });
    if (index > 0) index -= 1;
  }

  const fitted = new Array<number>(desired.length);
  for (const block of blocks) {
    const value = block.sum / block.count;
    for (let index = block.start; index <= block.end; index += 1) fitted[index] = value + index * spacing;
  }
  return fitted;
}

/**
 * Keep generations on immutable horizontal layers, then use repeated
 * barycentric sweeps to put related cards close together. The final top-down
 * placement centers descendants beneath their visible parents and resolves
 * card collisions without undoing the crossing-reduced order.
 */
export function layoutGraph<T extends Record<string, unknown>>(nodes: Node<T>[], edges: Edge[]): Node<T>[] {
  const genericNodes = nodes as Node<Record<string, unknown>>[];
  const byId = new Map(genericNodes.map((node) => [node.id, node]));
  const rows = new Map<number, Node<Record<string, unknown>>[]>();
  for (const node of genericNodes) {
    const generation = generationOf(node);
    const row = rows.get(generation) ?? [];
    row.push(node);
    rows.set(generation, row);
  }

  const generations = [...rows.keys()].sort((left, right) => left - right);
  for (const row of rows.values()) row.sort(nameOrder);

  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    parents.set(edge.target, [...(parents.get(edge.target) ?? []), edge.source]);
    children.set(edge.source, [...(children.get(edge.source) ?? []), edge.target]);
  }

  const orderIndex = () => {
    const index = new Map<string, number>();
    for (const row of rows.values()) row.forEach((node, position) => index.set(node.id, position));
    return index;
  };

  const sortByNeighbours = (row: Node<Record<string, unknown>>[], neighbours: Map<string, string[]>, index: Map<string, number>) => {
    const previous = new Map(row.map((node, position) => [node.id, position]));
    row.sort((left, right) => {
      const leftPositions = (neighbours.get(left.id) ?? []).map((id) => index.get(id)).filter((value): value is number => value !== undefined);
      const rightPositions = (neighbours.get(right.id) ?? []).map((id) => index.get(id)).filter((value): value is number => value !== undefined);
      if (leftPositions.length && rightPositions.length) {
        const delta = average(leftPositions) - average(rightPositions);
        if (Math.abs(delta) > Number.EPSILON) return delta;
      } else if (leftPositions.length !== rightPositions.length) {
        return leftPositions.length ? -1 : 1;
      }
      return (previous.get(left.id) ?? 0) - (previous.get(right.id) ?? 0) || nameOrder(left, right);
    });
  };

  for (let pass = 0; pass < 5; pass += 1) {
    let index = orderIndex();
    for (const generation of generations.slice(1)) {
      sortByNeighbours(rows.get(generation)!, parents, index);
      index = orderIndex();
    }
    index = orderIndex();
    for (const generation of generations.slice(0, -1).reverse()) {
      sortByNeighbours(rows.get(generation)!, children, index);
      index = orderIndex();
    }
  }

  const positioned = new Map<string, { x: number; y: number }>();
  const centers = new Map<string, number>();
  const spacing = GRAPH_NODE_WIDTH + COLUMN_GAP;
  for (const generation of generations) {
    const row = rows.get(generation)!;
    const fallbackCenters = row.map((_, index) => (index - (row.length - 1) / 2) * spacing);
    const desiredCenters = row.map((node, index) => {
      const parentCenters = (parents.get(node.id) ?? []).map((id) => centers.get(id)).filter((value): value is number => value !== undefined);
      return parentCenters.length ? average(parentCenters) : fallbackCenters[index];
    });
    const rowCenters = spreadCenters(desiredCenters, spacing);
    row.forEach((node, index) => {
      const center = rowCenters[index];
      centers.set(node.id, center);
      positioned.set(node.id, {
        x: center - GRAPH_NODE_WIDTH / 2,
        y: generation * (GRAPH_NODE_HEIGHT + ROW_GAP),
      });
    });
  }

  return nodes.map((node) => ({ ...node, position: positioned.get(node.id) ?? { x: 0, y: 0 } }));
}

function sourceHandle(source: Node<Record<string, unknown>>, targetCenter: number) {
  const sourceCenter = source.position.x + GRAPH_NODE_WIDTH / 2;
  return targetCenter < sourceCenter ? "lineage-left" : "lineage-right";
}

/**
 * Present a two-parent relationship like a mature pedigree: both branches
 * meet at one small junction, then a single descent line reaches the child.
 * Junction lanes are staggered inside the generation gap to avoid laying
 * multiple horizontal routes directly on top of each other.
 */
export function buildPedigreeGraph<T extends Record<string, unknown>>(nodes: Node<T>[], relations: Edge[]) {
  const genericNodes = nodes as Node<Record<string, unknown>>[];
  const byId = new Map(genericNodes.map((node) => [node.id, node]));
  const incoming = new Map<string, Edge[]>();
  for (const relation of relations) {
    if (!byId.has(relation.source) || !byId.has(relation.target)) continue;
    incoming.set(relation.target, [...(incoming.get(relation.target) ?? []), relation]);
  }

  const junctions: Node<PedigreeJunctionData>[] = [];
  const edges: Edge[] = [];
  const rowLaneIndex = new Map<number, number>();
  const targets = [...incoming.entries()].sort(([leftId], [rightId]) => {
    const left = byId.get(leftId)!;
    const right = byId.get(rightId)!;
    return generationOf(left) - generationOf(right) || left.position.x - right.position.x;
  });

  for (const [childId, childRelations] of targets) {
    const child = byId.get(childId)!;
    const childCenter = child.position.x + GRAPH_NODE_WIDTH / 2;
    const sortedRelations = [...childRelations].sort((left, right) => {
      const leftNode = byId.get(left.source)!;
      const rightNode = byId.get(right.source)!;
      return leftNode.position.x - rightNode.position.x || left.source.localeCompare(right.source);
    });

    if (sortedRelations.length < 2) {
      const relation = sortedRelations[0];
      const source = byId.get(relation.source)!;
      edges.push({
        id: relation.id,
        source: relation.source,
        sourceHandle: sourceHandle(source, childCenter),
        target: childId,
        type: "smoothstep",
        interactionWidth: 12,
        focusable: false,
        selectable: false,
        style: { stroke: "#61738f", strokeWidth: 1.35, opacity: 0.78 },
      });
      continue;
    }

    const generation = generationOf(child);
    const laneIndex = rowLaneIndex.get(generation) ?? 0;
    rowLaneIndex.set(generation, laneIndex + 1);
    const lane = JUNCTION_LANES[laneIndex % JUNCTION_LANES.length];
    const junctionId = `junction:${childId}`;
    const junctionOffset = 48 + lane * 19;
    junctions.push({
      id: junctionId,
      type: "junction",
      position: {
        x: childCenter - JUNCTION_SIZE / 2,
        y: child.position.y - junctionOffset,
      },
      data: {
        kind: "junction",
        generation: generation - 0.5,
        childId,
        parentNames: sortedRelations.map((relation) => String(byId.get(relation.source)?.data.name ?? relation.source)),
      },
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      deletable: false,
      zIndex: 1,
    });

    sortedRelations.forEach((relation, index) => {
      const source = byId.get(relation.source)!;
      edges.push({
        id: relation.id,
        source: relation.source,
        sourceHandle: sourceHandle(source, childCenter),
        target: junctionId,
        targetHandle: index === 0 ? "parent-left" : index === sortedRelations.length - 1 ? "parent-right" : undefined,
        type: "smoothstep",
        interactionWidth: 12,
        focusable: false,
        selectable: false,
        style: { stroke: "#61738f", strokeWidth: 1.35, opacity: 0.78 },
      });
    });
    edges.push({
      id: `${junctionId}:descent`,
      source: junctionId,
      sourceHandle: "child",
      target: childId,
      type: "straight",
      interactionWidth: 12,
      focusable: false,
      selectable: false,
      style: { stroke: "#22d3ee", strokeWidth: 1.55, opacity: 0.82 },
    });
  }

  return {
    nodes: [...nodes, ...junctions] as Node<T | PedigreeJunctionData>[],
    edges,
  };
}
