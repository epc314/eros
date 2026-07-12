import { describe, expect, it } from "vitest";
import { GENESIS_NODE_NAMES, GENOME_BITS } from "@/lib/protocol/constants";
import { getBit, popcount, xorBytes } from "@/lib/protocol/bits";
import { createGenesisGenome, createNodeId } from "@/lib/protocol/genesis";
import { bytesToHex, genomeHexToBytes } from "@/lib/protocol/hex";
import { splitGenome, joinChromosomes } from "@/lib/protocol/chromosomes";
import { calculateGenomeSimilarity } from "@/lib/protocol/similarity";
import { calculateMutationBudget } from "@/lib/protocol/mutation";
import { reproduce } from "@/lib/protocol/reproduction";
import { buildEntityImagePrompt, deduplicatePromptDescriptors, EROS_VISUAL_STYLE } from "@/lib/protocol/prompt";
import { calculateMutationStats, decodeGenome } from "@/lib/protocol/token-decoder";
import type { EntityAnchorToken } from "@/lib/protocol/types";
import {
  AUXILIARY_ENTITIES, AUXILIARY_ENTITIES_ZH, DESCRIPTOR_FAMILIES, DESCRIPTOR_FAMILIES_ZH,
  DESCRIPTOR_INTENSITIES, DESCRIPTOR_INTENSITIES_ZH, DESCRIPTOR_TERMS, DESCRIPTOR_TERMS_ZH,
  PRIMARY_ENTITIES, PRIMARY_ENTITIES_ZH, PRIMARY_SPECIES, PRIMARY_SPECIES_GROUPS, PRIMARY_SPECIES_ZH, AUXILIARY_ENTITY_MANIFESTATIONS,
} from "@/lib/protocol/vocabulary";

const genesis = (name: string, timestamp = 1_700_000_000_000n) => bytesToHex(createGenesisGenome({ name, timestampMs: timestamp }));
const parent = (name: string) => { const genomeHex = genesis(name); return { id: createNodeId(genomeHex), genomeHex }; };

describe("genesis and genome representation", () => {
  it("uses the exact seven genesis names", () => expect(GENESIS_NODE_NAMES).toEqual(["Gaia", "Eros", "Psyche", "Tartarus", "Erebos", "Khaos", "Uranus"]));
  it("is deterministic and responds only to normalized name and timestamp inputs", () => {
    expect(genesis("Gaia")).toBe(genesis("  Gaia  "));
    expect(genesis("Gaia")).not.toBe(genesis("Eros"));
    expect(genesis("Gaia")).not.toBe(genesis("Gaia", 1_700_000_000_001n));
  });
  it("preserves leading zeros and joins split chromosomes", () => {
    const genome = "0".repeat(127) + "1";
    expect(joinChromosomes(splitGenome(genome).chromosome0, splitGenome(genome).chromosome1)).toBe(genome);
  });
});

describe("similarity and mutation budget", () => {
  it("handles identical, opposite, and leading-zero genomes", () => {
    const zero = "0".repeat(128); const one = "f".repeat(128);
    expect(calculateGenomeSimilarity(zero, zero)).toMatchObject({ hammingDistance: 0, sameBitCount: 512, similarityRatio: 1, similarityMaskHex: one });
    expect(calculateGenomeSimilarity(zero, one)).toMatchObject({ hammingDistance: 512, sameBitCount: 0, similarityRatio: 0, similarityMaskHex: zero });
    expect(popcount(genomeHexToBytes("0".repeat(126) + "01"))).toBe(1);
  });
  it("is integer, bounded, low near half similarity, and monotonic", () => {
    expect(calculateMutationBudget(256)).toBe(2);
    expect(calculateMutationBudget(512)).toBe(32);
    for (let a = 0; a <= GENOME_BITS; a++) {
      const value = calculateMutationBudget(a);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(a);
      if (a < GENOME_BITS) expect(value).toBeLessThanOrEqual(calculateMutationBudget(a + 1));
    }
  });
});

