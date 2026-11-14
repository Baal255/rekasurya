import { z } from "zod";
import type { SparePartRecommendation } from "../types";

export const AI_CONTRACT_VERSION = "1.0.0";

export const FaultFamilyEnum = z.enum(["NONE", "F1", "F2", "F3", "F4", "F5", "F6"]);

export const SubCodeEnum = z.enum([
  "OK",
  "F1_01_PV_SOILING_SHADING",
  "F1_02_PV_OPEN_CIRCUIT",
  "F1_03_PV_UNDERPERFORM_CELL",
  "F2_01_BATT_SOH_DEGRADATION",
  "F2_02_BATT_UVLO_LOCKOUT",
  "F2_03_BATT_SUDDEN_DISCONNECT",
  "F3_01_SCC_CHARGE_FAIL",
  "F3_02_SCC_LVD_CUTOFF",
  "F4_01_LED_OPEN_CIRCUIT",
  "F4_02_LED_OVERCURRENT_SHORT",
  "F4_03_DAYLIGHT_RELAY_STUCK",
  "F5_01_BATT_OVERHEAT",
  "F5_02_CONTROLLER_OVERHEAT",
  "F6_01_DOOR_FORCED_OPEN",
  "F6_02_CABLE_BATT_THEFT",
  "F6_03_GEOFENCE_DISPLACEMENT",
]);

export const CorridorNeighborReadingZ = z.object({
  device_id: z.string(),
  ewma_z: z.number(),
  pv_power_w: z.number(),
  lux: z.number(),
});

export const TelemetryInferenceRequestZ = z
  .object({
    schema_version: z.literal(AI_CONTRACT_VERSION),
    device_id: z.string().min(2),
    recorded_at: z.string(),
    profile: z.object({
      nominal_pv_wp: z.number().positive(),
      nominal_batt_v: z.number().positive(),
      nominal_batt_ah: z.number().positive(),
      nominal_led_w: z.number().positive(),
      geofence_radius_m: z.number().positive(),
    }),
    sensors: z.object({
      pv_v: z.number().min(0).max(95),
      pv_i: z.number().min(0).max(30),
      batt_v: z.number().min(0).max(65),
      batt_i: z.number().min(-30).max(35),
      load_v: z.number().min(0).max(65),
      load_i: z.number().min(0).max(20),
      soc_pct: z.number().min(0).max(100),
      soh_pct: z.number().min(0).max(100),
      temp_panel_c: z.number().min(-20).max(120),
      temp_batt_c: z.number().min(-20).max(120),
      temp_scc_c: z.number().min(-20).max(120),
      temp_driver_c: z.number().min(-20).max(120),
      temp_board_c: z.number().min(-20).max(120),
      lux: z.number().min(0).max(150000),
      pir_active: z.boolean(),
      pwm_duty: z.number().int().min(0).max(100),
      door_open: z.boolean(),
      accel_g: z.number().min(0).max(16),
      backup_cell_v: z.number().min(0).max(4.5),
      geofence_drift_m: z.number().min(0),
    }),
    context: z.object({
      prev_ewma_z: z.number(),
      technician_authorized: z.boolean(),
      corridor_neighbors: z.array(CorridorNeighborReadingZ),
    }),
  })
  .strict();

export type TelemetryInferenceRequest = z.infer<typeof TelemetryInferenceRequestZ>;

export const SparePartZ = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unit: z.string(),
  estimatedIdr: z.number().nonnegative(),
  notes: z.string(),
});

export const TelemetryInferenceResponseZ = z
  .object({
    schema_version: z.literal(AI_CONTRACT_VERSION),
    adapter_mode: z.enum(["MOCK_EWMA_DETERMINISTIC", "EXTERNAL_POC_ASTRA", "FALLBACK_LOCAL"]),
    model_version: z.string(),
    is_simulated_poc: z.boolean(),
    fallback_used: z.boolean(),
    predicted_p_chg_w: z.number(),
    residual_w: z.number(),
    ewma_z: z.number(),
    ewma_ucl: z.number(),
    ewma_lcl: z.number(),
    neighbor_z_median: z.number(),
    spatial_verdict: z.enum(["NORMAL", "CUACA_SERUAS", "ANOMALI_LOKAL"]),
    fault_family: FaultFamilyEnum,
    sub_code: SubCodeEnum,
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    title: z.string(),
    root_cause: z.string(),
    confidence: z.number().min(0).max(1),
    uncertainty_band: z.number().min(0).max(1),
    recommended_pwm_duty: z.number().int().min(0).max(100),
    recommended_parts: z.array(SparePartZ),
  })
  .strict();

export type TelemetryInferenceResponse = z.infer<typeof TelemetryInferenceResponseZ>;

