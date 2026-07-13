import { ApiFailure } from "../api";
import { splitGenome } from "../protocol/chromosomes";
import { GENESIS_NODE_NAMES, IMAGE_PROMPT_VERSION, PROJECT_NAME, PROTOCOL_VERSION } from "../protocol/constants";
import { createGenesisGenome, createNodeId } from "../protocol/genesis";
import { bytesToHex } from "../protocol/hex";
import { createNameKey, normalizeName } from "../protocol/normalization";
import { reproduce } from "../protocol/reproduction";
import { calculateMutationStats } from "../protocol/token-decoder";
import { descendantBirthRecord, EROS_BIRTH_RECORD, EROS_DEATH_RECORD, genesisBirthRecord, type DescriptionKind } from "../story";
import { getHostedEnv } from "./env";
import { SCHEMA_STATEMENTS } from "./schema";

export const WORLD_ID = "eros-world";
export const newRecordId = () => crypto.randomUUID();

export interface HostedWorld {
  id: string; name: string; protocolVersion: string; genesisTimestampMs: string; initializedAt: string;
}
export interface HostedNode {
  id: string; worldId: string; protocolVersion: string; promptVersion: string;
  type: "GENESIS" | "DESCENDANT"; name: string; nameKey: string; genomeHex: string;
  chromosome0Hex: string; chromosome1Hex: string; generation: number;
  isDead: boolean; recordsLocked: boolean; createdAt: string;
}
export interface HostedDescription {
  id: string; nodeId: string; body: string; authorLabel: string | null; status: string;
  kind: DescriptionKind; createdAt: string; trueCount: number; falseCount: number;
}
export interface HostedReproduction {
  id: string; childNodeId: string; parentLowId: string; parentHighId: string;
  lowChoice: number; highChoice: number; segmentSwapMode: number; lowSelectedHex: string; lowUnusedHex: string;
  highSelectedHex: string; highUnusedHex: string; baseGenomeHex: string;
  hammingDistance: number; sameBitCount: number; similarityRatio: number;
  similarityMaskHex: string; requestedMutationBits: number; mutationBitCount: number;
  mutationSeedHex: string; mutationMaskHex: string; flippedBitPositionsJson: string;
  changedTokenPositionsJson: string; createdAt: string;
}
export interface HostedImage {
  id: string; nodeId: string; provider: string; providerModel: string | null;
  providerRequestId: string | null; exactPrompt: string; promptVersion: string;
  providerSeed: string | null; variationId: string | null; imageUrl: string | null;
  r2Key: string | null; contentType: string | null; width: number | null; height: number | null;
  isPrimary: boolean; status: "PENDING" | "COMPLETED" | "FAILED";
  errorMessage: string | null; createdAt: string; imageDataUrl?: null;
  thumbnailUrl?: string | null;
}

let schemaPromise: Promise<void> | undefined;
export function ensureHostedSchema(): Promise<void> {
  if (process.env.NODE_ENV !== "development") return Promise.resolve();
  schemaPromise ??= getHostedEnv().DB.batch(SCHEMA_STATEMENTS.map((sql) => getHostedEnv().DB.prepare(sql))).then(() => undefined);
  return schemaPromise!;
}

function db() { return getHostedEnv().DB; }
async function first<T>(query: D1PreparedStatement): Promise<T | null> { return (await query.first<T>()) ?? null; }
async function all<T>(query: D1PreparedStatement): Promise<T[]> { return (await query.all<T>()).results; }

const nodeColumns = `id, world_id AS worldId, protocol_version AS protocolVersion,
  prompt_version AS promptVersion, type, name, name_key AS nameKey, genome_hex AS genomeHex,
  chromosome0_hex AS chromosome0Hex, chromosome1_hex AS chromosome1Hex,
  generation, is_dead AS isDead, records_locked AS recordsLocked, created_at AS createdAt`;
const worldColumns = `id, name, protocol_version AS protocolVersion,
  genesis_timestamp_ms AS genesisTimestampMs, initialized_at AS initializedAt`;
