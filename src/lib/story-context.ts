import { decodeGenome } from "./protocol/token-decoder";
import type { EntityAnchorToken, Hex512 } from "./protocol/types";
import type { DescriptionKind } from "./story";
import type { PublicNarrator } from "./narrator/types";

export type StoryContextLanguage = "zh" | "en" | "both";

export interface StoryContextOptions {
  language: StoryContextLanguage;
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
  narrator?: PublicNarrator | null;
}

export interface StoryContextRecord {
  id: string;
  type: "birth" | "story" | "death" | "revival";
  text: string;
  author?: string;
  narrator?: { id: string; name: string; titles: string[] };
  createdAt: string;
  feedback: { trueVotes: number; falseVotes: number; disputed: boolean };
}

export interface StoryContextExistence {
  name: string;
  status: "alive" | "dead";
  locked?: true;
  entity: { primary: string; auxiliaries: string[] };
  parents: string[];
  records: StoryContextRecord[];
}

export interface StoryContext {
  schema: "eros-world-context-v1";
  generatedAt: string;
  view: { language: StoryContextLanguage };
  world: {
    name: string;
    existenceCount: number;
    aliveCount: number;
    deadCount: number;
    generationCount: number;
  };
  generations: Array<{ generation: number; existences: StoryContextExistence[] }>;
}

function entityLabel(token: EntityAnchorToken, language: StoryContextLanguage): string {
  if (language === "zh") return token.entityZh;
  if (language === "en") return token.entity;
  return `${token.entityZh} / ${token.entity}`;
}

function storyRecords(inputs: StoryContextRecordInput[]): StoryContextRecord[] {
  return [...inputs]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .map((item) => ({
      id: item.id,
      type: item.kind.toLowerCase() as StoryContextRecord["type"],
      text: item.body,
      ...(item.authorLabel ? { author: item.authorLabel } : {}),
      ...(item.narrator ? { narrator: { id: item.narrator.id, name: item.narrator.name, titles: item.narrator.titles } } : {}),
      createdAt: item.createdAt,
      feedback: {
        trueVotes: item.trueCount,
        falseVotes: item.falseCount,
        disputed: item.falseCount > item.trueCount,
      },
    }));
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
    const existence: StoryContextExistence = {
      name: node.name,
      status: node.isDead ? "dead" : "alive",
      ...(node.recordsLocked ? { locked: true as const } : {}),
      entity: {
        primary: primary ? entityLabel(primary, input.options.language) : "unknown",
        auxiliaries: auxiliaries.map((token) => entityLabel(token, input.options.language)),
      },
      parents: [...new Set(parentsByChild.get(node.id) ?? [])].sort((a, b) => a.localeCompare(b)),
      records: storyRecords(recordsByNode.get(node.id) ?? []),
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
    view: { language: input.options.language },
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
    `view language=${context.view.language} | records=complete`,
    "semantics parents=incoming_edges | records=chronological | disputed=false_votes_exceed_true_votes",
  ];
  for (const group of context.generations) {
    lines.push("", `generation=${group.generation}`);
    for (const existence of group.existences) {
      lines.push(`existence=${JSON.stringify(existence.name)} | status=${existence.status}${existence.locked ? " | locked=true" : ""} | primary=${JSON.stringify(existence.entity.primary)} | auxiliaries=${JSON.stringify(existence.entity.auxiliaries)} | parents=${JSON.stringify(existence.parents)}`);
      if (!existence.records.length) lines.push("  records=[]");
      for (const record of existence.records) {
        lines.push(`  record id=${JSON.stringify(record.id)} | type=${record.type} | created_at=${record.createdAt}${record.author ? ` | author=${JSON.stringify(record.author)}` : ""}${record.narrator ? ` | narrator_id=${record.narrator.id} | narrator_titles=${JSON.stringify(record.narrator.titles)}` : ""} | true_votes=${record.feedback.trueVotes} | false_votes=${record.feedback.falseVotes} | disputed=${record.feedback.disputed} | text=${JSON.stringify(record.text)}`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}
