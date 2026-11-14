#pragma once

#include <cstdint>

namespace rekasurya {

enum class FirmwareState : uint8_t {
  BOOT_SELFTEST = 0,
  DAY_CHARGING,
  NIGHT_ACTIVE_PIR,
  NIGHT_LOW_SOC_AUTONOMY,
  TAMPER_EMERGENCY_18650,
  UVLO_DEEP_SLEEP
};

enum class FaultFamily : uint8_t {
  NONE = 0,
  F1_PV_SUBSYSTEM,     // Panel surya kotor / tertutup / putus
  F2_BATTERY_BMS,      // Degradasi SoH / UVLO / baterai terlepas
  F3_SCC_MPPT,         // Kegagalan konversi SCC MPPT / LVD macet
  F4_LED_DRIVER,       // Putus rangkaian lampu / Buck CC-CV / short
  F5_THERMAL,          // Suhu berlebih NTC / LM75B
  F6_TAMPER_THEFT      // Pembongkaran paksa / pencurian baterai / pergeseran GPS
};

enum class FaultSubCode : uint16_t {
  OK = 0,
  F1_01_PV_SOILING_SHADING = 101,
  F1_02_PV_OPEN_CIRCUIT = 102,
  F1_03_PV_UNDERPERFORM_CELL = 103,
  F2_01_BATT_SOH_DEGRADATION = 201,
  F2_02_BATT_UVLO_LOCKOUT = 202,
  F2_03_BATT_SUDDEN_DISCONNECT = 203,
  F3_01_SCC_CHARGE_FAIL = 301,
  F3_02_SCC_LVD_CUTOFF = 302,
  F4_01_LED_OPEN_CIRCUIT = 401,
  F4_02_LED_OVERCURRENT_SHORT = 402,
  F4_03_DAYLIGHT_DRIVER_STUCK = 403,
  F5_01_BATT_OVERHEAT = 501,
  F5_02_CONTROLLER_OVERHEAT = 502,
  F6_01_DOOR_FORCED_OPEN = 601,
  F6_02_CABLE_BATT_THEFT = 602,
  F6_03_GEOFENCE_DISPLACEMENT = 603
};

struct RawSensorFrame {
  uint32_t epochSec = 0;

  // Kanal PV (INA228 terisolasi B0303S + ADuM1250)
  float pvVoltageV = 0.0f;
  float pvCurrentA = 0.0f;

  // Kanal BATT (INA226 terisolasi B0303S + ADuM1250)
  float battVoltageV = 0.0f;
  float battCurrentA = 0.0f; // positif = charging, negatif = discharging

  // Kanal LOAD (INA226 di jalur SCC LOAD -> Buck CC-CV -> LED)
  float loadVoltageV = 0.0f;
  float loadCurrentA = 0.0f;

  // Sensor lingkungan & termal (ADS1115 + 5x NTC / LM75B + BH1750)
  float tempPanelC = 28.0f;
  float tempBattC = 28.0f;
  float tempSccC = 28.0f;
  float tempDriverC = 28.0f;
  float tempBoardC = 28.0f;
  float lux = 0.0f;

  // Digital & keamanan
  bool pirTriggered = false;
  bool doorOpened = false;
  float accelGPeak = 1.0f; // LIS3DH magnitude puncak (g)
  float backupCellV = 4.05f; // Sel cadangan 18650 (untuk alarm jika baterai dicabut)

  // GNSS dari modem LTE Cat-1 + GNSS
  bool gnssValid = false;
  double gnssLat = 0.0;
  double gnssLng = 0.0;

  // Status konektivitas
  bool lteConnected = false;
  int16_t rssiDbm = -75;
};

struct ValidatedTelemetry {
  uint32_t epochSec = 0;
  bool validMask = true;

  float pvVoltageV = 0.0f;
  float pvCurrentA = 0.0f;
  float pvPowerW = 0.0f;

  float battVoltageV = 0.0f;
  float battCurrentA = 0.0f;
  float battPowerW = 0.0f;
  float socPct = 75.0f;
  float sohPct = 98.0f;

  float loadVoltageV = 0.0f;
  float loadCurrentA = 0.0f;
  float loadPowerW = 0.0f;

  float tempPanelC = 28.0f;
  float tempBattC = 28.0f;
  float tempSccC = 28.0f;
  float tempDriverC = 28.0f;
  float tempBoardC = 28.0f;
  float lux = 0.0f;

  bool pirTriggered = false;
  bool doorOpened = false;
  float accelGPeak = 1.0f;
  float backupCellV = 4.05f;
  bool onBackupCell = false;

  bool gnssValid = false;
  double gnssLat = 0.0;
  double gnssLng = 0.0;
  double geofenceDriftM = 0.0;

  uint8_t appliedPwmPct = 0;
};

struct DiagnosticResult {
  float expectedChargePowerW = 0.0f;
  float residualW = 0.0f;
  float ewmaZ = 0.0f;
  bool ewmaAlarm = false;
  FaultFamily family = FaultFamily::NONE;
  FaultSubCode subCode = FaultSubCode::OK;
  bool isEmergencyTamper = false;
  float confidence = 1.0f;
};

struct FlashRingRecord {
  uint32_t sequence = 0;
  ValidatedTelemetry telemetry;
  DiagnosticResult diag;
  uint16_t crc16 = 0;
};

struct RemoteCommand {
  uint32_t commandId = 0;
  uint8_t overridePwmPct = 0; // 0 = auto
  bool hasPwmOverride = false;
  uint32_t maintenanceAuthUntilEpoch = 0; // Sesi teknisi terautentikasi
  bool testLampPulse60s = false;
};

} // namespace rekasurya
