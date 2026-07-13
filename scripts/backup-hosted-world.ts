import "dotenv/config";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

interface BackupPayload {
  format: string;
  exportedAt: string;
  counts: Record<string, number>;
  tables: Record<string, unknown[]>;
}

const backupUrl = process.env.EROS_BACKUP_URL ?? "https://eros-genome-world.cassette2024.chatgpt.site/api/world/backup";
const backupPath = process.env.EROS_BACKUP_PATH ?? join(homedir(), "Documents", "Eros Backups", "eros-database-latest.json");
const token = process.env.EROS_BACKUP_TOKEN;

if (!token) throw new Error("EROS_BACKUP_TOKEN is missing from the local environment");

const response = await fetch(backupUrl, { headers: { "x-eros-backup-token": token, accept: "application/json" } });
if (!response.ok) throw new Error(`Backup export failed with HTTP ${response.status}`);
const payload = await response.json() as BackupPayload;
if (payload.format !== "eros-d1-backup-v1" || !payload.exportedAt || !payload.tables?.worlds || !payload.tables?.nodes)
  throw new Error("Backup export returned an invalid payload");

await mkdir(dirname(backupPath), { recursive: true });
const temporaryPath = `${backupPath}.tmp`;
try {
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, backupPath);
} catch (error) {
  await rm(temporaryPath, { force: true });
  throw error;
}

console.log(`Eros database backup updated: ${backupPath} (${payload.counts.nodes ?? 0} existences, exported ${payload.exportedAt}).`);
