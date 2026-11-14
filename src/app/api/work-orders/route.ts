import { NextRequest } from "next/server";
import { extractActor, handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import { createWorkOrder, listWorkOrders } from "@/lib/domain/work-orders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const deviceId = searchParams.get("deviceId") ?? undefined;
    const priority = searchParams.get("priority") ?? undefined;

    const workOrders = listWorkOrders(db, { status, deviceId, priority });
    return jsonOk({ workOrders });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = extractActor(req);
    const db = getDb();
    const workOrder = createWorkOrder(db, body, actor);
    return jsonOk({ workOrder }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
