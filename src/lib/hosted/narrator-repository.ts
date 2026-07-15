import { ApiFailure } from "@/lib/api";
import {
  constantTimeHexEqual,
  createNarratorId,
  derivePassphraseHash,
  hashSessionToken,
  narratorNameKey,
  NARRATOR_MESSAGE_MAX_LENGTH,
  NARRATOR_PBKDF2_ITERATIONS,
  normalizeNarratorName,
  randomHex,
  validateNarratorName,
  validatePassphrase,
} from "@/lib/narrator/identity";
import type { AuthorshipMode, NarratorAttribution, PublicNarrator } from "@/lib/narrator/types";
import { narratorFromColumns, type NarratorColumns } from "@/lib/narrator/types";
import { unicodeLength } from "@/lib/security/text";
import { getHostedEnv } from "./env";
import { ensureHostedSchema } from "./repository";

const SESSION_COOKIE = "eros_narrator_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

interface NarratorRow extends NarratorColumns {
  nameKey: string;
  passphraseSalt: string;
  passphraseHash: string;
  passphraseIterations: number;
}

interface SessionGrant {
  token: string;
  expiresAt: string;
}

const narratorColumns = `n.id AS narratorId,n.name AS narratorName,n.name_key AS nameKey,
  n.titles_json AS narratorTitlesJson,n.message AS narratorMessage,n.created_at AS narratorCreatedAt,
  n.passphrase_salt AS passphraseSalt,n.passphrase_hash AS passphraseHash,
  n.passphrase_iterations AS passphraseIterations`;

function db() { return getHostedEnv().DB; }
async function first<T>(query: D1PreparedStatement): Promise<T | null> { return (await query.first<T>()) ?? null; }

function publicNarrator(row: NarratorColumns): PublicNarrator {
  const narrator = narratorFromColumns(row);
  if (!narrator) throw new ApiFailure("NARRATOR_DATA_INVALID", "记述者资料无法读取。", 500);
  return narrator;
}

async function createSession(narratorId: string): Promise<SessionGrant> {
  const token = randomHex(32);
  const tokenHash = await hashSessionToken(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1_000).toISOString();
  await db().batch([
    db().prepare("DELETE FROM narrator_sessions WHERE expires_at<=?").bind(createdAt),
    db().prepare(`INSERT INTO narrator_sessions (id,narrator_id,token_hash,created_at,expires_at)
      VALUES (?,?,?,?,?)`).bind(crypto.randomUUID(), narratorId, tokenHash, createdAt, expiresAt),
  ]);
  return { token, expiresAt };
}

export function setNarratorSessionCookie(response: { cookies: { set: (options: { name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; expires: Date }) => void } }, session: SessionGrant): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: session.token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export function clearNarratorSessionCookie(response: { cookies: { set: (options: { name: string; value: string; httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string; expires: Date }) => void } }): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

function sessionToken(request: Request): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === SESSION_COOKIE) {
      try { return decodeURIComponent(rawValue.join("=")); }
      catch { return null; }
    }
  }
  return null;
}

export async function registerNarrator(nameInput: string, passphraseInput: string): Promise<{ narrator: PublicNarrator; session: SessionGrant }> {
  await ensureHostedSchema();
  let name: string;
  let passphrase: string;
  try {
    name = validateNarratorName(nameInput);
    passphrase = validatePassphrase(passphraseInput);
  } catch (error) {
    throw new ApiFailure("INVALID_NARRATOR_REGISTRATION", error instanceof Error ? error.message : "注册信息无效。", 400);
  }
  const nameKey = narratorNameKey(name);
  if (await first(db().prepare("SELECT id FROM narrators WHERE name_key=?").bind(nameKey)))
    throw new ApiFailure("NARRATOR_NAME_TAKEN", "这个记述者名已经被使用。", 409);
  const createdAt = new Date().toISOString();
  const id = await createNarratorId(name, createdAt);
  const passphraseSalt = randomHex(16);
  const passphraseHash = await derivePassphraseHash(passphrase, passphraseSalt);
  try {
    await db().prepare(`INSERT INTO narrators
      (id,name,name_key,passphrase_salt,passphrase_hash,passphrase_iterations,titles_json,message,created_at)
      VALUES (?,?,?,?,?,?, '[]','',?)`).bind(
      id, name, nameKey, passphraseSalt, passphraseHash, NARRATOR_PBKDF2_ITERATIONS, createdAt,
    ).run();
  } catch (error) {
    if (await first(db().prepare("SELECT id FROM narrators WHERE name_key=?").bind(nameKey)))
      throw new ApiFailure("NARRATOR_NAME_TAKEN", "这个记述者名已经被使用。", 409);
    throw error;
  }
  const narrator: PublicNarrator = { id, name, titles: [], message: "", createdAt };
  return { narrator, session: await createSession(id) };
}

