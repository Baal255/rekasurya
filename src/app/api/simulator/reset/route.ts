import { NextRequest } from "next/server";
import { appendAudit } from "@/lib/audit";
import { extractActor, handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb, resetDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    resetDb(db);
    const actor = extractActor(req);
    appendAudit(db, {
      actorRole: actor.role,
      actorName: actor.name,
      action: "DEMO_DATABASE_RESET",
      entityType: "system",
      entityId: "FLEET-SOLO-RAYA",
      detail: { message: "Basis data simulasi dipulihkan ke snapshot awal Solo Raya." },
    });
    return jsonOk({ message: "Data simulasi armada REKASURYA telah direset ke kondisi awal." });
  } catch (err) {
    return handleRouteError(err);
  }
}
