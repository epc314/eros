import { ENTITY_ANCHOR_POSITIONS, ENTITY_FORM_POSITIONS, IMAGE_PROMPT_VERSION, TOKEN_COUNT, TOKENS_PER_CHROMOSOME } from "./constants";
import { getBit } from "./bits";
import { genomeHexToBytes } from "./hex";
import type { DecodedToken, Hex512, MutationStats } from "./types";
import {
  AUXILIARY_ENTITIES, AUXILIARY_ENTITIES_ZH, AUXILIARY_ENTITY_CADENCES, AUXILIARY_ENTITY_CADENCES_ZH,
  AUXILIARY_ENTITY_CHARACTERS, AUXILIARY_ENTITY_CHARACTERS_ZH, AUXILIARY_ENTITY_MANIFESTATIONS,
  AUXILIARY_ENTITY_MANIFESTATIONS_ZH, AUXILIARY_ENTITY_REACHES, AUXILIARY_ENTITY_REACHES_ZH,
  DESCRIPTOR_FAMILIES, DESCRIPTOR_FAMILIES_ZH,
  DESCRIPTOR_INTENSITIES, DESCRIPTOR_INTENSITIES_ZH, DESCRIPTOR_TERMS, DESCRIPTOR_TERMS_ZH,
  PRIMARY_ENTITIES, PRIMARY_ENTITIES_ZH, PRIMARY_ENTITY_BEARINGS, PRIMARY_ENTITY_BEARINGS_ZH,
  PRIMARY_ENTITY_FORMS, PRIMARY_ENTITY_FORMS_ZH, PRIMARY_ENTITY_REGALIA, PRIMARY_ENTITY_REGALIA_ZH,
  PRIMARY_ENTITY_SCALES, PRIMARY_ENTITY_SCALES_ZH, PRIMARY_SPECIES, PRIMARY_SPECIES_GROUPS, PRIMARY_SPECIES_ZH,
} from "./vocabulary";
import {
  LEGACY_DESCRIPTOR_INTENSITIES, LEGACY_DESCRIPTOR_INTENSITIES_ZH,
  LEGACY_DESCRIPTOR_TERMS, LEGACY_DESCRIPTOR_TERMS_ZH,
} from "./legacy-vocabulary";

const LEGACY_PROMPT_VERSIONS = new Set(["eros-entity-prompt-v1", "eros-entity-prompt-v2", "eros-entity-prompt-v3", "eros-entity-prompt-v4"]);

function pairedEntityData(tokenId: number, role: "primary" | "auxiliary") {
  const formId = tokenId >>> 12;
  const bearingId = (tokenId >>> 8) & 0x0f;
  const scaleId = (tokenId >>> 4) & 0x0f;
  const regaliaId = tokenId & 0x0f;
  if (role === "primary") return {
    formId, form: PRIMARY_ENTITY_FORMS[formId], formZh: PRIMARY_ENTITY_FORMS_ZH[formId],
    bearingId, bearing: PRIMARY_ENTITY_BEARINGS[bearingId], bearingZh: PRIMARY_ENTITY_BEARINGS_ZH[bearingId],
    scaleId, scale: PRIMARY_ENTITY_SCALES[scaleId], scaleZh: PRIMARY_ENTITY_SCALES_ZH[scaleId],
    regaliaId, regalia: PRIMARY_ENTITY_REGALIA[regaliaId], regaliaZh: PRIMARY_ENTITY_REGALIA_ZH[regaliaId],
  };
  return {
    formId, form: AUXILIARY_ENTITY_MANIFESTATIONS[formId], formZh: AUXILIARY_ENTITY_MANIFESTATIONS_ZH[formId],
    bearingId, bearing: AUXILIARY_ENTITY_CADENCES[bearingId], bearingZh: AUXILIARY_ENTITY_CADENCES_ZH[bearingId],
    scaleId, scale: AUXILIARY_ENTITY_REACHES[scaleId], scaleZh: AUXILIARY_ENTITY_REACHES_ZH[scaleId],
    regaliaId, regalia: AUXILIARY_ENTITY_CHARACTERS[regaliaId], regaliaZh: AUXILIARY_ENTITY_CHARACTERS_ZH[regaliaId],
  };
}

