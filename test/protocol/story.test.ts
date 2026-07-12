import { describe, expect, it } from "vitest";
import { descendantBirthRecord, EROS_BIRTH_RECORD, EROS_DEATH_RECORD, genesisBirthRecord } from "@/lib/story";

describe("story records", () => {
  it("creates the requested default genesis and descendant birth records", () => {
    expect(genesisBirthRecord("Nyx")).toBe("Nyx诞生于虚无中...");
    expect(descendantBirthRecord("C", "A", "B")).toBe("C诞生于A与B的结合...");
  });

  it("preserves supplied records and the canonical Eros records", () => {
    expect(genesisBirthRecord("Nyx", " 自定义诞生 ")).toBe("自定义诞生");
    expect(descendantBirthRecord("C", "A", "B", " 自定义结合 ")).toBe("自定义结合");
    expect(EROS_BIRTH_RECORD).toContain("优雅的厄洛斯（Eros）");
    expect(EROS_DEATH_RECORD).toBe("祂终于逃离了生育繁衍的荣耀和诅咒，再次拥抱了虚无......");
  });
});
