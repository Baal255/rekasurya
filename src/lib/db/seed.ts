import type Database from "better-sqlite3";
import { computeExpectedChargePowerW } from "../ai/adapter";
import { FAULT_TAXONOMY } from "../ai/contract";
import { appendAudit } from "../audit";
import type { CitizenTimelineEntry, DeviceVariant, BatteryProfile, DeviceStatus, FaultFamily } from "../types";

const BASE_TIME = new Date("2026-11-14T06:00:00.000Z"); // 13:00 WIB

function isoAtOffsetHours(hoursOffset: number): string {
  return new Date(BASE_TIME.getTime() + hoursOffset * 3600_000).toISOString();
}

interface SeedCorridor {
  id: string;
  name: string;
  kabupaten: string;
  road_class: "Arteri" | "Kolektor" | "Lokal";
  target_lux: number;
  managing_agency: string;
  center_lat: number;
  center_lng: number;
}

interface SeedDeviceSpec {
  id: string;
  corridor_id: string;
  pole_label: string;
  variant: DeviceVariant;
  battery_profile: BatteryProfile;
  legacy_lamp: string;
  lat: number;
  lng: number;
  status: DeviceStatus;
  fault_family: FaultFamily;
  fault_sub_code: string;
  soc_pct: number;
  soh_pct: number;
  uptime_30d_pct: number;
  scenario: string;
}

const CORRIDORS: SeedCorridor[] = [
  {
    id: "COR-SOL-AY",
    name: "Jl. Ahmad Yani (Kleco–Gilingan)",
    kabupaten: "Kota Surakarta",
    road_class: "Arteri",
    target_lux: 15,
    managing_agency: "Dishub Kota Surakarta",
    center_lat: -7.5565,
    center_lng: 110.8165,
  },
  {
    id: "COR-SKH-GR",
    name: "Jl. Raya Solo–Sukoharjo (Grogol)",
    kabupaten: "Kab. Sukoharjo",
    road_class: "Kolektor",
    target_lux: 7,
    managing_agency: "Dishub Kab. Sukoharjo",
    center_lat: -7.648,
    center_lng: 110.8315,
  },
  {
    id: "COR-KRA-LW",
    name: "Jl. Lawu Timur (Karanganyar)",
    kabupaten: "Kab. Karanganyar",
    road_class: "Kolektor",
    target_lux: 5,
    managing_agency: "Dishub Kab. Karanganyar",
    center_lat: -7.5962,
    center_lng: 110.9508,
  },
  {
    id: "COR-KLT-JG",
    name: "Jl. Solo–Jogja (Jonggrangan)",
    kabupaten: "Kab. Klaten",
    road_class: "Kolektor",
    target_lux: 7,
    managing_agency: "Dishub Kab. Klaten",
    center_lat: -7.7024,
    center_lng: 110.6104,
  },
  {
    id: "COR-SRG-SK",
    name: "Jl. Raya Sukowati (Sragen)",
    kabupaten: "Kab. Sragen",
    road_class: "Lokal",
    target_lux: 4,
    managing_agency: "Dishub Kab. Sragen",
    center_lat: -7.4281,
    center_lng: 111.0214,
  },
];

