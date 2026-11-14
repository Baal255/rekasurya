import { NextRequest } from "next/server";
import { verifyAuditChain } from "@/lib/audit";
import { handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import type { AuditLogRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(5, Number(searchParams.get("limit") ?? 40)));
    const entries = db
      .prepare(`SELECT * FROM audit_log ORDER BY seq DESC LIMIT ?`)
      .all(limit) as AuditLogRecord[];
    const integrity = verifyAuditChain(db);
    return jsonOk({ integrity, entries });
  } catch (err) {
    return handleRouteError(err);
  }
}
