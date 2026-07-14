import { env } from "cloudflare:workers";

export interface ErosHostedEnv {
  DB: D1Database;
  EROS_IMAGES: R2Bucket;
  BFL_API_KEY?: string;
  IMAGE_PROVIDER?: string;
  IMAGE_API_KEY?: string;
  IMAGE_API_URL?: string;
  IMAGE_MODEL?: string;
  EROS_SETUP_TOKEN?: string;
  EROS_TREASURE_ADMIN_TOKEN?: string;
  EROS_BACKUP_TOKEN?: string;
  EROS_WORLD_GENESIS_TIMESTAMP_MS?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_MODEL?: string;
}

export function getHostedEnv(): ErosHostedEnv {
  return env as unknown as ErosHostedEnv;
}
