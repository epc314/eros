import { describe, expect, it } from "vitest";
import { composeFaustMessages, FAUST_GREETING, FAUST_QUICK_REPLY } from "../../src/lib/faust";

describe("Faust conversation context", () => {
  it("injects the world once and binds retrieved details to the selecting message", () => {
    const details = new Map<string, unknown>([["gaia-id", { existence: { name: "Gaia" }, records: [{ text: "完整记述" }] }]]);
    const messages = composeFaustMessages({
      worldContext: "EROS_WORLD_CONTEXT v1\nworld=Eros",
      canonicalNames: ["Gaia", "Nyx", "Gaia"],
      canonicalTreasureNames: ["【Gaia】的【宝珠】"],
      treasureContext: "宝物：【Gaia】的【宝珠】；持有存在：Gaia",
      conversation: [
        { role: "assistant", content: FAUST_GREETING },
        { role: "user", content: "她是谁？", existenceRefs: ["gaia-id"] },
        { role: "assistant", content: "她是 Gaia。" },
      ],
      detailsByReference: details,
    });
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("<eros_world_context>");
    expect(messages[0].content).toContain("<canonical_existence_names>");
    expect(messages[0].content).toContain("<canonical_treasure_names>");
    expect(messages[0].content).toContain("<eros_treasure_context>");
    expect(messages[0].content).toContain("【Gaia】的【宝珠】");
    expect(messages[0].content).toContain('["Gaia","Nyx"]');
    expect(messages[0].content).toContain("必须逐字、区分大小写地使用清单中的原名");
    expect(messages[0].content).toContain("不得把 Gaia 改成“盖亚”或“大地女神”");
    expect(messages[0].content.match(/EROS_WORLD_CONTEXT/g)).toHaveLength(1);
    expect(messages[2].content).toContain("<retrieved_existences>");
    expect(messages[2].content).toContain("完整记述");
    expect(messages[1].content).not.toContain("retrieved_existences");
    expect(messages[3].content).not.toContain("retrieved_existences");
  });

  it("keeps the requested greeting and quick reply stable", () => {
    expect(FAUST_GREETING).toBe("我们从一开始就是朋友，我们有着共同的忧伤、恐惧和根基；即便太阳也是我们所共有的。我们彼此不相识，我们漠然相对，我们笑对我们的知识。你好，记述的人，我叫浮士德。");
    expect(FAUST_QUICK_REPLY).toBe("请给我讲述那些史诗吧。");
  });
});
