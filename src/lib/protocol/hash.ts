import { shake256 } from "@noble/hashes/sha3.js";
import { encodeFields } from "./encoding";

function shake(fields: Uint8Array[], outputLength: number): Uint8Array {
  return shake256(encodeFields(fields), { dkLen: outputLength });
}

export const hash256 = (fields: Uint8Array[]) => shake(fields, 32);
export const hash512 = (fields: Uint8Array[]) => shake(fields, 64);
