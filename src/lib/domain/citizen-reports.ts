import type Database from "better-sqlite3";
import { z } from "zod";
import { FAULT_TAXONOMY } from "../ai/contract";
import { appendAudit } from "../audit";
import { nextId } from "../db";
import type { CitizenReportRecord, CitizenTimelineEntry, DeviceRecord } from "../types";
import { haversineDistanceMeters, resolveDispatchUnit } from "./telemetry";

export interface EnrichedCitizenReport extends CitizenReportRecord {
  timeline: CitizenTimelineEntry[];
  matched_pole_label: string | null;
  matched_device_status: string | null;
  matched_fault_sub_code: string | null;
}

function hydrateReport(
  row: CitizenReportRecord & {
    matched_pole_label?: string | null;
    matched_device_status?: string | null;
    matched_fault_sub_code?: string | null;
  }
): EnrichedCitizenReport {
  return {
    ...row,
    timeline: JSON.parse(row.timeline_json) as CitizenTimelineEntry[],
    matched_pole_label: row.matched_pole_label ?? null,
    matched_device_status: row.matched_device_status ?? null,
    matched_fault_sub_code: row.matched_fault_sub_code ?? null,
  };
}

export function listCitizenReports(
  db: Database.Database,
  filters: { id?: string; phoneLast4?: string; status?: string } = {}
): EnrichedCitizenReport[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.id) {
    where.push("r.id = ?");
    params.push(filters.id.trim());
  }
  if (filters.phoneLast4) {
    where.push("r.phone_last4 = ?");
    params.push(filters.phoneLast4.trim());
  }
  if (filters.status && filters.status !== "ALL") {
    where.push("r.status = ?");
    params.push(filters.status);
  }

  const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT r.*, d.pole_label AS matched_pole_label, d.status AS matched_device_status, d.fault_sub_code AS matched_fault_sub_code
       FROM citizen_reports r
       LEFT JOIN devices d ON r.matched_device_id = d.id
       ${clause}
       ORDER BY r.created_at DESC`
    )
    .all(...params) as Array<
    CitizenReportRecord & {
      matched_pole_label: string | null;
      matched_device_status: string | null;
      matched_fault_sub_code: string | null;
    }
  >;

  return rows.map(hydrateReport);
}

export const SubmitCitizenReportZ = z.object({
  channel: z
    .enum(["Web ULAS", "Lapor Mas Wali (WA)", "Solo Destination", "SP4N LAPOR!"])
    .default("Web ULAS"),
  reporter_alias: z.string().min(2).max(64),
  phone_last4: z.string().regex(/^\d{4}$/, "Masukkan tepat 4 digit terakhir nomor HP"),
  corridor_name: z.string().min(2),
  description: z.string().min(8),
  lat: z.number().min(-9).max(-6),
  lng: z.number().min(109).max(113),
  follow_up_of: z.string().nullable().optional(),
  auto_create_work_order: z.boolean().default(true),
});

export function submitCitizenReport(
  db: Database.Database,
  rawInput: unknown,
  actor: { role: string; name: string } = { role: "WARGA_DEMO", name: "Kanal Simulasi Aduan" }
): {
  report: EnrichedCitizenReport;
  nearestDevice: DeviceRecord | null;
  distanceMeters: number | null;
  linkedWorkOrderId: string | null;
} {
  const input = SubmitCitizenReportZ.parse(rawInput);
  const nowIso = new Date().toISOString();
  const reportId = nextId(db, "CIT");

  const devices = db
    .prepare(
      `SELECT d.*, c.name AS corridor_name, c.kabupaten
       FROM devices d
       JOIN corridors c ON d.corridor_id = c.id`
    )
    .all() as DeviceRecord[];

  let nearestDevice: DeviceRecord | null = null;
  let minDistance = Infinity;
  for (const dev of devices) {
    const dist = haversineDistanceMeters(input.lat, input.lng, dev.lat, dev.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestDevice = dev;
    }
  }

  const matchedDevice = nearestDevice && minDistance <= 10000 ? nearestDevice : null;
  const distanceMeters = matchedDevice ? Math.round(minDistance) : null;

  const tx = db.transaction(() => {
    let linkedWorkOrderId: string | null = null;
    let initialStatus: "Open" | "Responded" | "Process" = "Open";
    const timeline: CitizenTimelineEntry[] = [
      {
        timestamp: nowIso,
        status: "Open",
        actor: input.channel,
        note: `Aduan demo diterima (${input.reporter_alias}): ${input.description}`,
      },
    ];

    if (matchedDevice) {
      const existingWo = db
        .prepare(
          `SELECT id, status FROM work_orders WHERE device_id = ? AND status NOT IN ('VERIFIED', 'CLOSED') ORDER BY created_at DESC LIMIT 1`
        )
        .get(matchedDevice.id) as { id: string; status: string } | undefined;

      if (existingWo) {
        linkedWorkOrderId = existingWo.id;
        initialStatus = existingWo.status === "IN_PROGRESS" ? "Process" : "Responded";
        timeline.push({
          timestamp: nowIso,
          status: initialStatus,
          actor: "Sistem Pencocokan Spasial REKASURYA",
          note: `Aduan otomatis ditautkan ke tiang ${matchedDevice.id} (${distanceMeters} m dari titik laporan) dan Work Order aktif ${existingWo.id} (${matchedDevice.fault_sub_code}).`,
        });
      } else if (input.auto_create_work_order) {
        linkedWorkOrderId = nextId(db, "WO", 4);
        initialStatus = "Responded";
        const dispatch = resolveDispatchUnit(matchedDevice.kabupaten ?? "Kota Surakarta");
        const slaDeadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
        const defaultParts = FAULT_TAXONOMY.F4_01_LED_OPEN_CIRCUIT.parts;

        db.prepare(
          `INSERT INTO work_orders (
            id, device_id, fault_event_id, citizen_report_id, priority, status,
            title, diagnosis_summary, assigned_team, truck_unit, parts_checklist_json,
            technician_notes, checkin_at, checkin_lat, checkin_lng, verification_passed,
            sla_deadline, created_at, updated_at
          ) VALUES (?, ?, NULL, ?, 'SEDANG', 'OPEN', ?, ?, ?, ?, ?, '', NULL, NULL, NULL, 0, ?, ?, ?)`
        ).run(
          linkedWorkOrderId,
          matchedDevice.id,
          reportId,
          `Pemeriksaan Aduan Warga (${reportId}) — ${matchedDevice.id}`,
          `Laporan warga (${input.channel}): "${input.description}". Status telemetri terkini tiang ${matchedDevice.id}: ${matchedDevice.status}.`,
          dispatch.team,
          dispatch.truck,
          JSON.stringify(defaultParts),
          slaDeadline,
          nowIso,
          nowIso
        );

        timeline.push({
          timestamp: nowIso,
          status: "Responded",
          actor: "Sistem Pencocokan Spasial REKASURYA",
          note: `Terhubung ke tiang terdekat ${matchedDevice.id} (${distanceMeters} m). Work Order inspeksi ${linkedWorkOrderId} diterbitkan.`,
        });
      }
    }

    const finalDescription = input.follow_up_of
      ? `FOLLOW UP ADUAN ${input.follow_up_of}: ${input.description}`
      : input.description;

    db.prepare(
      `INSERT INTO citizen_reports (
        id, channel, reporter_alias, phone_last4, category, corridor_name,
        description, lat, lng, matched_device_id, linked_work_order_id,
        status, follow_up_of, timeline_json, created_at
      ) VALUES (?, ?, ?, ?, 'Penerangan Jalan Umum (PJU)', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      reportId,
      input.channel,
      input.reporter_alias,
      input.phone_last4,
      input.corridor_name,
      finalDescription,
      input.lat,
      input.lng,
      matchedDevice?.id ?? null,
      linkedWorkOrderId,
      initialStatus,
      input.follow_up_of ?? null,
      JSON.stringify(timeline),
      nowIso
    );

    appendAudit(db, {
      actorRole: actor.role,
      actorName: actor.name,
      action: "CITIZEN_REPORT_SUBMITTED",
      entityType: "citizen_report",
      entityId: reportId,
      detail: {
        channel: input.channel,
        matchedDeviceId: matchedDevice?.id ?? null,
        distanceMeters,
        linkedWorkOrderId,
      },
      createdAt: nowIso,
    });

    const created = listCitizenReports(db, { id: reportId })[0];
    return {
      report: created,
      nearestDevice: matchedDevice,
      distanceMeters,
      linkedWorkOrderId,
    };
  });

  return tx();
}
