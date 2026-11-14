import { AI_CONTRACT_VERSION, FAULT_TAXONOMY, type TelemetryInferenceRequest } from "@/lib/ai/contract";
import { handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import type { AiInvocationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const SAMPLE_REQUEST: TelemetryInferenceRequest = {
  schema_version: AI_CONTRACT_VERSION,
  device_id: "KRA-042",
  recorded_at: "2026-11-14T11:30:00.000Z",
  profile: {
    nominal_pv_wp: 300,
    nominal_batt_v: 25.6,
    nominal_batt_ah: 40,
    nominal_led_w: 40,
    geofence_radius_m: 15,
  },
  sensors: {
    pv_v: 36.2,
    pv_i: 2.32,
    batt_v: 26.5,
    batt_i: 3.15,
    load_v: 24.8,
    load_i: 0,
    soc_pct: 64,
    soh_pct: 95,
    temp_panel_c: 44.5,
    temp_batt_c: 32.1,
    temp_scc_c: 35.8,
    temp_driver_c: 30.2,
    temp_board_c: 33.4,
    lux: 78500,
    pir_active: false,
    pwm_duty: 0,
    door_open: false,
    accel_g: 1.0,
    backup_cell_v: 4.08,
    geofence_drift_m: 1.2,
  },
  context: {
    prev_ewma_z: -52.1,
    technician_authorized: false,
    corridor_neighbors: [
      { device_id: "KRA-041", ewma_z: -1.4, pv_power_w: 196.2, lux: 79000 },
      { device_id: "KRA-043", ewma_z: 0.9, pv_power_w: 201.5, lux: 78200 },
    ],
  },
};

export async function GET() {
  try {
    const db = getDb();
    const invocations = db
      .prepare(`SELECT * FROM ai_invocations ORDER BY created_at DESC LIMIT 25`)
      .all() as AiInvocationRecord[];

    return jsonOk({
      contractVersion: AI_CONTRACT_VERSION,
      adapterMode: process.env.REKASURYA_AI_SERVICE_URL
        ? "EXTERNAL_POC_ASTRA"
        : "MOCK_EWMA_DETERMINISTIC",
      isSimulatedPoc: !process.env.REKASURYA_AI_SERVICE_URL,
      externalEndpointConfigured: Boolean(process.env.REKASURYA_AI_SERVICE_URL),
      honestyNotice:
        "Adaptor AI saat ini menjalankan model deterministik EWMA & fisika panel/baterai sesuai kontrak JSON v1.0.0, menunggu endpoint PoC Python tim AI (GPT Astra).",
      sampleRequest: SAMPLE_REQUEST,
      faultTaxonomy: FAULT_TAXONOMY,
      recentInvocations: invocations,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
