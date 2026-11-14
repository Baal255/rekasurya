import type { TelemetryInferenceRequest } from "../ai/contract";
import { computeExpectedChargePowerW } from "../ai/adapter";
import type { DeviceRecord } from "../types";

export type SimulationScenarioId =
  | "NORMAL_CLEAR_DAY"
  | "F1_PV_SOILING_SHADING"
  | "WEATHER_CORRIDOR_CLOUDY"
  | "F2_BATTERY_DEGRADATION"
  | "F3_SCC_FAILURE"
  | "F4_LED_DRIVER_OPEN"
  | "F5_THERMAL_OVERHEAT"
  | "F6_TAMPER_THEFT";

export interface SimulationScenarioMeta {
  id: SimulationScenarioId;
  label: string;
  description: string;
  expectedFaultFamily: string;
  defaultTimeOfDay: "DAY" | "NIGHT";
}

export const SIMULATION_SCENARIOS: SimulationScenarioMeta[] = [
  {
    id: "NORMAL_CLEAR_DAY",
    label: "Operasi Normal (Cerah Siang)",
    description: "Panel 300 Wp mengisi baterai LiFePO4 25,6 V secara normal, lampu padam, EWMA Z ~ 0.",
    expectedFaultFamily: "NONE",
    defaultTimeOfDay: "DAY",
  },
  {
    id: "F1_PV_SOILING_SHADING",
    label: "F1 · Panel Surya Kotor / Terteduh Lokal",
    description: "Lux sekitar tetap terang (78.000 lux), namun arus PV turun 62% hanya pada 1 tiang. EWMA Z menembus batas kendali bawah dan korelasi tetangga normal.",
    expectedFaultFamily: "F1",
    defaultTimeOfDay: "DAY",
  },
  {
    id: "WEATHER_CORRIDOR_CLOUDY",
    label: "Mendung Koridor Seruas (Anti-False-Alarm)",
    description: "Penurunan iradiansi serentak pada seluruh tiang di ruas yang sama; sistem mengklasifikasikan sebagai cuaca seruas tanpa menerbitkan Work Order palsu.",
    expectedFaultFamily: "NONE",
    defaultTimeOfDay: "DAY",
  },
  {
    id: "F2_BATTERY_DEGRADATION",
    label: "F2 · Degradasi Kapasitas Baterai (SoH < 75%)",
    description: "SoH pack LiFePO4 turun ke 71%, tegangan sag lebih dalam saat dibebani malam hari.",
    expectedFaultFamily: "F2",
    defaultTimeOfDay: "NIGHT",
  },
  {
    id: "F3_SCC_FAILURE",
    label: "F3 · Kegagalan Konversi SCC MPPT",
    description: "Tegangan open-circuit PV terbaca (41,8 V) namun arus pengisian menuju baterai 0,04 A saat SoC 54%.",
    expectedFaultFamily: "F3",
    defaultTimeOfDay: "DAY",
  },
  {
    id: "F4_LED_DRIVER_OPEN",
    label: "F4 · Putus Driver Buck CC-CV / Lampu Malam",
    description: "Malam hari (lux 4), PWM optocoupler PC817 aktif (45%) namun arus beban LED terbaca 0,02 A.",
    expectedFaultFamily: "F4",
    defaultTimeOfDay: "NIGHT",
  },
  {
    id: "F5_THERMAL_OVERHEAT",
    label: "F5 · Suhu Berlebih Pack Baterai & SCC",
    description: "Suhu pack baterai NTC melonjak ke 54,5 °C akibat kegagalan ventilasi kotak IP65.",
    expectedFaultFamily: "F5",
    defaultTimeOfDay: "DAY",
  },
  {
    id: "F6_TAMPER_THEFT",
    label: "F6 · Sabotase Buka Paksa & Pencurian Baterai",
    description: "Sakelar pintu terbuka, akselerometer LIS3DH 3,2 g, bus baterai 0 V, board tetap online via sel cadangan 18650 dan GNSS bergeser 24 m.",
    expectedFaultFamily: "F6",
    defaultTimeOfDay: "NIGHT",
  },
];

