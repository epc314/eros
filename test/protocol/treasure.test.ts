import { describe, expect, it } from "vitest";
import {
  TREASURE_SUBJECTS,
  TREASURE_SUBJECTS_EN,
  addTreasureInstanceNumber,
  buildTreasureImagePrompt,
  createExistenceFeature,
  createTreasureName,
  decodeTreasure,
  intersectionScore,
  searchTreasures,
  treasureMatchThreshold,
  xnorSimilarityScore,
} from "../../src/lib/treasure/protocol";

describe("Eros treasure protocol", () => {
  it("keeps a unique 8-bit vocabulary in the requested order", () => {
    expect(TREASURE_SUBJECTS).toHaveLength(256);
    expect(new Set(TREASURE_SUBJECTS).size).toBe(256);
    expect(TREASURE_SUBJECTS[0]).toBe("宝珠");
    expect(TREASURE_SUBJECTS[255]).toBe("仪式号角");
    expect(TREASURE_SUBJECTS_EN).toHaveLength(256);
    expect(TREASURE_SUBJECTS_EN[0]).toBe("Jeweled Orb");
    expect(TREASURE_SUBJECTS_EN[255]).toBe("Ritual Horn");
    expect(TREASURE_SUBJECTS_EN.join(" ")).not.toMatch(/\p{Script=Han}/u);
  });

  it("extracts the first nibble from all 32 genome tokens", () => {
    const genome = Array.from({ length: 32 }, (_, index) => `${(index % 16).toString(16)}abc`).join("");
    expect(createExistenceFeature(genome)).toBe("0123456789abcdef0123456789abcdef");
  });

  it("scores the one bits in a 128-bit AND result", () => {
    expect(intersectionScore("ff".repeat(16), "ff".repeat(16))).toBe(128);
    expect(intersectionScore("aa".repeat(16), "55".repeat(16))).toBe(0);
    expect(intersectionScore("0f".repeat(16), "ff".repeat(16))).toBe(64);
  });

  it("scores both equal-zero and equal-one bits with XNOR similarity", () => {
    expect(xnorSimilarityScore("ff".repeat(16), "ff".repeat(16))).toBe(128);
    expect(xnorSimilarityScore("00".repeat(16), "00".repeat(16))).toBe(128);
    expect(xnorSimilarityScore("aa".repeat(16), "55".repeat(16))).toBe(0);
    expect(xnorSimilarityScore("0f".repeat(16), "ff".repeat(16))).toBe(64);
  });

  it("raises the threshold with the existence count to keep a complete search near the target rarity", () => {
    expect(treasureMatchThreshold(0)).toBe(128);
    expect(treasureMatchThreshold(1)).toBe(74);
    expect(treasureMatchThreshold(13)).toBe(79);
    expect(treasureMatchThreshold(100)).toBeGreaterThan(treasureMatchThreshold(13));
  });

  it("uses SHA-256, retries exactly twice, and reports the closest existence", () => {
    const failed = searchTreasures("风穿过橄榄林", "1720958400000", [{ id: "void", name: "Void", genomeHex: "ffff".repeat(32) }]);
    expect(failed.success).toBe(false);
    expect(failed.attempts.map(({ hashHex }) => hashHex)).toEqual([
      "bb0bf0246685348a2c4c0a55ac090a1d",
      "f9a284269f2384d7740271a10a73e62d",
      "7776c4e1373f520542f760ea4e586240",
    ]);
    expect(failed.attempts).toHaveLength(3);
    expect(failed.attempts.every(({ closest }) => closest?.name === "Void")).toBe(true);

    const matched = searchTreasures("风穿过橄榄林", "1720958400000", [{ id: "gaia", name: "Gaia", genomeHex: "ffff".repeat(32), featureHex: failed.attempts[0].hashHex }]);
    expect(matched.success).toBe(true);
    expect(matched.attempts).toHaveLength(1);
    expect(matched.matches[0].score).toBe(128);
    expect(matched.matches[0].score).toBeGreaterThan(matched.matchThreshold);
  });

  it("decodes one subject and fifteen independent descriptive tokens", () => {
    const first = decodeTreasure("00".repeat(16));
    const last = decodeTreasure(`ff${"00".repeat(15)}`);
    expect(first.subjectName).toBe("宝珠");
    expect(first.subjectNameEn).toBe("Jeweled Orb");
    expect(last.subjectName).toBe("仪式号角");
    expect(last.subjectNameEn).toBe("Ritual Horn");
    expect(first.tokens).toHaveLength(15);
    expect(new Set(first.tokens.map(({ family }) => family)).size).toBe(15);
    expect(createTreasureName("Gaia", first.subjectName)).toBe("Gaia 的 宝珠");
    expect(addTreasureInstanceNumber("Gaia 的 宝珠", 1)).toBe("Gaia 的 宝珠");
    expect(addTreasureInstanceNumber("Gaia 的 宝珠", 2)).toBe("Gaia 的 宝珠（2）");
    const prompt = buildTreasureImagePrompt(first.subjectNameEn, first.tokens);
    expect(prompt).toContain("Treasure subject:\n- Jeweled Orb");
    expect(prompt).toContain("A mysterious treasure with a mythic aura, presented in a painterly style with a sense of history.");
    expect(prompt).not.toMatch(/\p{Script=Han}/u);
  });
});
