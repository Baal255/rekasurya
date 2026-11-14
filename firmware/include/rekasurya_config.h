#pragma once

/**
 * REKASURYA Firmware Configuration (v2.0-arch)
 * Mengacu pada: ARSITEKTUR BOARD REKASURYA.pdf & Proposal_REKASURYA_Retrofit_v1.pdf
 *
 * CATATAN KONFIGURASI PIN:
 * Pin mapping GPIO ESP32-WROOM-32E di bawah ini menggunakan placeholder yang dapat
 * dikonfigurasi per revisi netlist KiCad/PCB REKASURYA karena skematik final
 * pin-by-pin belum dilampirkan pada PDF arsitektur board.
 */

#include <cstdint>

namespace rekasurya {

// Profil perangkat keras yang didukung oleh satu desain PCB DC REKASURYA (9-60 V input)
enum class DeviceProfile : uint8_t {
  PROFILE_REKASURYA_24V_40AH = 0, // Acuan PJUTS ESDM: 300 Wp, LiFePO4 25.6V 40Ah (1024 Wh), LED 40W
  PROFILE_REKASURYA_24V_50AH = 1, // Acuan Board Diagram: 300 Wp, LiFePO4 25.6V 50Ah (1280 Wh), LED 40W
  PROFILE_RETROFIT_12V_PJUTS = 2, // Varian B Retrofit pada PJUTS eksisting 12.8V 40Ah
  PROFILE_AURORA_BENCH_12V   = 3  // Skala bangku AURORA: 50 Wp, 12.8V 12Ah (153.6 Wh)
};

// Alamat I2C Perangkat Keras sesuai ARSITEKTUR BOARD REKASURYA.pdf
// Bus 1 (Terisolasi via B0303S-1W + ADuM1250): PV & BATT domain terpisah
// Bus 0 (Lokal GND Board = BAT-): LOAD, ADS1115, LM75B, BH1750, DS3231MZ, LIS3DH
struct I2cAddresses {
  static constexpr uint8_t INA228_PV      = 0x40; // Bus maks 85V (menahan Voc dingin 46-48V)
  static constexpr uint8_t INA226_BATT    = 0x41; // Bus maks 36V (kerja 25.6V maks 29.2V)
  static constexpr uint8_t INA226_LOAD    = 0x44; // Bus maks 36V (jalur SCC LOAD -> Buck CC-CV)
  static constexpr uint8_t ADS1115_NTC    = 0x48; // ADC 16-bit untuk 4-5x kanal NTC
  static constexpr uint8_t LM75B_BOARD    = 0x49; // Sensor suhu PCB kontrol
  static constexpr uint8_t BH1750_LUX     = 0x23; // Sensor intensitas cahaya sekitar
  static constexpr uint8_t DS3231MZ_RTC   = 0x68; // RTC presisi untuk stempel waktu saat offline
  static constexpr uint8_t LIS3DH_ACCEL   = 0x19; // Akselerometer getaran/kemiringan (antipencurian)
};

// Nilai Shunt & Batas Proteksi (halaman 2-6 ARSITEKTUR BOARD REKASURYA.pdf)
struct ElectricalLimits {
  static constexpr float SHUNT_PV_MOHM         = 5.0f;   // 2-5 mOhm >= 3W (Isc +-9A)
  static constexpr float SHUNT_BATT_MOHM       = 5.0f;   // 2-5 mOhm >= 3W
  static constexpr float SHUNT_LOAD_MOHM       = 5.0f;   // 2-5 mOhm untuk +-2-3A

  // Undervoltage Lockout (UVLO) board kendali langsung dari baterai (24V system)
  static constexpr float UVLO_24V_ENTER_V      = 22.0f;  // Masuk deep sleep agar tidak menguras baterai
  static constexpr float UVLO_24V_EXIT_V       = 24.2f;  // Bangun kembali setelah pengisian pulih
  static constexpr float UVLO_12V_ENTER_V      = 11.0f;
  static constexpr float UVLO_12V_EXIT_V       = 12.1f;

  // Batas keselamatan termal (derajat Celsius)
  static constexpr float TEMP_BATT_HIGH_C      = 50.0f;
  static constexpr float TEMP_CONTROLLER_HIGH_C= 75.0f;
  static constexpr float TEMP_LED_DERATE_C     = 70.0f;

