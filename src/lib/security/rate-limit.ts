import { ApiFailure } from "../api";

const windows = new Map<string, number[]>();

export function enforceRateLimit(key: string, limit: number, intervalMs: number): void {
  const now = Date.now();
  const valid = (windows.get(key) ?? []).filter((timestamp) => timestamp > now - intervalMs);
  if (valid.length >= limit) throw new ApiFailure("RATE_LIMITED", "Too many requests. Please try again shortly.", 429);
  valid.push(now);
  windows.set(key, valid);
}

export function requestAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
