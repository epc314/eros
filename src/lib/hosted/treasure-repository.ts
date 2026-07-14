import { ApiFailure } from "../api";
import { TREASURE_PROTOCOL_VERSION, addTreasureInstanceNumber, type TreasureToken } from "../treasure/protocol";
import { getHostedEnv } from "./env";
import { ensureHostedSchema, WORLD_ID } from "./repository";

export type TreasureStatus = "PENDING" | "COLLECTED";
export type TreasureDescriptionKind = "DISCOVERY" | "STORY";

export interface HostedTreasure {
  id: string;
  worldId: string;
  ownerNodeId: string;
  ownerName: string;
  protocolVersion: string;
  name: string;
  title: string | null;
  subjectIndex: number;
  subjectName: string;
  subjectGroup: string;
  instanceNumber: number;
  searchTimestampMs: string;
  searchAttempt: number;
  searchHashHex: string;
  matchScore: number;
  ownerFeatureHex: string;
  tokensJson: string;
  exactPrompt: string;
  recorderName: string | null;
  status: TreasureStatus;
  createdAt: string;
  collectedAt: string | null;
}

export interface HostedTreasureDescription {
  id: string;
  treasureId: string;
  body: string;
  authorLabel: string | null;
  status: string;
  kind: TreasureDescriptionKind;
  createdAt: string;
  trueCount: number;
  falseCount: number;
}

export interface HostedTreasureImage {
  id: string;
  treasureId: string;
  provider: string;
  providerModel: string | null;
  providerRequestId: string | null;
  exactPrompt: string;
  promptVersion: string;
  providerSeed: string | null;
  variationId: string | null;
  imageUrl: string | null;
  r2Key: string | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  status: "PENDING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  createdAt: string;
  thumbnailUrl?: string | null;
}

function db() { return getHostedEnv().DB; }
async function first<T>(query: D1PreparedStatement): Promise<T | null> { return (await query.first<T>()) ?? null; }
async function all<T>(query: D1PreparedStatement): Promise<T[]> { return (await query.all<T>()).results; }
const newId = () => crypto.randomUUID();

const treasureColumns = `t.id,t.world_id AS worldId,t.owner_node_id AS ownerNodeId,n.name AS ownerName,
  t.protocol_version AS protocolVersion,t.name,t.title,t.subject_index AS subjectIndex,t.subject_name AS subjectName,
  t.subject_group AS subjectGroup,t.instance_number AS instanceNumber,t.search_timestamp_ms AS searchTimestampMs,t.search_attempt AS searchAttempt,
  t.search_hash_hex AS searchHashHex,t.match_score AS matchScore,t.owner_feature_hex AS ownerFeatureHex,
  t.tokens_json AS tokensJson,t.exact_prompt AS exactPrompt,t.recorder_name AS recorderName,
  t.status,t.created_at AS createdAt,t.collected_at AS collectedAt`;
const imageColumns = `id,treasure_id AS treasureId,provider,provider_model AS providerModel,
  provider_request_id AS providerRequestId,exact_prompt AS exactPrompt,prompt_version AS promptVersion,
  provider_seed AS providerSeed,variation_id AS variationId,image_url AS imageUrl,r2_key AS r2Key,
  content_type AS contentType,width,height,is_primary AS isPrimary,status,error_message AS errorMessage,
  created_at AS createdAt`;
const imageDisplayColumns = `id,treasure_id AS treasureId,provider,provider_model AS providerModel,
  variation_id AS variationId,image_url AS imageUrl,r2_key AS r2Key,content_type AS contentType,
  width,height,is_primary AS isPrimary,status,error_message AS errorMessage,created_at AS createdAt`;

function normalizeImage(row: HostedTreasureImage): HostedTreasureImage {
  return {
    ...row,
    isPrimary: Boolean(row.isPrimary),
    imageUrl: row.r2Key ? `/api/images/${row.id}` : row.imageUrl,
    thumbnailUrl: row.r2Key ? `/api/thumbnails/${row.id}` : row.imageUrl,
  };
}

