import { ApiFailure } from "@/lib/api";
import { narratorFromColumns, type NarratorColumns, type PublicNarrator } from "@/lib/narrator/types";
import { validateProposalId } from "@/lib/proposal/validation";
import { getHostedEnv } from "./env";
import { narratorFromRequest, requireNarrator } from "./narrator-repository";
import { ensureHostedSchema } from "./repository";

export type ProposalSort = "latest" | "likes";

interface ProposalPostRow extends NarratorColumns {
  id: string;
  title: string;
  content: string;
  isPinned: number | boolean;
  pinnedAt: string | null;
  createdAt: string;
  replyCount: number;
  likeCount: number;
  viewerLiked: number | boolean;
}

interface ProposalReplyRow extends NarratorColumns {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
}

export interface ProposalPostSummary {
  id: string;
  title: string;
  author: PublicNarrator;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  replyCount: number;
  likeCount: number;
  viewerLiked: boolean;
}

const PAGE_SIZE = 20;
const narratorColumns = `n.id AS narratorId,n.name AS narratorName,n.titles_json AS narratorTitlesJson,
  n.message AS narratorMessage,n.created_at AS narratorCreatedAt,n.is_admin AS narratorIsAdmin`;
const postColumns = `p.id,p.title,p.content,p.is_pinned AS isPinned,p.pinned_at AS pinnedAt,p.created_at AS createdAt,
  ${narratorColumns},
  (SELECT COUNT(*) FROM proposal_replies r WHERE r.post_id=p.id) AS replyCount,
  (SELECT COUNT(*) FROM proposal_likes l WHERE l.post_id=p.id) AS likeCount,
  EXISTS(SELECT 1 FROM proposal_likes own_like WHERE own_like.post_id=p.id AND own_like.voter_key=?) AS viewerLiked`;

function db() { return getHostedEnv().DB; }
async function first<T>(query: D1PreparedStatement): Promise<T | null> { return (await query.first<T>()) ?? null; }
async function all<T>(query: D1PreparedStatement): Promise<T[]> { return (await query.all<T>()).results; }

function authorFrom(row: NarratorColumns): PublicNarrator {
  const narrator = narratorFromColumns(row);
  if (!narrator) throw new ApiFailure("NARRATOR_DATA_INVALID", "记述者资料无法读取。", 500);
  return narrator;
}

function summarize(row: ProposalPostRow): ProposalPostSummary {
  return {
    id: row.id,
    title: row.title,
    author: authorFrom(row),
    isPinned: Boolean(row.isPinned),
    pinnedAt: row.pinnedAt,
    createdAt: row.createdAt,
    replyCount: Number(row.replyCount),
    likeCount: Number(row.likeCount),
    viewerLiked: Boolean(row.viewerLiked),
  };
}

function parseLatestCursor(cursor?: string): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  const separator = cursor.lastIndexOf("~");
  if (separator < 1) return null;
  const createdAt = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  if (!Number.isFinite(Date.parse(createdAt)) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { createdAt, id };
}

async function viewerKey(request: Request, anonymousVoterKey?: string): Promise<string> {
  const narrator = await narratorFromRequest(request);
  if (narrator) return `narrator:${narrator.id}`;
  return anonymousVoterKey ? `anonymous:${anonymousVoterKey}` : "no-viewer";
}

export async function listProposalPosts(request: Request, sort: ProposalSort, cursor?: string, anonymousVoterKey?: string) {
  await ensureHostedSchema();
  const key = await viewerKey(request, anonymousVoterKey);
  const pinned = await all<ProposalPostRow>(db().prepare(`SELECT ${postColumns}
    FROM proposal_posts p JOIN narrators n ON n.id=p.author_narrator_id
    WHERE p.is_pinned=1 ORDER BY p.pinned_at DESC,p.created_at DESC,p.id DESC`).bind(key));

  if (sort === "likes") {
    const offsetMatch = /^offset:(\d+)$/.exec(cursor ?? "");
    const offset = Math.min(Number(offsetMatch?.[1] ?? 0), 10_000);
    const rows = await all<ProposalPostRow>(db().prepare(`SELECT ${postColumns}
      FROM proposal_posts p JOIN narrators n ON n.id=p.author_narrator_id
      WHERE p.is_pinned=0 ORDER BY likeCount DESC,p.created_at DESC,p.id DESC LIMIT ? OFFSET ?`)
      .bind(key, PAGE_SIZE + 1, offset));
    const hasMore = rows.length > PAGE_SIZE;
    return {
      pinned: pinned.map(summarize),
      posts: rows.slice(0, PAGE_SIZE).map(summarize),
      nextCursor: hasMore ? `offset:${offset + PAGE_SIZE}` : null,
      hasMore,
    };
  }

  const before = parseLatestCursor(cursor);
  const where = before ? "AND (p.created_at<? OR (p.created_at=? AND p.id<?))" : "";
  const bindings: unknown[] = [key];
  if (before) bindings.push(before.createdAt, before.createdAt, before.id);
  bindings.push(PAGE_SIZE + 1);
  const rows = await all<ProposalPostRow>(db().prepare(`SELECT ${postColumns}
    FROM proposal_posts p JOIN narrators n ON n.id=p.author_narrator_id
    WHERE p.is_pinned=0 ${where} ORDER BY p.created_at DESC,p.id DESC LIMIT ?`).bind(...bindings));
  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);
  const oldest = visible.at(-1);
  return {
    pinned: pinned.map(summarize),
    posts: visible.reverse().map(summarize),
    nextCursor: hasMore && oldest ? `${oldest.createdAt}~${oldest.id}` : null,
    hasMore,
  };
}