export function buildSimulatedTelemetryRequest(params: {
  device: DeviceRecord;
  scenario: SimulationScenarioId;
  corridorNeighbors: Array<{ device_id: string; ewma_z: number; pv_power_w: number; lux: number }>;
  recordedAt?: string;
}): {
  request: TelemetryInferenceRequest;
  overrideNeighborsEwmaZ?: number;
} {
  const { device, scenario } = params;
  const is12V = device.battery_profile.startsWith("12.8V");
  const nominalBattV = is12V ? 12.8 : 25.6;
  const nominalBattAh = device.battery_profile.includes("50Ah")
    ? 50
    : device.battery_profile.includes("12Ah")
    ? 12
    : 40;
  const nominalPvWp = is12V ? 150 : 300;
  const nominalLedW = 40;
  const recordedAt = params.recordedAt ?? new Date().toISOString();

  const maintenanceValid =
    device.maintenance_until !== null &&
    new Date(device.maintenance_until).getTime() >= new Date(recordedAt).getTime();

  // Baseline siang cerah (sekitar pukul 11.30 WIB)
  let pvV = is12V ? 19.2 : 36.8;
  let pvI = 0;
  let battV = is12V ? 13.45 : 26.7;
  let battI = 0;
  let loadV = is12V ? 13.2 : 26.2;
  let loadI = 0;
  let soc = Math.max(45, Math.min(82, device.soc_pct));
  let soh = Math.max(88, device.soh_pct);
  let tempPanel = 42.5;
  let tempBatt = 31.8;
  let tempScc = 36.2;
  let tempDriver = 30.5;
  let tempBoard = 33.4;
  let lux = 78000;
  let pirActive = false;
  let pwmDuty = 0;
  let doorOpen = false;
  let accelG = 1.01;
  let backupCellV = 4.08;
  let geofenceDriftM = 1.8;
  let prevEwmaZ = 0;
  let neighbors = params.corridorNeighbors;
  let overrideNeighborsEwmaZ: number | undefined;

  const expectedClear = computeExpectedChargePowerW({
    nominalPvWp,
    lux,
    tempPanelC: tempPanel,
    socPct: soc,
  });

  switch (scenario) {
    case "NORMAL_CLEAR_DAY": {
      pvI = Number((expectedClear / pvV).toFixed(2));
      const mpptOutW = pvV * pvI * 0.95;
      battI = Number((mpptOutW / battV).toFixed(2));
      soh = Math.max(92, device.soh_pct);
      prevEwmaZ = 0.5;
      break;
    }

    case "F1_PV_SOILING_SHADING": {
      // Panel kotor/terteduh: cahaya tetap 78.000 lux, tapi arus PV jatuh 65%
      pvV = is12V ? 18.4 : 35.1;
      pvI = Number(((expectedClear * 0.35) / pvV).toFixed(2));
      battI = Number(((pvV * pvI * 0.94) / battV).toFixed(2));
      prevEwmaZ = -85.0; // Akumulasi residu persisten > 3 sigma EWMA
      // Tetangga seruas tetap cerah & normal
      neighbors = params.corridorNeighbors.map((n) => ({
        ...n,
        ewma_z: -1.4,
        lux: 77500,
      }));
      break;
    }

    case "WEATHER_CORRIDOR_CLOUDY": {
      // Mendung tebal seruas: lux turun bersamaan di seluruh koridor
      lux = 19000;
      tempPanel = 29.4;
      const expectedCloudy = computeExpectedChargePowerW({
        nominalPvWp,
        lux,
        tempPanelC: tempPanel,
        socPct: soc,
      });
      // Sedikit di bawah ekspektasi krn awan cepat berubah, tapi serempak di semua tiang
      pvV = is12V ? 17.6 : 33.4;
      pvI = Number(((expectedCloudy * 0.48) / pvV).toFixed(2));
      battI = Number(((pvV * pvI * 0.94) / battV).toFixed(2));
      prevEwmaZ = -48.0;
      overrideNeighborsEwmaZ = -42.0;
      neighbors = params.corridorNeighbors.map((n) => ({
        ...n,
        ewma_z: -42.0,
        pv_power_w: Number((pvV * pvI).toFixed(1)),
        lux: 18800,
      }));
      break;
    }

    case "F2_BATTERY_DEGRADATION": {
      lux = 5;
      pvV = 0.2;
      pvI = 0;
      soh = 71.2;
      soc = 44.0;
      battV = is12V ? 11.95 : 23.85; // Sag tegangan berlebih
      pwmDuty = 45;
      loadV = battV - 0.3;
      loadI = Number(((nominalLedW * (pwmDuty / 100)) / loadV).toFixed(2));
      battI = Number((-loadI * 1.06).toFixed(2));
      tempBatt = 34.5;
      tempDriver = 41.2;
      break;
    }

    case "F3_SCC_FAILURE": {
      lux = 76500;
      pvV = is12V ? 21.8 : 42.6; // Voc tinggi krn tidak ada beban MPPT
      pvI = 0.04; // Hampir nol
      battV = is12V ? 12.75 : 25.4;
      battI = -0.05; // Hanya beban parasitik board 1-2W
      soc = 54.0;
      tempScc = 31.0;
      prevEwmaZ = -110.0;
      break;
    }

    case "F4_LED_DRIVER_OPEN": {
      lux = 4;
      pvV = 0.1;
      pvI = 0;
      battV = is12V ? 13.1 : 26.1;
      soc = 76.0;
      pwmDuty = 45;
      loadV = battV - 0.1;
      loadI = 0.02; // Rangkaian LED / Driver CC-CV putus!
      battI = -0.06; // Hanya board 1.5W
      tempDriver = 27.5;
      break;
    }

    case "F5_THERMAL_OVERHEAT": {
      lux = 85000;
      tempPanel = 63.0;
      tempBatt = 54.6;
      tempScc = 68.4;
      tempBoard = 51.2;
      const exp = computeExpectedChargePowerW({
        nominalPvWp,
        lux,
        tempPanelC: tempPanel,
        socPct: soc,
      });
      pvV = is12V ? 18.6 : 35.4;
      pvI = Number((exp / pvV).toFixed(2));
      battI = Number(((pvV * pvI * 0.94) / battV).toFixed(2));
      break;
    }

    case "F6_TAMPER_THEFT": {
      lux = 3;
      pvV = 0.1;
      pvI = 0;
      battV = 0.0; // Kabel baterai utama diputus/dicuri
      battI = 0.0;
      loadV = 0.0;
      loadI = 0.0;
      pwmDuty = 0;
      doorOpen = true;
      accelG = 3.24; // Getaran keras pembongkaran LIS3DH
      backupCellV = 4.04; // Sel 18650 menopang modem LTE + GNSS untuk alarm
      geofenceDriftM = 26.4; // Melebihi radius geofence 15 m
      break;
    }
  }

  return {
    request: {
      schema_version: "1.0.0",
      device_id: device.id,
      recorded_at: recordedAt,
      profile: {
        nominal_pv_wp: nominalPvWp,
        nominal_batt_v: nominalBattV,
        nominal_batt_ah: nominalBattAh,
        nominal_led_w: nominalLedW,
        geofence_radius_m: device.geofence_radius_m,
      },
      sensors: {
        pv_v: pvV,
        pv_i: pvI,
        batt_v: battV,
        batt_i: battI,
        load_v: loadV,
        load_i: loadI,
        soc_pct: soc,
        soh_pct: soh,
        temp_panel_c: tempPanel,
        temp_batt_c: tempBatt,
        temp_scc_c: tempScc,
        temp_driver_c: tempDriver,
        temp_board_c: tempBoard,
        lux,
        pir_active: pirActive,
        pwm_duty: pwmDuty,
        door_open: doorOpen,
        accel_g: accelG,
        backup_cell_v: backupCellV,
        geofence_drift_m: geofenceDriftM,
      },
      context: {
        prev_ewma_z: prevEwmaZ,
        technician_authorized: maintenanceValid,
        corridor_neighbors: neighbors,
      },
    },
    overrideNeighborsEwmaZ,
  };
}
