import type Database from "better-sqlite3";
import { z } from "zod";
import { appendAudit } from "../audit";
import { nextId } from "../db";
import type { CitizenTimelineEntry, DeviceRecord, WorkOrderRecord, WorkOrderStatus } from "../types";
import { resolveDispatchUnit } from "./telemetry";

export interface EnrichedWorkOrder extends WorkOrderRecord {
  pole_label: string;
  corridor_id: string;
  corridor_name: string;
  kabupaten: string;
  device_status: string;
  fault_sub_code: string;
  lat: number;
  lng: number;
  maintenance_until: string | null;
}

export function listWorkOrders(
  db: Database.Database,
  filters: { status?: string; deviceId?: string; priority?: string } = {}
): EnrichedWorkOrder[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.status && filters.status !== "ALL") {
    where.push("w.status = ?");
    params.push(filters.status);
  }
  if (filters.deviceId) {
    where.push("w.device_id = ?");
    params.push(filters.deviceId);
  }
  if (filters.priority && filters.priority !== "ALL") {
    where.push("w.priority = ?");
    params.push(filters.priority);
  }

  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return db
    .prepare(
      `SELECT w.*, d.pole_label, d.corridor_id, c.name AS corridor_name, c.kabupaten,
              d.status AS device_status, d.fault_sub_code, d.lat, d.lng, d.maintenance_until
       FROM work_orders w
       JOIN devices d ON w.device_id = d.id
       JOIN corridors c ON d.corridor_id = c.id
       ${clause}
       ORDER BY
         CASE w.status
           WHEN 'OPEN' THEN 1
           WHEN 'ASSIGNED' THEN 2
           WHEN 'IN_PROGRESS' THEN 3
           WHEN 'VERIFIED' THEN 4
           ELSE 5
         END,
         CASE w.priority
           WHEN 'DARURAT' THEN 1
           WHEN 'TINGGI' THEN 2
           WHEN 'SEDANG' THEN 3
           ELSE 4
         END,
         w.created_at DESC`
    )
    .all(...params) as EnrichedWorkOrder[];
}

export const CreateWorkOrderInputZ = z.object({
  device_id: z.string().min(2),
  priority: z.enum(["DARURAT", "TINGGI", "SEDANG", "RENDAH"]).default("SEDANG"),
  title: z.string().min(3),
  diagnosis_summary: z.string().min(5),
  assigned_team: z.string().optional(),
  truck_unit: z.string().optional(),
  technician_notes: z.string().default(""),
  parts: z
    .array(
      z.object({
        sku: z.string(),
        name: z.string(),
        quantity: z.number().int().positive(),
        unit: z.string(),
        estimatedIdr: z.number().nonnegative(),
        notes: z.string().default(""),
      })
    )
    .default([]),
});

export function createWorkOrder(
  db: Database.Database,
  rawInput: unknown,
  actor: { role: string; name: string }
): EnrichedWorkOrder {
  const input = CreateWorkOrderInputZ.parse(rawInput);
  const device = db
    .prepare(
      `SELECT d.*, c.kabupaten FROM devices d JOIN corridors c ON d.corridor_id = c.id WHERE d.id = ?`
    )
    .get(input.device_id) as (DeviceRecord & { kabupaten: string }) | undefined;

  if (!device) {
    throw new Error(`Perangkat ${input.device_id} tidak ditemukan.`);
  }

  const nowIso = new Date().toISOString();
  const dispatch = resolveDispatchUnit(device.kabupaten);
  const woId = nextId(db, "WO", 4);
  const slaHours = input.priority === "DARURAT" ? 4 : input.priority === "TINGGI" ? 12 : 24;
  const slaDeadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  db.prepare(
    `INSERT INTO work_orders (
      id, device_id, fault_event_id, citizen_report_id, priority, status,
      title, diagnosis_summary, assigned_team, truck_unit, parts_checklist_json,
      technician_notes, checkin_at, checkin_lat, checkin_lng, verification_passed,
      sla_deadline, created_at, updated_at
    ) VALUES (?, ?, NULL, NULL, ?, 'OPEN', ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 0, ?, ?, ?)`
  ).run(
    woId,
    device.id,
    input.priority,
    input.title,
    input.diagnosis_summary,
    input.assigned_team || dispatch.team,
    input.truck_unit || dispatch.truck,
    JSON.stringify(input.parts),
    input.technician_notes,
    slaDeadline,
    nowIso,
    nowIso
  );

  appendAudit(db, {
    actorRole: actor.role,
    actorName: actor.name,
    action: "WORK_ORDER_CREATED",
    entityType: "work_order",
    entityId: woId,
    detail: { deviceId: device.id, priority: input.priority, title: input.title },
    createdAt: nowIso,
  });

  return listWorkOrders(db, { deviceId: device.id }).find((w) => w.id === woId)!;
}