const reproductionColumns = `id, child_node_id AS childNodeId, parent_low_id AS parentLowId,
  parent_high_id AS parentHighId, low_choice AS lowChoice, high_choice AS highChoice,
  segment_swap_mode AS segmentSwapMode,
  low_selected_hex AS lowSelectedHex, low_unused_hex AS lowUnusedHex,
  high_selected_hex AS highSelectedHex, high_unused_hex AS highUnusedHex,
  base_genome_hex AS baseGenomeHex, hamming_distance AS hammingDistance,
  same_bit_count AS sameBitCount, similarity_ratio AS similarityRatio,
  similarity_mask_hex AS similarityMaskHex, requested_mutation_bits AS requestedMutationBits,
  mutation_bit_count AS mutationBitCount, mutation_seed_hex AS mutationSeedHex,
  mutation_mask_hex AS mutationMaskHex, flipped_bit_positions_json AS flippedBitPositionsJson,
  changed_token_positions_json AS changedTokenPositionsJson, created_at AS createdAt`;
const imageColumns = `id, node_id AS nodeId, provider, provider_model AS providerModel,
  provider_request_id AS providerRequestId, exact_prompt AS exactPrompt,
  prompt_version AS promptVersion, provider_seed AS providerSeed, variation_id AS variationId,
  image_url AS imageUrl, r2_key AS r2Key, content_type AS contentType, width, height,
  is_primary AS isPrimary, status, error_message AS errorMessage, created_at AS createdAt`;
const imageDisplayColumns = `id, node_id AS nodeId, provider, provider_model AS providerModel,
  variation_id AS variationId, image_url AS imageUrl, r2_key AS r2Key,
  content_type AS contentType, width, height, is_primary AS isPrimary,
  status, error_message AS errorMessage, created_at AS createdAt`;

function normalizeImage(row: HostedImage): HostedImage {
  return { ...row, isPrimary: Boolean(row.isPrimary), imageUrl: row.r2Key ? `/api/images/${row.id}` : row.imageUrl,
    thumbnailUrl: row.r2Key ? `/api/thumbnails/${row.id}` : row.imageUrl, imageDataUrl: null };
}

function normalizeNode(row: HostedNode): HostedNode {
  return { ...row, isDead: Boolean(row.isDead), recordsLocked: Boolean(row.recordsLocked) };
}

function configuredTimestamp(): bigint | undefined {
  const raw = getHostedEnv().EROS_WORLD_GENESIS_TIMESTAMP_MS?.trim();
  if (!raw) return undefined;
  const value = BigInt(raw);
  if (value < 0n) throw new Error("EROS_WORLD_GENESIS_TIMESTAMP_MS must be unsigned");
  return value;
}