export interface TreasureCandidateInput {
  ownerNodeId: string;
  name: string;
  subjectIndex: number;
  subjectName: string;
  subjectGroup: string;
  searchTimestampMs: string;
  searchAttempt: number;
  searchHashHex: string;
  matchScore: number;
  ownerFeatureHex: string;
  tokens: TreasureToken[];
  exactPrompt: string;
}

export async function createOrGetTreasureCandidate(input: TreasureCandidateInput): Promise<{ treasure: HostedTreasure; created: boolean }> {
  await ensureHostedSchema();
  const owner = await first<{ id: string }>(db().prepare("SELECT id FROM nodes WHERE id=? AND world_id=?").bind(input.ownerNodeId, WORLD_ID));
  if (!owner) throw new ApiFailure("NODE_NOT_FOUND", "匹配到的存在已经不在这个世界中。", 404);
  const existing = await first<HostedTreasure>(db().prepare(`SELECT ${treasureColumns} FROM treasures t JOIN nodes n ON n.id=t.owner_node_id
    WHERE t.owner_node_id=? AND t.search_hash_hex=?`).bind(input.ownerNodeId, input.searchHashHex));
  if (existing) return { treasure: existing, created: false };
  const createdAt = new Date().toISOString();
  for (let retry = 0; retry < 4; retry += 1) {
    const sequence = await first<{ instanceNumber: number }>(db().prepare(`SELECT COALESCE(MAX(instance_number),0)+1 AS instanceNumber
      FROM treasures WHERE owner_node_id=? AND subject_index=?`).bind(input.ownerNodeId, input.subjectIndex));
    const instanceNumber = Number(sequence?.instanceNumber ?? 1);
    const id = newId();
    const name = addTreasureInstanceNumber(input.name, instanceNumber);
    try {
      await db().prepare(`INSERT INTO treasures
        (id,world_id,owner_node_id,protocol_version,name,subject_index,subject_name,subject_group,instance_number,search_timestamp_ms,
         search_attempt,search_hash_hex,match_score,owner_feature_hex,tokens_json,exact_prompt,status,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        id, WORLD_ID, input.ownerNodeId, TREASURE_PROTOCOL_VERSION, name, input.subjectIndex, input.subjectName,
        input.subjectGroup, instanceNumber, input.searchTimestampMs, input.searchAttempt, input.searchHashHex, input.matchScore,
        input.ownerFeatureHex, JSON.stringify(input.tokens), input.exactPrompt, "PENDING", createdAt,
      ).run();
      const treasure = await getTreasureInternal(id);
      if (!treasure) throw new ApiFailure("TREASURE_CREATION_FAILED", "宝物候选未能成形。", 500);
      return { treasure, created: true };
    } catch (error) {
      const raced = await first<HostedTreasure>(db().prepare(`SELECT ${treasureColumns} FROM treasures t JOIN nodes n ON n.id=t.owner_node_id
        WHERE t.owner_node_id=? AND t.search_hash_hex=?`).bind(input.ownerNodeId, input.searchHashHex));
      if (raced) return { treasure: raced, created: false };
      if (retry === 3) throw error;
    }
  }
  throw new ApiFailure("TREASURE_CREATION_FAILED", "宝物候选未能成形。", 500);
}

export async function getTreasureInternal(id: string): Promise<HostedTreasure | null> {
  await ensureHostedSchema();
  return first<HostedTreasure>(db().prepare(`SELECT ${treasureColumns} FROM treasures t JOIN nodes n ON n.id=t.owner_node_id WHERE t.id=?`).bind(id));
}

export async function listCollectedTreasures(query?: string) {
  await ensureHostedSchema();
  const normalized = query?.trim();
  const where = normalized ? "AND (t.name LIKE ? OR t.title LIKE ? OR n.name LIKE ? OR t.search_hash_hex LIKE ? OR t.id LIKE ?)" : "";
  const values = normalized ? [`%${normalized}%`, `%${normalized}%`, `%${normalized}%`, `${normalized.toLowerCase()}%`, `${normalized.toLowerCase()}%`] : [];
  const rows = await all<HostedTreasure & { descriptionCount: number; imageCount: number }>(db().prepare(`SELECT ${treasureColumns},
    (SELECT COUNT(*) FROM treasure_descriptions d WHERE d.treasure_id=t.id AND d.status='VISIBLE') AS descriptionCount,
    (SELECT COUNT(*) FROM treasure_images i WHERE i.treasure_id=t.id AND i.status='COMPLETED') AS imageCount
    FROM treasures t JOIN nodes n ON n.id=t.owner_node_id WHERE t.world_id=? AND t.status='COLLECTED' ${where}
    ORDER BY t.collected_at DESC,t.name`).bind(WORLD_ID, ...values));
  if (!rows.length) return [];
  const images = await all<HostedTreasureImage>(db().prepare(`SELECT ${imageDisplayColumns} FROM treasure_images
    WHERE status='COMPLETED' AND treasure_id IN (${rows.map(() => "?").join(",")}) ORDER BY is_primary DESC,created_at DESC`).bind(...rows.map(({ id }) => id)));
  const imageMap = new Map<string, HostedTreasureImage>();
  for (const image of images) if (!imageMap.has(image.treasureId)) imageMap.set(image.treasureId, normalizeImage(image));
  return rows.map(({ descriptionCount, imageCount, ...treasure }) => ({
    id: treasure.id,
    name: treasure.name,
    title: treasure.title,
    ownerNodeId: treasure.ownerNodeId,
    ownerName: treasure.ownerName,
    subjectIndex: treasure.subjectIndex,
    subjectName: treasure.subjectName,
    subjectGroup: treasure.subjectGroup,
    instanceNumber: treasure.instanceNumber,
    searchHashHex: treasure.searchHashHex,
    recorderName: treasure.recorderName,
    status: treasure.status,
    createdAt: treasure.createdAt,
    collectedAt: treasure.collectedAt,
    descriptions: Number(descriptionCount),
    images: imageMap.has(treasure.id) ? [imageMap.get(treasure.id)!] : [],
    imageCount: Number(imageCount),
  }));
}

export async function listNodeTreasures(nodeId: string) {
  await ensureHostedSchema();
  const rows = await all<HostedTreasure & { descriptionCount: number; imageCount: number }>(db().prepare(`SELECT ${treasureColumns},
    (SELECT COUNT(*) FROM treasure_descriptions d WHERE d.treasure_id=t.id AND d.status='VISIBLE') AS descriptionCount,
    (SELECT COUNT(*) FROM treasure_images i WHERE i.treasure_id=t.id AND i.status='COMPLETED') AS imageCount
    FROM treasures t JOIN nodes n ON n.id=t.owner_node_id WHERE t.owner_node_id=? AND t.status='COLLECTED'
    ORDER BY t.collected_at,t.name`).bind(nodeId));
  return rows.map(({ descriptionCount, imageCount, ...treasure }) => ({
    id: treasure.id,
    name: treasure.name,
    title: treasure.title,
    ownerNodeId: treasure.ownerNodeId,
    ownerName: treasure.ownerName,
    subjectIndex: treasure.subjectIndex,
    subjectName: treasure.subjectName,
    subjectGroup: treasure.subjectGroup,
    instanceNumber: treasure.instanceNumber,
    recorderName: treasure.recorderName,
    status: treasure.status,
    createdAt: treasure.createdAt,
    collectedAt: treasure.collectedAt,
    descriptions: Number(descriptionCount),
    imageCount: Number(imageCount),
  }));
}

export async function getCollectedTreasure(id: string) {
  await ensureHostedSchema();
  const treasure = await first<HostedTreasure>(db().prepare(`SELECT ${treasureColumns} FROM treasures t JOIN nodes n ON n.id=t.owner_node_id
    WHERE t.id=? AND t.status='COLLECTED'`).bind(id));
  if (!treasure) throw new ApiFailure("TREASURE_NOT_FOUND", "宝物不存在或尚未被收录。", 404);
  const results = await db().batch([
    db().prepare(`SELECT d.id,d.treasure_id AS treasureId,d.body,d.author_label AS authorLabel,d.status,d.kind,d.created_at AS createdAt,
      (SELECT COUNT(*) FROM treasure_description_feedback f WHERE f.description_id=d.id AND f.is_true=1) AS trueCount,
      (SELECT COUNT(*) FROM treasure_description_feedback f WHERE f.description_id=d.id AND f.is_true=0) AS falseCount
      FROM treasure_descriptions d WHERE d.treasure_id=? AND d.status='VISIBLE' ORDER BY d.created_at,d.id`).bind(id),
    db().prepare(`SELECT ${imageColumns} FROM treasure_images WHERE treasure_id=? ORDER BY is_primary DESC,created_at DESC`).bind(id),
  ]);
  const { tokensJson, ...publicTreasure } = treasure;
  return {
    treasure: { ...publicTreasure, tokens: JSON.parse(tokensJson) as TreasureToken[] },
    descriptions: (results[0].results as unknown as HostedTreasureDescription[]).map((item) => ({
      ...item, trueCount: Number(item.trueCount), falseCount: Number(item.falseCount),
    })),
    images: (results[1].results as unknown as HostedTreasureImage[]).map(normalizeImage),
  };
}

export async function collectTreasure(id: string, recorderName?: string) {
  await ensureHostedSchema();
  const treasure = await getTreasureInternal(id);
  if (!treasure) throw new ApiFailure("TREASURE_NOT_FOUND", "没有找到这件候选宝物。", 404);
  if (treasure.status === "COLLECTED") return getCollectedTreasure(id);
  const image = await first<{ id: string }>(db().prepare("SELECT id FROM treasure_images WHERE treasure_id=? AND status='COMPLETED' LIMIT 1").bind(id));
  if (!image) throw new ApiFailure("TREASURE_IMAGE_NOT_READY", "宝物的视觉解释尚未完成，暂时不能收录。", 409);
  const recorder = recorderName?.trim() || "匿名";
  const collectedAt = new Date().toISOString();
  const descriptionId = `treasure-discovery:${id}`;
  const body = `${treasure.name} 由 ${recorder} 从 ${treasure.ownerName} 的命运中寻得，并收入宝物图鉴。`;
  await db().batch([
    db().prepare("UPDATE treasures SET status='COLLECTED',recorder_name=?,collected_at=? WHERE id=? AND status='PENDING'").bind(recorder, collectedAt, id),
    db().prepare(`INSERT OR IGNORE INTO treasure_descriptions (id,treasure_id,body,author_label,status,kind,created_at)
      VALUES (?,?,?,?, 'VISIBLE','DISCOVERY',?)`).bind(descriptionId, id, body, recorder, collectedAt),
  ]);
  return getCollectedTreasure(id);
}

export async function updateTreasureTitle(id: string, title: string) {
  await ensureHostedSchema();
  if (!await first(db().prepare("SELECT id FROM treasures WHERE id=? AND status='COLLECTED'").bind(id)))
    throw new ApiFailure("TREASURE_NOT_FOUND", "宝物不存在或尚未被收录。", 404);
  const normalized = title.trim();
  await db().prepare("UPDATE treasures SET title=? WHERE id=?").bind(normalized || null, id).run();
  return getCollectedTreasure(id);
}

export async function addTreasureDescription(treasureId: string, body: string, authorLabel?: string) {
  await ensureHostedSchema();
  const treasure = await first<{ id: string }>(db().prepare("SELECT id FROM treasures WHERE id=? AND status='COLLECTED'").bind(treasureId));
  if (!treasure) throw new ApiFailure("TREASURE_NOT_FOUND", "宝物不存在或尚未被收录。", 404);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await all<{ body: string }>(db().prepare("SELECT body FROM treasure_descriptions WHERE treasure_id=? AND created_at>=?").bind(treasureId, since));
  if (recent.some((item) => item.body.normalize("NFKC").toLowerCase() === body.normalize("NFKC").toLowerCase()))
    throw new ApiFailure("DUPLICATE_DESCRIPTION", "这条记述最近已经添加过。", 409);
  const description: HostedTreasureDescription = {
    id: newId(), treasureId, body, authorLabel: authorLabel || null, status: "VISIBLE", kind: "STORY",
    createdAt: new Date().toISOString(), trueCount: 0, falseCount: 0,
  };
  await db().prepare(`INSERT INTO treasure_descriptions (id,treasure_id,body,author_label,status,kind,created_at)
    VALUES (?,?,?,?,?,?,?)`).bind(description.id, treasureId, body, description.authorLabel, description.status, description.kind, description.createdAt).run();
  return description;
}

export async function setTreasureDescriptionFeedback(descriptionId: string, voterKey: string, isTrue: boolean) {
  await ensureHostedSchema();
  if (!await first(db().prepare("SELECT id FROM treasure_descriptions WHERE id=? AND status='VISIBLE'").bind(descriptionId)))
    throw new ApiFailure("DESCRIPTION_NOT_FOUND", "记述不存在。", 404);
  const now = new Date().toISOString();
  await db().prepare(`INSERT INTO treasure_description_feedback (id,description_id,voter_key,is_true,created_at,updated_at)
    VALUES (?,?,?,?,?,?) ON CONFLICT(description_id,voter_key) DO UPDATE SET is_true=excluded.is_true,updated_at=excluded.updated_at`)
    .bind(newId(), descriptionId, voterKey, isTrue ? 1 : 0, now, now).run();
  const counts = await first<{ trueCount: number; falseCount: number }>(db().prepare(`SELECT
    SUM(CASE WHEN is_true=1 THEN 1 ELSE 0 END) AS trueCount,
    SUM(CASE WHEN is_true=0 THEN 1 ELSE 0 END) AS falseCount
    FROM treasure_description_feedback WHERE description_id=?`).bind(descriptionId));
  return { descriptionId, isTrue, trueCount: Number(counts?.trueCount ?? 0), falseCount: Number(counts?.falseCount ?? 0) };
}

export async function createTreasurePendingImage(input: { id: string; treasureId: string; provider: string; exactPrompt: string; providerSeed: string; variationId: string }) {
  await ensureHostedSchema();
  const createdAt = new Date().toISOString();
  await db().prepare(`INSERT INTO treasure_images (id,treasure_id,provider,exact_prompt,prompt_version,provider_seed,variation_id,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind(input.id, input.treasureId, input.provider, input.exactPrompt, TREASURE_PROTOCOL_VERSION,
      input.providerSeed, input.variationId, "PENDING", createdAt).run();
}

export async function completeTreasureImage(id: string, input: { provider: string; providerModel?: string; providerRequestId?: string; imageUrl?: string; r2Key?: string; contentType?: string; width?: number; height?: number; isPrimary: boolean }) {
  await db().prepare(`UPDATE treasure_images SET provider=?,provider_model=?,provider_request_id=?,image_url=?,r2_key=?,content_type=?,width=?,height=?,is_primary=?,status='COMPLETED' WHERE id=?`)
    .bind(input.provider, input.providerModel ?? null, input.providerRequestId ?? null, input.imageUrl ?? null, input.r2Key ?? null,
      input.contentType ?? null, input.width ?? null, input.height ?? null, input.isPrimary ? 1 : 0, id).run();
  const row = await first<HostedTreasureImage>(db().prepare(`SELECT ${imageColumns} FROM treasure_images WHERE id=?`).bind(id));
  return row ? normalizeImage(row) : null;
}

export async function failTreasureImage(id: string, errorMessage: string) {
  await db().prepare("UPDATE treasure_images SET status='FAILED',error_message=? WHERE id=?").bind(errorMessage.slice(0, 500), id).run();
}

export async function countCompletedTreasureImages(treasureId: string) {
  const row = await first<{ total: number }>(db().prepare("SELECT COUNT(*) AS total FROM treasure_images WHERE treasure_id=? AND status='COMPLETED'").bind(treasureId));
  return Number(row?.total ?? 0);
}

export async function getTreasureImageRecord(id: string) {
  await ensureHostedSchema();
  return first<HostedTreasureImage>(db().prepare(`SELECT ${imageColumns} FROM treasure_images WHERE id=? AND status='COMPLETED'`).bind(id));
}

export async function listTreasureImages(treasureId: string) {
  await ensureHostedSchema();
  return (await all<HostedTreasureImage>(db().prepare(`SELECT ${imageColumns} FROM treasure_images
    WHERE treasure_id=? ORDER BY is_primary DESC,created_at DESC`).bind(treasureId))).map(normalizeImage);
}

export async function clearHostedTreasures() {
  await ensureHostedSchema();
  const countStatements = [
    db().prepare("SELECT COUNT(*) AS total FROM treasures WHERE world_id=?").bind(WORLD_ID),
    db().prepare("SELECT COUNT(*) AS total FROM treasure_descriptions WHERE treasure_id IN (SELECT id FROM treasures WHERE world_id=?)").bind(WORLD_ID),
    db().prepare(`SELECT COUNT(*) AS total FROM treasure_description_feedback WHERE description_id IN
      (SELECT id FROM treasure_descriptions WHERE treasure_id IN (SELECT id FROM treasures WHERE world_id=?))`).bind(WORLD_ID),
    db().prepare("SELECT COUNT(*) AS total FROM treasure_images WHERE treasure_id IN (SELECT id FROM treasures WHERE world_id=?)").bind(WORLD_ID),
  ];
  const [counts, imageRows] = await Promise.all([
    db().batch(countStatements),
    all<{ r2Key: string | null }>(db().prepare(`SELECT r2_key AS r2Key FROM treasure_images
      WHERE treasure_id IN (SELECT id FROM treasures WHERE world_id=?) AND r2_key IS NOT NULL`).bind(WORLD_ID)),
  ]);
  const total = (index: number) => Number((counts[index].results[0] as { total?: number } | undefined)?.total ?? 0);
  const deleted = {
    treasures: total(0),
    descriptions: total(1),
    feedback: total(2),
    images: total(3),
    storedImages: new Set(imageRows.map(({ r2Key }) => r2Key).filter((key): key is string => Boolean(key))).size,
  };
  await db().batch([
    db().prepare(`DELETE FROM treasure_description_feedback WHERE description_id IN
      (SELECT id FROM treasure_descriptions WHERE treasure_id IN (SELECT id FROM treasures WHERE world_id=?))`).bind(WORLD_ID),
    db().prepare("DELETE FROM treasure_descriptions WHERE treasure_id IN (SELECT id FROM treasures WHERE world_id=?)").bind(WORLD_ID),
    db().prepare("DELETE FROM treasure_images WHERE treasure_id IN (SELECT id FROM treasures WHERE world_id=?)").bind(WORLD_ID),
    db().prepare("DELETE FROM treasures WHERE world_id=?").bind(WORLD_ID),
  ]);
  const r2Keys = [...new Set(imageRows.map(({ r2Key }) => r2Key).filter((key): key is string => Boolean(key)))];
  for (let index = 0; index < r2Keys.length; index += 1_000)
    await getHostedEnv().EROS_IMAGES.delete(r2Keys.slice(index, index + 1_000));
  return { cleared: true, deleted };
}

export async function hostedTreasureContext(): Promise<{ text: string; names: string[] }> {
  const treasures = await listCollectedTreasures();
  if (!treasures.length) return { text: "当前尚无已收录宝物。", names: [] };
  const details = await Promise.all(treasures.map(({ id }) => getCollectedTreasure(id)));
  return {
    names: details.map(({ treasure }) => treasure.name),
    text: details.map(({ treasure, descriptions }) => [
      `宝物：${treasure.name} [${treasure.id}]`,
      ...(treasure.title ? [`称号：${treasure.title}`] : []),
      `主体：${treasure.subjectName}；类别：${treasure.subjectGroup}；持有存在：${treasure.ownerName} [${treasure.ownerNodeId}]；记述人：${treasure.recorderName ?? "匿名"}`,
      `属性：${treasure.tokens.map((token) => `${token.familyZh}=${token.phraseZh}`).join("；")}`,
      "记述：",
      ...descriptions.map((record) => `- [${record.kind}; 真实=${record.trueCount}; 虚假=${record.falseCount}; ${record.falseCount > record.trueCount ? "disputed" : "accepted"}] ${record.body}`),
    ].join("\n")).join("\n\n"),
  };
}
