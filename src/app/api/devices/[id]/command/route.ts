import { NextRequest } from "next/server";
import { extractActor, handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import { executeDeviceCommand } from "@/lib/domain/commands";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const actor = extractActor(req);
    const db = getDb();
    const result = executeDeviceCommand(db, id, body, actor);
    return jsonOk(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