export const PatchWorkOrderInputZ = z.object({
  action: z.enum(["ASSIGN", "CHECKIN", "VERIFY", "CLOSE", "UPDATE_NOTES"]),
  assigned_team: z.string().optional(),
  truck_unit: z.string().optional(),
  technician_notes: z.string().optional(),
  checkin_lat: z.number().optional(),
  checkin_lng: z.number().optional(),
});

export function checkTelemetryRecoveryForDevice(device: DeviceRecord): {
  recovered: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const is12V = device.battery_profile.startsWith("12.8V");
  const minBattV = is12V ? 11.8 : 23.6;

  if (device.status !== "NORMAL") {
    reasons.push(`Status perangkat masih ${device.status} (harus NORMAL)`);
  }
  if (device.fault_family !== "NONE") {
    reasons.push(`Gangguan aktif ${device.fault_sub_code} belum bersih`);
  }
  if (device.batt_v < minBattV) {
    reasons.push(`Tegangan baterai ${device.batt_v.toFixed(2)} V di bawah ambang sehat ${minBattV} V`);
  }
  if (device.door_open === 1 && !device.maintenance_until) {
    reasons.push("Kotak kontrol IP65 masih terbuka");
  }

  return { recovered: reasons.length === 0, reasons };
}

function appendLinkedCitizenTimeline(
  db: Database.Database,
  workOrderId: string,
  entry: CitizenTimelineEntry,
  nextStatus: "Open" | "Responded" | "Process" | "Resolved"
) {
  const reports = db
    .prepare(`SELECT id, timeline_json FROM citizen_reports WHERE linked_work_order_id = ?`)
    .all(workOrderId) as Array<{ id: string; timeline_json: string }>;

  for (const r of reports) {
    const timeline = JSON.parse(r.timeline_json) as CitizenTimelineEntry[];
    timeline.push(entry);
    db.prepare(`UPDATE citizen_reports SET status = ?, timeline_json = ? WHERE id = ?`).run(
      nextStatus,
      JSON.stringify(timeline),
      r.id
    );
  }
}

