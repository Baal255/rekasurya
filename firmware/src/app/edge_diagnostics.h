#pragma once

#include "../../include/rekasurya_config.h"
#include "../../include/rekasurya_types.h"
#include <algorithm>
#include <cmath>

namespace rekasurya {

/**
 * Lapis 2 & 3 Kecerdasan di Edge (ESP32):
 * - Regresi Daya Pengisian Surya P_hat_chg(E_lux, T_p, SoC)
 * - Peta Kendali EWMA pada Residu (Z_t)
 * - Klasifikasi Kode Gangguan Per Komponen (F1-F6)
 * - Deteksi Antipencurian 3-Sinyal dengan Pengecualian Sesi Teknisi Terautentikasi
 */
class EdgeDiagnostics {
public:
  explicit EdgeDiagnostics(DeviceProfile profile) : spec_(getProfileSpec(profile)) {}

  void setMaintenanceWindowUntil(uint32_t epochSec) { maintenanceAuthUntil_ = epochSec; }

  float computeExpectedChargePower(float lux, float tempPanelC, float socPct) const {
    if (lux < 1500.0f) {
      return 0.0f;
    }
    // Konversi kasar lux -> iradiansi relatif (100.000 lux ~ 1000 W/m^2)
    float irradianceRatio = std::clamp(lux / 100000.0f, 0.0f, 1.15f);
    // Koefisien suhu panel monokristal sekitar -0.4% / degC di atas 25 C
    float tempDerate = 1.0f - 0.004f * std::max(0.0f, tempPanelC - 25.0f);
    // Taper pengisian baterai LiFePO4 saat SoC > 90%
    float socTaper = 1.0f;
    if (socPct > 90.0f) {
      socTaper = std::clamp((100.0f - socPct) / 10.0f, 0.08f, 1.0f);
    }
    constexpr float kMpptEff = 0.94f;
    return spec_.nominalPanelWp * irradianceRatio * tempDerate * socTaper * kMpptEff;
  }

