import { BASE_MUTATION_BITS, GENOME_BITS, KINSHIP_EXPONENT, MAX_KINSHIP_EXTRA_BITS, PROTOCOL_VERSION } from "./constants";
import { getBit, setBit } from "./bits";
import { encodeUint16, encodeUtf8 } from "./encoding";
import { hash256 } from "./hash";
import { bytesToHex, genomeHexToBytes } from "./hex";

export function calculateMutationBudget(sameBitCount: number): number {
  if (!Number.isInteger(sameBitCount) || sameBitCount < 0 || sameBitCount > GENOME_BITS) throw new RangeError("Invalid same bit count");
  const same = BigInt(sameBitCount);
  const total = BigInt(GENOME_BITS);
  const extra = (BigInt(MAX_KINSHIP_EXTRA_BITS) * same ** BigInt(KINSHIP_EXPONENT)) /
    total ** BigInt(KINSHIP_EXPONENT);
  return Math.min(sameBitCount, BASE_MUTATION_BITS + Number(extra));
}

export function selectMutationPositions(similarityMaskHex: string, mutationSeed: Uint8Array, count: number, protectedPrefixBits = 0): number[] {
  const mask = genomeHexToBytes(similarityMaskHex);
  const eligible: number[] = [];
  for (let position = protectedPrefixBits; position < GENOME_BITS; position++) if (getBit(mask, position)) eligible.push(position);
  const ranked = eligible.map((position) => ({
    position,
    rank: hash256([
      encodeUtf8("EROS_MUTATION_RANK"), encodeUtf8(PROTOCOL_VERSION), mutationSeed, encodeUint16(position),
    ]),
  }));
  ranked.sort((a, b) => Buffer.compare(Buffer.from(a.rank), Buffer.from(b.rank)) || a.position - b.position);
  return ranked.slice(0, count).map(({ position }) => position).sort((a, b) => a - b);
}

export function createMutationMask(positions: number[]): Uint8Array {
  const mask = new Uint8Array(64);
  for (const position of positions) setBit(mask, position);
  return mask;
}

export const createMutationMaskHex = (positions: number[]) => bytesToHex(createMutationMask(positions));