export class WorkOrderTransitionError extends Error {
  statusCode: number;
  details?: string[];
  constructor(message: string, statusCode = 400, details?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function transitionWorkOrder(
  db: Database.Database,
  woId: string,
  rawInput: unknown,
  actor: { role: string; name: string }
): EnrichedWorkOrder {
  const input = PatchWorkOrderInputZ.parse(rawInput);
  const wo = db.prepare(`SELECT * FROM work_orders WHERE id = ?`).get(woId) as WorkOrderRecord | undefined;
  if (!wo) {
    throw new WorkOrderTransitionError(`Work Order ${woId} tidak ditemukan.`, 404);
  }
  const device = db.prepare(`SELECT * FROM devices WHERE id = ?`).get(wo.device_id) as DeviceRecord;
  const nowIso = new Date().toISOString();

  const tx = db.transaction(() => {
    let nextStatus: WorkOrderStatus = wo.status;
    let verificationPassed = wo.verification_passed;

    if (input.action === "ASSIGN") {
      nextStatus = "ASSIGNED";
      db.prepare(
        `UPDATE work_orders SET status = ?, assigned_team = ?, truck_unit = ?, technician_notes = ?, updated_at = ? WHERE id = ?`
      ).run(
        nextStatus,
        input.assigned_team ?? wo.assigned_team,
        input.truck_unit ?? wo.truck_unit,
        input.technician_notes ?? wo.technician_notes,
        nowIso,
        wo.id
      );
      appendLinkedCitizenTimeline(
        db,
        wo.id,
        {
          timestamp: nowIso,
          status: "Responded",
          actor: actor.name,
          note: `Regu ${input.assigned_team ?? wo.assigned_team} (${input.truck_unit ?? wo.truck_unit}) ditugaskan untuk ${wo.id}.`,
        },
        "Responded"
      );
    } else if (input.action === "CHECKIN") {
      nextStatus = "IN_PROGRESS";
      const lat = input.checkin_lat ?? device.lat;
      const lng = input.checkin_lng ?? device.lng;
      const maintUntil = new Date(Date.now() + 90 * 60 * 1000).toISOString();
      const notes =
        input.technician_notes ??
        (wo.technician_notes || `Teknisi check-in lapangan di koordinat (${lat.toFixed(4)}, ${lng.toFixed(4)}). Mode pemeliharaan aktif 90 menit.`);

      db.prepare(
        `UPDATE work_orders SET status = ?, checkin_at = ?, checkin_lat = ?, checkin_lng = ?, technician_notes = ?, updated_at = ? WHERE id = ?`
      ).run(nextStatus, nowIso, lat, lng, notes, nowIso, wo.id);

      db.prepare(`UPDATE devices SET maintenance_until = ? WHERE id = ?`).run(maintUntil, device.id);

      appendLinkedCitizenTimeline(
        db,
        wo.id,
        {
          timestamp: nowIso,
          status: "Process",
          actor: actor.name,
          note: `Teknisi tiba di lokasi tiang ${device.id} dan membuka panel kontrol untuk perbaikan (${wo.id}).`,
        },
        "Process"
      );
    } else if (input.action === "VERIFY") {
      const check = checkTelemetryRecoveryForDevice(device);
      if (!check.recovered) {
        throw new WorkOrderTransitionError(
          `Verifikasi telemetri pemulihan gagal pada ${device.id}: ${check.reasons.join("; ")}. Jalankan pemulihan telemetri normal terlebih dahulu.`,
          409,
          check.reasons
        );
      }
      nextStatus = "VERIFIED";
      verificationPassed = 1;
      const notes =
        input.technician_notes ??
        `${wo.technician_notes ? `${wo.technician_notes}\n` : ""}Telemetri pasca-perbaikan terverifikasi normal (BATT ${device.batt_v.toFixed(1)} V, EWMA Z ${device.ewma_z.toFixed(1)} W).`;

      db.prepare(
        `UPDATE work_orders SET status = ?, verification_passed = 1, technician_notes = ?, updated_at = ? WHERE id = ?`
      ).run(nextStatus, notes, nowIso, wo.id);

      db.prepare(`UPDATE devices SET maintenance_until = NULL WHERE id = ?`).run(device.id);
      if (wo.fault_event_id) {
        db.prepare(`UPDATE fault_events SET status = 'RESOLVED', resolved_at = ? WHERE id = ?`).run(
          nowIso,
          wo.fault_event_id
        );
      }
      appendLinkedCitizenTimeline(
        db,
        wo.id,
        {
          timestamp: nowIso,
          status: "Resolved",
          actor: "Verifikasi Telemetri Otomatis",
          note: `Perbaikan ${wo.id} pada tiang ${device.id} telah diverifikasi normal lewat telemetri 3-kanal.`,
        },
        "Resolved"
      );
    } else if (input.action === "CLOSE") {
      if (wo.verification_passed !== 1) {
        const check = checkTelemetryRecoveryForDevice(device);
        if (!check.recovered) {
          throw new WorkOrderTransitionError(
            `Work Order ${wo.id} tidak dapat ditutup sebelum verifikasi pemulihan telemetri terpenuhi: ${check.reasons.join("; ")}.`,
            409,
            check.reasons
          );
        }
        verificationPassed = 1;
      }
      nextStatus = "CLOSED";
      db.prepare(
        `UPDATE work_orders SET status = 'CLOSED', verification_passed = ?, technician_notes = ?, updated_at = ? WHERE id = ?`
      ).run(verificationPassed, input.technician_notes ?? wo.technician_notes, nowIso, wo.id);
      db.prepare(`UPDATE devices SET maintenance_until = NULL WHERE id = ?`).run(device.id);
      if (wo.fault_event_id) {
        db.prepare(`UPDATE fault_events SET status = 'RESOLVED', resolved_at = ? WHERE id = ?`).run(
          nowIso,
          wo.fault_event_id
        );
      }
      appendLinkedCitizenTimeline(
        db,
        wo.id,
        {
          timestamp: nowIso,
          status: "Resolved",
          actor: actor.name,
          note: `Tiket pemeliharaan ${wo.id} resmi ditutup.`,
        },
        "Resolved"
      );
    } else if (input.action === "UPDATE_NOTES") {
      db.prepare(`UPDATE work_orders SET technician_notes = ?, updated_at = ? WHERE id = ?`).run(
        input.technician_notes ?? wo.technician_notes,
        nowIso,
        wo.id
      );
    }

    appendAudit(db, {
      actorRole: actor.role,
      actorName: actor.name,
      action: `WORK_ORDER_${input.action}`,
      entityType: "work_order",
      entityId: wo.id,
      detail: {
        deviceId: wo.device_id,
        fromStatus: wo.status,
        toStatus: nextStatus,
        verificationPassed,
      },
      createdAt: nowIso,
    });
  });

  tx();
  return listWorkOrders(db, { deviceId: wo.device_id }).find((w) => w.id === wo.id)!;
}
