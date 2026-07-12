export function unicodeLength(value: string): number { return Array.from(value).length; }

export function plainText(value: string): string {
  return value.normalize("NFKC").trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}
