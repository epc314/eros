export interface PublicNarrator {
  id: string;
  name: string;
  titles: string[];
  message: string;
  createdAt: string;
  isAdmin: boolean;
}

export type AuthorshipMode = "narrator" | "custom";

export interface NarratorAttribution {
  narratorId: string | null;
  authorLabel: string | null;
  narrator: PublicNarrator | null;
}

export interface NarratorColumns {
  narratorId: string | null;
  narratorName: string | null;
  narratorTitlesJson: string | null;
  narratorMessage: string | null;
  narratorCreatedAt: string | null;
  narratorIsAdmin: number | boolean | null;
}

export function narratorFromColumns(row: NarratorColumns): PublicNarrator | null {
  if (!row.narratorId || !row.narratorName || !row.narratorCreatedAt) return null;
  let titles: string[] = [];
  try {
    const parsed = JSON.parse(row.narratorTitlesJson ?? "[]") as unknown;
    if (Array.isArray(parsed)) titles = parsed.filter((title): title is string => typeof title === "string");
  } catch {
    titles = [];
  }
  return {
    id: row.narratorId,
    name: row.narratorName,
    titles,
    message: row.narratorMessage ?? "",
    createdAt: row.narratorCreatedAt,
    isAdmin: Boolean(row.narratorIsAdmin),
  };
}

export function withoutNarratorColumns<T extends NarratorColumns>(row: T): Omit<T, keyof NarratorColumns> {
  const result = { ...row } as Partial<NarratorColumns> & Record<string, unknown>;
  delete result.narratorId;
  delete result.narratorName;
  delete result.narratorTitlesJson;
  delete result.narratorMessage;
  delete result.narratorCreatedAt;
  delete result.narratorIsAdmin;
  return result as Omit<T, keyof NarratorColumns>;
}
