import { NextRequest } from "next/server";
import { extractActor, handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import { transitionWorkOrder } from "@/lib/domain/work-orders";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const actor = extractActor(req);
    const db = getDb();
    const workOrder = transitionWorkOrder(db, id, body, actor);
    return jsonOk({ workOrder });
  } catch (err) {
    return handleRouteError(err);
  }
}