const DEVICES: SeedDeviceSpec[] = [
  // Surakarta (4 titik)
  {
    id: "SOL-001",
    corridor_id: "COR-SOL-AY",
    pole_label: "Tiang AY-01 (Simpang Kleco)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.5542,
    lng: 110.7851,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 86,
    soh_pct: 97.4,
    uptime_30d_pct: 99.8,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "SOL-002",
    corridor_id: "COR-SOL-AY",
    pole_label: "Tiang AY-02 (Manahan Barat)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.5558,
    lng: 110.8054,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 84,
    soh_pct: 96.8,
    uptime_30d_pct: 99.6,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "SOL-003",
    corridor_id: "COR-SOL-AY",
    pole_label: "Tiang AY-03 (Terminal Tirtonadi)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_50Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.5529,
    lng: 110.8194,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 88,
    soh_pct: 98.1,
    uptime_30d_pct: 100.0,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "SOL-004",
    corridor_id: "COR-SOL-AY",
    pole_label: "Tiang AY-04 (Gilingan Timur)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "PJUTS Eksisting 2021",
    lat: -7.5572,
    lng: 110.8312,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 81,
    soh_pct: 91.5,
    uptime_30d_pct: 99.1,
    scenario: "NORMAL_CLEAR_DAY",
  },

  // Sukoharjo (4 titik — problem owner fokus PJUTS warisan & sentra UMKM)
  {
    id: "SKH-105",
    corridor_id: "COR-SKH-GR",
    pole_label: "Tiang GR-105 (Pasar Grogol)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "PJUTS ESDM 2019",
    lat: -7.6194,
    lng: 110.8226,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 79,
    soh_pct: 88.2,
    uptime_30d_pct: 98.7,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "SKH-106",
    corridor_id: "COR-SKH-GR",
    pole_label: "Tiang GR-106 (Telukan Selatan)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "PJUTS ESDM 2019",
    lat: -7.6382,
    lng: 110.8295,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 82,
    soh_pct: 89.4,
    uptime_30d_pct: 99.0,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "SKH-107",
    corridor_id: "COR-SKH-GR",
    pole_label: "Tiang GR-107 (Depan Sentra IKM)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "PJUTS APBD 2021",
    lat: -7.6815,
    lng: 110.8351,
    status: "FAULT",
    fault_family: "F4",
    fault_sub_code: "F4_01_LED_OPEN_CIRCUIT",
    soc_pct: 77,
    soh_pct: 90.6,
    uptime_30d_pct: 94.2,
    scenario: "F4_LED_DRIVER_OPEN",
  },
  {
    id: "SKH-108",
    corridor_id: "COR-SKH-GR",
    pole_label: "Tiang GR-108 (Alun-Alun Sukoharjo)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_50Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.6844,
    lng: 110.8398,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 87,
    soh_pct: 97.9,
    uptime_30d_pct: 99.9,
    scenario: "NORMAL_CLEAR_DAY",
  },

  // Karanganyar (4 titik — termasuk KRA-042 F1 EWMA dari kanvas proposal)
  {
    id: "KRA-040",
    corridor_id: "COR-KRA-LW",
    pole_label: "Tiang LW-040 (Bejen Barat)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.5944,
    lng: 110.9412,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 83,
    soh_pct: 96.5,
    uptime_30d_pct: 99.5,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "KRA-041",
    corridor_id: "COR-KRA-LW",
    pole_label: "Tiang LW-041 (Alun-Alun Karanganyar)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "Merkuri 150 W",
    lat: -7.5955,
    lng: 110.9465,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 85,
    soh_pct: 97.1,
    uptime_30d_pct: 99.7,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "KRA-042",
    corridor_id: "COR-KRA-LW",
    pole_label: "Tiang LW-042 (Pasar Jungke)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.5962,
    lng: 110.9508,
    status: "WARNING_EWMA",
    fault_family: "F1",
    fault_sub_code: "F1_01_PV_SOILING_SHADING",
    soc_pct: 61,
    soh_pct: 95.8,
    uptime_30d_pct: 97.4,
    scenario: "F1_PV_SOILING_SHADING",
  },
  {
    id: "KRA-043",
    corridor_id: "COR-KRA-LW",
    pole_label: "Tiang LW-043 (Tegalgede)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.5978,
    lng: 110.9571,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 84,
    soh_pct: 96.9,
    uptime_30d_pct: 99.6,
    scenario: "NORMAL_CLEAR_DAY",
  },

  // Klaten (3 titik — armada PJUTS lama dengan degradasi baterai)
  {
    id: "KLT-017",
    corridor_id: "COR-KLT-JG",
    pole_label: "Tiang JG-017 (Delanggu Utara)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "PJUTS Eksisting 2019",
    lat: -7.6248,
    lng: 110.7012,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 76,
    soh_pct: 86.5,
    uptime_30d_pct: 98.4,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "KLT-018",
    corridor_id: "COR-KLT-JG",
    pole_label: "Tiang JG-018 (Jonggrangan)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "PJUTS Eksisting 2019",
    lat: -7.7024,
    lng: 110.6104,
    status: "FAULT",
    fault_family: "F2",
    fault_sub_code: "F2_01_BATT_SOH_DEGRADATION",
    soc_pct: 44,
    soh_pct: 71.2,
    uptime_30d_pct: 91.5,
    scenario: "F2_BATTERY_DEGRADATION",
  },
  {
    id: "KLT-019",
    corridor_id: "COR-KLT-JG",
    pole_label: "Tiang JG-019 (Trucuk Timur)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "12.8V_40Ah",
    legacy_lamp: "PJUTS Eksisting 12V",
    lat: -7.7211,
    lng: 110.6542,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 79,
    soh_pct: 84.0,
    uptime_30d_pct: 98.2,
    scenario: "NORMAL_CLEAR_DAY",
  },

  // Sragen (3 titik — termasuk SRG-009 sabotase/tamper dari kanvas proposal)
  {
    id: "SRG-008",
    corridor_id: "COR-SRG-SK",
    pole_label: "Tiang SK-008 (Nglorog Barat)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.4264,
    lng: 111.0124,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 83,
    soh_pct: 95.9,
    uptime_30d_pct: 99.4,
    scenario: "NORMAL_CLEAR_DAY",
  },
  {
    id: "SRG-009",
    corridor_id: "COR-SRG-SK",
    pole_label: "Tiang SK-009 (Ringroad Sragen)",
    variant: "KIT_KONVERSI",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "SON-T 250 W",
    lat: -7.4281,
    lng: 111.0214,
    status: "TAMPER_CRITICAL",
    fault_family: "F6",
    fault_sub_code: "F6_02_CABLE_BATT_THEFT",
    soc_pct: 0,
    soh_pct: 95.0,
    uptime_30d_pct: 92.8,
    scenario: "F6_TAMPER_THEFT",
  },
  {
    id: "SRG-010",
    corridor_id: "COR-SRG-SK",
    pole_label: "Tiang SK-010 (Karangmalang)",
    variant: "RETROFIT_PJUTS",
    battery_profile: "25.6V_40Ah",
    legacy_lamp: "PJUTS Eksisting 2020",
    lat: -7.4322,
    lng: 111.0319,
    status: "NORMAL",
    fault_family: "NONE",
    fault_sub_code: "OK",
    soc_pct: 80,
    soh_pct: 89.8,
    uptime_30d_pct: 99.1,
    scenario: "NORMAL_CLEAR_DAY",
  },
];

