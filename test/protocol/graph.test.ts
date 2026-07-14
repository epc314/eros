import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { buildRadialGraph, GRAPH_NODE_HEIGHT, GRAPH_NODE_WIDTH } from "@/lib/graph/layout";
import { ancestorIds, descendantIds } from "@/lib/graph/traversal";

const edges = [
  { parentNodeId: "a", childNodeId: "c" }, { parentNodeId: "b", childNodeId: "c" },
  { parentNodeId: "c", childNodeId: "d" }, { parentNodeId: "b", childNodeId: "d" },
];

describe("graph traversal", () => {
  it("finds all ancestors without looping", () => expect([...ancestorIds("d", edges)].sort()).toEqual(["a", "b", "c", "d"]));
  it("finds all descendants", () => expect([...descendantIds("a", edges)].sort()).toEqual(["a", "c", "d"]));
});

function polar(node: Node<Record<string, unknown>>) {
  const x = node.position.x + GRAPH_NODE_WIDTH / 2;
  const y = node.position.y + GRAPH_NODE_HEIGHT / 2;
  return { radius: Math.hypot(x, y), angle: Math.atan2(y, x) };
}

describe("radial generation layout", () => {
  it("pins Eros to the graph origin and keeps the other genesis nodes on the first ring", () => {
    const nodes = [
      { id: "eros", data: { name: "Eros", generation: 0 } },
      { id: "gaia", data: { name: "Gaia", generation: 0 } },
      { id: "khaos", data: { name: "Khaos", generation: 0 } },
    ].map((node) => ({ ...node, position: { x: 0, y: 0 } })) as Node<Record<string, unknown>>[];
    const graph = buildRadialGraph(nodes, []);
    const eros = graph.nodes.find(({ id }) => id === "eros")!;
    const gaia = graph.nodes.find(({ id }) => id === "gaia")!;
    expect(polar(eros).radius).toBe(0);
    expect(eros.data.isRadialCenter).toBe(true);
    expect(polar(gaia).radius).toBeGreaterThan(0);
    expect(graph.centerNodeId).toBe("eros");
    expect(graph.rings.map(({ generation }) => generation)).toEqual([0]);
  });

  it("keeps each generation on a stable concentric ring", () => {
    const nodes = [
      { id: "root-b", data: { name: "Beta", generation: 0 } },
      { id: "child", data: { name: "Child", generation: 1 } },
      { id: "root-a", data: { name: "Alpha", generation: 0 } },
    ].map((node) => ({ ...node, position: { x: 0, y: 0 } })) as Node<Record<string, unknown>>[];
    const first = buildRadialGraph(nodes, []);
    const second = buildRadialGraph(nodes, []);
    const rootA = first.nodes.find(({ id }) => id === "root-a")!;
    const rootB = first.nodes.find(({ id }) => id === "root-b")!;
    const child = first.nodes.find(({ id }) => id === "child")!;
    expect(polar(rootA).radius).toBeCloseTo(polar(rootB).radius);
    expect(polar(child).radius).toBeGreaterThan(polar(rootA).radius);
    expect(first.nodes.map(({ position }) => position)).toEqual(second.nodes.map(({ position }) => position));
    expect(first.rings.map(({ generation }) => generation)).toEqual([0, 1]);
  });

  it("places descendants near the circular mean of their parents", () => {
    const nodes = [
      { id: "a", data: { name: "A", generation: 0 } },
      { id: "b", data: { name: "B", generation: 0 } },
      { id: "c", data: { name: "C", generation: 0 } },
      { id: "d", data: { name: "D", generation: 0 } },
      { id: "child", data: { name: "Child", generation: 1 } },
    ].map((node) => ({ ...node, position: { x: 0, y: 0 } })) as Node<Record<string, unknown>>[];
    const relations = [
      { id: "a-child", source: "a", target: "child" },
      { id: "b-child", source: "b", target: "child" },
    ] as Edge[];
    const result = buildRadialGraph(nodes, relations);
    const parentAngles = result.nodes.filter(({ id }) => id === "a" || id === "b").map((node) => polar(node).angle);
    const expected = Math.atan2(parentAngles.map(Math.sin).reduce((sum, value) => sum + value), parentAngles.map(Math.cos).reduce((sum, value) => sum + value));
    const child = result.nodes.find(({ id }) => id === "child")!;
    expect(polar(child).angle).toBeCloseTo(expected);
  });
});

describe("radial relation presentation", () => {
  it("routes direct curved relations through directional handles without labels", () => {
    const nodes = [
      { id: "a", data: { name: "A", generation: 0 } },
      { id: "b", data: { name: "B", generation: 0 } },
      { id: "child", data: { name: "Child", generation: 1 } },
    ].map((node) => ({ ...node, position: { x: 0, y: 0 } })) as Node<Record<string, unknown>>[];
    const relations = [
      { id: "a-child", source: "a", target: "child" },
      { id: "b-child", source: "b", target: "child" },
    ] as Edge[];
    const graph = buildRadialGraph(nodes, relations);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges.every((edge) => edge.label === undefined)).toBe(true);
    expect(graph.edges.every((edge) => edge.type === "default")).toBe(true);
    expect(graph.edges.every((edge) => /^source-(top|right|bottom|left)-[ab]$/.test(edge.sourceHandle ?? ""))).toBe(true);
    expect(graph.edges.every((edge) => /^target-(top|right|bottom|left)-[ab]$/.test(edge.targetHandle ?? ""))).toBe(true);
  });
});
