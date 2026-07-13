import { describe, expect, it } from "vitest";
import { rehypeFaustExistenceLinks, splitFaustExistenceNames } from "../../src/lib/faust-markdown";

const existences = [
  { id: "gaia-id", name: "Gaia" },
  { id: "eros-id", name: "Eros" },
  { id: "eros-prime-id", name: "Eros Prime" },
  { id: "emoji-id", name: "😧" },
];

describe("Faust existence links", () => {
  it("matches canonical names exactly without linking parts of other words", () => {
    const segments = splitFaustExistenceNames("Gaia 与 Eros Prime 看着 Erosian 和 😧。", existences);
    expect(segments.filter((item) => item.existence).map((item) => item.existence?.name))
      .toEqual(["Gaia", "Eros Prime", "😧"]);
    expect(segments.map((item) => item.text).join("")).toBe("Gaia 与 Eros Prime 看着 Erosian 和 😧。");
  });

  it("adds card links while leaving existing links and code untouched", () => {
    const tree = {
      type: "root",
      children: [
        { type: "element", tagName: "p", children: [{ type: "text", value: "Gaia 遇见 Eros。" }] },
        { type: "element", tagName: "code", children: [{ type: "text", value: "Gaia" }] },
        { type: "element", tagName: "a", properties: { href: "/elsewhere" }, children: [{ type: "text", value: "Eros" }] },
      ],
    };
    rehypeFaustExistenceLinks(existences)()(tree);
    const paragraph = tree.children[0];
    const paragraphChildren = paragraph.children as Array<{ tagName?: string; properties?: Record<string, unknown> }>;
    expect(paragraphChildren.filter((item) => item.tagName === "a").map((item) => item.properties?.href))
      .toEqual(["/nodes/gaia-id", "/nodes/eros-id"]);
    expect(tree.children[1].children?.[0]).toMatchObject({ type: "text", value: "Gaia" });
    expect(tree.children[2].children?.[0]).toMatchObject({ type: "text", value: "Eros" });
  });
});