export function seedAll(db: Database.Database): void {
  const tx = db.transaction(() => {
    const insertCorridor = db.prepare(`
      INSERT INTO corridors (id, name, kabupaten, road_class, target_lux, managing_agency, center_lat, center_lng)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of CORRIDORS) {
      insertCorridor.run(
        c.id,
        c.name,
        c.kabupaten,
        c.road_class,
        c.target_lux,
        c.managing_agency,
        c.center_lat,
        c.center_lng
      );
    }

    const insertDevice = db.prepare(`
      INSERT INTO devices (
        id, corridor_id, pole_label, variant, battery_profile, legacy_lamp,
        lat, lng, geofence_radius_m, status, fault_family, fault_sub_code,
        soc_pct, soh_pct, pv_v, pv_i, pv_p, batt_v, batt_i, batt_p,
        load_v, load_i, load_p, temp_panel_c, temp_batt_c, temp_scc_c,
        temp_driver_c, temp_board_c, lux, pir_active, pwm_duty, door_open,
        accel_g, backup_cell_v, on_backup_cell, expected_p_chg, residual_w,
        ewma_z, ewma_ucl, ewma_lcl, neighbor_z_median, spatial_verdict,
        uptime_30d_pct, commissioned_at, last_inspection_at, maintenance_until,
        active_scenario, data_source, last_seen_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, 15.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 16.5, -16.5,
        ?, ?, ?, ?, ?, NULL, ?, 'SIMULATED', ?
      )
    `);

    const insertHistory = db.prepare(`
      INSERT INTO telemetry_history (
        device_id, recorded_at, pv_v, pv_i, pv_p, batt_v, batt_i,
        load_v, load_i, load_p, soc_pct, temp_panel_c, temp_batt_c,
        lux, pwm_duty, expected_p_chg, residual_w, ewma_z, data_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SIMULATED')
    `);

    for (const d of DEVICES) {
      const is12V = d.battery_profile.startsWith("12.8V");
      const nomBattV = is12V ? 12.8 : 25.6;
      const nomPvWp = is12V ? 150 : 300;
      const luxNow = 78500;
      const tempPanelNow = 42.2;
      const expectedNow = computeExpectedChargePowerW({
        nominalPvWp: nomPvWp,
        lux: luxNow,
        tempPanelC: tempPanelNow,
        socPct: d.soc_pct,
      });

      let pvV = is12V ? 19.2 : 36.8;
      let pvI = Number((expectedNow / pvV).toFixed(2));
      let pvP = Number((pvV * pvI).toFixed(1));
      let battV = is12V ? 13.4 : 26.8;
      let battI = Number(((pvP * 0.94) / battV).toFixed(2));
      let loadV = battV - 0.1;
      let loadI = 0;
      let loadP = 0;
      let doorOpen = 0;
      let accelG = 1.01;
      let backupCellV = 4.08;
      let onBackup = 0;
      let residualW = 0.8;
      let ewmaZ = 0.4;
      let neighborZ = 0.3;
      let spatialVerdict: "NORMAL" | "CUACA_SERUAS" | "ANOMALI_LOKAL" = "NORMAL";

      if (d.id === "KRA-042") {
        pvV = 35.1;
        pvI = Number(((expectedNow * 0.62) / pvV).toFixed(2));
        pvP = Number((pvV * pvI).toFixed(1));
        battI = Number(((pvP * 0.94) / battV).toFixed(2));
        residualW = Number((pvP - expectedNow).toFixed(1));
        ewmaZ = -58.4;
        neighborZ = -0.8;
        spatialVerdict = "ANOMALI_LOKAL";
      } else if (d.id === "SKH-107") {
        // Gangguan F4 terdeteksi pada malam sebelumnya dan tercatat masih aktif
        residualW = -2.1;
        ewmaZ = -1.8;
      } else if (d.id === "SRG-009") {
        pvV = 38.4;
        pvI = 0.0;
        pvP = 0.0;
        battV = 0.0;
        battI = 0.0;
        loadV = 0.0;
        doorOpen = 1;
        accelG = 3.18;
        backupCellV = 4.02;
        onBackup = 1;
        ewmaZ = -19.2;
      } else if (d.id === "KLT-018") {
        battV = 25.1;
        ewmaZ = -3.4;
      }

      insertDevice.run(
        d.id,
        d.corridor_id,
        d.pole_label,
        d.variant,
        d.battery_profile,
        d.legacy_lamp,
        d.lat,
        d.lng,
        d.status,
        d.fault_family,
        d.fault_sub_code,
        d.soc_pct,
        d.soh_pct,
        pvV,
        pvI,
        pvP,
        battV,
        battI,
        Number((battV * battI).toFixed(1)),
        loadV,
        loadI,
        loadP,
        tempPanelNow,
        32.0,
        35.4,
        29.8,
        33.1,
        luxNow,
        0,
        0,
        doorOpen,
        accelG,
        backupCellV,
        onBackup,
        expectedNow,
        residualW,
        ewmaZ,
        neighborZ,
        spatialVerdict,
        d.uptime_30d_pct,
        "2026-09-18T03:00:00.000Z",
        "2026-11-01T04:00:00.000Z",
        d.scenario,
        isoAtOffsetHours(0)
      );

      // Buat 48 jam histori telemetri yang konsisten secara fisika
      let simEwma = 0;
      let simSoc = Math.max(55, d.soc_pct - 6);
      for (let h = -47; h <= 0; h++) {
        const dt = new Date(BASE_TIME.getTime() + h * 3600_000);
        const wibHour = (dt.getUTCHours() + 7) % 24;
        const isDay = wibHour >= 6 && wibHour <= 17;
        const solarFactor = isDay ? Math.max(0, Math.sin(((wibHour - 6) / 11) * Math.PI)) : 0;
        const hLux = isDay ? Math.round(8000 + 82000 * solarFactor) : 4;
        const hTempPanel = Number((26 + 21 * solarFactor).toFixed(1));
        const hTempBatt = Number((27 + 6 * solarFactor).toFixed(1));
        const hExpected = computeExpectedChargePowerW({
          nominalPvWp: nomPvWp,
          lux: hLux,
          tempPanelC: hTempPanel,
          socPct: simSoc,
        });

        let hPvV = isDay ? (is12V ? 19.0 : 36.2) : 0.1;
        let hPvP = hExpected;
        if (d.id === "KRA-042" && h >= -16 && isDay) {
          hPvP = Number((hExpected * 0.62).toFixed(1));
        } else if (d.id === "SRG-009" && h >= -2) {
          hPvP = 0;
        }
        const hPvI = hPvV > 1 ? Number((hPvP / hPvV).toFixed(2)) : 0;
        const hPwm = isDay ? 0 : simSoc < 45 ? 35 : 45;
        let hLoadV = isDay ? nomBattV + 0.4 : nomBattV + 0.2;
        let hLoadP = isDay ? 0 : Number(((40 * hPwm) / 100).toFixed(1));
        if (d.id === "SKH-107" && h >= -12 && !isDay) {
          hLoadP = 0.5; // driver open
        }
        if (d.id === "SRG-009" && h >= -2) {
          hLoadV = 0;
          hLoadP = 0;
        }
        const hLoadI = hLoadV > 1 ? Number((hLoadP / hLoadV).toFixed(2)) : 0;
        const hBattV =
          d.id === "SRG-009" && h >= -2
            ? 0
            : Number((nomBattV + (isDay ? 1.1 : -0.4) + (simSoc - 50) * 0.015).toFixed(2));
        const hBattI =
          hBattV > 1
            ? Number(((hPvP * 0.94 - hLoadP - 1.5) / hBattV).toFixed(2))
            : 0;
        const netWh = hPvP * 0.94 - hLoadP - 1.5;
        const capWh = nomBattV * 40;
        simSoc = Math.max(20, Math.min(96, Number((simSoc + (netWh / capWh) * 100).toFixed(1))));
        const hResidual = isDay ? Number((hPvP - hExpected).toFixed(1)) : 0;
        simEwma = isDay
          ? Number((0.2 * hResidual + 0.8 * simEwma).toFixed(1))
          : Number((0.92 * simEwma).toFixed(1));

        insertHistory.run(
          d.id,
          dt.toISOString(),
          hPvV,
          hPvI,
          Number(hPvP.toFixed(1)),
          hBattV,
          hBattI,
          hLoadV,
          hLoadI,
          hLoadP,
          d.id === "SRG-009" && h >= -2 ? 0 : simSoc,
          hTempPanel,
          hTempBatt,
          hLux,
          hPwm,
          hExpected,
          hResidual,
          simEwma
        );
      }
    }

    // Seed Fault Events & Work Orders
    const insertFault = db.prepare(`
      INSERT INTO fault_events (
        id, device_id, fault_family, sub_code, severity, title, root_cause,
        recommended_parts_json, detection_latency_sec, confidence, ewma_z,
        spatial_verdict, status, detected_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    const insertWo = db.prepare(`
      INSERT INTO work_orders (
        id, device_id, fault_event_id, citizen_report_id, priority, status,
        title, diagnosis_summary, assigned_team, truck_unit, parts_checklist_json,
        technician_notes, checkin_at, checkin_lat, checkin_lng, verification_passed,
        sla_deadline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1. SRG-009 Sabotase Darurat
    insertFault.run(
      "FLT-2026-0001",
      "SRG-009",
      "F6",
      "F6_02_CABLE_BATT_THEFT",
      "CRITICAL",
      FAULT_TAXONOMY.F6_02_CABLE_BATT_THEFT.title,
      "Kotak IP65 dibuka paksa (sakelar pintu aktif), getaran LIS3DH 3,18 g, bus baterai turun ke 0 V, modul melapor lewat sel cadangan 18650 (4,02 V) dan bergeser 28 m.",
      JSON.stringify(FAULT_TAXONOMY.F6_02_CABLE_BATT_THEFT.parts),
      7.4,
      0.99,
      -19.2,
      "ANOMALI_LOKAL",
      "ACTIVE",
      isoAtOffsetHours(-1.5)
    );
    insertWo.run(
      "WO-2026-0001",
      "SRG-009",
      "FLT-2026-0001",
      null,
      "DARURAT",
      "ASSIGNED",
      "Patroli & Pemulihan Sabotase Tiang SRG-009",
      "Indikasi pencurian baterai LiFePO4 25,6 V 40 Ah. Sel cadangan 18650 masih mengirim koordinat GNSS aktif.",
      "Tim Reaksi Cepat PJU Sragen",
      "Patroli Pick-Up 01",
      JSON.stringify(FAULT_TAXONOMY.F6_02_CABLE_BATT_THEFT.parts),
      "Tim berkoordinasi dengan petugas wilayah Ringroad Sragen.",
      null,
      null,
      null,
      0,
      isoAtOffsetHours(4),
      isoAtOffsetHours(-1.4),
      isoAtOffsetHours(-1.4)
    );

    // 2. KRA-042 Peringatan Dini EWMA F1
    insertFault.run(
      "FLT-2026-0002",
      "KRA-042",
      "F1",
      "F1_01_PV_SOILING_SHADING",
      "MEDIUM",
      FAULT_TAXONOMY.F1_01_PV_SOILING_SHADING.title,
      "Daya pengisian aktual -38% terhadap kurva regresi ekspektasi (EWMA Z = -58,4 W < -16,5 W), sedangkan tiang tetangga KRA-041 dan KRA-043 normal.",
      JSON.stringify(FAULT_TAXONOMY.F1_01_PV_SOILING_SHADING.parts),
      42.0,
      0.91,
      -58.4,
      "ANOMALI_LOKAL",
      "ACKNOWLEDGED",
      isoAtOffsetHours(-5)
    );
    insertWo.run(
      "WO-2026-0002",
      "KRA-042",
      "FLT-2026-0002",
      null,
      "SEDANG",
      "OPEN",
      "Pembersihan Panel & Pangkas Peneduh KRA-042",
      "EWMA mendeteksi degradasi pengisian lokal di depan Pasar Jungke. Tidak perlu bawa suku cadang elektrikal berat.",
      "Regu Pemeliharaan Karanganyar",
      "Sky-Lift KRA-02",
      JSON.stringify(FAULT_TAXONOMY.F1_01_PV_SOILING_SHADING.parts),
      "Dijadwalkan dalam rute rutin Koridor Jl. Lawu.",
      null,
      null,
      null,
      0,
      isoAtOffsetHours(24),
      isoAtOffsetHours(-4.8),
      isoAtOffsetHours(-3.0)
    );

    // 3. SKH-107 Gangguan Driver LED F4 (terhubung ke Aduan Warga adaptasi ULAS)
    insertFault.run(
      "FLT-2026-0003",
      "SKH-107",
      "F4",
      "F4_01_LED_OPEN_CIRCUIT",
      "HIGH",
      FAULT_TAXONOMY.F4_01_LED_OPEN_CIRCUIT.title,
      "Tegangan baterai normal (26,1 V), PWM optocoupler PC817 aktif 45% pada malam hari, tetapi arus beban INA226 0,02 A.",
      JSON.stringify(FAULT_TAXONOMY.F4_01_LED_OPEN_CIRCUIT.parts),
      18.5,
      0.95,
      -1.8,
      "NORMAL",
      "ACKNOWLEDGED",
      isoAtOffsetHours(-12)
    );
    insertWo.run(
      "WO-2026-0003",
      "SKH-107",
      "FLT-2026-0003",
      "ID. 2026007610",
      "TINGGI",
      "IN_PROGRESS",
      "Penggantian Driver Buck CC-CV / LED DC SKH-107",
      "Diagnosis terisolasi pada modul driver Buck CC-CV atau armatur LED DC 40 W. Teknisi siap angkat sky-lift dengan komponen tepat.",
      "Regu PJU Dishub Sukoharjo",
      "Sky-Lift SKH-01",
      JSON.stringify(FAULT_TAXONOMY.F4_01_LED_OPEN_CIRCUIT.parts),
      "Menunggu eksekusi lapangan sore ini.",
      isoAtOffsetHours(-7.5),
      -7.6815,
      110.8351,
      0,
      isoAtOffsetHours(12),
      isoAtOffsetHours(-11.8),
      isoAtOffsetHours(-8)
    );

    // 4. KLT-018 Degradasi Baterai F2
    insertFault.run(
      "FLT-2026-0004",
      "KLT-018",
      "F2",
      "F2_01_BATT_SOH_DEGRADATION",
      "HIGH",
      FAULT_TAXONOMY.F2_01_BATT_SOH_DEGRADATION.title,
      "SoH pack LiFePO4 PJUTS 2019 turun ke 71,2%. Tegangan drop cepat saat malam hari; berisiko padam dini setelah hari hujan.",
      JSON.stringify(FAULT_TAXONOMY.F2_01_BATT_SOH_DEGRADATION.parts),
      55.0,
      0.88,
      -3.4,
      "NORMAL",
      "ACTIVE",
      isoAtOffsetHours(-18)
    );
    insertWo.run(
      "WO-2026-0004",
      "KLT-018",
      "FLT-2026-0004",
      "ID. 2026007530",
      "TINGGI",
      "ASSIGNED",
      "Penggantian Pack Baterai LiFePO4 25,6V 40Ah KLT-018",
      "Unit warisan ESDM 2019 melewati masa garansi 5 tahun. Log degradasi tersedia sebagai bukti pengadaan suku cadang.",
      "Regu PJU Dishub Klaten",
      "Sky-Lift KLT-01",
      JSON.stringify(FAULT_TAXONOMY.F2_01_BATT_SOH_DEGRADATION.parts),
      "Permintaan baterai pengganti sudah dipesan di gudang suku cadang sebelum truk berangkat.",
      null,
      null,
      null,
      0,
      isoAtOffsetHours(36),
      isoAtOffsetHours(-17.5),
      isoAtOffsetHours(-10)
    );

    // Seed Citizen Reports (Adaptasi Pola ULAS Surakarta — 100% Data Simulasi Demo)
    const insertCitizen = db.prepare(`
      INSERT INTO citizen_reports (
        id, channel, reporter_alias, phone_last4, category, corridor_name,
        description, lat, lng, matched_device_id, linked_work_order_id,
        status, follow_up_of, timeline_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tl1: CitizenTimelineEntry[] = [
      {
        timestamp: isoAtOffsetHours(-10),
        status: "Open",
        actor: "Kanal Simulasi Aduan Warga",
        note: "Laporan warga masuk: lampu tiang depan sentra IKM Grogol padam sejak semalam.",
      },
      {
        timestamp: isoAtOffsetHours(-9.5),
        status: "Responded",
        actor: "Operator Dishub Sukoharjo",
        note: "Terverifikasi & ditautkan ke telemetri SKH-107 (kode F4_01_LED_OPEN_CIRCUIT sudah terdeteksi otomatis lebih dulu).",
      },
      {
        timestamp: isoAtOffsetHours(-8),
        status: "Process",
        actor: "Regu PJU Dishub Sukoharjo",
        note: "Work Order WO-2026-0003 disiapkan dengan suku cadang Driver Buck CC-CV 300W + LED 40W.",
      },
    ];
    insertCitizen.run(
      "ID. 2026007610",
      "Lapor Mas Wali (WA)",
      "Warga Simulasi #01 (Grogol)",
      "4821",
      "Penerangan Jalan Umum (PJU)",
      "Jl. Raya Solo–Sukoharjo (Grogol)",
      "Lampu PJU di depan sentra IKM Grogol mati total tadi malam, kondisi jalan gelap untuk pekerja shift malam.",
      -7.6816,
      110.8352,
      "SKH-107",
      "WO-2026-0003",
      "Process",
      null,
      JSON.stringify(tl1),
      isoAtOffsetHours(-10)
    );

    const tl2: CitizenTimelineEntry[] = [
      {
        timestamp: isoAtOffsetHours(-20),
        status: "Open",
        actor: "Web Portal Simulasi",
        note: "Laporan warga masuk terkait PJU tenaga surya di Jonggrangan padam sebelum tengah malam.",
      },
      {
        timestamp: isoAtOffsetHours(-17),
        status: "Responded",
        actor: "Operator Dishub Klaten",
        note: "Ditautkan ke perangkat KLT-018 (kode F2_01_BATT_SOH_DEGRADATION, SoH 71,2%).",
      },
    ];
    insertCitizen.run(
      "ID. 2026007530",
      "Web ULAS",
      "Warga Simulasi #02 (Jonggrangan)",
      "1934",
      "Penerangan Jalan Umum (PJU)",
      "Jl. Solo–Jogja (Jonggrangan)",
      "LANJUTAN ADUAN: lampu surya di dekat pertigaan Jonggrangan menyala sebentar lalu mati jam 22.00.",
      -7.7025,
      110.6105,
      "KLT-018",
      "WO-2026-0004",
      "Responded",
      "ID. 2026004685",
      JSON.stringify(tl2),
      isoAtOffsetHours(-20)
    );

    const tl3: CitizenTimelineEntry[] = [
      {
        timestamp: isoAtOffsetHours(-48),
        status: "Open",
        actor: "Solo Destination",
        note: "Laporan lampu berkedip di sekitar Simpang Kleco.",
      },
      {
        timestamp: isoAtOffsetHours(-44),
        status: "Process",
        actor: "Teknisi Sky-Lift Surakarta",
        note: "Pemeriksaan konektor terminal LOAD dan verifikasi beban INA226.",
      },
      {
        timestamp: isoAtOffsetHours(-41),
        status: "Resolved",
        actor: "Verifikasi Telemetri Otomatis",
        note: "Arus LED 1,55 A stabil dan uptime 100% selama 41 jam terakhir.",
      },
    ];
    insertCitizen.run(
      "ID. 2026007402",
      "Solo Destination",
      "Warga Simulasi #03 (Kleco)",
      "7705",
      "Penerangan Jalan Umum (PJU)",
      "Jl. Ahmad Yani (Kleco–Gilingan)",
      "Lampu sempat redup berkedip di Simpang Kleco, sudah ditindaklanjuti dan kembali terang.",
      -7.5543,
      110.7852,
      "SOL-001",
      null,
      "Resolved",
      null,
      JSON.stringify(tl3),
      isoAtOffsetHours(-48)
    );

    // Seed AI Invocations Sample
    const insertAi = db.prepare(`
      INSERT INTO ai_invocations (
        id, device_id, schema_version, adapter_mode, model_version, input_hash,
        predicted_p_chg, residual_w, ewma_z, spatial_score, fault_family, sub_code,
        confidence, uncertainty, latency_ms, created_at
      ) VALUES (?, ?, '1.0.0', 'MOCK_EWMA_DETERMINISTIC', 'rekasurya-ewma-physics-baseline-v1.0', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAi.run(
      "AI-00001",
      "KRA-042",
      "seed-kra042-ewma",
      221.4,
      -84.1,
      -58.4,
      -0.8,
      "F1",
      "F1_01_PV_SOILING_SHADING",
      0.91,
      0.09,
      4,
      isoAtOffsetHours(-5)
    );
    insertAi.run(
      "AI-00002",
      "SKH-107",
      "seed-skh107-led",
      0.0,
      0.0,
      -1.8,
      0.1,
      "F4",
      "F4_01_LED_OPEN_CIRCUIT",
      0.95,
      0.05,
      3,
      isoAtOffsetHours(-12)
    );
    insertAi.run(
      "AI-00003",
      "SRG-009",
      "seed-srg009-tamper",
      0.0,
      0.0,
      -19.2,
      0.2,
      "F6",
      "F6_02_CABLE_BATT_THEFT",
      0.99,
      0.01,
      2,
      isoAtOffsetHours(-1.5)
    );

    // Sekuens ID deterministik
    const insertMeta = db.prepare(
      "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    );
    insertMeta.run("seq:FLT", "4");
    insertMeta.run("seq:WO", "4");
    insertMeta.run("seq:AI", "3");
    insertMeta.run("seq:CIT", "7610");

    // Seed Audit Log berantai hash SHA-256
    appendAudit(db, {
      actorRole: "SYSTEM",
      actorName: "REKASURYA Seeder",
      action: "SEED_DEMO_DATASET",
      entityType: "FLEET",
      entityId: "SOLO_RAYA_18_POLES",
      detail: {
        mode: "SIMULATED_DEMO",
        corridors: CORRIDORS.length,
        devices: DEVICES.length,
        note: "Seluruh data telemetri dan aduan warga pada demo ini adalah simulasi terkalibrasi fisika.",
      },
      createdAt: isoAtOffsetHours(-2),
    });
    appendAudit(db, {
      actorRole: "OPERATOR_DISHUB",
      actorName: "Operator Command Center",
      action: "AUTO_CREATE_WORK_ORDER",
      entityType: "WORK_ORDER",
      entityId: "WO-2026-0001",
      detail: {
        device_id: "SRG-009",
        fault_sub_code: "F6_02_CABLE_BATT_THEFT",
        priority: "DARURAT",
      },
      createdAt: isoAtOffsetHours(-1.4),
    });
  });

  tx();
}
