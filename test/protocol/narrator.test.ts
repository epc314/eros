import { describe, expect, it } from "vitest";
import {
  constantTimeHexEqual,
  createNarratorId,
  derivePassphraseHash,
  NARRATOR_PBKDF2_ITERATIONS,
  narratorNameKey,
  normalizeNarratorName,
} from "../../src/lib/narrator/identity";

describe("narrator identity", () => {
  it("stays within the hosted Workers PBKDF2 limit", () => {
    expect(NARRATOR_PBKDF2_ITERATIONS).toBe(100_000);
  });

  it("normalizes names consistently for uniqueness checks", () => {
    expect(normalizeNarratorName("  记述  者  ")).toBe("记述 者");
    expect(narratorNameKey("Faust")).toBe(narratorNameKey("faust"));
  });

  it("creates a deterministic 512-bit hexadecimal identifier from name and creation time", async () => {
    const first = await createNarratorId("浮士德", "2026-07-15T00:00:00.000Z");
    const second = await createNarratorId("浮士德", "2026-07-15T00:00:00.000Z");
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{128}$/);
    expect(await createNarratorId("浮士德", "2026-07-15T00:00:00.001Z")).not.toBe(first);
  });

  it("derives salted passphrase hashes and compares them without early exit", async () => {
    const salt = "00112233445566778899aabbccddeeff";
    const hash = await derivePassphraseHash("共同的忧伤与根基", salt, 1_000);
    const same = await derivePassphraseHash("共同的忧伤与根基", salt, 1_000);
    const different = await derivePassphraseHash("另一句密语", salt, 1_000);
    expect(constantTimeHexEqual(hash, same)).toBe(true);
    expect(constantTimeHexEqual(hash, different)).toBe(false);
  });
});
