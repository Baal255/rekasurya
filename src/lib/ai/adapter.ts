import crypto from "node:crypto";
import {
  AI_CONTRACT_VERSION,
  FAULT_TAXONOMY,
  TelemetryInferenceRequest,
  TelemetryInferenceResponse,
  TelemetryInferenceResponseZ,
} from "./contract";

const EWMA_LAMBDA = 0.2;
const EWMA_L_SIGMA = 3.0;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeExpectedChargePowerW(params: {
  nominalPvWp: number;
  lux: number;
  tempPanelC: number;
  socPct: number;
}): number {
  if (params.lux < 1500) return 0;
  const irradianceRatio = Math.min(1.15, Math.max(0, params.lux / 100000));
  const tempDerate = 1 - 0.004 * Math.max(0, params.tempPanelC - 25);
  let socTaper = 1.0;
  if (params.socPct > 90) {
    socTaper = Math.min(1, Math.max(0.08, (100 - params.socPct) / 10));
  }
  const mpptEfficiency = 0.94;
  return Number((params.nominalPvWp * irradianceRatio * tempDerate * socTaper * mpptEfficiency).toFixed(2));
}

export function computeSafeAdaptivePwm(params: {
  lux: number;
  battV: number;
  nominalBattV: number;
  socPct: number;
  pirActive: boolean;
  tempDriverC: number;
}): number {
  if (params.lux >= 120) return 0;
  const uvloCutoff = params.nominalBattV > 18 ? 22.0 : 11.0;
  if (params.battV <= uvloCutoff) return 0;

  let duty = 45;
  if (params.socPct < 30) {
    duty = params.pirActive ? 75 : 25;
  } else if (params.socPct < 55) {
    duty = params.pirActive ? 90 : 35;
  } else {
    duty = params.pirActive ? 100 : 45;
  }
  if (params.tempDriverC >= 70) {
    duty = Math.min(duty, 50);
  }
  return Math.max(25, Math.min(100, Math.round(duty)));
}

