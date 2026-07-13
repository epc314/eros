import { decodeGenome } from "./protocol/token-decoder";
import type { EntityAnchorToken, Hex512 } from "./protocol/types";
import type { DescriptionKind } from "./story";

export type StoryContextLanguage = "zh" | "en" | "both";

export interface StoryContextOptions {
  language: StoryContextLanguage;
  recordsPerExistence: number;
  includeDisputed: boolean;
}

export interface StoryContextNodeInput {
  id: string;
  name: string;
  genomeHex: Hex512;
  promptVersion: string;
  generation: number;
  isDead: boolean;
  recordsLocked: boolean;
  createdAt: string;
}

export interface StoryContextEdgeInput {
  parentNodeId: string;
  childNodeId: string;
}

export interface StoryContextRecordInput {
  id: string;
  nodeId: string;
  body: string;
  authorLabel: string | null;
  kind: DescriptionKind;
  createdAt: string;
  trueCount: number;
  falseCount: number;
}

export interface StoryContextRecord {
  type: "birth" | "story" | "death" | "revival";
  text: string;
  author?: string;
  disputed?: true;
}

export interface StoryContextExistence {
  name: string;
  status: "alive" | "dead";
  locked?: true;
  entity: { primary: string; auxiliaries: string[] };
  parents: string[];
  records: StoryContextRecord[];
  recordsOmitted?: number;
}

export interface StoryContext {
  schema: "eros-world-context-v1";
  generatedAt: string;
  view: {
    language: StoryContextLanguage;
    disputedRecords: "included" | "excluded";
    recordsPerExistence: number;
  };
  world: {
    name: string;
    existenceCount: number;
    aliveCount: number;
    deadCount: number;
    generationCount: number;
  };
  generations: Array<{ generation: number; existences: StoryContextExistence[] }>;
}

function compact(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function entityLabel(token: EntityAnchorToken, language: StoryContextLanguage): string {
  if (language === "zh") return token.entityZh;
  if (language === "en") return token.entity;
  return `${token.entityZh} / ${token.entity}`;
}

function selectRecords(
  inputs: StoryContextRecordInput[],
  options: StoryContextOptions,
): { records: StoryContextRecord[]; omitted: number } {
  const eligible = inputs
    .filter((item) => options.includeDisputed || item.falseCount <= item.trueCount)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const limit = options.recordsPerExistence;
  let selected = eligible;
  if (eligible.length > limit) {
    if (limit === 0) selected = [];
    else if (limit === 1) selected = [eligible[0]];
    else selected = [eligible[0], ...eligible.slice(-(limit - 1))];
  }
  return {
    records: selected.map((item) => ({
      type: item.kind.toLowerCase() as StoryContextRecord["type"],
      text: compact(item.body),
      ...(item.authorLabel ? { author: compact(item.authorLabel) } : {}),
      ...(item.falseCount > item.trueCount ? { disputed: true as const } : {}),
    })),
    omitted: eligible.length - selected.length,
  };
}

export function buildStoryContext(input: {
  worldName: string;
  nodes: StoryContextNodeInput[];
  edges: StoryContextEdgeInput[];
  records: StoryContextRecordInput[];
  options: StoryContextOptions;
  generatedAt?: string;
}): StoryContext {
  const names = new Map(input.nodes.map((node) => [node.id, node.name]));
  const parentsByChild = new Map<string, string[]>();
  for (const edge of input.edges) {
    const parentName = names.get(edge.parentNodeId);
    if (!parentName || !names.has(edge.childNodeId)) continue;
    const parents = parentsByChild.get(edge.childNodeId) ?? [];
    parents.push(parentName);
    parentsByChild.set(edge.childNodeId, parents);
  }
  const recordsByNode = new Map<string, StoryContextRecordInput[]>();
  for (const record of input.records) {
    const records = recordsByNode.get(record.nodeId) ?? [];
    records.push(record);
    recordsByNode.set(record.nodeId, records);
  }

  const grouped = new Map<number, StoryContextExistence[]>();
  const sortedNodes = [...input.nodes].sort((a, b) =>
    a.generation - b.generation || a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));
  for (const node of sortedNodes) {
    const anchors = decodeGenome(node.genomeHex, undefined, node.promptVersion)
      .filter((token): token is EntityAnchorToken => token.kind === "entity-anchor");
    const primary = anchors.find((token) => token.role === "primary");
    const auxiliaries = anchors.filter((token) => token.role === "auxiliary");
    const selected = selectRecords(recordsByNode.get(node.id) ?? [], input.options);
    const existence: StoryContextExistence = {
      name: node.name,
      status: node.isDead ? "dead" : "alive",
      ...(node.recordsLocked ? { locked: true as const } : {}),
      entity: {
        primary: primary ? entityLabel(primary, input.options.language) : "unknown",
        auxiliaries: auxiliaries.map((token) => entityLabel(token, input.options.language)),
      },
      parents: [...new Set(parentsByChild.get(node.id) ?? [])].sort((a, b) => a.localeCompare(b)),
      records: selected.records,
      ...(selected.omitted ? { recordsOmitted: selected.omitted } : {}),
    };
    const generation = grouped.get(node.generation) ?? [];
    generation.push(existence);
    grouped.set(node.generation, generation);
  }

  const generations = [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([generation, existences]) => ({ generation, existences }));
  const deadCount = input.nodes.filter((node) => node.isDead).length;
  return {
    schema: "eros-world-context-v1",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    view: {
      language: input.options.language,
      disputedRecords: input.options.includeDisputed ? "included" : "excluded",
      recordsPerExistence: input.options.recordsPerExistence,
    },
    world: {
      name: input.worldName,
      existenceCount: input.nodes.length,
      aliveCount: input.nodes.length - deadCount,
      deadCount,
      generationCount: generations.length,
    },
    generations,
  };
}

export function formatStoryContextText(context: StoryContext): string {
  const lines = [
    "EROS_WORLD_CONTEXT v1",
    `world=${JSON.stringify(context.world.name)} | generated_at=${context.generatedAt} | existences=${context.world.existenceCount} | alive=${context.world.aliveCount} | dead=${context.world.deadCount} | generations=${context.world.generationCount}`,
    `view language=${context.view.language} | disputed=${context.view.disputedRecords} | records_per_existence=${context.view.recordsPerExistence}`,
    "semantics parents=incoming_edges | records=chronological | disputed=false_votes_exceed_true_votes",
  ];
  for (const group of context.generations) {
    lines.push("", `generation=${group.generation}`);
    for (const existence of group.existences) {
      lines.push(`existence=${JSON.stringify(existence.name)} | status=${existence.status}${existence.locked ? " | locked=true" : ""} | primary=${JSON.stringify(existence.entity.primary)} | auxiliaries=${JSON.stringify(existence.entity.auxiliaries)} | parents=${JSON.stringify(existence.parents)}`);
      if (!existence.records.length) lines.push("  records=[]");
      for (const record of existence.records) {
        lines.push(`  record type=${record.type}${record.disputed ? " | disputed=true" : ""}${record.author ? ` | author=${JSON.stringify(record.author)}` : ""} | text=${JSON.stringify(record.text)}`);
      }
      if (existence.recordsOmitted) lines.push(`  records_omitted=${existence.recordsOmitted}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