export async function initializeHostedWorld(now: () => number = Date.now) {
  await ensureHostedSchema();
  const existing = await first<HostedWorld>(db().prepare(`SELECT ${worldColumns} FROM worlds WHERE id = ?`).bind(WORLD_ID));
  if (existing) {
    const nodes = (await all<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE world_id = ? ORDER BY name`).bind(WORLD_ID))).map(normalizeNode);
    return { world: existing, nodes, created: false };
  }
  const timestampMs = configuredTimestamp() ?? BigInt(now());
  const initializedAt = new Date().toISOString();
  const world: HostedWorld = { id: WORLD_ID, name: PROJECT_NAME, protocolVersion: PROTOCOL_VERSION, genesisTimestampMs: timestampMs.toString(), initializedAt };
  const nodes = GENESIS_NODE_NAMES.map((rawName) => {
    const name = normalizeName(rawName);
    const nameKey = createNameKey(name);
    const genome = createGenesisGenome({ name, timestampMs });
    const genomeHex = bytesToHex(genome);
    const chromosomes = splitGenome(genomeHex);
    return { id: createNodeId(genome), worldId: WORLD_ID, protocolVersion: PROTOCOL_VERSION,
      promptVersion: IMAGE_PROMPT_VERSION, type: "GENESIS" as const, name, nameKey,
      genomeHex, chromosome0Hex: chromosomes.chromosome0, chromosome1Hex: chromosomes.chromosome1,
      generation: 0, isDead: nameKey === "eros", recordsLocked: nameKey === "eros", createdAt: initializedAt };
  });
  const seedDescriptions = nodes.flatMap((node) => node.nameKey === "eros" ? [
    { id: newRecordId(), nodeId: node.id, body: EROS_BIRTH_RECORD, kind: "BIRTH" as const, createdAt: initializedAt },
    { id: newRecordId(), nodeId: node.id, body: EROS_DEATH_RECORD, kind: "DEATH" as const, createdAt: new Date(Date.parse(initializedAt) + 1_000).toISOString() },
  ] : [{ id: newRecordId(), nodeId: node.id, body: genesisBirthRecord(node.name), kind: "BIRTH" as const, createdAt: initializedAt }]);
  await db().batch([
    db().prepare("INSERT OR IGNORE INTO worlds (id,name,protocol_version,genesis_timestamp_ms,initialized_at) VALUES (?,?,?,?,?)")
      .bind(world.id, world.name, world.protocolVersion, world.genesisTimestampMs, world.initializedAt),
    ...nodes.map((node) => db().prepare(`INSERT OR IGNORE INTO nodes
      (id,world_id,protocol_version,prompt_version,type,name,name_key,genome_hex,chromosome0_hex,chromosome1_hex,generation,is_dead,records_locked,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(node.id, node.worldId, node.protocolVersion, node.promptVersion, node.type,
        node.name, node.nameKey, node.genomeHex, node.chromosome0Hex, node.chromosome1Hex, node.generation,
        node.isDead ? 1 : 0, node.recordsLocked ? 1 : 0, node.createdAt)),
    ...seedDescriptions.map((item) => db().prepare(`INSERT OR IGNORE INTO node_descriptions
      (id,node_id,body,author_label,status,kind,created_at) VALUES (?,?,?,NULL,'VISIBLE',?,?)`)
      .bind(item.id, item.nodeId, item.body, item.kind, item.createdAt)),
  ]);
  return { world, nodes, created: true };
}

