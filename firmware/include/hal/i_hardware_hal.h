#pragma once

#include "../rekasurya_types.h"
#include <cstdint>

namespace rekasurya {

/**
 * Antarmuka Abstraksi Perangkat Keras (HAL) REKASURYA.
 * Memisahkan driver fisik (INA228, INA226, ADS1115, BH1750, DS3231MZ, LIS3DH,
 * W25Q, Modem LTE Cat-1/MQTT, Optocoupler PC817) dari logika aplikasi firmware.
 */
class IHardwareHal {
public:
  virtual ~IHardwareHal() = default;

  // Inisialisasi bus I2C (terisolasi & lokal), SPI Flash W25Q, UART1 LTE, dan PWM PC817
  virtual bool initPeripherals() = 0;

  // Membaca seluruh sensor untuk 1 siklus akuisisi (1 Hz)
  virtual RawSensorFrame readSensors() = 0;

  // Mengirim sinyal PWM dimming 200-500 Hz ke anoda optocoupler PC817
  virtual void setLedPwmDutyPct(uint8_t dutyPct) = 0;

  // Mengaktifkan atau mematikan buzzer alarm lokal di tiang
  virtual void setBuzzer(bool enabled) = 0;

  // Mengirim payload telemetri / alarm via MQTT (LTE Cat-1)
  virtual bool publishMqttJson(const char* topic, const char* jsonPayload, uint8_t qos) = 0;

  // Memeriksa apakah uplink LTE Cat-1 + MQTT broker aktif
  virtual bool isMqttConnected() const = 0;

  // Operasi SPI Flash eksternal W25Q untuk ring buffer offline
  virtual bool writeFlashSlot(uint32_t slotIndex, const uint8_t* data, uint32_t len) = 0;
  virtual bool readFlashSlot(uint32_t slotIndex, uint8_t* outData, uint32_t len) = 0;

  // Watchdog & Deep Sleep (saat UVLO < 22V pada sistem 24V)
  virtual void feedWatchdog() = 0;
  virtual void enterDeepSleepSeconds(uint32_t seconds) = 0;

  // Waktu monotonic & epoch dari RTC DS3231MZ
  virtual uint32_t getRtcEpochSec() const = 0;
};

} // namespace rekasurya
