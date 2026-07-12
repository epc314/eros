import { PROTOCOL_VERSION } from "./constants";
import { encodeUint64, encodeUtf8 } from "./encoding";
import { hash256, hash512 } from "./hash";
import { bytesToHex, genomeHexToBytes } from "./hex";
import { normalizeName } from "./normalization";

export interface GenesisInput { name: string; timestampMs: bigint }

export function createGenesisGenome(input: GenesisInput): Uint8Array {
  return hash512([
    encodeUtf8("EROS_GENESIS"), encodeUtf8(PROTOCOL_VERSION),
    encodeUtf8(normalizeName(input.name)), encodeUint64(input.timestampMs),
  ]);
}

export function createNodeId(genome: Uint8Array | string): string {
  const bytes = typeof genome === "string" ? genomeHexToBytes(genome) : genome;
  return bytesToHex(hash256([encodeUtf8("EROS_NODE_ID"), encodeUtf8(PROTOCOL_VERSION), bytes]));
}