  DiagnosticResult evaluate(const ValidatedTelemetry& t) {
    DiagnosticResult res{};
    bool technicianAuthorized = (t.epochSec > 0 && t.epochSec <= maintenanceAuthUntil_);

    // 1. PRIORITAS KESELAMATAN & ANTIPENCURIAN (F6) — tidak boleh tertutupi sensor lain
    if (t.onBackupCell || (t.battVoltageV < 3.0f && t.doorOpened)) {
      res.family = FaultFamily::F6_TAMPER_THEFT;
      res.subCode = FaultSubCode::F6_02_CABLE_BATT_THEFT;
      res.isEmergencyTamper = !technicianAuthorized;
      res.confidence = 0.99f;
      if (technicianAuthorized) {
        res.family = FaultFamily::NONE;
        res.subCode = FaultSubCode::OK;
      }
      return res;
    }

    if (t.gnssValid && t.geofenceDriftM > AnalyticsConfig::GEOFENCE_RADIUS_M) {
      res.family = FaultFamily::F6_TAMPER_THEFT;
      res.subCode = FaultSubCode::F6_03_GEOFENCE_DISPLACEMENT;
      res.isEmergencyTamper = !technicianAuthorized;
      res.confidence = 0.97f;
      return res;
    }

    if ((t.doorOpened || t.accelGPeak > 2.2f) && !technicianAuthorized) {
      res.family = FaultFamily::F6_TAMPER_THEFT;
      res.subCode = FaultSubCode::F6_01_DOOR_FORCED_OPEN;
      res.isEmergencyTamper = true;
      res.confidence = (t.doorOpened && t.accelGPeak > 1.8f) ? 0.98f : 0.88f;
      return res;
    }

    // 2. KESELAMATAN TERMAL (F5)
    if (t.tempBattC >= ElectricalLimits::TEMP_BATT_HIGH_C) {
      res.family = FaultFamily::F5_THERMAL;
      res.subCode = FaultSubCode::F5_01_BATT_OVERHEAT;
      res.confidence = 0.96f;
      return res;
    }
    if (t.tempSccC >= ElectricalLimits::TEMP_CONTROLLER_HIGH_C ||
        t.tempBoardC >= ElectricalLimits::TEMP_CONTROLLER_HIGH_C) {
      res.family = FaultFamily::F5_THERMAL;
      res.subCode = FaultSubCode::F5_02_CONTROLLER_OVERHEAT;
      res.confidence = 0.95f;
      return res;
    }

    // 3. ANALITIK PENGISIAN SIANG HARI (Regresi + EWMA + F1 / F3)
    if (t.lux >= 8000.0f) {
      res.expectedChargePowerW = computeExpectedChargePower(t.lux, t.tempPanelC, t.socPct);
      res.residualW = t.pvPowerW - res.expectedChargePowerW;

      float sigmaRef = std::max(AnalyticsConfig::EWMA_BASELINE_SIGMA_W, 0.045f * spec_.nominalPanelWp);
      float asymptoteSigma = sigmaRef * std::sqrt(AnalyticsConfig::EWMA_LAMBDA / (2.0f - AnalyticsConfig::EWMA_LAMBDA));
      ewmaZ_ = AnalyticsConfig::EWMA_LAMBDA * res.residualW + (1.0f - AnalyticsConfig::EWMA_LAMBDA) * ewmaZ_;
      res.ewmaZ = ewmaZ_;

      float lowerLimit = -AnalyticsConfig::EWMA_SIGMA_THRESHOLD * asymptoteSigma;
      res.ewmaAlarm = (ewmaZ_ < lowerLimit);

      // Tegangan PV ada (Voc tinggi) tetapi arus pengisian ke baterai nol pada siang hari -> SCC gagal
      if (t.pvVoltageV > (spec_.nominalBatteryV * 1.15f) && t.pvCurrentA < 0.15f && t.socPct < 88.0f) {
        res.family = FaultFamily::F3_SCC_MPPT;
        res.subCode = FaultSubCode::F3_01_SCC_CHARGE_FAIL;
        res.confidence = 0.93f;
        return res;
      }

      // Panel putus total pada cahaya tinggi
      if (t.pvVoltageV < 4.0f && t.lux > 15000.0f) {
        res.family = FaultFamily::F1_PV_SUBSYSTEM;
        res.subCode = FaultSubCode::F1_02_PV_OPEN_CIRCUIT;
        res.ewmaAlarm = true;
        res.confidence = 0.96f;
        return res;
      }

      // Degradasi/teduhan/kotor bertahap tertangkap EWMA
      if (res.ewmaAlarm && t.socPct < 90.0f) {
        res.family = FaultFamily::F1_PV_SUBSYSTEM;
        res.subCode = FaultSubCode::F1_01_PV_SOILING_SHADING;
        res.confidence = 0.89f;
        return res;
      }

      // Lampu tetap menyala pada siang terik
      if (t.loadCurrentA > 0.25f && t.lux > 10000.0f) {
        res.family = FaultFamily::F4_LED_DRIVER;
        res.subCode = FaultSubCode::F4_03_DAYLIGHT_DRIVER_STUCK;
        res.confidence = 0.94f;
        return res;
      }
    }

    // 4. ANALITIK BEBAN MALAM HARI (F4 / F2 / F3)
    if (t.lux < 100.0f) {
      if (t.battVoltageV <= spec_.uvloEnterV) {
        res.family = FaultFamily::F2_BATTERY_BMS;
        res.subCode = FaultSubCode::F2_02_BATT_UVLO_LOCKOUT;
        res.confidence = 0.98f;
        return res;
      }

      if (t.appliedPwmPct >= 20 && t.loadVoltageV > 8.0f && t.loadCurrentA < 0.08f) {
        res.family = FaultFamily::F4_LED_DRIVER;
        res.subCode = FaultSubCode::F4_01_LED_OPEN_CIRCUIT;
        res.confidence = 0.95f;
        return res;
      }

      if (t.appliedPwmPct >= 20 && t.loadVoltageV < 3.0f && t.socPct > 35.0f) {
        res.family = FaultFamily::F3_SCC_MPPT;
        res.subCode = FaultSubCode::F3_02_SCC_LVD_CUTOFF;
        res.confidence = 0.90f;
        return res;
      }

      if (t.loadPowerW > (spec_.ledNominalW * 1.45f)) {
        res.family = FaultFamily::F4_LED_DRIVER;
        res.subCode = FaultSubCode::F4_02_LED_OVERCURRENT_SHORT;
        res.confidence = 0.92f;
        return res;
      }
    }

    // 5. KESEHATAN BATERAI (SoH)
    if (t.sohPct < 78.0f) {
      res.family = FaultFamily::F2_BATTERY_BMS;
      res.subCode = FaultSubCode::F2_01_BATT_SOH_DEGRADATION;
      res.confidence = 0.87f;
      return res;
    }

    return res;
  }

  float currentEwmaZ() const { return ewmaZ_; }

private:
  ProfileSpec spec_;
  float ewmaZ_ = 0.0f;
  uint32_t maintenanceAuthUntil_ = 0;
};

} // namespace rekasurya
