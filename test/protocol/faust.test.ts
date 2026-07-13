import { describe, expect, it } from "vitest";
import { composeFaustMessages, FAUST_GREETING, FAUST_QUICK_REPLY } from "../../src/lib/faust";

describe("Faust conversation context", () => {
  it("injects the world once and binds retrieved details to the selecting message", () => {
    const details = new Map<string, unknown>([["gaia-id", { existence: { name: "Gaia" }, records: [{ text: "完整记述" }] }]]);
    const messages = composeFaustMessages({
      worldContext: "EROS_WORLD_CONTEXT v1\nworld=Eros",
      conversation: [
        { role: "assistant", content: FAUST_GREETING },
        { role: "user", content: "她是谁？", existenceRefs: ["gaia-id"] },
        { role: "assistant", content: "她是 Gaia。" },
      ],
      detailsByReference: details,
    });
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("<eros_world_context>");
    expect(messages[0].content.match(/EROS_WORLD_CONTEXT/g)).toHaveLength(1);
    expect(messages[2].content).toContain("<retrieved_existences>");
    expect(messages[2].content).toContain("完整记述");
    expect(messages[1].content).not.toContain("retrieved_existences");
    expect(messages[3].content).not.toContain("retrieved_existences");
  });

  it("keeps the requested greeting and quick reply stable", () => {
    expect(FAUST_GREETING).toContain("你好，记述的人，我叫浮士德");
    expect(FAUST_QUICK_REPLY).toBe("请给我讲述那些史诗吧。");
  });
});