export async function hostedWorldGraph() {
  await ensureHostedSchema();
  let world = await first<HostedWorld>(db().prepare(`SELECT ${worldColumns} FROM worlds WHERE id = ?`).bind(WORLD_ID));
  if (!world) world = (await initializeHostedWorld()).world;
  const [nodesResult, edgesResult, countsResult, reproductionsResult, imagesResult] = await db().batch([
    db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE world_id = ? ORDER BY generation, created_at`).bind(WORLD_ID),
    db().prepare("SELECT id,parent_node_id AS parentNodeId,child_node_id AS childNodeId,created_at AS createdAt FROM parent_edges ORDER BY created_at"),
    db().prepare(`SELECT n.id AS nodeId,
      (SELECT COUNT(*) FROM node_descriptions d WHERE d.node_id=n.id AND d.status='VISIBLE') AS descriptionCount,
      (SELECT COUNT(*) FROM generated_images i WHERE i.node_id=n.id AND i.status='COMPLETED') AS imageCount
      FROM nodes n WHERE n.world_id=?`).bind(WORLD_ID),
    db().prepare(`SELECT ${reproductionColumns} FROM reproductions`),
    db().prepare(`SELECT ${imageDisplayColumns} FROM generated_images WHERE status='COMPLETED' ORDER BY is_primary DESC, created_at DESC`),
  ]);
  const nodes = (nodesResult.results as unknown as HostedNode[]).map(normalizeNode);
  const edges = edgesResult.results as unknown as Array<{ id: string; parentNodeId: string; childNodeId: string; createdAt: string }>;
  const counts = countsResult.results as unknown as Array<{ nodeId: string; descriptionCount: number; imageCount: number }>;
  const reproductions = reproductionsResult.results as unknown as HostedReproduction[];
  const images = imagesResult.results as unknown as HostedImage[];
  const countMap = new Map(counts.map((item) => [item.nodeId, item]));
  const reproductionMap = new Map(reproductions.map((item) => [item.childNodeId, item]));
  const imageMap = new Map<string, HostedImage>();
  for (const image of images) if (!imageMap.has(image.nodeId)) imageMap.set(image.nodeId, normalizeImage(image));
  return { world, edges, nodes: nodes.map((node) => ({ ...node,
    _count: { descriptions: Number(countMap.get(node.id)?.descriptionCount ?? 0), images: Number(countMap.get(node.id)?.imageCount ?? 0) },
    reproduction: reproductionMap.get(node.id) ?? null, images: imageMap.has(node.id) ? [imageMap.get(node.id)!] : [],
  })) };
}

export async function listHostedNodes(filters: { query?: string; generation?: number; type?: "GENESIS" | "DESCENDANT"; page: number }) {
  await ensureHostedSchema();
  const clauses = ["world_id = ?"]; const values: unknown[] = [WORLD_ID];
  if (filters.query) { clauses.push("(name LIKE ? OR genome_hex LIKE ? OR id LIKE ?)"); const q = `%${filters.query}%`; values.push(q, q.toLowerCase(), q.toLowerCase()); }
  if (filters.generation !== undefined) { clauses.push("generation = ?"); values.push(filters.generation); }
  if (filters.type) { clauses.push("type = ?"); values.push(filters.type); }
  const where = clauses.join(" AND ");
  const nodes = await all<HostedNode & { descriptionCount: number; imageCount: number }>(db().prepare(`SELECT ${nodeColumns},
    (SELECT COUNT(*) FROM node_descriptions d WHERE d.node_id=nodes.id AND d.status='VISIBLE') AS descriptionCount,
    (SELECT COUNT(*) FROM generated_images i WHERE i.node_id=nodes.id AND i.status='COMPLETED') AS imageCount
    FROM nodes WHERE ${where} ORDER BY generation,name LIMIT 30 OFFSET ?`).bind(...values, (filters.page - 1) * 30));
  const total = await first<{ total: number }>(db().prepare(`SELECT COUNT(*) AS total FROM nodes WHERE ${where}`).bind(...values));
  return { nodes: nodes.map(({ descriptionCount, imageCount, ...node }) => ({ ...normalizeNode(node), _count: { descriptions: Number(descriptionCount), images: Number(imageCount) } })),
    page: filters.page, pageSize: 30, total: Number(total?.total ?? 0) };
}

export async function getHostedNode(id: string) {
  await ensureHostedSchema();
  const rawNode = await first<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE id=?`).bind(id));
  const node = rawNode ? normalizeNode(rawNode) : null;
  if (!node) throw new ApiFailure("NODE_NOT_FOUND", "Node not found.", 404);
  const detailResults = await db().batch([
    db().prepare(`SELECT ${reproductionColumns} FROM reproductions WHERE child_node_id=?`).bind(id),
    db().prepare("SELECT id,child_node_id AS childNodeId FROM parent_edges WHERE parent_node_id=? ORDER BY created_at").bind(id),
    db().prepare(`SELECT d.id,d.node_id AS nodeId,d.body,d.author_label AS authorLabel,d.status,d.kind,d.created_at AS createdAt,
      (SELECT COUNT(*) FROM description_feedback f WHERE f.description_id=d.id AND f.is_true=1) AS trueCount,
      (SELECT COUNT(*) FROM description_feedback f WHERE f.description_id=d.id AND f.is_true=0) AS falseCount
      FROM node_descriptions d WHERE d.node_id=? AND d.status='VISIBLE' ORDER BY d.created_at ASC`).bind(id),
    db().prepare(`SELECT ${imageDisplayColumns} FROM generated_images WHERE node_id=? ORDER BY is_primary DESC,created_at DESC`).bind(id),
  ]);
  const reproduction = (detailResults[0].results[0] as unknown as HostedReproduction | undefined) ?? null;
  const childEdges = detailResults[1].results as unknown as Array<{ id: string; childNodeId: string }>;
  const descriptions = detailResults[2].results as unknown as HostedDescription[];
  const rawImages = detailResults[3].results as unknown as HostedImage[];
  const parents = reproduction ? (await all<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE id IN (?,?)`).bind(reproduction.parentLowId, reproduction.parentHighId))).map(normalizeNode) : [];
  const children = childEdges.length ? (await all<HostedNode>(
    db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE id IN (${childEdges.map(() => "?").join(",")})`)
      .bind(...childEdges.map(({ childNodeId }) => childNodeId)),
  )).map(normalizeNode) : [];
  return { node, parents, children, reproduction, descriptions: descriptions.map((item) => ({ ...item, trueCount: Number(item.trueCount), falseCount: Number(item.falseCount) })), images: rawImages.map(normalizeImage) };
}

