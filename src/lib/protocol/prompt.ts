import type { DecodedToken, EntityDescriptorToken } from "./types";

export interface PromptDescriptor {
  position: number;
  sourceToken: EntityDescriptorToken;
  familyKey: string;
  phrase: string;
}

export const EROS_VISUAL_STYLE = "Ancient Greek epic mythology style; solemn, timeless classical aesthetics; mythological grandeur; cinematic composition; highly detailed fantasy concept art; epic historical tone.";

/**
 * Keeps only the earliest intrinsic token for each descriptor family key.
 * Entity anchors are deliberately outside this function.
 */
export function deduplicatePromptDescriptors(tokens: DecodedToken[]): PromptDescriptor[] {
  const seenFamilies = new Set<number>();
  const descriptors = tokens
    .filter((token): token is EntityDescriptorToken => token.kind === "entity-descriptor")
    .sort((a, b) => a.position - b.position);

  return descriptors.flatMap((token) => {
    if (seenFamilies.has(token.familyId)) return [];
    seenFamilies.add(token.familyId);
    return [{
      position: token.position,
      sourceToken: token,
      familyKey: token.family,
      phrase: token.phrase,
    }];
  });
}

export function buildEntityImagePrompt(tokens: DecodedToken[]): string {
  const anchors = tokens.filter((token) => token.kind === "entity-anchor");
  const forms = tokens.filter((token) => token.kind === "entity-form");
  const descriptors = tokens.filter((token) => token.kind === "entity-descriptor");
  const promptDescriptors = deduplicatePromptDescriptors(tokens);
  const primary = anchors.find((token) => token.role === "primary");
  const auxiliaries = anchors.filter((token) => token.role === "auxiliary");
  const expectedDescriptorCount = forms.length === 4 ? 24 : 28;
  if (!primary || auxiliaries.length !== 3 || ![0, 4].includes(forms.length) || descriptors.length !== expectedDescriptorCount) {
    throw new Error("Expected four entity groups and the corresponding intrinsic descriptor tokens");
  }
  return `Generate one coherent visual interpretation of a single entity.\n\nUnified visual style:\n${EROS_VISUAL_STYLE}\n\nPrimary entity foundation:\n- ${primary.phrase}\n\nAuxiliary entities or elemental influences:\n${auxiliaries.map((token) => `- ${token.phrase}`).join("\n")}\n\nThe primary entity remains recognizable while the auxiliary influences modify its material, energy, color, structure, or behavior.\n\nIntrinsic attributes, deduplicated by family key with lower token positions taking precedence:\n${promptDescriptors.map(({ phrase }) => `- ${phrase}`).join("\n")}\n\nInterpret all attributes as properties of the entity itself. Contradictory attributes should be combined into an original and internally coherent form rather than discarded. Compose the entity at a scale and viewpoint that best express its mythological grandeur.\n\nDo not add text, captions, logos, signatures, labels, or watermarks.`;
}
