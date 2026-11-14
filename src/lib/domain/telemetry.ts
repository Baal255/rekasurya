import type Database from "better-sqlite3";
import {
  FAULT_TAXONOMY,
  TelemetryInferenceRequestZ,
  type TelemetryInferenceRequest,
  type TelemetryInferenceResponse,
} from "../ai/contract";
import { runAiInference } from "../ai/adapter";
import { appendAudit } from "../audit";
import { nextId } from "../db";
import { buildSimulatedTelemetryRequest, type SimulationScenarioId } from "../simulator/engine";
import type { DeviceRecord, DeviceStatus, FaultEventRecord, WorkOrderRecord } from "../types";

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveDispatchUnit(kabupaten: string): { team: string; truck: string } {
  const k = kabupaten.toLowerCase();
  if (k.includes("sukoharjo")) {
    return { team: "Regu PJU Dishub Sukoharjo", truck: "Sky-Lift SKH-01" };
  }
  if (k.includes("karanganyar")) {
    return { team: "Regu Pemeliharaan Karanganyar", truck: "Sky-Lift KRA-02" };
  }
  if (k.includes("klaten")) {
    return { team: "Regu PJU Dishub Klaten", truck: "Sky-Lift KLT-01" };
  }
  if (k.includes("sragen")) {
    return { team: "Tim Reaksi Cepat PJU Sragen", truck: "Patroli Pick-Up 01" };
  }
  return { team: "Regu PJU Dishub Surakarta", truck: "Sky-Lift SOL-01" };
}

function severityToPriority(
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
): "DARURAT" | "TINGGI" | "SEDANG" | "RENDAH" {
  switch (severity) {
    case "CRITICAL":
      return "DARURAT";
    case "HIGH":
      return "TINGGI";
    case "MEDIUM":
      return "SEDANG";
    default:
      return "RENDAH";
  }
}

function severityToSlaHours(severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"): number {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 12;
    case "MEDIUM":
      return 24;
    default:
      return 48;
  }
}

export function deriveDeviceStatus(result: TelemetryInferenceResponse): DeviceStatus {
  if (result.fault_family === "F6" || result.sub_code === "F2_03_BATT_SUDDEN_DISCONNECT") {
    return "TAMPER_CRITICAL";
  }
  if (result.fault_family === "F1" && result.severity === "MEDIUM") {
    return "WARNING_EWMA";
  }
  if (result.fault_family !== "NONE") {
    return "FAULT";
  }
  return "NORMAL";
}

export function isTechnicianAuthorized(device: DeviceRecord, atIso: string): boolean {
  if (!device.maintenance_until) return false;
  return new Date(device.maintenance_until).getTime() >= new Date(atIso).getTime();
}

export interface IngestTelemetryOptions {
  dataSource?: "SIMULATED" | "LIVE_MQTT";
  scenarioLabel?: string;
  actorRole?: string;
  actorName?: string;
  autoCreateWorkOrder?: boolean;
}

export interface IngestTelemetryResult {
  device: DeviceRecord;
  ai: TelemetryInferenceResponse;
  latencyMs: number;
  createdFault: FaultEventRecord | null;
  createdWorkOrder: WorkOrderRecord | null;
  verifiedWorkOrderIds: string[];
}

