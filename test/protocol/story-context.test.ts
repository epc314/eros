import { describe, expect, it } from "vitest";
import { buildStoryContext, formatStoryContextText, type StoryContextNodeInput, type StoryContextRecordInput } from "../../src/lib/story-context";

const genome = "0000".repeat(32);
const nodes: StoryContextNodeInput[] = [
  { id: "a", name: "Gaia", genomeHex: genome, promptVersion: "eros-entity-prompt-v8", generation: 0, isDead: false, recordsLocked: false, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "b", name: "Nyx", genomeHex: genome, promptVersion: "eros-entity-prompt-v8", generation: 1, isDead: true, recordsLocked: true, createdAt: "2026-01-02T00:00:00.000Z" },
];
const records: StoryContextRecordInput[] = [
  { id: "r1", nodeId: "b", body: "Nyx 诞生。", authorLabel: null, kind: "BIRTH", createdAt: "2026-01-02T00:00:00.000Z", trueCount: 0, falseCount: 0 },
  { id: "r2", nodeId: "b", body: "一条有争议的记述。", authorLabel: "Oracle", kind: "STORY", createdAt: "2026-01-03T00:00:00.000Z", trueCount: 1, falseCount: 2 },
  { id: "r3", nodeId: "b", body: "Nyx 离开世界。", authorLabel: null, kind: "DEATH", createdAt: "2026-01-04T00:00:00.000Z", trueCount: 2, falseCount: 0 },
];

describe("LLM story context", () => {
  it("keeps graph structure, compact entity labels, status, and chronological records", () => {
    const context = buildStoryContext({
      worldName: "Eros", nodes, edges: [{ parentNodeId: "a", childNodeId: "b" }], records,
      options: { language: "zh" },
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    expect(context.world).toMatchObject({ existenceCount: 2, aliveCount: 1, deadCount: 1, generationCount: 2 });
    const nyx = context.generations[1].existences[0];
    expect(nyx).toMatchObject({ name: "Nyx", status: "dead", locked: true, parents: ["Gaia"] });
    expect(nyx.entity.primary).toBeTruthy();
    expect(nyx.entity.auxiliaries).toHaveLength(3);
    expect(nyx.records.map((record) => record.type)).toEqual(["birth", "story", "death"]);
    expect(nyx.records[1]).toMatchObject({
      text: "一条有争议的记述。", author: "Oracle",
      feedback: { trueVotes: 1, falseVotes: 2, disputed: true },
    });
  });

  it("emits every record and its complete feedback in stable line-oriented text", () => {
    const context = buildStoryContext({
      worldName: "Eros", nodes, edges: [{ parentNodeId: "a", childNodeId: "b" }], records,
      options: { language: "both" },
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    const text = formatStoryContextText(context);
    expect(text).toContain("EROS_WORLD_CONTEXT v1");
    expect(text).toContain('existence="Nyx" | status=dead | locked=true');
    expect(text).toContain('parents=["Gaia"]');
    expect(text).toContain("一条有争议的记述");
    expect(text).toContain("true_votes=1 | false_votes=2 | disputed=true");
    expect(text).not.toContain(genome);
  });
});