export async function createProposal(request: Request, title: string, content: string) {
  await ensureHostedSchema();
  const narrator = await requireNarrator(request);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db().prepare(`INSERT INTO proposal_posts (id,author_narrator_id,title,content,is_pinned,created_at)
    VALUES (?,?,?,?,0,?)`).bind(id, narrator.id, title, content, createdAt).run();
  return { id, title, content, author: narrator, isPinned: false, pinnedAt: null, createdAt, replyCount: 0, likeCount: 0, viewerLiked: false };
}

async function getPostRow(id: string, key: string): Promise<ProposalPostRow> {
  validateProposalId(id);
  const row = await first<ProposalPostRow>(db().prepare(`SELECT ${postColumns}
    FROM proposal_posts p JOIN narrators n ON n.id=p.author_narrator_id WHERE p.id=?`).bind(key, id));
  if (!row) throw new ApiFailure("PROPOSAL_NOT_FOUND", "没有找到这条建言。", 404);
  return row;
}

export async function getProposal(request: Request, id: string, anonymousVoterKey?: string) {
  await ensureHostedSchema();
  const key = await viewerKey(request, anonymousVoterKey);
  const post = await getPostRow(id, key);
  const replies = await all<ProposalReplyRow>(db().prepare(`SELECT r.id,r.post_id AS postId,r.body,r.created_at AS createdAt,
    ${narratorColumns} FROM proposal_replies r JOIN narrators n ON n.id=r.author_narrator_id
    WHERE r.post_id=? ORDER BY r.created_at,r.id`).bind(id));
  return {
    post: { ...summarize(post), content: post.content },
    replies: replies.map((reply) => ({ id: reply.id, postId: reply.postId, body: reply.body, createdAt: reply.createdAt, author: authorFrom(reply) })),
  };
}

export async function addProposalReply(request: Request, id: string, body: string) {
  await ensureHostedSchema();
  const narrator = await requireNarrator(request);
  validateProposalId(id);
  if (!await first(db().prepare("SELECT id FROM proposal_posts WHERE id=?").bind(id)))
    throw new ApiFailure("PROPOSAL_NOT_FOUND", "没有找到这条建言。", 404);
  const reply = { id: crypto.randomUUID(), postId: id, body, createdAt: new Date().toISOString(), author: narrator };
  await db().prepare(`INSERT INTO proposal_replies (id,post_id,author_narrator_id,body,created_at)
    VALUES (?,?,?,?,?)`).bind(reply.id, id, narrator.id, body, reply.createdAt).run();
  return reply;
}

export async function toggleProposalLike(request: Request, id: string, anonymousVoterKey?: string) {
  await ensureHostedSchema();
  validateProposalId(id);
  const narrator = await narratorFromRequest(request);
  if (!narrator && !anonymousVoterKey) throw new ApiFailure("INVALID_VOTER_KEY", "匿名点赞标识无效。");
  const key = narrator ? `narrator:${narrator.id}` : `anonymous:${anonymousVoterKey}`;
  if (!await first(db().prepare("SELECT id FROM proposal_posts WHERE id=?").bind(id)))
    throw new ApiFailure("PROPOSAL_NOT_FOUND", "没有找到这条建言。", 404);
  const existing = await first<{ id: string }>(db().prepare("SELECT id FROM proposal_likes WHERE post_id=? AND voter_key=?").bind(id, key));
  if (existing) await db().prepare("DELETE FROM proposal_likes WHERE id=?").bind(existing.id).run();
  else await db().prepare("INSERT OR IGNORE INTO proposal_likes (id,post_id,voter_key,created_at) VALUES (?,?,?,?)")
    .bind(crypto.randomUUID(), id, key, new Date().toISOString()).run();
  const count = await first<{ total: number }>(db().prepare("SELECT COUNT(*) AS total FROM proposal_likes WHERE post_id=?").bind(id));
  return { id, viewerLiked: !existing, likeCount: Number(count?.total ?? 0) };
}

async function requireAdministrator(request: Request): Promise<PublicNarrator> {
  const narrator = await requireNarrator(request);
  if (!narrator.isAdmin) throw new ApiFailure("PROPOSAL_ADMIN_REQUIRED", "只有管理员可以执行此操作。", 403);
  return narrator;
}

export async function setProposalPinned(request: Request, id: string, pinned: boolean) {
  await ensureHostedSchema();
  await requireAdministrator(request);
  validateProposalId(id);
  const exists = await first<{ id: string }>(db().prepare("SELECT id FROM proposal_posts WHERE id=?").bind(id));
  if (!exists) throw new ApiFailure("PROPOSAL_NOT_FOUND", "没有找到这条建言。", 404);
  const pinnedAt = pinned ? new Date().toISOString() : null;
  await db().prepare("UPDATE proposal_posts SET is_pinned=?,pinned_at=? WHERE id=?").bind(pinned ? 1 : 0, pinnedAt, id).run();
  return { id, isPinned: pinned, pinnedAt };
}

export async function deleteProposal(request: Request, id: string) {
  await ensureHostedSchema();
  await requireAdministrator(request);
  validateProposalId(id);
  const exists = await first<{ id: string }>(db().prepare("SELECT id FROM proposal_posts WHERE id=?").bind(id));
  if (!exists) throw new ApiFailure("PROPOSAL_NOT_FOUND", "没有找到这条建言。", 404);
  await db().batch([
    db().prepare("DELETE FROM proposal_likes WHERE post_id=?").bind(id),
    db().prepare("DELETE FROM proposal_replies WHERE post_id=?").bind(id),
    db().prepare("DELETE FROM proposal_posts WHERE id=?").bind(id),
  ]);
  return { id, deleted: true };
}
