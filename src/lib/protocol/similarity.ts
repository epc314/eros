import { GENOME_BITS } from "./constants";
import { invertBytes, popcount, xorBytes } from "./bits";
import { bytesToHex, genomeHexToBytes } from "./hex";
import type { GenomeSimilarity, Hex512 } from "./types";

export function calculateGenomeSimilarity(a: Hex512, b: Hex512): GenomeSimilarity {
  const difference = xorBytes(genomeHexToBytes(a), genomeHexToBytes(b));
  const hammingDistance = popcount(difference);
  const sameBitCount = GENOME_BITS - hammingDistance;
  return {
    hammingDistance,
    sameBitCount,
    similarityRatio: sameBitCount / GENOME_BITS,
    similarityMaskHex: bytesToHex(invertBytes(difference)),
  };
}
