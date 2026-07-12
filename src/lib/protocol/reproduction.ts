import { PRIMARY_ENTITY_SEGMENT_BITS, PROTOCOL_VERSION } from "./constants";
import { xorBytes } from "./bits";
import { splitGenome } from "./chromosomes";
import { encodeUtf8 } from "./encoding";
import { createNodeId } from "./genesis";
import { hash256, hash512 } from "./hash";
import { bytesToHex, chromosomeHexToBytes, genomeHexToBytes } from "./hex";
import { calculateMutationBudget, createMutationMask, selectMutationPositions } from "./mutation";
import { normalizeName } from "./normalization";
import { calculateGenomeSimilarity } from "./similarity";
import type { ProtocolParent, ReproductionResult } from "./types";

export function orderParents(a: ProtocolParent, b: ProtocolParent): [ProtocolParent, ProtocolParent] {
  if (a.id === b.id) throw new Error("PARENTS_MUST_BE_DIFFERENT");
  if (a.genomeHex === b.genomeHex) {
    if (a.id === b.id) throw new Error("PARENTS_MUST_BE_DIFFERENT");
    return a.id < b.id ? [a, b] : [b, a];
  }
  return a.genomeHex < b.genomeHex ? [a, b] : [b, a];
}

interface ChromosomeSegments { head: string; tail: string }

function splitChromosomeSegments(chromosomeHex: string): ChromosomeSegments {
  const headHexLength = PRIMARY_ENTITY_SEGMENT_BITS / 4;
  return { head: chromosomeHex.slice(0, headHexLength), tail: chromosomeHex.slice(headHexLength) };
}

export function reproduce(parentA: ProtocolParent, parentB: ProtocolParent, childName: string): ReproductionResult {
  const normalizedName = normalizeName(childName);
  if (!normalizedName) throw new Error("INVALID_NODE_NAME");
  const [parentLow, parentHigh] = orderParents(parentA, parentB);
  const lowBytes = genomeHexToBytes(parentLow.genomeHex);
  const highBytes = genomeHexToBytes(parentHigh.genomeHex);
  const selectionHash = hash256([
    encodeUtf8("EROS_CHROMOSOME_SELECTION"), encodeUtf8(PROTOCOL_VERSION), lowBytes, highBytes, encodeUtf8(normalizedName),
  ]);
  // Read the final three hash bits: bit 0 selects the C0/C1 parent pairing;
  // bits 1–2 select one of four tail-segment exchange modes.
  const selectionBits = selectionHash[selectionHash.length - 1] & 0b111;
  const pairing = (selectionBits & 1) as 0 | 1;
  const segmentSwapMode = ((selectionBits >> 1) & 0b11) as 0 | 1 | 2 | 3;
  const lowChoice = pairing;
  const highChoice = (1 - pairing) as 0 | 1;
  const low = splitGenome(parentLow.genomeHex);
  const high = splitGenome(parentHigh.genomeHex);
  const lowSelectedHex = lowChoice === 0 ? low.chromosome0 : low.chromosome1;
  const lowUnusedHex = lowChoice === 0 ? low.chromosome1 : low.chromosome0;
  const highSelectedHex = highChoice === 0 ? high.chromosome0 : high.chromosome1;
  const highUnusedHex = highChoice === 0 ? high.chromosome1 : high.chromosome0;
  const chromosome0Parent = lowChoice === 0 ? parentLow : parentHigh;
  const chromosome1Parent = lowChoice === 1 ? parentLow : parentHigh;
  const chromosome0ParentId = chromosome0Parent.id;
  const chromosome1ParentId = chromosome1Parent.id;
  const chromosome0Source = splitGenome(chromosome0Parent.genomeHex);
  const chromosome1Source = splitGenome(chromosome1Parent.genomeHex);
  const c00 = splitChromosomeSegments(chromosome0Source.chromosome0);
  const c10 = splitChromosomeSegments(chromosome0Source.chromosome1);
  const c00Prime = splitChromosomeSegments(chromosome1Source.chromosome0);
  const c10Prime = splitChromosomeSegments(chromosome1Source.chromosome1);
  let chromosome0Tail = c00.tail;
  let chromosome1Tail = c10Prime.tail;
  if (segmentSwapMode === 1) {
    chromosome0Tail = c10Prime.tail;
    chromosome1Tail = c00.tail;
  } else if (segmentSwapMode === 2) {
    chromosome1Tail = c10.tail;
  } else if (segmentSwapMode === 3) {
    chromosome0Tail = c00Prime.tail;
  }
  const chromosome0Hex = c00.head + chromosome0Tail;
  const chromosome1Hex = c10Prime.head + chromosome1Tail;
  const baseGenomeHex = chromosome0Hex + chromosome1Hex;
  const similarity = calculateGenomeSimilarity(parentLow.genomeHex, parentHigh.genomeHex);
  const requestedMutationBits = calculateMutationBudget(similarity.sameBitCount);
  const mutationSeed = hash512([
    encodeUtf8("EROS_MUTATION_SEED"), encodeUtf8(PROTOCOL_VERSION), lowBytes, highBytes,
    encodeUtf8(normalizedName), chromosomeHexToBytes(lowUnusedHex), chromosomeHexToBytes(highUnusedHex),
  ]);
  const flippedBitPositions = selectMutationPositions(similarity.similarityMaskHex, mutationSeed, requestedMutationBits, PRIMARY_ENTITY_SEGMENT_BITS);
  const mutationBitCount = flippedBitPositions.length;
  const mutationMask = createMutationMask(flippedBitPositions);
  const childGenome = xorBytes(genomeHexToBytes(baseGenomeHex), mutationMask);
  const childGenomeHex = bytesToHex(childGenome);
  return {
    parentLowId: parentLow.id, parentHighId: parentHigh.id, normalizedName,
    chromosome0ParentId, chromosome1ParentId, selectionBits, segmentSwapMode,
    lowChoice, highChoice, lowSelectedHex, lowUnusedHex, highSelectedHex, highUnusedHex,
    baseGenomeHex, similarity, requestedMutationBits, mutationBitCount,
    mutationSeedHex: bytesToHex(mutationSeed), mutationMaskHex: bytesToHex(mutationMask),
    flippedBitPositions, childGenomeHex, childNodeId: createNodeId(childGenome),
  };
}