export function runDeterministicEwmaInference(
  req: TelemetryInferenceRequest,
  mode: "MOCK_EWMA_DETERMINISTIC" | "FALLBACK_LOCAL" = "MOCK_EWMA_DETERMINISTIC"
): TelemetryInferenceResponse {
  const { sensors, profile, context } = req;
  const pvPowerW = sensors.pv_v * sensors.pv_i;
  const loadPowerW = sensors.load_v * sensors.load_i;
  const expectedP = computeExpectedChargePowerW({
    nominalPvWp: profile.nominal_pv_wp,
    lux: sensors.lux,
    tempPanelC: sensors.temp_panel_c,
    socPct: sensors.soc_pct,
  });

  const residualW = sensors.lux >= 1500 ? Number((pvPowerW - expectedP).toFixed(2)) : 0;
  const sigmaRef = Math.max(6.5, 0.045 * profile.nominal_pv_wp);
  const asymptoteSigma = sigmaRef * Math.sqrt(EWMA_LAMBDA / (2 - EWMA_LAMBDA));
  const ewmaZ =
    sensors.lux >= 1500
      ? Number((EWMA_LAMBDA * residualW + (1 - EWMA_LAMBDA) * context.prev_ewma_z).toFixed(2))
      : Number((0.92 * context.prev_ewma_z).toFixed(2));
  const ucl = Number((EWMA_L_SIGMA * asymptoteSigma).toFixed(2));
  const lcl = Number((-EWMA_L_SIGMA * asymptoteSigma).toFixed(2));

  const neighborZs = context.corridor_neighbors.map((n) => n.ewma_z);
  const neighborZMedian = Number(median(neighborZs).toFixed(2));

  // Korelasi antartiang seruas: membedakan mendung lokal seruas vs kerusakan 1 tiang
  let spatialVerdict: "NORMAL" | "CUACA_SERUAS" | "ANOMALI_LOKAL" = "NORMAL";
  if (ewmaZ < lcl) {
    if (context.corridor_neighbors.length >= 2 && neighborZMedian < lcl * 0.75) {
      spatialVerdict = "CUACA_SERUAS";
    } else {
      spatialVerdict = "ANOMALI_LOKAL";
    }
  }

  let subCode: keyof typeof FAULT_TAXONOMY = "OK";
  let rootCause = "Seluruh parameter daya PV, baterai LiFePO4, SCC, driver LED, dan geofence berada pada batas operasi normal.";
  let confidence = 0.96;

  const onBackupCell = sensors.batt_v < 3.0 && sensors.backup_cell_v >= 3.2;
  const uvloThreshold = profile.nominal_batt_v > 18 ? 22.0 : 11.0;

  // Prioritas 1: Antipencurian & Keamanan Fisik (F6)
  if (onBackupCell || (sensors.batt_v < 3.0 && sensors.door_open)) {
    if (!context.technician_authorized) {
      subCode = "F6_02_CABLE_BATT_THEFT";
      rootCause = `Tegangan bus baterai turun ke ${sensors.batt_v.toFixed(1)} V sementara modul tetap hidup melalui sel cadangan 18650 (${sensors.backup_cell_v.toFixed(2)} V).`;
      confidence = 0.99;
    }
  } else if (sensors.geofence_drift_m > profile.geofence_radius_m && !context.technician_authorized) {
    subCode = "F6_03_GEOFENCE_DISPLACEMENT";
    rootCause = `Posisi GNSS bergeser ${sensors.geofence_drift_m.toFixed(1)} m dari titik referensi terdaftar (batas ${profile.geofence_radius_m} m).`;
    confidence = 0.97;
  } else if ((sensors.door_open || sensors.accel_g >= 2.2) && !context.technician_authorized) {
    subCode = "F6_01_DOOR_FORCED_OPEN";
    rootCause = `Sakelar pintu kotak IP65 ${sensors.door_open ? "terbuka" : "tertutup"} dengan puncak getaran LIS3DH ${sensors.accel_g.toFixed(2)} g tanpa sesi Work Order teknisi.`;
    confidence = sensors.door_open && sensors.accel_g >= 1.8 ? 0.98 : 0.9;
  }
  // Prioritas 2: Termal (F5)
  else if (sensors.temp_batt_c >= 50) {
    subCode = "F5_01_BATT_OVERHEAT";
    rootCause = `Sensor NTC baterai membaca ${sensors.temp_batt_c.toFixed(1)} °C (>= 50 °C). Risiko degradasi sel LiFePO4.`;
    confidence = 0.96;
  } else if (sensors.temp_scc_c >= 75 || sensors.temp_board_c >= 75) {
    subCode = "F5_02_CONTROLLER_OVERHEAT";
    rootCause = `Suhu SCC (${sensors.temp_scc_c.toFixed(1)} °C) atau board LM75B (${sensors.temp_board_c.toFixed(1)} °C) melebihi ambang 75 °C.`;
    confidence = 0.95;
  }
  // Prioritas 3: Pengisian Siang Hari (F1, F3, F4 siang)
  else if (sensors.lux >= 8000) {
    if (sensors.pv_v < 4.0 && sensors.lux > 15000) {
      subCode = "F1_02_PV_OPEN_CIRCUIT";
      rootCause = `Cahaya ${Math.round(sensors.lux)} lux tetapi tegangan PV hanya ${sensors.pv_v.toFixed(1)} V (rangkaian panel/konektor MC4 putus).`;
      confidence = 0.96;
    } else if (sensors.pv_v > profile.nominal_batt_v * 1.15 && sensors.pv_i < 0.15 && sensors.soc_pct < 88) {
      subCode = "F3_01_SCC_CHARGE_FAIL";
      rootCause = `Tegangan PV terukur ${sensors.pv_v.toFixed(1)} V namun arus pengisian menuju baterai ${sensors.pv_i.toFixed(2)} A pada SoC ${sensors.soc_pct.toFixed(0)}%.`;
      confidence = 0.93;
    } else if (sensors.load_i > 0.25) {
      subCode = "F4_03_DAYLIGHT_RELAY_STUCK";
      rootCause = `Arus beban LED ${sensors.load_i.toFixed(2)} A tetap mengalir pada siang hari (${Math.round(sensors.lux)} lux).`;
      confidence = 0.94;
    } else if (spatialVerdict === "ANOMALI_LOKAL" && sensors.soc_pct < 90) {
      subCode = "F1_01_PV_SOILING_SHADING";
      rootCause = `Residu EWMA Z=${ewmaZ.toFixed(1)} W melampaui batas kendali bawah (${lcl.toFixed(1)} W) sementara median tetangga seruas normal (Z=${neighborZMedian.toFixed(1)} W).`;
      confidence = 0.91;
    } else if (spatialVerdict === "CUACA_SERUAS") {
      rootCause = `Penurunan daya pengisian serentak teramati pada seluruh tiang koridor (median tetangga Z=${neighborZMedian.toFixed(1)} W); diidentifikasi sebagai faktor mendung lokal, bukan kerusakan tiang.`;
      confidence = 0.89;
    }
  }
  // Prioritas 4: Operasi Malam Hari (F4, F2, F3)
  else if (sensors.lux < 100) {
    if (sensors.batt_v <= uvloThreshold) {
      subCode = "F2_02_BATT_UVLO_LOCKOUT";
      rootCause = `Tegangan baterai ${sensors.batt_v.toFixed(1)} V menyentuh batas UVLO (${uvloThreshold} V). Board memasuki deep sleep pelindung.`;
      confidence = 0.98;
    } else if (sensors.pwm_duty >= 20 && sensors.load_v > 8.0 && sensors.load_i < 0.08) {
      subCode = "F4_01_LED_OPEN_CIRCUIT";
      rootCause = `PWM dimming aktif (${sensors.pwm_duty}%) dan tegangan LOAD ${sensors.load_v.toFixed(1)} V tersedia, tetapi arus LED ${sensors.load_i.toFixed(2)} A (driver Buck CC-CV atau luminer putus).`;
      confidence = 0.95;
    } else if (sensors.pwm_duty >= 20 && sensors.load_v < 3.0 && sensors.soc_pct > 35) {
      subCode = "F3_02_SCC_LVD_CUTOFF";
      rootCause = `SoC baterai masih ${sensors.soc_pct.toFixed(0)}%, tetapi keluaran LOAD SCC terputus (${sensors.load_v.toFixed(1)} V).`;
      confidence = 0.9;
    } else if (loadPowerW > profile.nominal_led_w * 1.45) {
      subCode = "F4_02_LED_OVERCURRENT_SHORT";
      rootCause = `Daya beban terukur ${loadPowerW.toFixed(1)} W jauh melampaui nominal ${profile.nominal_led_w} W.`;
      confidence = 0.92;
    }
  }

  // Prioritas 5: Degradasi SoH
  if (subCode === "OK" && sensors.soh_pct < 78) {
    subCode = "F2_01_BATT_SOH_DEGRADATION";
    rootCause = `Estimasi State of Health (SoH) baterai ${sensors.soh_pct.toFixed(1)}% berada di bawah ambang kelayakan 78%.`;
    confidence = 0.88;
  }

  const meta = FAULT_TAXONOMY[subCode];
  const recommendedPwm = computeSafeAdaptivePwm({
    lux: sensors.lux,
    battV: sensors.batt_v,
    nominalBattV: profile.nominal_batt_v,
    socPct: sensors.soc_pct,
    pirActive: sensors.pir_active,
    tempDriverC: sensors.temp_driver_c,
  });

  const uncertainty = Number((1 - confidence).toFixed(3));

  const response: TelemetryInferenceResponse = {
    schema_version: AI_CONTRACT_VERSION,
    adapter_mode: mode,
    model_version: "rekasurya-ewma-physics-baseline-v1.0",
    is_simulated_poc: true,
    fallback_used: mode === "FALLBACK_LOCAL",
    predicted_p_chg_w: expectedP,
    residual_w: residualW,
    ewma_z: ewmaZ,
    ewma_ucl: ucl,
    ewma_lcl: lcl,
    neighbor_z_median: neighborZMedian,
    spatial_verdict: spatialVerdict,
    fault_family: meta.family,
    sub_code: subCode,
    severity: meta.severity,
    title: meta.title,
    root_cause: rootCause,
    confidence,
    uncertainty_band: uncertainty,
    recommended_pwm_duty: recommendedPwm,
    recommended_parts: meta.parts,
  };

  return TelemetryInferenceResponseZ.parse(response);
}

