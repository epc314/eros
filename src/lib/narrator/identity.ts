import { bytesToHex, hexToBytes } from "@/lib/protocol/hex";
import { plainText, unicodeLength } from "@/lib/security/text";

export const NARRATOR_NAME_MIN_LENGTH = 2;
export const NARRATOR_NAME_MAX_LENGTH = 32;
export const NARRATOR_PASSPHRASE_MIN_LENGTH = 8;
export const NARRATOR_PASSPHRASE_MAX_LENGTH = 128;
export const NARRATOR_MESSAGE_MAX_LENGTH = 500;
export const NARRATOR_PBKDF2_ITERATIONS = 210_000;

const encoder = new TextEncoder();

export function normalizeNarratorName(value: string): string {
  return plainText(value).replace(/\s+/gu, " ");
}

export function narratorNameKey(value: string): string {
  return normalizeNarratorName(value).toLowerCase();
}

export function validateNarratorName(value: string): string {
  const name = normalizeNarratorName(value);
  const length = unicodeLength(name);
  if (length < NARRATOR_NAME_MIN_LENGTH || length > NARRATOR_NAME_MAX_LENGTH)
    throw new Error(`记述者名必须包含 ${NARRATOR_NAME_MIN_LENGTH}–${NARRATOR_NAME_MAX_LENGTH} 个字符。`);
  return name;
}

export function validatePassphrase(value: string): string {
  const length = unicodeLength(value);
  if (length < NARRATOR_PASSPHRASE_MIN_LENGTH || length > NARRATOR_PASSPHRASE_MAX_LENGTH)
    throw new Error(`密语必须包含 ${NARRATOR_PASSPHRASE_MIN_LENGTH}–${NARRATOR_PASSPHRASE_MAX_LENGTH} 个字符。`);
  return value;
}

async function digest(algorithm: "SHA-256" | "SHA-512", value: Uint8Array): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest(algorithm, value as BufferSource)));
}

export async function createNarratorId(name: string, createdAt: string): Promise<string> {
  return digest("SHA-512", encoder.encode(`${normalizeNarratorName(name)}\u001f${createdAt}`));
}

export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function hashSessionToken(token: string): Promise<string> {
  return digest("SHA-256", encoder.encode(token));
}

export async function derivePassphraseHash(passphrase: string, saltHex: string, iterations = NARRATOR_PBKDF2_ITERATIONS): Promise<string> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: hexToBytes(saltHex) as BufferSource,
    iterations,
  }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

export function constantTimeHexEqual(left: string, right: string): boolean {
  if (left.length !== right.length || left.length % 2 !== 0) return false;
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
}
