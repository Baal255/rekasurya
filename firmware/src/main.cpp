#include "../include/rekasurya_config.h"
#include "../include/rekasurya_types.h"
#include "app/adaptive_dimmer.h"
#include "app/edge_diagnostics.h"
#include "app/offline_buffer.h"
#include "app/sensor_pipeline.h"
#include "hal/mock_hardware_hal.h"
#include <cstdio>
#include <cstring>

namespace rekasurya {

class RekasuryaController {
public:
  RekasuryaController(IHardwareHal& hal, const char* deviceId, DeviceProfile profile,
                      double anchorLat, double anchorLng)
      : hal_(hal),
        deviceId_(deviceId),
        spec_(getProfileSpec(profile)),
        pipeline_(profile, anchorLat, anchorLng),
        diagnostics_(profile),
        dimmer_(profile) {}

  bool boot() {
    if (!hal_.initPeripherals()) {
      return false;
    }
    state_ = FirmwareState::BOOT_SELFTEST;
    hal_.feedWatchdog();
    state_ = FirmwareState::DAY_CHARGING;
    return true;
  }

  void applyRemoteCommand(const RemoteCommand& cmd) {
    if (cmd.maintenanceAuthUntilEpoch > 0) {
      diagnostics_.setMaintenanceWindowUntil(cmd.maintenanceAuthUntilEpoch);
    }
    if (cmd.hasPwmOverride) {
      dimmer_.setRemoteOverride(true, cmd.overridePwmPct, hal_.getRtcEpochSec() + 3600);
    } else if (cmd.testLampPulse60s) {
      dimmer_.setRemoteOverride(true, 100, hal_.getRtcEpochSec() + 60);
    }
  }

  DiagnosticResult stepCycle(uint32_t dtSeconds, bool forceUplink) {
    hal_.feedWatchdog();
    RawSensorFrame raw = hal_.readSensors();
    ValidatedTelemetry telemetry = pipeline_.process(raw, dtSeconds, lastPwmPct_);

    uint8_t targetPwm = dimmer_.computeDutyPct(telemetry);
    telemetry.appliedPwmPct = targetPwm;
    lastPwmPct_ = targetPwm;
    hal_.setLedPwmDutyPct(targetPwm);

    DiagnosticResult diag = diagnostics_.evaluate(telemetry);

    // Pembaruan state machine operasional
    if (diag.isEmergencyTamper) {
      state_ = FirmwareState::TAMPER_EMERGENCY_18650;
      hal_.setBuzzer(true);
    } else if (telemetry.battVoltageV <= spec_.uvloEnterV && !telemetry.onBackupCell) {
      state_ = FirmwareState::UVLO_DEEP_SLEEP;
      hal_.setBuzzer(false);
      hal_.enterDeepSleepSeconds(300);
      return diag;
    } else if (telemetry.lux < 120.0f) {
      hal_.setBuzzer(false);
      state_ = (telemetry.socPct < 30.0f) ? FirmwareState::NIGHT_LOW_SOC_AUTONOMY
                                          : FirmwareState::NIGHT_ACTIVE_PIR;
    } else {
      hal_.setBuzzer(false);
      state_ = FirmwareState::DAY_CHARGING;
    }

    // Uplink atau penyimpanan offline W25Q
    if (forceUplink || diag.isEmergencyTamper || diag.family != FaultFamily::NONE) {
      char payload[512];
      formatJson(payload, sizeof(payload), telemetry, diag);
      char topic[96];
      std::snprintf(topic, sizeof(topic), "rekasurya/v1/%s/%s",
                    deviceId_, diag.isEmergencyTamper ? "alarm" : "telemetry");

      if (!hal_.isMqttConnected() || !hal_.publishMqttJson(topic, payload, 1)) {
        FlashRingRecord rec{};
        rec.telemetry = telemetry;
        rec.diag = diag;
        buffer_.push(hal_, rec);
      } else {
        flushOfflineBuffer();
      }
    }

    return diag;
  }

  uint32_t flushOfflineBuffer() {
    uint32_t sent = 0;
    FlashRingRecord rec{};
    while (hal_.isMqttConnected() && buffer_.pendingCount() > 0) {
      if (!buffer_.popValidated(hal_, rec)) {
        break;
      }
      char payload[512];
      formatJson(payload, sizeof(payload), rec.telemetry, rec.diag);
      char topic[96];
      std::snprintf(topic, sizeof(topic), "rekasurya/v1/%s/replay", deviceId_);
      if (!hal_.publishMqttJson(topic, payload, 1)) {
        buffer_.push(hal_, rec);
        break;
      }
      sent++;
    }
    return sent;
  }

  FirmwareState state() const { return state_; }
  uint32_t bufferedCount() const { return buffer_.pendingCount(); }

private:
  IHardwareHal& hal_;
  const char* deviceId_;
  ProfileSpec spec_;
  SensorPipeline pipeline_;
  EdgeDiagnostics diagnostics_;
  AdaptiveDimmer dimmer_;
  OfflineRingBuffer buffer_;
  FirmwareState state_ = FirmwareState::BOOT_SELFTEST;
  uint8_t lastPwmPct_ = 0;

  void formatJson(char* buf, size_t size, const ValidatedTelemetry& t, const DiagnosticResult& d) const {
    std::snprintf(
        buf, size,
        "{\"device_id\":\"%s\",\"ts\":%u,\"pv_v\":%.2f,\"pv_i\":%.2f,\"batt_v\":%.2f,"
        "\"batt_i\":%.2f,\"soc\":%.1f,\"load_v\":%.2f,\"load_i\":%.2f,\"lux\":%.1f,"
        "\"pwm\":%u,\"ewma_z\":%.2f,\"fault_family\":%u,\"sub_code\":%u,\"tamper\":%s}",
        deviceId_, t.epochSec, t.pvVoltageV, t.pvCurrentA, t.battVoltageV, t.battCurrentA,
        t.socPct, t.loadVoltageV, t.loadCurrentA, t.lux, t.appliedPwmPct, d.ewmaZ,
        static_cast<unsigned>(d.family), static_cast<unsigned>(d.subCode),
        d.isEmergencyTamper ? "true" : "false");
  }
};

} // namespace rekasurya

#ifndef REKASURYA_TEST_NO_MAIN
#if defined(REKASURYA_TARGET_NATIVE)
int main() {
  using namespace rekasurya;
  MockHardwareHal hal(1794646800U);
  RekasuryaController ctrl(hal, "KRA-042", DeviceProfile::PROFILE_REKASURYA_24V_40AH, -7.5962, 110.9508);
  ctrl.boot();

  RawSensorFrame normal{};
  normal.pvVoltageV = 36.8f;
  normal.pvCurrentA = 6.2f;
  normal.battVoltageV = 26.7f;
  normal.battCurrentA = 7.9f;
  normal.loadVoltageV = 25.8f;
  normal.loadCurrentA = 0.0f;
  normal.lux = 78000.0f;
  normal.gnssValid = true;
  normal.gnssLat = -7.5962;
  normal.gnssLng = 110.9508;

  hal.setNextFrame(normal);
  DiagnosticResult res = ctrl.stepCycle(60, true);
  std::printf("[REKASURYA FIRMWARE HOST SIM] State=%d Fault=%u Z=%.2f MsgCount=%zu\n",
              static_cast<int>(ctrl.state()), static_cast<unsigned>(res.subCode),
              res.ewmaZ, hal.publishedMessages().size());
  return 0;
}
#else
void setup() {}
void loop() {}
#endif
#endif
