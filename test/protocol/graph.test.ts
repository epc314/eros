import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { layoutGraph } from "@/lib/graph/layout";
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
});
