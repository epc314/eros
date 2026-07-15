import { describe, expect, it } from "vitest";
import { narratorFromColumns } from "../../src/lib/narrator/types";
import { validateProposalContent, validateProposalReply, validateProposalTitle } from "../../src/lib/proposal/validation";

describe("proposal stone", () => {
  it("accepts a required title up to 30 Unicode characters", () => {
    expect(validateProposalTitle("  让星辰听见我们  ")).toBe("让星辰听见我们");
    expect(validateProposalTitle("𠮷".repeat(30))).toHaveLength(60);
    expect(() => validateProposalTitle("")).toThrow(/1–30/);
    expect(() => validateProposalTitle("言".repeat(31))).toThrow(/1–30/);
  });

  it("allows an empty body but requires non-empty replies", () => {
    expect(validateProposalContent("   ")).toBe("");
    expect(() => validateProposalReply("   ")).toThrow(/回复必须/);
    expect(validateProposalReply("  我赞同。  ")).toBe("我赞同。");
  });

  it("exposes the persisted administrator flag instead of inferring it from a name", () => {
    const base = {
      narratorId: "a".repeat(128), narratorName: "EROS", narratorTitlesJson: "[]",
      narratorMessage: "", narratorCreatedAt: "2026-07-15T00:00:00.000Z",
    };
    expect(narratorFromColumns({ ...base, narratorIsAdmin: 1 })?.isAdmin).toBe(true);
    expect(narratorFromColumns({ ...base, narratorName: "EROS-but-not-admin", narratorIsAdmin: 0 })?.isAdmin).toBe(false);
  });
});
