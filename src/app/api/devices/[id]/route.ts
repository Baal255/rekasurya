import { NextRequest } from "next/server";
import { handleRouteError, jsonErr, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import type {
  AiInvocationRecord,
  CitizenReportRecord,
  CorridorRecord,
  DeviceRecord,
  FaultEventRecord,
  TelemetryHistoryRecord,
  WorkOrderRecord,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();

    const device = db
      .prepare(
        `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
         FROM devices d
         JOIN corridors c ON d.corridor_id = c.id
         WHERE d.id = ?`
      )
      .get(id) as DeviceRecord | undefined;

    if (!device) {
      return jsonErr(`Tiang ${id} tidak ditemukan.`, 404, "DEVICE_NOT_FOUND");
    }

    const corridor = db
      .prepare(`SELECT *, (SELECT COUNT(*) FROM devices WHERE corridor_id = c.id) AS pole_count FROM corridors c WHERE c.id = ?`)
      .get(device.corridor_id) as CorridorRecord;

    const history = db
      .prepare(
        `SELECT * FROM telemetry_history WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 48`
      )
      .all(device.id) as TelemetryHistoryRecord[];
    history.reverse();

    const faultEvents = db
      .prepare(`SELECT * FROM fault_events WHERE device_id = ? ORDER BY detected_at DESC`)
      .all(device.id) as FaultEventRecord[];

    const workOrders = db
      .prepare(`SELECT * FROM work_orders WHERE device_id = ? ORDER BY created_at DESC`)
      .all(device.id) as WorkOrderRecord[];

    const citizenReports = db
      .prepare(`SELECT * FROM citizen_reports WHERE matched_device_id = ? ORDER BY created_at DESC`)
      .all(device.id) as CitizenReportRecord[];

    const corridorNeighbors = db
      .prepare(
        `SELECT id, pole_label, status, fault_family, pv_p, lux, ewma_z, spatial_verdict, soc_pct
         FROM devices
         WHERE corridor_id = ? AND id != ?
         ORDER BY id`
      )
      .all(device.corridor_id, device.id) as Array<{
      id: string;
      pole_label: string;
      status: string;
      fault_family: string;
      pv_p: number;
      lux: number;
      ewma_z: number;
      spatial_verdict: string;
      soc_pct: number;
    }>;

    const aiInvocations = db
      .prepare(`SELECT * FROM ai_invocations WHERE device_id = ? ORDER BY created_at DESC LIMIT 10`)
      .all(device.id) as AiInvocationRecord[];

    return jsonOk({
      device,
      corridor,
      history,
      faultEvents,
      workOrders,
      citizenReports,
      corridorNeighbors,
      aiInvocations,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