describe("reproduction", () => {
  it("is invariant to visual parent order across genome, tokens, and prompt", () => {
    const a = parent("Gaia"); const b = parent("Eros");
    const forward = reproduce(a, b, "Nova"); const reverse = reproduce(b, a, "Nova");
    expect(reverse).toEqual(forward);
    expect(decodeGenome(reverse.childGenomeHex)).toEqual(decodeGenome(forward.childGenomeHex));
    expect(buildEntityImagePrompt(decodeGenome(reverse.childGenomeHex))).toBe(buildEntityImagePrompt(decodeGenome(forward.childGenomeHex)));
  });
  it("flips only eligible positions and child XOR mask equals base", () => {
    const result = reproduce(parent("Gaia"), parent("Eros"), "Pleroma");
    const similarityMask = genomeHexToBytes(result.similarity.similarityMaskHex);
    result.flippedBitPositions.forEach((position) => expect(getBit(similarityMask, position)).toBe(1));
    expect(result.flippedBitPositions).toHaveLength(result.mutationBitCount);
    expect(bytesToHex(xorBytes(genomeHexToBytes(result.childGenomeHex), genomeHexToBytes(result.mutationMaskHex)))).toBe(result.baseGenomeHex);
  });
  it("uses the name in deterministic mutation ranking", () => {
    const a = parent("Gaia"); const b = parent("Eros");
    expect(reproduce(a, b, "One").flippedBitPositions).not.toEqual(reproduce(a, b, "Two").flippedBitPositions);
    expect(reproduce(a, b, "One")).toEqual(reproduce(a, b, "One"));
  });
  it("keeps chromosome indices stable and inherits an unmutated primary from a parent", () => {
    const a = parent("Gaia"); const b = parent("Eros");
    const result = reproduce(a, b, "Stable subject");
    const [low, high] = a.genomeHex < b.genomeHex ? [a, b] : [b, a];
    expect([result.lowChoice, result.highChoice].sort()).toEqual([0, 1]);
    const expectedC0 = result.lowChoice === 0 ? splitGenome(low.genomeHex).chromosome0 : splitGenome(high.genomeHex).chromosome0;
    const expectedC1 = result.lowChoice === 1 ? splitGenome(low.genomeHex).chromosome1 : splitGenome(high.genomeHex).chromosome1;
    expect(result.baseGenomeHex).toBe(expectedC0 + expectedC1);
    expect(result.chromosome0ParentId).toBe(result.lowChoice === 0 ? low.id : high.id);
    expect(result.chromosome1ParentId).toBe(result.lowChoice === 1 ? low.id : high.id);
    expect([low.genomeHex.slice(0, 4), high.genomeHex.slice(0, 4)]).toContain(result.baseGenomeHex.slice(0, 4));
    if (result.flippedBitPositions.every((position) => position >= 16)) {
      expect(result.childGenomeHex.slice(0, 4)).toBe(result.baseGenomeHex.slice(0, 4));
    }
  });
});