export async function ingestTelemetry(
  db: Database.Database,
  rawRequest: unknown,
  options: IngestTelemetryOptions = {}
): Promise<IngestTelemetryResult> {
  const req = TelemetryInferenceRequestZ.parse(rawRequest);
  const device = db
    .prepare(
      `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
       FROM devices d
       JOIN corridors c ON d.corridor_id = c.id
       WHERE d.id = ?`
    )
    .get(req.device_id) as DeviceRecord | undefined;

  if (!device) {
    throw new Error(`Perangkat ${req.device_id} tidak ditemukan dalam armada REKASURYA.`);
  }

  // Sinkronkan otorisasi teknisi berdasarkan status check-in Work Order aktif
  const authorized = req.context.technician_authorized || isTechnicianAuthorized(device, req.recorded_at);
  const effectiveRequest: TelemetryInferenceRequest = {
    ...req,
    context: {
      ...req.context,
      technician_authorized: authorized,
    },
  };

  const { result, latencyMs, inputHash } = await runAiInference(effectiveRequest);
  const nextStatus = deriveDeviceStatus(result);

  const pvP = Number((req.sensors.pv_v * req.sensors.pv_i).toFixed(2));
  const battP = Number((req.sensors.batt_v * req.sensors.batt_i).toFixed(2));
  const loadP = Number((req.sensors.load_v * req.sensors.load_i).toFixed(2));
  const onBackupCell = req.sensors.batt_v < 2.0 && req.sensors.backup_cell_v >= 3.2 ? 1 : 0;
  const dataSource = options.dataSource ?? "LIVE_MQTT";
  const scenarioLabel = options.scenarioLabel ?? (result.fault_family === "NONE" ? "NORMAL_CLEAR_DAY" : result.sub_code);

  const tx = db.transaction((): IngestTelemetryResult => {
    db.prepare(
      `UPDATE devices SET
        status = ?,
        fault_family = ?,
        fault_sub_code = ?,
        soc_pct = ?,
        soh_pct = ?,
        pv_v = ?,
        pv_i = ?,
        pv_p = ?,
        batt_v = ?,
        batt_i = ?,
        batt_p = ?,
        load_v = ?,
        load_i = ?,
        load_p = ?,
        temp_panel_c = ?,
        temp_batt_c = ?,
        temp_scc_c = ?,
        temp_driver_c = ?,
        temp_board_c = ?,
        lux = ?,
        pir_active = ?,
        pwm_duty = ?,
        door_open = ?,
        accel_g = ?,
        backup_cell_v = ?,
        on_backup_cell = ?,
        expected_p_chg = ?,
        residual_w = ?,
        ewma_z = ?,
        ewma_ucl = ?,
        ewma_lcl = ?,
        neighbor_z_median = ?,
        spatial_verdict = ?,
        active_scenario = ?,
        data_source = ?,
        last_seen_at = ?
      WHERE id = ?`
    ).run(
      nextStatus,
      result.fault_family,
      result.sub_code,
      req.sensors.soc_pct,
      req.sensors.soh_pct,
      req.sensors.pv_v,
      req.sensors.pv_i,
      pvP,
      req.sensors.batt_v,
      req.sensors.batt_i,
      battP,
      req.sensors.load_v,
      req.sensors.load_i,
      loadP,
      req.sensors.temp_panel_c,
      req.sensors.temp_batt_c,
      req.sensors.temp_scc_c,
      req.sensors.temp_driver_c,
      req.sensors.temp_board_c,
      req.sensors.lux,
      req.sensors.pir_active ? 1 : 0,
      req.sensors.pwm_duty,
      req.sensors.door_open ? 1 : 0,
      req.sensors.accel_g,
      req.sensors.backup_cell_v,
      onBackupCell,
      result.predicted_p_chg_w,
      result.residual_w,
      result.ewma_z,
      result.ewma_ucl,
      result.ewma_lcl,
      result.neighbor_z_median,
      result.spatial_verdict,
      scenarioLabel,
      dataSource,
      req.recorded_at,
      device.id
    );

    db.prepare(
      `INSERT INTO telemetry_history (
        device_id, recorded_at, pv_v, pv_i, pv_p, batt_v, batt_i, load_v, load_i, load_p,
        soc_pct, temp_panel_c, temp_batt_c, lux, pwm_duty, expected_p_chg, residual_w, ewma_z, data_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      device.id,
      req.recorded_at,
      req.sensors.pv_v,
      req.sensors.pv_i,
      pvP,
      req.sensors.batt_v,
      req.sensors.batt_i,
      req.sensors.load_v,
      req.sensors.load_i,
      loadP,
      req.sensors.soc_pct,
      req.sensors.temp_panel_c,
      req.sensors.temp_batt_c,
      req.sensors.lux,
      req.sensors.pwm_duty,
      result.predicted_p_chg_w,
      result.residual_w,
      result.ewma_z,
      dataSource
    );

    const aiId = nextId(db, "AI", 5);
    db.prepare(
      `INSERT INTO ai_invocations (
        id, device_id, schema_version, adapter_mode, model_version, input_hash,
        predicted_p_chg, residual_w, ewma_z, spatial_score, fault_family, sub_code,
        confidence, uncertainty, latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      aiId,
      device.id,
      result.schema_version,
      result.adapter_mode,
      result.model_version,
      inputHash,
      result.predicted_p_chg_w,
      result.residual_w,
      result.ewma_z,
      result.neighbor_z_median,
      result.fault_family,
      result.sub_code,
      result.confidence,
      result.uncertainty_band,
      latencyMs,
      req.recorded_at
    );

    let createdFault: FaultEventRecord | null = null;
    let createdWorkOrder: WorkOrderRecord | null = null;
    const verifiedWorkOrderIds: string[] = [];

    if (result.fault_family !== "NONE" && result.sub_code !== "OK") {
      const existingFault = db
        .prepare(
          `SELECT * FROM fault_events WHERE device_id = ? AND sub_code = ? AND status IN ('ACTIVE', 'ACKNOWLEDGED') LIMIT 1`
        )
        .get(device.id, result.sub_code) as FaultEventRecord | undefined;

      if (!existingFault) {
        const faultId = nextId(db, "FLT", 4);
        const taxonomy = FAULT_TAXONOMY[result.sub_code];
        const partsJson = JSON.stringify(result.recommended_parts.length > 0 ? result.recommended_parts : taxonomy.parts);
        const estLatencySec = result.fault_family === "F6" ? 7.8 : result.fault_family === "F1" ? 38.0 : 18.0;

        db.prepare(
          `INSERT INTO fault_events (
            id, device_id, fault_family, sub_code, severity, title, root_cause,
            recommended_parts_json, detection_latency_sec, confidence, ewma_z,
            spatial_verdict, status, detected_at, resolved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NULL)`
        ).run(
          faultId,
          device.id,
          result.fault_family,
          result.sub_code,
          result.severity,
          result.title,
          result.root_cause,
          partsJson,
          estLatencySec,
          result.confidence,
          result.ewma_z,
          result.spatial_verdict,
          req.recorded_at
        );
        createdFault = db.prepare(`SELECT * FROM fault_events WHERE id = ?`).get(faultId) as FaultEventRecord;

        if (options.autoCreateWorkOrder !== false) {
          const openWo = db
            .prepare(
              `SELECT id FROM work_orders WHERE device_id = ? AND status NOT IN ('VERIFIED', 'CLOSED') LIMIT 1`
            )
            .get(device.id) as { id: string } | undefined;

          if (!openWo) {
            const woId = nextId(db, "WO", 4);
            const dispatch = resolveDispatchUnit(device.kabupaten ?? "Kota Surakarta");
            const priority = severityToPriority(result.severity);
            const slaDeadline = new Date(
              new Date(req.recorded_at).getTime() + severityToSlaHours(result.severity) * 3600 * 1000
            ).toISOString();

            db.prepare(
              `INSERT INTO work_orders (
                id, device_id, fault_event_id, citizen_report_id, priority, status,
                title, diagnosis_summary, assigned_team, truck_unit, parts_checklist_json,
                technician_notes, checkin_at, checkin_lat, checkin_lng, verification_passed,
                sla_deadline, created_at, updated_at
              ) VALUES (?, ?, ?, NULL, ?, 'OPEN', ?, ?, ?, ?, ?, '', NULL, NULL, NULL, 0, ?, ?, ?)`
            ).run(
              woId,
              device.id,
              faultId,
              priority,
              `${result.title} — ${device.id}`,
              result.root_cause,
              dispatch.team,
              dispatch.truck,
              partsJson,
              slaDeadline,
              req.recorded_at,
              req.recorded_at
            );
            createdWorkOrder = db.prepare(`SELECT * FROM work_orders WHERE id = ?`).get(woId) as WorkOrderRecord;
          }
        }

        appendAudit(db, {
          actorRole: options.actorRole ?? "SYSTEM_EDGE_AI",
          actorName: options.actorName ?? "REKASURYA Telemetry Engine",
          action: "FAULT_DETECTED",
          entityType: "device",
          entityId: device.id,
          detail: {
            faultId,
            workOrderId: createdWorkOrder?.id ?? null,
            subCode: result.sub_code,
            ewmaZ: result.ewma_z,
            spatialVerdict: result.spatial_verdict,
            dataSource,
          },
          createdAt: req.recorded_at,
        });
      }
    } else {
      // Telemetri normal: tandai kesiapan verifikasi pada WO IN_PROGRESS dan selesaikan fault aktif bila bukan simulasi cuaca
      const activeFaults = db
        .prepare(`SELECT id FROM fault_events WHERE device_id = ? AND status IN ('ACTIVE', 'ACKNOWLEDGED')`)
        .all(device.id) as Array<{ id: string }>;

      if (activeFaults.length > 0 && result.spatial_verdict !== "CUACA_SERUAS") {
        db.prepare(
          `UPDATE fault_events SET status = 'RESOLVED', resolved_at = ? WHERE device_id = ? AND status IN ('ACTIVE', 'ACKNOWLEDGED')`
        ).run(req.recorded_at, device.id);
      }

      const inProgressWos = db
        .prepare(`SELECT id FROM work_orders WHERE device_id = ? AND status IN ('IN_PROGRESS', 'ASSIGNED', 'OPEN')`)
        .all(device.id) as Array<{ id: string }>;

      for (const wo of inProgressWos) {
        db.prepare(`UPDATE work_orders SET verification_passed = 1, updated_at = ? WHERE id = ?`).run(
          req.recorded_at,
          wo.id
        );
        verifiedWorkOrderIds.push(wo.id);
      }

      if (result.spatial_verdict === "CUACA_SERUAS" || options.scenarioLabel === "NORMAL_CLEAR_DAY") {
        appendAudit(db, {
          actorRole: options.actorRole ?? "OPERATOR_DISHUB",
          actorName: options.actorName ?? "REKASURYA Simulator",
          action: result.spatial_verdict === "CUACA_SERUAS" ? "WEATHER_CORRELATION_CONFIRMED" : "TELEMETRY_RECOVERED",
          entityType: "device",
          entityId: device.id,
          detail: {
            ewmaZ: result.ewma_z,
            neighborMedian: result.neighbor_z_median,
            spatialVerdict: result.spatial_verdict,
            verifiedWorkOrderIds,
          },
          createdAt: req.recorded_at,
        });
      }
    }

    const updatedDevice = db
      .prepare(
        `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
         FROM devices d
         JOIN corridors c ON d.corridor_id = c.id
         WHERE d.id = ?`
      )
      .get(device.id) as DeviceRecord;

    return {
      device: updatedDevice,
      ai: result,
      latencyMs,
      createdFault,
      createdWorkOrder,
      verifiedWorkOrderIds,
    };
  });

  return tx();
}

export async function injectSimulationScenario(
  db: Database.Database,
  params: {
    deviceId: string;
    scenario: SimulationScenarioId;
    actorRole?: string;
    actorName?: string;
  }
): Promise<IngestTelemetryResult & { requestPayload: TelemetryInferenceRequest }> {
  const device = db
    .prepare(
      `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
       FROM devices d
       JOIN corridors c ON d.corridor_id = c.id
       WHERE d.id = ?`
    )
    .get(params.deviceId) as DeviceRecord | undefined;

  if (!device) {
    throw new Error(`Tiang ${params.deviceId} tidak ditemukan.`);
  }

  const neighborRows = db
    .prepare(
      `SELECT id AS device_id, ewma_z, pv_p AS pv_power_w, lux
       FROM devices
       WHERE corridor_id = ? AND id != ?`
    )
    .all(device.corridor_id, device.id) as Array<{
    device_id: string;
    ewma_z: number;
    pv_power_w: number;
    lux: number;
  }>;

  const { request, overrideNeighborsEwmaZ } = buildSimulatedTelemetryRequest({
    device,
    scenario: params.scenario,
    corridorNeighbors: neighborRows,
  });

  if (typeof overrideNeighborsEwmaZ === "number") {
    db.prepare(
      `UPDATE devices SET ewma_z = ?, spatial_verdict = 'CUACA_SERUAS', neighbor_z_median = ? WHERE corridor_id = ? AND id != ?`
    ).run(overrideNeighborsEwmaZ, overrideNeighborsEwmaZ, device.corridor_id, device.id);
  } else {
    db.prepare(
      `UPDATE devices SET ewma_z = -1.2, spatial_verdict = 'NORMAL' WHERE corridor_id = ? AND id != ? AND status = 'NORMAL'`
    ).run(device.corridor_id, device.id);
  }

  const ingested = await ingestTelemetry(db, request, {
    dataSource: "SIMULATED",
    scenarioLabel: params.scenario,
    actorRole: params.actorRole ?? "OPERATOR_DISHUB",
    actorName: params.actorName ?? "Simulasi Lab REKASURYA",
    autoCreateWorkOrder: true,
  });

  return {
    ...ingested,
    requestPayload: request,
  };
}