export const FAULT_TAXONOMY: Record<
  z.infer<typeof SubCodeEnum>,
  {
    family: z.infer<typeof FaultFamilyEnum>;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    parts: SparePartRecommendation[];
  }
> = {
  OK: {
    family: "NONE",
    severity: "LOW",
    title: "Operasi Normal",
    parts: [],
  },
  F1_01_PV_SOILING_SHADING: {
    family: "F1",
    severity: "MEDIUM",
    title: "Panel Surya Kotor / Terteduh Lokal",
    parts: [
      {
        sku: "MNT-PV-CLN",
        name: "Kit Pembersih Panel & Air Deionisasi",
        quantity: 1,
        unit: "set",
        estimatedIdr: 45000,
        notes: "Bersihkan permukaan kaca panel & pangkas dahan peneduh",
      },
    ],
  },
  F1_02_PV_OPEN_CIRCUIT: {
    family: "F1",
    severity: "HIGH",
    title: "Kabel / Konektor Panel Surya Putus",
    parts: [
      {
        sku: "CON-MC4-PR",
        name: "Pasangan Konektor MC4 Waterproof + Sekring PV 15A",
        quantity: 2,
        unit: "pasang",
        estimatedIdr: 85000,
        notes: "Periksa jalur PV+ / PV- menuju kotak IP65 dan sekring kanal PV",
      },
      {
        sku: "CBL-PV-4MM",
        name: "Kabel PV NYAF / Solar 4 mm2 (5 m)",
        quantity: 1,
        unit: "gulung",
        estimatedIdr: 110000,
        notes: "Penggantian bila konduktor putus atau teroksidasi",
      },
    ],
  },
  F1_03_PV_UNDERPERFORM_CELL: {
    family: "F1",
    severity: "HIGH",
    title: "Degradasi Sel / Dioda Bypass Panel 300 Wp",
    parts: [
      {
        sku: "PV-MONO-300",
        name: "Modul Panel Surya Monokristal 300 Wp",
        quantity: 1,
        unit: "unit",
        estimatedIdr: 1350000,
        notes: "Bawa unit pengganti bila hotspot/delaminasi terkonfirmasi",
      },
    ],
  },
  F2_01_BATT_SOH_DEGRADATION: {
    family: "F2",
    severity: "HIGH",
    title: "Degradasi Kapasitas Baterai LiFePO4 (SoH Menurun)",
    parts: [
      {
        sku: "BAT-LFP-256-40",
        name: "Baterai Pack LiFePO4 25,6 V 40 Ah + BMS",
        quantity: 1,
        unit: "pack",
        estimatedIdr: 2250000,
        notes: "Prioritaskan klaim garansi bila usia < 5 tahun (data log tersedia)",
      },
    ],
  },
  F2_02_BATT_UVLO_LOCKOUT: {
    family: "F2",
    severity: "HIGH",
    title: "Baterai Mencapai Batas UVLO (<= 22 V)",
    parts: [
      {
        sku: "BAT-LFP-256-40",
        name: "Baterai LiFePO4 25,6 V 40 Ah Cadangan + Charger Lapangan",
        quantity: 1,
        unit: "pack",
        estimatedIdr: 2250000,
        notes: "Periksa apakah pengisian PV terhambat beberapa hari berturut-turut",
      },
    ],
  },
  F2_03_BATT_SUDDEN_DISCONNECT: {
    family: "F2",
    severity: "CRITICAL",
    title: "BMS Cutoff / Terminal Baterai Lepas",
    parts: [
      {
        sku: "BMS-8S-30A",
        name: "Modul BMS LiFePO4 8S + Skun Terminal Baterai",
        quantity: 1,
        unit: "set",
        estimatedIdr: 240000,
        notes: "Periksa proteksi BMS dan kekencangan baut terminal BATT",
      },
    ],
  },
  F3_01_SCC_CHARGE_FAIL: {
    family: "F3",
    severity: "HIGH",
    title: "Kegagalan Konversi SCC MPPT",
    parts: [
      {
        sku: "SCC-MPPT-24V",
        name: "Solar Charge Controller MPPT 24V 20A (Input >=100V)",
        quantity: 1,
        unit: "unit",
        estimatedIdr: 480000,
        notes: "Tegangan PV normal namun arus pengisian menuju baterai nol",
      },
    ],
  },
  F3_02_SCC_LVD_CUTOFF: {
    family: "F3",
    severity: "MEDIUM",
    title: "SCC Memutus Jalur Beban (LVD Aktif)",
    parts: [
      {
        sku: "SCC-MPPT-24V",
        name: "SCC MPPT Cadangan & Multimeter Diagnosa",
        quantity: 1,
        unit: "unit",
        estimatedIdr: 480000,
        notes: "Verifikasi keselarasan LVD SCC vs SoC baterai sesungguhnya",
      },
    ],
  },
  F4_01_LED_OPEN_CIRCUIT: {
    family: "F4",
    severity: "HIGH",
    title: "Putus Rangkaian Lampu / Driver Buck CC-CV",
    parts: [
      {
        sku: "DRV-CCCV-300W",
        name: "Modul Driver Buck CC-CV Eksternal (6-40V, CC 2A)",
        quantity: 1,
        unit: "unit",
        estimatedIdr: 145000,
        notes: "Arus beban 0 A pada malam hari saat PWM dimming aktif",
      },
      {
        sku: "LED-DC-40W",
        name: "Armatur Luminer LED DC 40 W (>=130 lm/W)",
        quantity: 1,
        unit: "unit",
        estimatedIdr: 420000,
        notes: "Siapkan unit luminer bila modul LED atas yang putus",
      },
    ],
  },
  F4_02_LED_OVERCURRENT_SHORT: {
    family: "F4",
    severity: "CRITICAL",
    title: "Arus Berlebih / Hubung Singkat Driver LED",
    parts: [
      {
        sku: "DRV-CCCV-300W",
        name: "Modul Driver Buck CC-CV + Sekring Kanal Load 5A",
        quantity: 1,
        unit: "set",
        estimatedIdr: 165000,
        notes: "Periksa isolasi kabel tiang menuju armatur atas",
      },
    ],
  },
  F4_03_DAYLIGHT_RELAY_STUCK: {
    family: "F4",
    severity: "MEDIUM",
    title: "Lampu Menyala Siang Hari (MOSFET/PC817 Terkunci)",
    parts: [
      {
        sku: "PCB-REKA-V2",
        name: "Modul Optocoupler PC817 / Board Kendali REKASURYA",
        quantity: 1,
        unit: "unit",
        estimatedIdr: 320000,
        notes: "Mencegah pengurasan baterai sia-sia di siang hari",
      },
    ],
  },
  F5_01_BATT_OVERHEAT: {
    family: "F5",
    severity: "CRITICAL",
    title: "Suhu Berlebih Pack Baterai (>= 50 C)",
    parts: [
      {
        sku: "ENCL-VENT-IP65",
        name: "Kit Ventilasi IP65 + Pelindung Termal Kotak Baterai",
        quantity: 1,
        unit: "set",
        estimatedIdr: 180000,
        notes: "Periksa ventilasi kotak, potensi sel menggelembung, dan sensor NTC",
      },
    ],
  },
  F5_02_CONTROLLER_OVERHEAT: {
    family: "F5",
    severity: "HIGH",
    title: "Suhu Berlebih SCC / Driver / Board Kendali",
    parts: [
      {
        sku: "HSK-PAD-THRM",
        name: "Thermal Pad + Heatsink SCC/Buck CC-CV",
        quantity: 1,
        unit: "set",
        estimatedIdr: 95000,
        notes: "Sistem menurunkan PWM (derating); cek aliran udara panel box",
      },
    ],
  },
  F6_01_DOOR_FORCED_OPEN: {
    family: "F6",
    severity: "CRITICAL",
    title: "DARURAT: Kotak Panel Dibuka Paksa (Tanpa Sesi Teknisi)",
    parts: [
      {
        sku: "SEC-LOCK-DIN",
        name: "Gembok Pengaman Kotak IP65 + Sakelar Pintu Pengganti",
        quantity: 1,
        unit: "set",
        estimatedIdr: 150000,
        notes: "Koordinasi patroli Dishub / keamanan wilayah segera ke titik GPS",
      },
    ],
  },
  F6_02_CABLE_BATT_THEFT: {
    family: "F6",
    severity: "CRITICAL",
    title: "DARURAT: Indikasi Pencurian Baterai (Aktif via Sel 18650)",
    parts: [
      {
        sku: "BAT-LFP-256-40",
        name: "Baterai LiFePO4 25,6 V 40 Ah + Kunci Pengaman Anti-Bongkar",
        quantity: 1,
        unit: "set",
        estimatedIdr: 2450000,
        notes: "Tegangan utama 0 V mendadak, perangkat melapor lewat sel cadangan 18650",
      },
    ],
  },
  F6_03_GEOFENCE_DISPLACEMENT: {
    family: "F6",
    severity: "CRITICAL",
    title: "DARURAT: Pergeseran Lokasi GPS Keluar Geofence (> 15 m)",
    parts: [
      {
        sku: "BRK-CLAMP-ANTI",
        name: "Braket Clamp-On & Baut Keamanan Anti-Tamper",
        quantity: 1,
        unit: "set",
        estimatedIdr: 350000,
        notes: "Lacak posisi GNSS terkini perangkat secara real-time",
      },
    ],
  },
};
