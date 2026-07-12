import { CHROMOSOME_BYTES, GENOME_BYTES } from "./constants";

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string, expectedBytes?: number): Uint8Array {
  if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) throw new Error("Hex must be lowercase and even-length");
  if (expectedBytes !== undefined && hex.length !== expectedBytes * 2) throw new Error(`Expected ${expectedBytes * 2} hex characters`);
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (value) => Number.parseInt(value, 16));
}

export const genomeHexToBytes = (hex: string) => hexToBytes(hex, GENOME_BYTES);
export const chromosomeHexToBytes = (hex: string) => hexToBytes(hex, CHROMOSOME_BYTES);
