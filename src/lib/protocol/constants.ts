export const PROJECT_NAME = "Eros";
export const PROTOCOL_VERSION = "eros-v2";
export const IMAGE_PROMPT_VERSION = "eros-entity-prompt-v8";
export const GENOME_BITS = 512;
export const GENOME_BYTES = 64;
export const CHROMOSOME_BITS = 256;
export const CHROMOSOME_BYTES = 32;
export const TOKEN_BITS = 16;
export const TOKEN_COUNT = 32;
export const TOKENS_PER_CHROMOSOME = 16;
export const ENTITY_ANCHOR_POSITIONS = [0, 8, 16, 24] as const;
export const ENTITY_FORM_POSITIONS = [1, 9, 17, 25] as const;
export const ENTITY_ANCHOR_COUNT = 4;
export const ENTITY_TOKEN_COUNT = 8;
export const DESCRIPTOR_TOKEN_COUNT = 24;
export const VOCAB_SIZE = 65_536;
export const BASE_MUTATION_BITS = 2;
export const MAX_KINSHIP_EXTRA_BITS = 30;
export const KINSHIP_EXPONENT = 6;
export const GENESIS_NODE_NAMES = [
  "Gaia", "Eros", "Psyche", "Tartarus", "Erebos", "Khaos", "Uranus",
] as const;

export function assertProtocolConstants(): void {
  const checks = [
    GENOME_BITS === CHROMOSOME_BITS * 2,
    GENOME_BYTES === GENOME_BITS / 8,
    CHROMOSOME_BYTES === CHROMOSOME_BITS / 8,
    GENOME_BITS === TOKEN_BITS * TOKEN_COUNT,
    TOKEN_COUNT === TOKENS_PER_CHROMOSOME * 2,
    ENTITY_ANCHOR_COUNT * 2 === ENTITY_TOKEN_COUNT,
    ENTITY_TOKEN_COUNT + DESCRIPTOR_TOKEN_COUNT === TOKEN_COUNT,
    VOCAB_SIZE === 2 ** TOKEN_BITS,
  ];
  if (checks.some((value) => !value)) throw new Error("Invalid Eros protocol constants");
}

assertProtocolConstants();