describe("entity tokens", () => {
  const tokens = decodeGenome("0123456789abcdef".repeat(8));
  it("decodes four two-token entity groups and twenty-four descriptors", () => {
    expect(tokens).toHaveLength(32);
    const anchors = tokens.filter((token): token is EntityAnchorToken => token.kind === "entity-anchor");
    const forms = tokens.filter((token) => token.kind === "entity-form");
    expect(anchors.map(({ position }) => position)).toEqual([0, 8, 16, 24]);
    expect(forms.map(({ position }) => position)).toEqual([1, 9, 17, 25]);
    expect(anchors.filter((token) => token.role === "primary")).toHaveLength(1);
    expect(anchors.filter((token) => token.role === "auxiliary")).toHaveLength(3);
    expect(tokens.filter(({ kind }) => kind === "entity-descriptor")).toHaveLength(24);
    const primary = anchors.find((token) => token.role === "primary")!;
    expect(primary.speciesId).toBeGreaterThanOrEqual(0);
    expect(primary.speciesId).toBeLessThan(256);
    anchors.filter((token) => token.role === "auxiliary").forEach((token) => expect(token.form).toBeTruthy());
    tokens.forEach(({ tokenId }) => { expect(tokenId).toBeGreaterThanOrEqual(0); expect(tokenId).toBeLessThan(65_536); });
  });
  it("has sixteen entries in every vocabulary dimension and excludes prohibited terms", () => {
    for (const vocabulary of [PRIMARY_ENTITIES, PRIMARY_ENTITIES_ZH, AUXILIARY_ENTITIES, AUXILIARY_ENTITIES_ZH,
      DESCRIPTOR_FAMILIES, DESCRIPTOR_FAMILIES_ZH, DESCRIPTOR_INTENSITIES, DESCRIPTOR_INTENSITIES_ZH]) expect(vocabulary).toHaveLength(16);
    DESCRIPTOR_TERMS.forEach((terms) => expect(terms).toHaveLength(16));
    DESCRIPTOR_TERMS_ZH.forEach((terms) => expect(terms).toHaveLength(16));
    const vocabulary = [PRIMARY_ENTITIES, AUXILIARY_ENTITIES, DESCRIPTOR_FAMILIES, DESCRIPTOR_INTENSITIES, ...DESCRIPTOR_TERMS].flat().join(" ").toLowerCase();
    for (const term of ["eye", "weapon", "running", "forest", "close-up", "watercolor"]) expect(vocabulary).not.toContain(term);
    for (const term of ["porous", "granular", "pitted", "perforated", "cellular", "chambered", "clustered", "webbed", "wrinkled", "fractured", "serrated", "jagged", "absorptive"]) expect(vocabulary).not.toContain(term);
    const descriptorTerms = DESCRIPTOR_TERMS.flat();
    expect(new Set(descriptorTerms).size).toBe(256);
    expect(PRIMARY_SPECIES).toHaveLength(256);
    expect(PRIMARY_SPECIES_ZH).toHaveLength(256);
    expect(new Set(PRIMARY_SPECIES).size).toBe(256);
    expect(new Set(PRIMARY_SPECIES_ZH).size).toBe(256);
    expect(PRIMARY_SPECIES_GROUPS).toEqual([
      { key: "natural-life", label: "Natural organism", labelZh: "现实自然生物", start: 0, end: 64 },
      { key: "natural-nonliving", label: "Natural nonliving entity", labelZh: "自然非生物", start: 64, end: 128 },
      { key: "fantasy", label: "Fantasy race", labelZh: "幻想种族", start: 128, end: 256 },
    ]);
    const naturalLife = PRIMARY_SPECIES.slice(0, 64);
    const naturalNonliving = PRIMARY_SPECIES.slice(64, 128);
    const fantasy = PRIMARY_SPECIES.slice(128, 256);
    expect(naturalLife).toHaveLength(64);
    expect(naturalNonliving).toHaveLength(64);
    expect(fantasy).toHaveLength(128);
    for (const expected of ["human", "elephant", "penguin", "shark", "octopus", "butterfly", "lotus", "mushroom"]) expect(naturalLife).toContain(expected);
    for (const expected of ["stone", "quartz", "gold", "water droplet", "snowflake", "fossil", "seashell", "petrified wood"]) expect(naturalNonliving).toContain(expected);
    for (const expected of ["werewolf", "treant", "lamia", "siren", "dragon", "golem", "clockwork robot", "mechanical dragon"]) expect(fantasy).toContain(expected);
    for (const excluded of ["mountain", "volcano", "island", "river", "ocean", "planet", "star", "house", "castle", "train", "automobile", "airplane", "bacterium"]) expect(PRIMARY_SPECIES).not.toContain(excluded as (typeof PRIMARY_SPECIES)[number]);
    expect(new Set(AUXILIARY_ENTITIES.flatMap((entity) => AUXILIARY_ENTITY_MANIFESTATIONS.map((form) => `${entity} ${form}`))).size).toBe(256);
    tokens.forEach((token) => expect(token.phraseZh.length).toBeGreaterThan(0));
  });
  it("uses all 65,536 descriptor combinations without repeating A and B", () => {
    const phrases = new Set<string>();
    for (let family = 0; family < 16; family++) for (let intensity = 0; intensity < 16; intensity++) {
      for (let descriptorA = 0; descriptorA < 16; descriptorA++) for (let rawDescriptorB = 0; rawDescriptorB < 16; rawDescriptorB++) {
        const descriptorB = (rawDescriptorB + descriptorA + 1) & 0x0f;
        const descriptorBTerm = descriptorB === descriptorA ? `harmonic counterpart to ${DESCRIPTOR_TERMS[family][descriptorB]}` : DESCRIPTOR_TERMS[family][descriptorB];
        phrases.add(`${DESCRIPTOR_FAMILIES[family]}: ${DESCRIPTOR_INTENSITIES[intensity]} ${DESCRIPTOR_TERMS[family][descriptorA]} / ${descriptorBTerm}`);
      }
    }
    expect(phrases.size).toBe(65_536);
    decodeGenome("0123456789abcdef".repeat(8)).filter((token) => token.kind === "entity-descriptor")
      .forEach((token) => expect(token.descriptorA).not.toBe(token.descriptorB));
  });
  it("deduplicates prompt features by family key while preserving all entity anchors", () => {
    const prompt = buildEntityImagePrompt(tokens);
    expect(prompt).toContain(EROS_VISUAL_STYLE);
    expect(prompt).toContain("Ancient Greek epic mythology");
    expect(prompt).not.toContain("visual style are intentionally unspecified");
    tokens.filter((token) => token.kind === "entity-anchor").forEach(({ phrase }) => expect(prompt).toContain(phrase));
    const promptDescriptors = deduplicatePromptDescriptors(tokens);
    promptDescriptors.forEach(({ phrase }) => expect(prompt).toContain(phrase));
    const familyKeys = promptDescriptors.map(({ familyKey }) => familyKey);
    expect(new Set(familyKeys).size).toBe(familyKeys.length);
    expect(familyKeys.length).toBeLessThanOrEqual(16);
    for (const descriptor of promptDescriptors) {
      const earliest = tokens.find((token) => token.kind === "entity-descriptor" && token.family === descriptor.familyKey);
      expect(descriptor.position).toBe(earliest?.position);
    }
    expect(promptDescriptors.map(({ position }) => position)).toEqual([...promptDescriptors.map(({ position }) => position)].sort((a, b) => a - b));
    const stats = calculateMutationStats("0".repeat(128), "0".repeat(127) + "1", [511]);
    expect(stats).toMatchObject({ flippedBitCount: 1, changedTokenCount: 1, changedTokenPositions: [31] });
  });
});
