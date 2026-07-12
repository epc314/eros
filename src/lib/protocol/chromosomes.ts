import type { GenomePair, Hex256, Hex512 } from "./types";
import { chromosomeHexToBytes, genomeHexToBytes } from "./hex";

export function splitGenome(genomeHex: Hex512): GenomePair {
  genomeHexToBytes(genomeHex);
  return { chromosome0: genomeHex.slice(0, 64), chromosome1: genomeHex.slice(64) };
}

export function joinChromosomes(chromosome0: Hex256, chromosome1: Hex256): Hex512 {
  chromosomeHexToBytes(chromosome0);
  chromosomeHexToBytes(chromosome1);
  return chromosome0 + chromosome1;
}