export async function createHostedGenesis(rawName: string, suppliedDescription?: string) {
  await ensureHostedSchema();
  const world = await first<HostedWorld>(db().prepare(`SELECT ${worldColumns} FROM worlds WHERE id=?`).bind(WORLD_ID));
  if (!world) throw new ApiFailure("WORLD_NOT_FOUND", "The Eros world has not been initialized.", 404);
  const name = normalizeName(rawName); const nameKey = createNameKey(name);
  const genome = createGenesisGenome({ name, timestampMs: BigInt(world.genesisTimestampMs) });
  const genomeHex = bytesToHex(genome); const id = createNodeId(genome);
  const existing = await first<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE world_id=? AND name_key=?`).bind(WORLD_ID, nameKey));
  if (existing) {
    if (existing.type === "GENESIS" && existing.id === id) return { node: existing, created: false };
    throw new ApiFailure("NODE_NAME_ALREADY_EXISTS", "This normalized name is already in use.", 409, { existingNodeId: existing.id });
  }
  const collision = await first<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE genome_hex=?`).bind(genomeHex));
  if (collision) throw new ApiFailure("GENOME_COLLISION", "A genome collision prevented node creation.", 409);
  const chromosomes = splitGenome(genomeHex); const createdAt = new Date().toISOString();
  const node: HostedNode = { id, worldId: WORLD_ID, protocolVersion: PROTOCOL_VERSION, promptVersion: IMAGE_PROMPT_VERSION,
    type: "GENESIS", name, nameKey, genomeHex, chromosome0Hex: chromosomes.chromosome0,
    chromosome1Hex: chromosomes.chromosome1, generation: 0, isDead: false, recordsLocked: false, createdAt };
  await db().batch([
    db().prepare(`INSERT INTO nodes (id,world_id,protocol_version,prompt_version,type,name,name_key,genome_hex,chromosome0_hex,chromosome1_hex,generation,is_dead,records_locked,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, WORLD_ID, PROTOCOL_VERSION, IMAGE_PROMPT_VERSION, "GENESIS", name, nameKey, genomeHex,
        node.chromosome0Hex, node.chromosome1Hex, 0, 0, 0, createdAt),
    db().prepare(`INSERT INTO node_descriptions (id,node_id,body,author_label,status,kind,created_at) VALUES (?,?,?,NULL,'VISIBLE','BIRTH',?)`)
      .bind(newRecordId(), id, genesisBirthRecord(name, suppliedDescription), createdAt),
  ]);
  return { node, created: true };
}

export async function previewHostedReproduction(parentAId: string, parentBId: string, name: string) {
  await ensureHostedSchema();
  if (parentAId === parentBId) throw new ApiFailure("PARENTS_MUST_BE_DIFFERENT", "Choose two different nodes.");
  const parents = await all<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE world_id=? AND id IN (?,?)`).bind(WORLD_ID, parentAId, parentBId));
  if (parents.length !== 2) throw new ApiFailure("PARENT_NOT_FOUND", "Both nodes must already exist.", 404);
  const parentA = normalizeNode(parents.find(({ id }) => id === parentAId)!); const parentB = normalizeNode(parents.find(({ id }) => id === parentBId)!);
  if (parentA.isDead || parentB.isDead) throw new ApiFailure("DEAD_PARENT", "死亡存在不能参与繁衍。", 409);
  const result = reproduce(parentA, parentB, name);
  return { result, mutationStats: calculateMutationStats(result.baseGenomeHex, result.childGenomeHex, result.flippedBitPositions) };
}

