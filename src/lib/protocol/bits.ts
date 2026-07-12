export function getBit(bytes: Uint8Array, position: number): 0 | 1 {
  if (!Number.isInteger(position) || position < 0 || position >= bytes.length * 8) throw new RangeError("Invalid bit position");
  return ((bytes[Math.floor(position / 8)] >> (7 - (position % 8))) & 1) as 0 | 1;
}

export function setBit(bytes: Uint8Array, position: number): void {
  bytes[Math.floor(position / 8)] |= 1 << (7 - (position % 8));
}

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) throw new Error("Byte arrays must be equal length");
  return Uint8Array.from(a, (value, index) => value ^ b[index]);
}

export function invertBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes, (value) => value ^ 0xff);
}

export function popcount(bytes: Uint8Array): number {
  let count = 0;
  for (const value of bytes) {
    let current = value;
    while (current) {
      current &= current - 1;
      count++;
    }
  }
  return count;
}
