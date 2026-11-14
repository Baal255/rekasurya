import { NextResponse } from "next/server";
import { verifyAuditChain } from "@/lib/audit";
import { handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import { calculateEnergyAndSavings } from "@/lib/energy/calculator";
import { AI_CONTRACT_VERSION } from "@/lib/ai/contract";
import type {
  CorridorRecord,
  DeviceRecord,
  FaultEventRecord,
  WorkOrderRecord,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const corridors = db
      .prepare(
        `SELECT c.*, COUNT(d.id) AS pole_count
         FROM corridors c
         LEFT JOIN devices d ON d.corridor_id = c.id
         GROUP BY c.id
         ORDER BY c.id`
      )
      .all() as CorridorRecord[];

    const devices = db
      .prepare(
        `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
         FROM devices d
         JOIN corridors c ON d.corridor_id = c.id
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
      .all() as DeviceRecord[];

    const openWorkOrders = db
      .prepare(
        `SELECT w.*, d.pole_label, c.name AS corridor_name, c.kabupaten
         FROM work_orders w
         JOIN devices d ON w.device_id = d.id
         JOIN corridors c ON d.corridor_id = c.id
         WHERE w.status NOT IN ('VERIFIED', 'CLOSED')
         ORDER BY w.created_at DESC`
      )
      .all() as Array<WorkOrderRecord & { pole_label: string; corridor_name: string; kabupaten: string }>;

    const faultEvents = db
      .prepare(
        `SELECT fe.*,
                d.pole_label,
                d.corridor_id,
                c.name AS corridor_name,
                c.kabupaten,
                d.status AS device_status,
                (
                  SELECT w.id
                  FROM work_orders w
                  WHERE w.fault_event_id = fe.id
                  ORDER BY w.created_at DESC
                  LIMIT 1
                ) AS linked_work_order_id,
                (
                  SELECT w.status
                  FROM work_orders w
                  WHERE w.fault_event_id = fe.id
                  ORDER BY w.created_at DESC
                  LIMIT 1
                ) AS work_order_status
         FROM fault_events fe
         JOIN devices d ON fe.device_id = d.id
         JOIN corridors c ON d.corridor_id = c.id
         ORDER BY
           CASE fe.status WHEN 'ACTIVE' THEN 1 WHEN 'ACKNOWLEDGED' THEN 2 ELSE 3 END,
           CASE fe.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
           fe.detected_at DESC`
      )
      .all() as Array<
      FaultEventRecord & {
        pole_label: string;
        corridor_id: string;
        corridor_name: string;
        kabupaten: string;
        device_status: string;
        linked_work_order_id: string | null;
        work_order_status: string | null;
      }
    >;

    const openCitizenCountRow = db
      .prepare(`SELECT COUNT(*) AS cnt FROM citizen_reports WHERE status != 'Resolved'`)
      .get() as { cnt: number };

    const activeFaultsCount = devices.filter((d) => d.status !== "NORMAL").length;
    const tamperAlertsCount = devices.filter((d) => d.status === "TAMPER_CRITICAL").length;
    const avgUptime30d =
      devices.length > 0
        ? Number((devices.reduce((acc, d) => acc + d.uptime_30d_pct, 0) / devices.length).toFixed(2))
        : 0;
    const energySummary = calculateEnergyAndSavings();
    const auditIntegrity = verifyAuditChain(db);

    return NextResponse.json({
      ok: true,
      data: {
        isDemoSimulation: true,
        aiContractVersion: AI_CONTRACT_VERSION,
        aiAdapterMode: process.env.REKASURYA_AI_SERVICE_URL
          ? "EXTERNAL_POC_ASTRA"
          : "MOCK_EWMA_DETERMINISTIC",
        stats: {
          totalDevices: devices.length,
          normalDevices: devices.length - activeFaultsCount,
          activeFaults: activeFaultsCount,
          tamperCritical: tamperAlertsCount,
          openWorkOrders: openWorkOrders.length,
          openCitizenReports: openCitizenCountRow.cnt,
          avgUptime30dPct: avgUptime30d,
          annualSavingsEstimatedIdr: energySummary.combined.totalAnnualBenefitIdr,
        },
        corridors,
        devices,
        openWorkOrders,
        faultEvents,
        auditIntegrity,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