export async function createHostedDescendant(parentAId: string, parentBId: string, rawName: string, suppliedDescription?: string) {
  const normalizedName = normalizeName(rawName); const nameKey = createNameKey(normalizedName);
  const preview = await previewHostedReproduction(parentAId, parentBId, normalizedName); const { result } = preview;
  const existing = await first<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE world_id=? AND name_key=?`).bind(WORLD_ID, nameKey));
  if (existing) {
    const reproduction = await first<HostedReproduction>(db().prepare(`SELECT ${reproductionColumns} FROM reproductions WHERE child_node_id=?`).bind(existing.id));
    if (existing.id === result.childNodeId && reproduction?.parentLowId === result.parentLowId && reproduction.parentHighId === result.parentHighId)
      return { node: existing, ...preview, created: false };
    throw new ApiFailure("NODE_NAME_ALREADY_EXISTS", "This normalized name is already in use.", 409, { existingNodeId: existing.id });
  }
  if (await first(db().prepare("SELECT id FROM nodes WHERE genome_hex=?").bind(result.childGenomeHex)))
    throw new ApiFailure("GENOME_COLLISION", "A genome collision prevented node creation.", 409);
  const parentRecords = await all<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE id IN (?,?)`).bind(result.parentLowId, result.parentHighId));
  const generation = Math.max(...parentRecords.map((parent) => parent.generation)) + 1;
  const chromosomes = splitGenome(result.childGenomeHex); const createdAt = new Date().toISOString();
  const node: HostedNode = { id: result.childNodeId, worldId: WORLD_ID, protocolVersion: PROTOCOL_VERSION,
    promptVersion: IMAGE_PROMPT_VERSION, type: "DESCENDANT", name: normalizedName, nameKey,
    genomeHex: result.childGenomeHex, chromosome0Hex: chromosomes.chromosome0,
    chromosome1Hex: chromosomes.chromosome1, generation, isDead: false, recordsLocked: false, createdAt };
  const parentA = parentRecords.find((parent) => parent.id === parentAId)!;
  const parentB = parentRecords.find((parent) => parent.id === parentBId)!;
  await db().batch([
    db().prepare(`INSERT INTO nodes (id,world_id,protocol_version,prompt_version,type,name,name_key,genome_hex,chromosome0_hex,chromosome1_hex,generation,is_dead,records_locked,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(node.id, WORLD_ID, PROTOCOL_VERSION, IMAGE_PROMPT_VERSION, node.type, node.name, nameKey,
        node.genomeHex, node.chromosome0Hex, node.chromosome1Hex, generation, 0, 0, createdAt),
    db().prepare(`INSERT INTO reproductions (id,child_node_id,parent_low_id,parent_high_id,low_choice,high_choice,segment_swap_mode,low_selected_hex,low_unused_hex,
      high_selected_hex,high_unused_hex,base_genome_hex,hamming_distance,same_bit_count,similarity_ratio,similarity_mask_hex,
      requested_mutation_bits,mutation_bit_count,mutation_seed_hex,mutation_mask_hex,flipped_bit_positions_json,changed_token_positions_json,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(newRecordId(), node.id, result.parentLowId, result.parentHighId,
        result.lowChoice, result.highChoice, result.segmentSwapMode, result.lowSelectedHex, result.lowUnusedHex, result.highSelectedHex, result.highUnusedHex,
        result.baseGenomeHex, result.similarity.hammingDistance, result.similarity.sameBitCount, result.similarity.similarityRatio,
        result.similarity.similarityMaskHex, result.requestedMutationBits, result.mutationBitCount, result.mutationSeedHex,
        result.mutationMaskHex, JSON.stringify(result.flippedBitPositions), JSON.stringify(preview.mutationStats.changedTokenPositions), createdAt),
    db().prepare("INSERT INTO parent_edges (id,parent_node_id,child_node_id,created_at) VALUES (?,?,?,?)").bind(newRecordId(), result.parentLowId, node.id, createdAt),
    db().prepare("INSERT INTO parent_edges (id,parent_node_id,child_node_id,created_at) VALUES (?,?,?,?)").bind(newRecordId(), result.parentHighId, node.id, createdAt),
    db().prepare(`INSERT INTO node_descriptions (id,node_id,body,author_label,status,kind,created_at) VALUES (?,?,?,NULL,'VISIBLE','BIRTH',?)`)
      .bind(newRecordId(), node.id, descendantBirthRecord(node.name, parentA.name, parentB.name, suppliedDescription), createdAt),
  ]);
  return { node, ...preview, created: true };
}

export async function addHostedDescription(nodeId: string, body: string, authorLabel?: string) {
  await ensureHostedSchema();
  const node = await first<{ id: string; recordsLocked: number }>(db().prepare("SELECT id,records_locked AS recordsLocked FROM nodes WHERE id=?").bind(nodeId));
  if (!node) throw new ApiFailure("NODE_NOT_FOUND", "Node not found.", 404);
  if (node.recordsLocked) throw new ApiFailure("NODE_RECORDS_LOCKED", "该存在的记述已永久封存。", 409);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await all<{ body: string }>(db().prepare("SELECT body FROM node_descriptions WHERE node_id=? AND created_at>=?").bind(nodeId, since));
  if (recent.some((item) => item.body.normalize("NFKC").toLowerCase() === body.toLowerCase()))
    throw new ApiFailure("DUPLICATE_DESCRIPTION", "This description was already added recently.", 409);
  const description = { id: newRecordId(), nodeId, body, authorLabel: authorLabel || null, status: "VISIBLE", kind: "STORY" as const, createdAt: new Date().toISOString(), trueCount: 0, falseCount: 0 };
  await db().prepare("INSERT INTO node_descriptions (id,node_id,body,author_label,status,kind,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(description.id, nodeId, body, description.authorLabel, description.status, description.kind, description.createdAt).run();
  return description;
}

export async function setHostedNodeLifeStatus(nodeId: string, action: "die" | "revive", body: string) {
  await ensureHostedSchema();
  const rawNode = await first<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE id=?`).bind(nodeId));
  if (!rawNode) throw new ApiFailure("NODE_NOT_FOUND", "Node not found.", 404);
  const node = normalizeNode(rawNode);
  if (node.recordsLocked) throw new ApiFailure("NODE_RECORDS_LOCKED", "该存在已永久封存，不能改变生死状态。", 409);
  const nextDead = action === "die";
  if (node.isDead === nextDead) throw new ApiFailure("LIFE_STATUS_UNCHANGED", nextDead ? "该存在已经死亡。" : "该存在已经复活。", 409);
  const createdAt = new Date().toISOString();
  const description = { id: newRecordId(), nodeId, body, authorLabel: null, status: "VISIBLE", kind: (nextDead ? "DEATH" : "REVIVAL") as DescriptionKind, createdAt, trueCount: 0, falseCount: 0 };
  await db().batch([
    db().prepare("UPDATE nodes SET is_dead=? WHERE id=?").bind(nextDead ? 1 : 0, nodeId),
    db().prepare("INSERT INTO node_descriptions (id,node_id,body,author_label,status,kind,created_at) VALUES (?,?,?,?,?,?,?)")
      .bind(description.id, nodeId, body, null, description.status, description.kind, createdAt),
  ]);
  return { node: { ...node, isDead: nextDead }, description };
}

export async function setHostedDescriptionFeedback(descriptionId: string, voterKey: string, isTrue: boolean) {
  await ensureHostedSchema();
  if (!await first(db().prepare("SELECT id FROM node_descriptions WHERE id=? AND status='VISIBLE'").bind(descriptionId)))
    throw new ApiFailure("DESCRIPTION_NOT_FOUND", "记述不存在。", 404);
  const now = new Date().toISOString();
  await db().prepare(`INSERT INTO description_feedback (id,description_id,voter_key,is_true,created_at,updated_at)
    VALUES (?,?,?,?,?,?) ON CONFLICT(description_id,voter_key) DO UPDATE SET is_true=excluded.is_true,updated_at=excluded.updated_at`)
    .bind(newRecordId(), descriptionId, voterKey, isTrue ? 1 : 0, now, now).run();
  const counts = await first<{ trueCount: number; falseCount: number }>(db().prepare(`SELECT
    SUM(CASE WHEN is_true=1 THEN 1 ELSE 0 END) AS trueCount,
    SUM(CASE WHEN is_true=0 THEN 1 ELSE 0 END) AS falseCount
    FROM description_feedback WHERE description_id=?`).bind(descriptionId));
  return { descriptionId, isTrue, trueCount: Number(counts?.trueCount ?? 0), falseCount: Number(counts?.falseCount ?? 0) };
}

const BACKUP_TABLES = [
  "worlds", "nodes", "reproductions", "parent_edges", "node_descriptions", "description_feedback", "generated_images",
] as const;

export async function exportHostedDatabase() {
  await ensureHostedSchema();
  const results = await db().batch(BACKUP_TABLES.map((table) => db().prepare(`SELECT * FROM ${table}`)));
  const tables = Object.fromEntries(BACKUP_TABLES.map((table, index) => [table, results[index].results]));
  return {
    format: "eros-d1-backup-v1",
    exportedAt: new Date().toISOString(),
    worldId: WORLD_ID,
    counts: Object.fromEntries(BACKUP_TABLES.map((table) => [table, tables[table].length])),
    tables,
  };
}

export async function getHostedNodeForImage(nodeId: string) {
  await ensureHostedSchema();
  const node = await first<HostedNode>(db().prepare(`SELECT ${nodeColumns} FROM nodes WHERE id=?`).bind(nodeId));
  return node ? normalizeNode(node) : null;
}
export async function countHostedCompletedImages(nodeId: string) {
  const row = await first<{ total: number }>(db().prepare("SELECT COUNT(*) AS total FROM generated_images WHERE node_id=? AND status='COMPLETED'").bind(nodeId));
  return Number(row?.total ?? 0);
}
export async function createHostedPendingImage(input: { id: string; nodeId: string; provider: string; exactPrompt: string; providerSeed?: string; variationId: string }) {
  const createdAt = new Date().toISOString();
  await db().prepare(`INSERT INTO generated_images (id,node_id,provider,exact_prompt,prompt_version,provider_seed,variation_id,status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind(input.id, input.nodeId, input.provider, input.exactPrompt, IMAGE_PROMPT_VERSION,
      input.providerSeed ?? null, input.variationId, "PENDING", createdAt).run();
  return input.id;
}
export async function completeHostedImage(id: string, input: { provider: string; providerModel?: string; providerRequestId?: string; imageUrl?: string; r2Key?: string; contentType?: string; width?: number; height?: number; isPrimary: boolean }) {
  await db().prepare(`UPDATE generated_images SET provider=?,provider_model=?,provider_request_id=?,image_url=?,r2_key=?,content_type=?,width=?,height=?,is_primary=?,status='COMPLETED' WHERE id=?`)
    .bind(input.provider, input.providerModel ?? null, input.providerRequestId ?? null, input.imageUrl ?? null, input.r2Key ?? null,
      input.contentType ?? null, input.width ?? null, input.height ?? null, input.isPrimary ? 1 : 0, id).run();
  const row = await first<HostedImage>(db().prepare(`SELECT ${imageColumns} FROM generated_images WHERE id=?`).bind(id));
  return row ? normalizeImage(row) : null;
}
export async function failHostedImage(id: string, errorMessage: string) {
  await db().prepare("UPDATE generated_images SET status='FAILED',error_message=? WHERE id=?").bind(errorMessage.slice(0, 500), id).run();
}
export async function getHostedImageRecord(id: string) {
  await ensureHostedSchema();
  return first<HostedImage>(db().prepare(`SELECT ${imageColumns} FROM generated_images WHERE id=? AND status='COMPLETED'`).bind(id));
}