export async function runAiInference(
  req: TelemetryInferenceRequest
): Promise<{ result: TelemetryInferenceResponse; latencyMs: number; inputHash: string }> {
  const start = Date.now();
  const inputHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(req))
    .digest("hex")
    .slice(0, 16);

  const externalUrl = process.env.REKASURYA_DEMO_ONLY === "1"
    ? undefined
    : process.env.REKASURYA_AI_SERVICE_URL;
  if (externalUrl && externalUrl.trim().length > 0) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${externalUrl.replace(/\/$/, "")}/infer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const rawJson = await res.json();
        const parsed = TelemetryInferenceResponseZ.parse(rawJson);
        return {
          result: parsed,
          latencyMs: Math.max(1, Date.now() - start),
          inputHash,
        };
      }
    } catch {
      // Fail-safe fallback ke adaptor deterministik lokal
      const fallback = runDeterministicEwmaInference(req, "FALLBACK_LOCAL");
      return {
        result: fallback,
        latencyMs: Math.max(1, Date.now() - start),
        inputHash,
      };
    }
  }

  const simulated = runDeterministicEwmaInference(req, "MOCK_EWMA_DETERMINISTIC");
  return {
    result: simulated,
    latencyMs: Math.max(1, Date.now() - start),
    inputHash,
  };
}
