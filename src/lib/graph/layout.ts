import { MarkerType, type Edge, type Node } from "@xyflow/react";

export const GRAPH_NODE_WIDTH = 268;
export const GRAPH_NODE_HEIGHT = 280;
const BASE_RING_RADIUS = 420;
const RING_GAP = 370;
const NODE_ARC = 330;
const TAU = Math.PI * 2;

export interface RadialRing {
  generation: number;
  radius: number;
}

type Side = "top" | "right" | "bottom" | "left";
type Lane = "a" | "b";

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

function normalizeAngle(angle: number) {
  return ((angle % TAU) + TAU) % TAU;
}

function circularMean(angles: number[], fallback: number) {
  if (!angles.length) return normalizeAngle(fallback);
  const x = average(angles.map(Math.cos));
  const y = average(angles.map(Math.sin));
  return Math.abs(x) + Math.abs(y) < 1e-8 ? normalizeAngle(fallback) : normalizeAngle(Math.atan2(y, x));
}

/** Find the closest ordered values with at least `spacing` between neighbours. */
function spreadValues(desired: number[], spacing: number) {
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

function spreadCircularAngles(items: Array<{ id: string; desired: number; order: number }>, minimumGap: number) {
  if (items.length <= 1) return new Map(items.map((item) => [item.id, normalizeAngle(item.desired)]));
  const sorted = [...items].sort((left, right) => normalizeAngle(left.desired) - normalizeAngle(right.desired) || left.order - right.order);

  let largestGapIndex = 0;
  let largestGap = -1;
  sorted.forEach((item, index) => {
    const next = sorted[(index + 1) % sorted.length];
    const gap = normalizeAngle(next.desired - item.desired);
    if (gap > largestGap) {
      largestGap = gap;
      largestGapIndex = index;
    }
  });

  const cut = (largestGapIndex + 1) % sorted.length;
  const ordered = [...sorted.slice(cut), ...sorted.slice(0, cut)];
  const unwrapped: number[] = [];
  ordered.forEach((item, index) => {
    let angle = normalizeAngle(item.desired);
    if (index > 0) while (angle < unwrapped[index - 1]) angle += TAU;
    unwrapped.push(angle);
  });

  const safeGap = Math.min(minimumGap, TAU / items.length * 0.92);
  const spread = spreadValues(unwrapped, safeGap);
  return new Map(ordered.map((item, index) => [item.id, normalizeAngle(spread[index])]));
}

function orderRows(nodes: Node<Record<string, unknown>>[], edges: Edge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const rows = new Map<number, Node<Record<string, unknown>>[]>();
  for (const node of nodes) {
    const generation = generationOf(node);
    const row = rows.get(generation) ?? [];
    row.push(node);
    rows.set(generation, row);
  }
  for (const row of rows.values()) row.sort(nameOrder);

  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    parents.set(edge.target, [...(parents.get(edge.target) ?? []), edge.source]);
    children.set(edge.source, [...(children.get(edge.source) ?? []), edge.target]);
  }

  const generations = [...rows.keys()].sort((left, right) => left - right);
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

  return { rows, generations, parents };
}

function sideToward(from: Node<Record<string, unknown>>, to: Node<Record<string, unknown>>): Side {
  const fromX = from.position.x + GRAPH_NODE_WIDTH / 2;
  const fromY = from.position.y + GRAPH_NODE_HEIGHT / 2;
  const toX = to.position.x + GRAPH_NODE_WIDTH / 2;
  const toY = to.position.y + GRAPH_NODE_HEIGHT / 2;
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  if (Math.abs(deltaX) > Math.abs(deltaY)) return deltaX > 0 ? "right" : "left";
  return deltaY > 0 ? "bottom" : "top";
}

function assignHandleLanes(relations: Edge[], byId: Map<string, Node<Record<string, unknown>>>, endpoint: "source" | "target") {
  const lanes = new Map<string, Lane>();
  const groups = new Map<string, Edge[]>();
  for (const relation of relations) {
    const from = byId.get(relation[endpoint]);
    const to = byId.get(endpoint === "source" ? relation.target : relation.source);
    if (!from || !to) continue;
    const key = `${relation[endpoint]}:${sideToward(from, to)}`;
    groups.set(key, [...(groups.get(key) ?? []), relation]);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => left.id.localeCompare(right.id));
    group.forEach((relation, index) => lanes.set(relation.id, index % 2 === 0 ? "a" : "b"));
  }
  return lanes;
}

/**
 * Lay semantic generations onto concentric rings. The first visible generation
 * occupies the inner ring; later generations expand outward. Descendants seek
 * the circular mean of their visible parents and are then separated along the
 * circumference so cards never stack on one another.
 */
export function buildRadialGraph<T extends Record<string, unknown>>(nodes: Node<T>[], relations: Edge[]) {
  const genericNodes = nodes as Node<Record<string, unknown>>[];
  const { rows, generations, parents } = orderRows(genericNodes, relations);
  const angles = new Map<string, number>();
  const rings: RadialRing[] = [];
  const positioned = new Map<string, { x: number; y: number }>();
  let previousRadius = 0;

  generations.forEach((generation, ringIndex) => {
    const row = rows.get(generation)!;
    const densityRadius = row.length * NODE_ARC / TAU;
    const radius = Math.max(densityRadius, ringIndex === 0 ? BASE_RING_RADIUS : previousRadius + RING_GAP);
    previousRadius = radius;
    rings.push({ generation, radius });

    const desired = row.map((node, index) => {
      const fallback = -Math.PI / 2 + index * TAU / Math.max(1, row.length);
      const parentAngles = (parents.get(node.id) ?? []).map((id) => angles.get(id)).filter((value): value is number => value !== undefined);
      return { id: node.id, desired: circularMean(parentAngles, fallback), order: index };
    });
    const resolved = spreadCircularAngles(desired, NODE_ARC / radius);
    for (const node of row) {
      const angle = resolved.get(node.id) ?? 0;
      angles.set(node.id, angle);
      positioned.set(node.id, {
        x: Math.cos(angle) * radius - GRAPH_NODE_WIDTH / 2,
        y: Math.sin(angle) * radius - GRAPH_NODE_HEIGHT / 2,
      });
    }
  });

  const radialNodes = nodes.map((node) => ({ ...node, position: positioned.get(node.id) ?? { x: 0, y: 0 } }));
  const byId = new Map((radialNodes as Node<Record<string, unknown>>[]).map((node) => [node.id, node]));
  const sourceLanes = assignHandleLanes(relations, byId, "source");
  const targetLanes = assignHandleLanes(relations, byId, "target");
  const radialEdges: Edge[] = relations.flatMap((relation) => {
    const source = byId.get(relation.source);
    const target = byId.get(relation.target);
    if (!source || !target) return [];
    const sourceSide = sideToward(source, target);
    const targetSide = sideToward(target, source);
    return [{
      id: relation.id,
      source: relation.source,
      sourceHandle: `source-${sourceSide}-${sourceLanes.get(relation.id) ?? "a"}`,
      target: relation.target,
      targetHandle: `target-${targetSide}-${targetLanes.get(relation.id) ?? "a"}`,
      type: "default",
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: "#64748b" },
      interactionWidth: 16,
      focusable: false,
      selectable: false,
      style: { stroke: "#64748b", strokeWidth: 1.4, opacity: 0.74 },
    }];
  });

  return { nodes: radialNodes, edges: radialEdges, rings };
}
