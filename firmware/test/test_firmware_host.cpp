#define REKASURYA_TEST_NO_MAIN
#include "../src/main.cpp"
#include <cassert>
#include <cstdio>

int main() {
  using namespace rekasurya;

  // 1. Pengujian Normal Siang Hari
  {
    MockHardwareHal hal(1794646800U);
    RekasuryaController ctrl(hal, "SKH-107", DeviceProfile::PROFILE_REKASURYA_24V_40AH, -7.6815, 110.8351);
    assert(ctrl.boot());
    RawSensorFrame f{};
    f.pvVoltageV = 37.2f;
    f.pvCurrentA = 6.5f;
    f.battVoltageV = 26.8f;
    f.battCurrentA = 8.4f;
    f.loadVoltageV = 25.6f;
    f.loadCurrentA = 0.0f;
    f.lux = 82000.0f;
    f.gnssValid = true;
    f.gnssLat = -7.6815;
    f.gnssLng = 110.8351;
    hal.setNextFrame(f);
    DiagnosticResult d = ctrl.stepCycle(60, true);
    assert(d.family == FaultFamily::NONE);
    assert(hal.lastPwmPct() == 0);
    assert(!hal.isBuzzerOn());
    assert(hal.publishedMessages().size() == 1);
  }

  // 2. Pengujian Buffer Offline W25Q + Replay saat MQTT kembali online
  {
    MockHardwareHal hal(1794646800U);
    RekasuryaController ctrl(hal, "KRA-042", DeviceProfile::PROFILE_REKASURYA_24V_40AH, -7.5962, 110.9508);
    ctrl.boot();
    hal.setMqttOnline(false);

    RawSensorFrame f{};
    f.pvVoltageV = 35.0f;
    f.pvCurrentA = 1.2f; // drop arus signifikan
    f.battVoltageV = 25.4f;
    f.battCurrentA = 1.4f;
    f.lux = 80000.0f;
    hal.setNextFrame(f);
    for (int i = 0; i < 6; ++i) {
      hal.advanceTime(60);
      ctrl.stepCycle(60, true);
    }
    assert(ctrl.bufferedCount() == 6);
    assert(hal.publishedMessages().empty());

    hal.setMqttOnline(true);
    uint32_t flushed = ctrl.flushOfflineBuffer();
    assert(flushed == 6);
    assert(ctrl.bufferedCount() == 0);
    assert(hal.publishedMessages().size() == 6);
  }

  // 3. Pengujian Antipencurian 18650 Backup & Sesi Teknisi Terautentikasi
  {
    MockHardwareHal hal(1794646800U);
    RekasuryaController ctrl(hal, "SRG-009", DeviceProfile::PROFILE_REKASURYA_24V_40AH, -7.4281, 111.0214);
    ctrl.boot();
    RawSensorFrame theft{};
    theft.battVoltageV = 0.0f; // baterai utama dicabut
    theft.backupCellV = 4.08f; // sel 18650 menjaga LTE/GNSS tetap hidup
    theft.doorOpened = true;
    theft.accelGPeak = 3.1f;
    theft.gnssValid = true;
    theft.gnssLat = -7.4284;
    theft.gnssLng = 111.0216;
    hal.setNextFrame(theft);
    DiagnosticResult d = ctrl.stepCycle(5, true);
    assert(d.family == FaultFamily::F6_TAMPER_THEFT);
    assert(d.isEmergencyTamper);
    assert(ctrl.state() == FirmwareState::TAMPER_EMERGENCY_18650);
    assert(hal.isBuzzerOn());

    // Aktivasi sesi teknisi terautentikasi pada jendela waktu yang sama
    RemoteCommand auth{};
    auth.maintenanceAuthUntilEpoch = hal.getRtcEpochSec() + 1800;
    ctrl.applyRemoteCommand(auth);
    RawSensorFrame techDoor{};
    techDoor.battVoltageV = 26.2f;
    techDoor.doorOpened = true;
    techDoor.accelGPeak = 1.4f;
    techDoor.lux = 50000.0f;
    techDoor.pvVoltageV = 36.0f;
    techDoor.pvCurrentA = 5.0f;
    techDoor.gnssValid = true;
    techDoor.gnssLat = -7.4281;
    techDoor.gnssLng = 111.0214;
    hal.setNextFrame(techDoor);
    DiagnosticResult dTech = ctrl.stepCycle(5, true);
    assert(!dTech.isEmergencyTamper);
    assert(!hal.isBuzzerOn());
  }

  // 4. Pengujian Fail-safe Dimmer Malam Hari & UVLO
  {
    MockHardwareHal hal(1794646800U);
    RekasuryaController ctrl(hal, "SOL-001", DeviceProfile::PROFILE_REKASURYA_24V_40AH, -7.5681, 110.8280);
    ctrl.boot();
    RawSensorFrame night{};
    night.lux = 2.0f;
    night.battVoltageV = 25.8f;
    night.battCurrentA = -1.5f;
    night.loadVoltageV = 25.5f;
    night.loadCurrentA = 1.55f;
    night.pirTriggered = true;
    hal.setNextFrame(night);
    ctrl.stepCycle(60, true);
    assert(hal.lastPwmPct() >= ElectricalLimits::PWM_MIN_SAFE_PCT);

    // Uji UVLO (< 22V) -> masuk deep sleep
    night.battVoltageV = 21.6f;
    hal.setNextFrame(night);
    ctrl.stepCycle(60, true);
    assert(ctrl.state() == FirmwareState::UVLO_DEEP_SLEEP);
    assert(hal.deepSleepRequested());
    assert(hal.lastPwmPct() == 0);
  }

  std::printf("SEMUA PENGUJIAN UNIT FIRMWARE HOST LULUS (4/4 skenario).\n");
  return 0;
}
