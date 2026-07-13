import { NextResponse } from "next/server";
import { apiError, ApiFailure } from "@/lib/api";
import { getHostedEnv } from "@/lib/hosted/env";
import { exportHostedDatabase } from "@/lib/hosted/repository";
import { enforceRateLimit, requestAddress } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  try {
    enforceRateLimit(`backup:${requestAddress(request)}`, 10, 3_600_000);
    const expected = getHostedEnv().EROS_BACKUP_TOKEN;
    const supplied = request.headers.get("x-eros-backup-token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!expected || supplied !== expected) throw new ApiFailure("INVALID_BACKUP_TOKEN", "A valid backup token is required.", 401);
    return NextResponse.json(await exportHostedDatabase(), { headers: {
      "cache-control": "private, no-store, max-age=0",
      "content-disposition": 'attachment; filename="eros-database-latest.json"',
      "x-content-type-options": "nosniff",
    } });
  } catch (error) { return apiError(error); }
}
