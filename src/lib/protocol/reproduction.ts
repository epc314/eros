import { PROTOCOL_VERSION } from "./constants";
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

export function reproduce(parentA: ProtocolParent, parentB: ProtocolParent, childName: string): ReproductionResult {
  const normalizedName = normalizeName(childName);
  if (!normalizedName) throw new Error("INVALID_NODE_NAME");
  const [parentLow, parentHigh] = orderParents(parentA, parentB);
  const lowBytes = genomeHexToBytes(parentLow.genomeHex);
  const highBytes = genomeHexToBytes(parentHigh.genomeHex);
  const selectionHash = hash256([
    encodeUtf8("EROS_CHROMOSOME_SELECTION"), encodeUtf8(PROTOCOL_VERSION), lowBytes, highBytes, encodeUtf8(normalizedName),
  ]);
  // eros-v2 keeps chromosome positions stable. The deterministic bit chooses
  // one of the only two pairings where each parent contributes exactly once.
  const pairing = (selectionHash[0] & 1) as 0 | 1;
  const lowChoice = pairing;
  const highChoice = (1 - pairing) as 0 | 1;
  const low = splitGenome(parentLow.genomeHex);
  const high = splitGenome(parentHigh.genomeHex);
  const lowSelectedHex = lowChoice === 0 ? low.chromosome0 : low.chromosome1;
  const lowUnusedHex = lowChoice === 0 ? low.chromosome1 : low.chromosome0;
  const highSelectedHex = highChoice === 0 ? high.chromosome0 : high.chromosome1;
  const highUnusedHex = highChoice === 0 ? high.chromosome1 : high.chromosome0;
  const chromosome0ParentId = lowChoice === 0 ? parentLow.id : parentHigh.id;
  const chromosome1ParentId = lowChoice === 1 ? parentLow.id : parentHigh.id;
  const chromosome0Hex = lowChoice === 0 ? lowSelectedHex : highSelectedHex;
  const chromosome1Hex = lowChoice === 1 ? lowSelectedHex : highSelectedHex;
  const baseGenomeHex = chromosome0Hex + chromosome1Hex;
  const similarity = calculateGenomeSimilarity(parentLow.genomeHex, parentHigh.genomeHex);
  const requestedMutationBits = calculateMutationBudget(similarity.sameBitCount);
  const mutationBitCount = Math.min(requestedMutationBits, similarity.sameBitCount);
  const mutationSeed = hash512([
    encodeUtf8("EROS_MUTATION_SEED"), encodeUtf8(PROTOCOL_VERSION), lowBytes, highBytes,
    encodeUtf8(normalizedName), chromosomeHexToBytes(lowUnusedHex), chromosomeHexToBytes(highUnusedHex),
  ]);
  const flippedBitPositions = selectMutationPositions(similarity.similarityMaskHex, mutationSeed, mutationBitCount);
  const mutationMask = createMutationMask(flippedBitPositions);
  const childGenome = xorBytes(genomeHexToBytes(baseGenomeHex), mutationMask);
  const childGenomeHex = bytesToHex(childGenome);
  return {
    parentLowId: parentLow.id, parentHighId: parentHigh.id, normalizedName,
    chromosome0ParentId, chromosome1ParentId,
    lowChoice, highChoice, lowSelectedHex, lowUnusedHex, highSelectedHex, highUnusedHex,
    baseGenomeHex, similarity, requestedMutationBits, mutationBitCount,
    mutationSeedHex: bytesToHex(mutationSeed), mutationMaskHex: bytesToHex(mutationMask),
    flippedBitPositions, childGenomeHex, childNodeId: createNodeId(childGenome),
  };
}
