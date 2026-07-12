export function encodeField(value: Uint8Array): Uint8Array {
  const output = new Uint8Array(4 + value.length);
  new DataView(output.buffer).setUint32(0, value.length, false);
  output.set(value, 4);
  return output;
}

export function encodeFields(values: Uint8Array[]): Uint8Array {
  const encoded = values.map(encodeField);
  const output = new Uint8Array(encoded.reduce((sum, value) => sum + value.length, 0));
  let offset = 0;
  for (const value of encoded) {
    output.set(value, offset);
    offset += value.length;
  }
  return output;
}

export function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function encodeUint16(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new RangeError("Invalid uint16");
  const output = new Uint8Array(2);
  new DataView(output.buffer).setUint16(0, value, false);
  return output;
}

export function encodeUint64(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) throw new RangeError("Invalid uint64");
  const output = new Uint8Array(8);
  new DataView(output.buffer).setBigUint64(0, value, false);
  return output;
}
