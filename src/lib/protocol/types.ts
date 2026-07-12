export type Hex256 = string;
export type Hex512 = string;

export interface GenomePair {
  chromosome0: Hex256;
  chromosome1: Hex256;
}

export interface GenomeSimilarity {
  hammingDistance: number;
  sameBitCount: number;
  similarityRatio: number;
  similarityMaskHex: Hex512;
}

export interface ProtocolParent {
  id: string;
  genomeHex: Hex512;
}

export interface ReproductionResult {
  parentLowId: string;
  parentHighId: string;
  normalizedName: string;
  lowChoice: 0 | 1;
  highChoice: 0 | 1;
  chromosome0ParentId: string;
  chromosome1ParentId: string;
  lowSelectedHex: Hex256;
  lowUnusedHex: Hex256;
  highSelectedHex: Hex256;
  highUnusedHex: Hex256;
  baseGenomeHex: Hex512;
  similarity: GenomeSimilarity;
  requestedMutationBits: number;
  mutationBitCount: number;
  mutationSeedHex: Hex512;
  mutationMaskHex: Hex512;
  flippedBitPositions: number[];
  childGenomeHex: Hex512;
  childNodeId: string;
}

export interface BaseDecodedToken {
  position: number;
  chromosome: 0 | 1;
  chromosomePosition: number;
  tokenId: number;
  tokenHex: string;
  mutated: boolean;
}

export interface EntityAnchorToken extends BaseDecodedToken {
  kind: "entity-anchor";
  role: "primary" | "auxiliary";
  entityId: number;
  entity: string;
  entityZh: string;
  baseEntity: string;
  baseEntityZh: string;
  speciesId?: number;
  speciesGroup?: "natural-life" | "natural-nonliving" | "fantasy";
  speciesGroupLabel?: string;
  speciesGroupLabelZh?: string;
  formId?: number;
  form?: string;
  formZh?: string;
  bearing?: string;
  bearingZh?: string;
  scale?: string;
  scaleZh?: string;
  regalia?: string;
  regaliaZh?: string;
  familyId: number;
  family: string;
  familyZh: string;
  descriptorAId: number;
  descriptorA: string;
  descriptorAZh: string;
  descriptorBId: number;
  descriptorB: string;
  descriptorBZh: string;
  phrase: string;
  phraseZh: string;
}

export interface EntityFormToken extends BaseDecodedToken {
  kind: "entity-form";
  role: "primary" | "auxiliary";
  speciesId?: number;
  formId: number;
  form: string;
  formZh: string;
  bearingId: number;
  bearing: string;
  bearingZh: string;
  scaleId: number;
  scale: string;
  scaleZh: string;
  regaliaId: number;
  regalia: string;
  regaliaZh: string;
  phrase: string;
  phraseZh: string;
}

export interface EntityDescriptorToken extends BaseDecodedToken {
  kind: "entity-descriptor";
  familyId: number;
  family: string;
  familyZh: string;
  intensityId: number;
  intensity: string;
  intensityZh: string;
  descriptorAId: number;
  descriptorA: string;
  descriptorAZh: string;
  descriptorBId: number;
  descriptorB: string;
  descriptorBZh: string;
  phrase: string;
  phraseZh: string;
}

export type DecodedToken = EntityAnchorToken | EntityFormToken | EntityDescriptorToken;

export interface MutationStats {
  flippedBitCount: number;
  flippedBitPositions: number[];
  changedTokenCount: number;
  changedTokenPositions: number[];
  beforeAfterTokens: Array<{ position: number; beforeTokenId: number; afterTokenId: number }>;
}