  // Parameter PWM Dimming Terisolasi via Optocoupler PC817 + N-MOSFET low-side
  static constexpr uint32_t PWM_FREQ_HZ        = 400;    // Rentang desain 200-500 Hz
  static constexpr uint8_t  PWM_MIN_SAFE_PCT   = 25;     // Fail-safe malam: jangan matikan lampu total
  static constexpr uint8_t  PWM_CRUISE_PCT     = 40;     // Mode jalan sepi (hemat otonomi)
  static constexpr uint8_t  PWM_BOOST_PIR_PCT  = 100;    // Saat sensor gerak PIR aktif
};

// Placeholder Pin Mapping ESP32-WROOM-32E (harus diverifikasi terhadap netlist PCB final)
struct PinConfigPlaceholder {
  static constexpr int8_t I2C_SDA_PIN          = 21;
  static constexpr int8_t I2C_SCL_PIN          = 22;
  static constexpr int8_t UART1_LTE_TX_PIN     = 17;
  static constexpr int8_t UART1_LTE_RX_PIN     = 16;
  static constexpr int8_t SPI_FLASH_CS_PIN     = 5;    // W25Q SPI Flash buffer offline
  static constexpr int8_t PWM_PC817_PIN        = 25;   // Output ke anoda optocoupler PC817
  static constexpr int8_t PIR_MOTION_PIN       = 34;   // Input sensor gerak PIR
  static constexpr int8_t DOOR_SWITCH_PIN      = 35;   // Input sakelar pintu kotak IP65 (pull-up + ESD)
  static constexpr int8_t LIS3DH_INT_PIN       = 32;   // Interupsi bangun dari akselerometer
  static constexpr int8_t BUZZER_PIN           = 26;   // Buzzer alarm lokal
  static constexpr int8_t EXT_GPIO_SWITCH_PIN  = 27;   // Extended switching GPIO
  static constexpr int8_t BACKUP_18650_SENSE   = 33;   // Monitor sel cadangan 18650 (power-path)
};

// Parameter Statistik EWMA & Telemetri
struct AnalyticsConfig {
  static constexpr float    EWMA_LAMBDA              = 0.20f;
  static constexpr float    EWMA_SIGMA_THRESHOLD     = 3.0f;
  static constexpr float    EWMA_BASELINE_SIGMA_W    = 6.5f;   // Simpangan baku residu normal (W)
  static constexpr uint32_t SAMPLE_INTERVAL_MS       = 1000;   // Sampling sensor setiap 1 detik
  static constexpr uint32_t UPLINK_NORMAL_INTERVAL_S = 60;     // Kirim MQTT normal per 60 detik
  static constexpr uint32_t UPLINK_TAMPER_INTERVAL_S = 2;      // Alarm darurat <= 10 detik (target)
  static constexpr float    GEOFENCE_RADIUS_M        = 15.0f;  // Radius toleransi drift GNSS
  static constexpr uint32_t WATCHDOG_TIMEOUT_S       = 30;     // Hardware TWDT ESP32
};

struct ProfileSpec {
  DeviceProfile profile;
  float nominalBatteryV;
  float nominalCapacityAh;
  float nominalPanelWp;
  float ledNominalW;
  float uvloEnterV;
  float uvloExitV;
};

inline constexpr ProfileSpec getProfileSpec(DeviceProfile p) {
  switch (p) {
    case DeviceProfile::PROFILE_REKASURYA_24V_40AH:
      return {p, 25.6f, 40.0f, 300.0f, 40.0f, ElectricalLimits::UVLO_24V_ENTER_V, ElectricalLimits::UVLO_24V_EXIT_V};
    case DeviceProfile::PROFILE_REKASURYA_24V_50AH:
      return {p, 25.6f, 50.0f, 300.0f, 40.0f, ElectricalLimits::UVLO_24V_ENTER_V, ElectricalLimits::UVLO_24V_EXIT_V};
    case DeviceProfile::PROFILE_RETROFIT_12V_PJUTS:
      return {p, 12.8f, 40.0f, 150.0f, 30.0f, ElectricalLimits::UVLO_12V_ENTER_V, ElectricalLimits::UVLO_12V_EXIT_V};
    case DeviceProfile::PROFILE_AURORA_BENCH_12V:
    default:
      return {p, 12.8f, 12.0f, 50.0f, 30.0f, ElectricalLimits::UVLO_12V_ENTER_V, ElectricalLimits::UVLO_12V_EXIT_V};
  }
}

} // namespace rekasurya
