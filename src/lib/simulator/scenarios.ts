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
