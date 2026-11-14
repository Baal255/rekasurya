#pragma once

#include "../../include/hal/i_hardware_hal.h"
#include <array>
#include <cstring>
#include <string>
#include <vector>

namespace rekasurya {

/**
 * Adaptor Perangkat Keras Mock untuk pengujian deterministik di host/CI
 * ketika papan PCB REKASURYA fisik belum terpasang.
 */
class MockHardwareHal : public IHardwareHal {
public:
  static constexpr uint32_t FLASH_SLOTS = 64;
  static constexpr uint32_t SLOT_BYTES = 512;

  explicit MockHardwareHal(uint32_t startEpoch = 1794646800U) : currentEpoch_(startEpoch) {
    for (auto& slot : flashStorage_) {
      slot.fill(0xFF);
    }
  }

  bool initPeripherals() override {
    initialized_ = true;
    return true;
  }

  void setNextFrame(const RawSensorFrame& frame) {
    nextFrame_ = frame;
    nextFrame_.epochSec = currentEpoch_;
  }

  void advanceTime(uint32_t seconds) {
    currentEpoch_ += seconds;
    nextFrame_.epochSec = currentEpoch_;
  }

  void setMqttOnline(bool online) { mqttOnline_ = online; }

  RawSensorFrame readSensors() override {
    nextFrame_.epochSec = currentEpoch_;
    return nextFrame_;
  }

  void setLedPwmDutyPct(uint8_t dutyPct) override { lastPwmPct_ = dutyPct; }
  void setBuzzer(bool enabled) override { buzzerOn_ = enabled; }

  bool publishMqttJson(const char* topic, const char* jsonPayload, uint8_t /*qos*/) override {
    if (!mqttOnline_) {
      return false;
    }
    publishedMessages_.push_back({std::string(topic), std::string(jsonPayload)});
    return true;
  }

  bool isMqttConnected() const override { return mqttOnline_; }

  bool writeFlashSlot(uint32_t slotIndex, const uint8_t* data, uint32_t len) override {
    if (slotIndex >= FLASH_SLOTS || len > SLOT_BYTES) {
      return false;
    }
    flashStorage_[slotIndex].fill(0x00);
    std::memcpy(flashStorage_[slotIndex].data(), data, len);
    return true;
  }

  bool readFlashSlot(uint32_t slotIndex, uint8_t* outData, uint32_t len) override {
    if (slotIndex >= FLASH_SLOTS || len > SLOT_BYTES) {
      return false;
    }
    std::memcpy(outData, flashStorage_[slotIndex].data(), len);
    return true;
  }

  void feedWatchdog() override { watchdogFeeds_++; }
  void enterDeepSleepSeconds(uint32_t seconds) override {
    deepSleepRequested_ = true;
    lastSleepSeconds_ = seconds;
  }

  uint32_t getRtcEpochSec() const override { return currentEpoch_; }

  // Akses inspeksi untuk uji unit
  bool isInitialized() const { return initialized_; }
  uint8_t lastPwmPct() const { return lastPwmPct_; }
  bool isBuzzerOn() const { return buzzerOn_; }
  bool deepSleepRequested() const { return deepSleepRequested_; }
  uint32_t watchdogFeeds() const { return watchdogFeeds_; }
  const std::vector<std::pair<std::string, std::string>>& publishedMessages() const {
    return publishedMessages_;
  }
  void clearPublished() { publishedMessages_.clear(); }

private:
  uint32_t currentEpoch_;
  bool initialized_ = false;
  bool mqttOnline_ = true;
  uint8_t lastPwmPct_ = 0;
  bool buzzerOn_ = false;
  bool deepSleepRequested_ = false;
  uint32_t lastSleepSeconds_ = 0;
  uint32_t watchdogFeeds_ = 0;
  RawSensorFrame nextFrame_{};
  std::array<std::array<uint8_t, SLOT_BYTES>, FLASH_SLOTS> flashStorage_{};
  std::vector<std::pair<std::string, std::string>> publishedMessages_;
};

} // namespace rekasurya
