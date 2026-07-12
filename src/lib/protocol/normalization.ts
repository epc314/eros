export function normalizeName(value: string): string {
  return value.normalize("NFKC").trim();
}

export function createNameKey(value: string): string {
  return normalizeName(value).toLowerCase();
}
