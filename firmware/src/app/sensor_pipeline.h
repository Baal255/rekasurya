#pragma once

#include "../../include/rekasurya_config.h"
#include "../../include/rekasurya_types.h"
#include <algorithm>
#include <array>
#include <cmath>

namespace rekasurya {

/**
 * Lapis 1 Kecerdasan: Akuisisi, Penyaringan Median, Coulomb Counting SoC,
 * Estimasi Geofence Haversine, dan Validasi Batas Fisik.
 */
class SensorPipeline {
public:
  explicit SensorPipeline(DeviceProfile profile, double anchorLat, double anchorLng)
      : spec_(getProfileSpec(profile)), anchorLat_(anchorLat), anchorLng_(anchorLng) {}

  void setInitialSoc(float socPct, float sohPct) {
    socPct_ = std::clamp(socPct, 0.0f, 100.0f);
    sohPct_ = std::clamp(sohPct, 20.0f, 100.0f);
  }

  ValidatedTelemetry process(const RawSensorFrame& raw, uint32_t dtSeconds, uint8_t currentPwmPct) {
    pushWindow(pvVWin_, raw.pvVoltageV);
    pushWindow(pvIWin_, raw.pvCurrentA);
    pushWindow(battVWin_, raw.battVoltageV);
    pushWindow(battIWin_, raw.battCurrentA);
    pushWindow(loadIWin_, raw.loadCurrentA);
    pushWindow(luxWin_, raw.lux);

    sampleCount_++;

    ValidatedTelemetry out{};
    out.epochSec = raw.epochSec;
    out.pvVoltageV = std::max(0.0f, median5(pvVWin_));
    out.pvCurrentA = std::max(0.0f, median5(pvIWin_));
    out.pvPowerW = out.pvVoltageV * out.pvCurrentA;

    out.battVoltageV = std::max(0.0f, median5(battVWin_));
    out.battCurrentA = median5(battIWin_);
    out.battPowerW = out.battVoltageV * out.battCurrentA;

    out.loadVoltageV = std::max(0.0f, raw.loadVoltageV);
    out.loadCurrentA = std::max(0.0f, median5(loadIWin_));
    out.loadPowerW = out.loadVoltageV * out.loadCurrentA;

    out.tempPanelC = clampPhysicalTemp(raw.tempPanelC);
    out.tempBattC = clampPhysicalTemp(raw.tempBattC);
    out.tempSccC = clampPhysicalTemp(raw.tempSccC);
    out.tempDriverC = clampPhysicalTemp(raw.tempDriverC);
    out.tempBoardC = clampPhysicalTemp(raw.tempBoardC);
    out.lux = std::clamp(median5(luxWin_), 0.0f, 150000.0f);

    out.pirTriggered = raw.pirTriggered;
    out.doorOpened = raw.doorOpened;
    out.accelGPeak = raw.accelGPeak;
    out.backupCellV = raw.backupCellV;
    out.onBackupCell = (out.battVoltageV < 3.0f && out.backupCellV >= 3.2f);
    out.appliedPwmPct = currentPwmPct;

    // Validasi rentang sensor (kewarasan fisik)
    out.validMask = std::isfinite(out.pvVoltageV) && std::isfinite(out.battVoltageV) &&
                    std::isfinite(out.lux) && out.pvVoltageV <= 85.0f;

    // Coulomb counting dengan pembaruan SoC + koreksi OCV saat istirahat
    if (dtSeconds > 0 && !out.onBackupCell) {
      float effectiveCapacityAh = spec_.nominalCapacityAh * (sohPct_ / 100.0f);
      if (effectiveCapacityAh > 1.0f) {
        float deltaAh = (out.battCurrentA * static_cast<float>(dtSeconds)) / 3600.0f;
        socPct_ = std::clamp(socPct_ + (deltaAh / effectiveCapacityAh) * 100.0f, 0.0f, 100.0f);
      }
      // Koreksi tegangan open-circuit ringan bila arus sangat kecil (<0.15 A)
      if (std::fabs(out.battCurrentA) < 0.15f && out.battVoltageV > 8.0f) {
        float perCellV = out.battVoltageV / (spec_.nominalBatteryV > 18.0f ? 8.0f : 4.0f);
        float ocvSoc = std::clamp((perCellV - 3.00f) / (3.40f - 3.00f) * 100.0f, 0.0f, 100.0f);
        socPct_ = 0.85f * socPct_ + 0.15f * ocvSoc;
      }
    }

    out.socPct = socPct_;
    out.sohPct = sohPct_;

    out.gnssValid = raw.gnssValid;
    out.gnssLat = raw.gnssLat;
    out.gnssLng = raw.gnssLng;
    if (raw.gnssValid) {
      out.geofenceDriftM = haversineMeters(anchorLat_, anchorLng_, raw.gnssLat, raw.gnssLng);
    }

    return out;
  }

private:
  ProfileSpec spec_;
  double anchorLat_;
  double anchorLng_;
  float socPct_ = 78.0f;
  float sohPct_ = 96.0f;
  uint32_t sampleCount_ = 0;

  std::array<float, 5> pvVWin_{};
  std::array<float, 5> pvIWin_{};
  std::array<float, 5> battVWin_{};
  std::array<float, 5> battIWin_{};
  std::array<float, 5> loadIWin_{};
  std::array<float, 5> luxWin_{};

  void pushWindow(std::array<float, 5>& w, float val) {
    if (sampleCount_ == 0) {
      w.fill(val);
      return;
    }
    for (size_t i = 0; i < 4; ++i) {
      w[i] = w[i + 1];
    }
    w[4] = val;
  }

  static float median5(const std::array<float, 5>& w) {
    std::array<float, 5> copy = w;
    std::sort(copy.begin(), copy.end());
    return copy[2];
  }

  static float clampPhysicalTemp(float t) {
    if (!std::isfinite(t) || t < -20.0f || t > 130.0f) {
      return 28.0f;
    }
    return t;
  }

  static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
    constexpr double kEarthRadiusM = 6371000.0;
    constexpr double kDegToRad = 3.14159265358979323846 / 180.0;
    double dLat = (lat2 - lat1) * kDegToRad;
    double dLon = (lon2 - lon1) * kDegToRad;
    double a = std::sin(dLat / 2.0) * std::sin(dLat / 2.0) +
               std::cos(lat1 * kDegToRad) * std::cos(lat2 * kDegToRad) *
               std::sin(dLon / 2.0) * std::sin(dLon / 2.0);
    double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));
    return kEarthRadiusM * c;
  }
};

} // namespace rekasurya
