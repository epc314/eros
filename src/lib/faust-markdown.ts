export interface FaustExistenceLink {
  id: string;
  name: string;
  href?: string;
  kind?: "existence" | "treasure";
}

export interface FaustTextSegment {
  text: string;
  existence?: FaustExistenceLink;
}

interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;
const SKIPPED_TAGS = new Set(["a", "code", "pre", "script", "style"]);

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWordCharacter(value: string | undefined): boolean {
  return value !== undefined && WORD_CHARACTER.test(value);
}

export function normalizeFaustMarkdown(content: string): string {
  const lines = content.split("\n");
  const normalized: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      if (normalized.length && normalized.at(-1) !== "") normalized.push("");
      normalized.push(line.trim());
      if (index < lines.length - 1 && lines[index + 1] !== "") normalized.push("");
    } else normalized.push(line);
  }
  return normalized.join("\n");
}

export function splitFaustExistenceNames(text: string, existences: FaustExistenceLink[]): FaustTextSegment[] {
  const linksByName = new Map(existences.filter((item) => item.name).map((item) => [item.name, item]));
  const names = [...linksByName.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
  if (!names.length || !text) return [{ text }];
  const matcher = new RegExp(names.map(escapeRegularExpression).join("|"), "gu");
  const segments: FaustTextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(matcher)) {
    const name = match[0];
    const start = match.index;
    const end = start + name.length;
    const startsWithWord = isWordCharacter(Array.from(name)[0]);
    const endsWithWord = isWordCharacter(Array.from(name).at(-1));
    if ((startsWithWord && isWordCharacter(text[start - 1])) || (endsWithWord && isWordCharacter(text[end]))) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: name, existence: linksByName.get(name) });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length ? segments : [{ text }];
}

export function rehypeFaustExistenceLinks(existences: FaustExistenceLink[]) {
  return function plugin() {
    return function transform(tree: HastNode) {
      function visit(node: HastNode, blocked: boolean) {
        if (!node.children?.length) return;
        const nextChildren: HastNode[] = [];
        const descendantsBlocked = blocked || (node.type === "element" && SKIPPED_TAGS.has(node.tagName ?? ""));
        for (const child of node.children) {
          if (!descendantsBlocked && child.type === "text" && child.value) {
            for (const segment of splitFaustExistenceNames(child.value, existences)) {
              nextChildren.push(segment.existence ? {
                type: "element",
                tagName: "a",
                properties: {
                  href: segment.existence.href ?? `/nodes/${encodeURIComponent(segment.existence.id)}`,
                  title: `打开 ${segment.existence.name} 的${segment.existence.kind === "treasure" ? "宝物" : "存在"}卡片`,
                  "data-existence-name": segment.existence.name,
                },
                children: [{ type: "text", value: segment.text }],
              } : { type: "text", value: segment.text });
            }
          } else {
            visit(child, descendantsBlocked);
            nextChildren.push(child);
          }
        }
        node.children = nextChildren;
      }
      visit(tree, false);
    };
  };
}