export function decodeGenome(genomeHex: Hex512, mutationMaskHex?: Hex512, promptVersion = IMAGE_PROMPT_VERSION): DecodedToken[] {
  const bytes = genomeHexToBytes(genomeHex);
  const mask = mutationMaskHex ? genomeHexToBytes(mutationMaskHex) : undefined;
  const legacy = LEGACY_PROMPT_VERSIONS.has(promptVersion);
  const pairedEntities = ["eros-entity-prompt-v6", "eros-entity-prompt-v7", "eros-entity-prompt-v8"].includes(promptVersion);
  const explicitPrimarySpecies = ["eros-entity-prompt-v7", "eros-entity-prompt-v8"].includes(promptVersion);
  const intensities = legacy ? LEGACY_DESCRIPTOR_INTENSITIES : DESCRIPTOR_INTENSITIES;
  const intensitiesZh = legacy ? LEGACY_DESCRIPTOR_INTENSITIES_ZH : DESCRIPTOR_INTENSITIES_ZH;
  const terms = legacy ? LEGACY_DESCRIPTOR_TERMS : DESCRIPTOR_TERMS;
  const termsZh = legacy ? LEGACY_DESCRIPTOR_TERMS_ZH : DESCRIPTOR_TERMS_ZH;
  return Array.from({ length: TOKEN_COUNT }, (_, position) => {
    const tokenId = (bytes[position * 2] << 8) | bytes[position * 2 + 1];
    const familyId = tokenId >>> 12;
    const descriptorAId = (tokenId >>> 4) & 0x0f;
    const rawDescriptorBId = tokenId & 0x0f;
    // v5+ uses a bijective rotation: every low nibble remains meaningful while visible A/B wording never repeats.
    const descriptorBId = legacy ? rawDescriptorBId : (rawDescriptorBId + descriptorAId + 1) & 0x0f;
    const family = DESCRIPTOR_FAMILIES[familyId];
    const familyZh = DESCRIPTOR_FAMILIES_ZH[familyId];
    const descriptorA = terms[familyId][descriptorAId];
    const descriptorAZh = termsZh[familyId][descriptorAId];
    const descriptorBBase = terms[familyId][descriptorBId];
    const descriptorBBaseZh = termsZh[familyId][descriptorBId];
    const harmonicCounterpart = !legacy && descriptorBId === descriptorAId;
    const descriptorB = harmonicCounterpart ? `harmonic counterpart to ${descriptorBBase}` : descriptorBBase;
    const descriptorBZh = harmonicCounterpart ? `与${descriptorBBaseZh}和声呼应` : descriptorBBaseZh;
    const base = {
      position,
      chromosome: (position < TOKENS_PER_CHROMOSOME ? 0 : 1) as 0 | 1,
      chromosomePosition: position % TOKENS_PER_CHROMOSOME,
      tokenId,
      tokenHex: tokenId.toString(16).padStart(4, "0"),
      mutated: mask ? Array.from({ length: 16 }, (_, bit) => getBit(mask, position * 16 + bit)).some(Boolean) : false,
    };
    if ((ENTITY_ANCHOR_POSITIONS as readonly number[]).includes(position)) {
      const entityId = tokenId >>> 12;
      const anchorFamilyId = (tokenId >>> 8) & 0x0f;
      const anchorFamily = DESCRIPTOR_FAMILIES[anchorFamilyId];
      const anchorFamilyZh = DESCRIPTOR_FAMILIES_ZH[anchorFamilyId];
      const anchorA = terms[anchorFamilyId][descriptorAId];
      const anchorAZh = termsZh[anchorFamilyId][descriptorAId];
      const anchorBBase = terms[anchorFamilyId][descriptorBId];
      const anchorBBaseZh = termsZh[anchorFamilyId][descriptorBId];
      const anchorB = harmonicCounterpart ? `harmonic counterpart to ${anchorBBase}` : anchorBBase;
      const anchorBZh = harmonicCounterpart ? `与${anchorBBaseZh}和声呼应` : anchorBBaseZh;
      const role = position === 0 ? "primary" : "auxiliary";
      const extensionTokenId = (bytes[(position + 1) * 2] << 8) | bytes[(position + 1) * 2 + 1];
      const rawPair = pairedEntities ? pairedEntityData(extensionTokenId, role) : undefined;
      const speciesId = explicitPrimarySpecies && role === "primary" ? (entityId << 4) | (extensionTokenId >>> 12) : undefined;
      const speciesGroup = speciesId === undefined ? undefined : PRIMARY_SPECIES_GROUPS.find(({ start, end }) => speciesId >= start && speciesId < end);
      const resolvedEntityId = speciesId ?? entityId;
      const baseEntity = speciesId === undefined
        ? (role === "primary" ? PRIMARY_ENTITIES[entityId] : AUXILIARY_ENTITIES[entityId])
        : PRIMARY_SPECIES[speciesId];
      const baseEntityZh = speciesId === undefined
        ? (role === "primary" ? PRIMARY_ENTITIES_ZH[entityId] : AUXILIARY_ENTITIES_ZH[entityId])
        : PRIMARY_SPECIES_ZH[speciesId];
      const pair = speciesId !== undefined && rawPair ? {
        bearingId: rawPair.bearingId, bearing: rawPair.bearing, bearingZh: rawPair.bearingZh,
        scaleId: rawPair.scaleId, scale: rawPair.scale, scaleZh: rawPair.scaleZh,
        regaliaId: rawPair.regaliaId, regalia: rawPair.regalia, regaliaZh: rawPair.regaliaZh,
      } : rawPair;
      const entity = pair && "form" in pair ? `${baseEntity} ${pair.form}` : baseEntity;
      const entityZh = pair && "formZh" in pair ? `${baseEntityZh}${pair.formZh}` : baseEntityZh;
      const pairPhrase = pair ? (role === "primary"
        ? `; bearing: ${pair.bearing}; scale: ${pair.scale}; regalia: ${pair.regalia}`
        : `; cadence: ${pair.bearing}; reach: ${pair.scale}; character: ${pair.regalia}`) : "";
      const pairPhraseZh = pair ? (role === "primary"
        ? `；气质：${pair.bearingZh}；尺度：${pair.scaleZh}；装束：${pair.regaliaZh}`
        : `；律动：${pair.bearingZh}；范围：${pair.scaleZh}；性质：${pair.regaliaZh}`) : "";
      return { ...base, kind: "entity-anchor", role, entityId: resolvedEntityId, speciesId,
        speciesGroup: speciesGroup?.key, speciesGroupLabel: speciesGroup?.label, speciesGroupLabelZh: speciesGroup?.labelZh,
        entity, entityZh, baseEntity, baseEntityZh, ...pair, familyId: anchorFamilyId,
        family: anchorFamily, familyZh: anchorFamilyZh, descriptorAId, descriptorA: anchorA, descriptorAZh: anchorAZh,
        descriptorBId, descriptorB: anchorB, descriptorBZh: anchorBZh,
        phrase: `${role === "primary" ? "primary" : "auxiliary"} ${entity}${pairPhrase}; ${anchorFamily}: ${anchorA} / ${anchorB}`,
        phraseZh: `${role === "primary" ? "主体" : "辅助"} ${entityZh}${pairPhraseZh}；${anchorFamilyZh}：${anchorAZh} / ${anchorBZh}` };
    }
    if (pairedEntities && (ENTITY_FORM_POSITIONS as readonly number[]).includes(position)) {
      const role = position === 1 ? "primary" : "auxiliary";
      const pair = pairedEntityData(tokenId, role);
      if (explicitPrimarySpecies && role === "primary") {
        const anchorTokenId = (bytes[(position - 1) * 2] << 8) | bytes[(position - 1) * 2 + 1];
        const speciesId = ((anchorTokenId >>> 12) << 4) | (tokenId >>> 12);
        const species = PRIMARY_SPECIES[speciesId];
        const speciesZh = PRIMARY_SPECIES_ZH[speciesId];
        return { ...base, kind: "entity-form", role, ...pair, speciesId, form: species, formZh: speciesZh,
          phrase: `${pair.bearing} ${pair.scale} ${species}; ${pair.regalia}`,
          phraseZh: `${pair.bearingZh}、${pair.scaleZh}的${speciesZh}；${pair.regaliaZh}` };
      }
      return { ...base, kind: "entity-form", role, ...pair,
        phrase: role === "primary"
          ? `${pair.bearing} ${pair.scale} ${pair.form}; ${pair.regalia}`
          : `${pair.bearing} ${pair.form}; ${pair.scale}; ${pair.regalia}`,
        phraseZh: role === "primary"
          ? `${pair.bearingZh}、${pair.scaleZh}的${pair.formZh}；${pair.regaliaZh}`
          : `${pair.bearingZh}的${pair.formZh}；${pair.scaleZh}；${pair.regaliaZh}` };
    }
    const intensityId = (tokenId >>> 8) & 0x0f;
    const intensity = intensities[intensityId];
    const intensityZh = intensitiesZh[intensityId];
    return { ...base, kind: "entity-descriptor", familyId, family, familyZh, intensityId, intensity, intensityZh,
      descriptorAId, descriptorA, descriptorAZh, descriptorBId, descriptorB, descriptorBZh,
      phrase: `${family}: ${intensity} ${descriptorA} / ${descriptorB}`,
      phraseZh: `${familyZh}：${intensityZh}${descriptorAZh} / ${descriptorBZh}` };
  });
}

export function calculateMutationStats(baseGenomeHex: Hex512, childGenomeHex: Hex512, flippedBitPositions: number[]): MutationStats {
  const before = decodeGenome(baseGenomeHex);
  const after = decodeGenome(childGenomeHex);
  const changes = before.flatMap((token, position) => token.tokenId === after[position].tokenId ? [] : [{
    position, beforeTokenId: token.tokenId, afterTokenId: after[position].tokenId,
  }]);
  return { flippedBitCount: flippedBitPositions.length, flippedBitPositions,
    changedTokenCount: changes.length, changedTokenPositions: changes.map(({ position }) => position), beforeAfterTokens: changes };
}