export async function loginNarrator(nameInput: string, passphrase: string): Promise<{ narrator: PublicNarrator; session: SessionGrant }> {
  await ensureHostedSchema();
  if (normalizeNarratorName(nameInput).length > 64 || passphrase.length > 128 || passphrase.length < 1)
    throw new ApiFailure("INVALID_NARRATOR_CREDENTIALS", "记述者名或密语不正确。", 401);
  const nameKey = narratorNameKey(normalizeNarratorName(nameInput));
  const row = await first<NarratorRow>(db().prepare(`SELECT ${narratorColumns} FROM narrators n WHERE n.name_key=?`).bind(nameKey));
  if (!row) throw new ApiFailure("INVALID_NARRATOR_CREDENTIALS", "记述者名或密语不正确。", 401);
  const candidate = await derivePassphraseHash(passphrase, row.passphraseSalt, Number(row.passphraseIterations));
  if (!constantTimeHexEqual(candidate, row.passphraseHash))
    throw new ApiFailure("INVALID_NARRATOR_CREDENTIALS", "记述者名或密语不正确。", 401);
  const narrator = publicNarrator(row);
  return { narrator, session: await createSession(narrator.id) };
}

export async function narratorFromRequest(request: Request): Promise<PublicNarrator | null> {
  await ensureHostedSchema();
  const token = sessionToken(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const tokenHash = await hashSessionToken(token);
  const row = await first<NarratorRow>(db().prepare(`SELECT ${narratorColumns}
    FROM narrator_sessions s JOIN narrators n ON n.id=s.narrator_id
    WHERE s.token_hash=? AND s.expires_at>?`).bind(tokenHash, new Date().toISOString()));
  return row ? publicNarrator(row) : null;
}

export async function requireNarrator(request: Request): Promise<PublicNarrator> {
  const narrator = await narratorFromRequest(request);
  if (!narrator) throw new ApiFailure("NARRATOR_LOGIN_REQUIRED", "请先登录记述者账户。", 401);
  return narrator;
}

export async function logoutNarrator(request: Request): Promise<void> {
  await ensureHostedSchema();
  const token = sessionToken(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return;
  await db().prepare("DELETE FROM narrator_sessions WHERE token_hash=?").bind(await hashSessionToken(token)).run();
}

export async function getPublicNarrator(id: string): Promise<PublicNarrator> {
  await ensureHostedSchema();
  if (!/^[0-9a-f]{128}$/.test(id)) throw new ApiFailure("NARRATOR_NOT_FOUND", "没有找到这名记述者。", 404);
  const row = await first<NarratorRow>(db().prepare(`SELECT ${narratorColumns} FROM narrators n WHERE n.id=?`).bind(id));
  if (!row) throw new ApiFailure("NARRATOR_NOT_FOUND", "没有找到这名记述者。", 404);
  return publicNarrator(row);
}

export async function updateNarratorMessage(request: Request, message: string): Promise<PublicNarrator> {
  const narrator = await requireNarrator(request);
  if (unicodeLength(message) > NARRATOR_MESSAGE_MAX_LENGTH)
    throw new ApiFailure("INVALID_NARRATOR_MESSAGE", `留言不能超过 ${NARRATOR_MESSAGE_MAX_LENGTH} 个字符。`);
  await db().prepare("UPDATE narrators SET message=? WHERE id=?").bind(message, narrator.id).run();
  return { ...narrator, message };
}

export async function resolveNarratorAttribution(request: Request, mode: AuthorshipMode | undefined, customLabel?: string): Promise<NarratorAttribution> {
  if (mode !== "narrator") return { narratorId: null, authorLabel: customLabel?.trim() || null, narrator: null };
  const narrator = await requireNarrator(request);
  return { narratorId: narrator.id, authorLabel: narrator.name, narrator };
}
