import { NextRequest } from "next/server";
import { extractActor, handleRouteError, jsonErr, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import { ingestTelemetry } from "@/lib/domain/telemetry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (process.env.REKASURYA_DEMO_ONLY === "1") {
      return jsonErr("Pratinjau menerima data sintetis melalui Simulator.", 403, "DEMO_ONLY");
    }

    const requiredKey = process.env.REKASURYA_INGEST_KEY;
    if (requiredKey && requiredKey.trim().length > 0) {
      const provided = req.headers.get("x-rekasurya-ingest-key");
      if (provided !== requiredKey) {
        return jsonErr("Kunci autentikasi ingest telemetri tidak valid.", 401, "UNAUTHORIZED");
      }
    }

    const body = await req.json();
    const actor = extractActor(req);
    const db = getDb();
    const result = await ingestTelemetry(db, body, {
      dataSource: "LIVE_MQTT",
      actorRole: actor.role,
      actorName: actor.name,
      autoCreateWorkOrder: true,
    });
    return jsonOk(result, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
