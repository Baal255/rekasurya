import { NextRequest } from "next/server";
import { handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import type { DeviceRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const corridor = searchParams.get("corridor");
    const status = searchParams.get("status");
    const faultFamily = searchParams.get("faultFamily");
    const search = searchParams.get("search");

    const where: string[] = [];
    const params: unknown[] = [];

    if (corridor && corridor !== "ALL") {
      where.push("d.corridor_id = ?");
      params.push(corridor);
    }
    if (status && status !== "ALL") {
      where.push("d.status = ?");
      params.push(status);
    }
    if (faultFamily && faultFamily !== "ALL") {
      where.push("d.fault_family = ?");
      params.push(faultFamily);
    }
    if (search && search.trim().length > 0) {
      where.push("(d.id LIKE ? OR d.pole_label LIKE ? OR c.name LIKE ? OR d.fault_sub_code LIKE ?)");
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q);
    }

    const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const devices = db
      .prepare(
        `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
         FROM devices d
         JOIN corridors c ON d.corridor_id = c.id
         ${clause}
         ORDER BY
           CASE d.status
             WHEN 'TAMPER_CRITICAL' THEN 1
             WHEN 'FAULT' THEN 2
             WHEN 'WARNING_EWMA' THEN 3
             WHEN 'OFFLINE' THEN 4
             ELSE 5
           END,
           d.id`
      )
      .all(...params) as DeviceRecord[];

    return jsonOk({ devices });
  } catch (err) {
    return handleRouteError(err);
  }
}
