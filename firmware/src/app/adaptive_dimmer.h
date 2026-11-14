#pragma once

#include "../../include/rekasurya_config.h"
#include "../../include/rekasurya_types.h"
#include <algorithm>

namespace rekasurya {

/**
 * Lapis 5 Kecerdasan & Fail-Safe Keselamatan Publik:
 * Mengatur sinyal PWM (200-500 Hz via optocoupler PC817 ke N-MOSFET low-side LED-).
 * Prinsip fail-safe: pada malam hari (lux < 50), lampu tidak pernah dimatikan akibat
 * kegagalan koneksi LTE, error model AI, atau perintah tidak valid; minimal tetap
 * menyala pada PWM_MIN_SAFE_PCT (25%) kecuali UVLO perangkat keras tercapai.
 */
class AdaptiveDimmer {
public:
  explicit AdaptiveDimmer(DeviceProfile profile) : spec_(getProfileSpec(profile)) {}

  void setRemoteOverride(bool active, uint8_t pct, uint32_t untilEpoch) {
    overrideActive_ = active;
    overridePct_ = std::clamp(pct, ElectricalLimits::PWM_MIN_SAFE_PCT, static_cast<uint8_t>(100));
    overrideUntil_ = untilEpoch;
  }

  uint8_t computeDutyPct(const ValidatedTelemetry& t) {
    // Siang hari: lampu wajib mati
    if (t.lux >= 120.0f) {
      return 0;
    }

    // Proteksi UVLO baterai keras
    if (t.battVoltageV <= spec_.uvloEnterV || t.onBackupCell) {
      return 0;
    }

    // Perintah jarak jauh yang masih dalam batas masa berlaku & aturan aman
    if (overrideActive_ && t.epochSec <= overrideUntil_) {
      return overridePct_;
    }

    uint8_t target = ElectricalLimits::PWM_CRUISE_PCT;

    // Jika baterai kritis (<30% SoC), perketat mode hemat untuk bertahan melewati 2 malam mendung
    if (t.socPct < 30.0f) {
      target = t.pirTriggered ? 75 : ElectricalLimits::PWM_MIN_SAFE_PCT;
    } else if (t.socPct < 55.0f) {
      target = t.pirTriggered ? 90 : 35;
    } else {
      target = t.pirTriggered ? ElectricalLimits::PWM_BOOST_PIR_PCT : 45;
    }

    // Thermal derating jika driver atau LED terlalu panas
    if (t.tempDriverC >= ElectricalLimits::TEMP_LED_DERATE_C) {
      target = std::min(target, static_cast<uint8_t>(50));
    }

    return std::clamp(target, ElectricalLimits::PWM_MIN_SAFE_PCT, static_cast<uint8_t>(100));
  }

private:
  ProfileSpec spec_;
  bool overrideActive_ = false;
  uint8_t overridePct_ = 50;
  uint32_t overrideUntil_ = 0;
};

} // namespace rekasurya
