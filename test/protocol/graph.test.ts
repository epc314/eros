import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import { buildPedigreeGraph, layoutGraph } from "@/lib/graph/layout";
import { ancestorIds, descendantIds } from "@/lib/graph/traversal";

const edges = [
  { parentNodeId: "a", childNodeId: "c" }, { parentNodeId: "b", childNodeId: "c" },
  { parentNodeId: "c", childNodeId: "d" }, { parentNodeId: "b", childNodeId: "d" },
];

describe("graph traversal", () => {
  it("finds all ancestors without looping", () => expect([...ancestorIds("d", edges)].sort()).toEqual(["a", "b", "c", "d"]));
  it("finds all descendants", () => expect([...descendantIds("a", edges)].sort()).toEqual(["a", "c", "d"]));
});

describe("generation layout", () => {
  it("keeps one stable row per generation and sorts names within a row", () => {
    const nodes = [
      { id: "root-b", data: { name: "Beta", generation: 0 } },
      { id: "child", data: { name: "Child", generation: 1 } },
      { id: "root-a", data: { name: "Alpha", generation: 0 } },
    ].map((node) => ({ ...node, position: { x: 0, y: 0 } })) as Node<Record<string, unknown>>[];
    const result = layoutGraph(nodes, []);
    const rootA = result.find(({ id }) => id === "root-a")!;
    const rootB = result.find(({ id }) => id === "root-b")!;
    const child = result.find(({ id }) => id === "child")!;
    expect(rootA.position.y).toBe(rootB.position.y);
    expect(child.position.y).toBeGreaterThan(rootA.position.y);
    expect(rootA.position.x).toBeLessThan(rootB.position.x);
  });

  it("keeps descendants near their parents instead of centering every row independently", () => {
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
    const result = layoutGraph(nodes, relations);
    const parentCenters = result.filter(({ id }) => id === "a" || id === "b").map(({ position }) => position.x + 134);
    const child = result.find(({ id }) => id === "child")!;
    expect(child.position.x + 134).toBeCloseTo((parentCenters[0] + parentCenters[1]) / 2);
  });
});

describe("pedigree presentation", () => {
  it("merges two parent branches before drawing one descent line and has no edge labels", () => {
    const nodes = [
      { id: "a", data: { name: "A", generation: 0 } },
      { id: "b", data: { name: "B", generation: 0 } },
      { id: "child", data: { name: "Child", generation: 1 } },
    ].map((node) => ({ ...node, position: { x: 0, y: 0 } })) as Node<Record<string, unknown>>[];
    const relations = [
      { id: "a-child", source: "a", target: "child" },
      { id: "b-child", source: "b", target: "child" },
    ] as Edge[];
    const graph = buildPedigreeGraph(layoutGraph(nodes, relations), relations);
    const junction = graph.nodes.find(({ type }) => type === "junction")!;
    expect(junction).toBeTruthy();
    expect(graph.edges.filter(({ target }) => target === junction.id)).toHaveLength(2);
    expect(graph.edges.filter(({ source, target }) => source === junction.id && target === "child")).toHaveLength(1);
    expect(graph.edges.every((edge) => edge.label === undefined)).toBe(true);
  });
});
