#pragma once

#include "../../include/hal/i_hardware_hal.h"
#include "../../include/rekasurya_types.h"
#include <cstddef>
#include <cstdint>
#include <vector>

namespace rekasurya {

/**
 * Penyangga Offline SPI Flash W25Q (Store-and-Forward):
 * Menyimpan frame telemetri dengan CRC-16 saat sinyal LTE Cat-1 terputus,
 * lalu mengirim ulang secara berurutan ketika broker MQTT kembali online.
 */
class OfflineRingBuffer {
public:
  static constexpr uint32_t CAPACITY = 64;

  bool push(IHardwareHal& hal, FlashRingRecord record) {
    record.sequence = nextSeq_++;
    record.crc16 = computeCrc16(reinterpret_cast<const uint8_t*>(&record),
                                offsetof(FlashRingRecord, crc16));
    if (!hal.writeFlashSlot(head_, reinterpret_cast<const uint8_t*>(&record), sizeof(FlashRingRecord))) {
      return false;
    }
    head_ = (head_ + 1) % CAPACITY;
    if (count_ == CAPACITY) {
      tail_ = (tail_ + 1) % CAPACITY; // Timpa data tertua saat penuh
    } else {
      count_++;
    }
    return true;
  }

  bool popValidated(IHardwareHal& hal, FlashRingRecord& outRecord) {
    if (count_ == 0) {
      return false;
    }
    if (!hal.readFlashSlot(tail_, reinterpret_cast<uint8_t*>(&outRecord), sizeof(FlashRingRecord))) {
      return false;
    }
    uint16_t expected = computeCrc16(reinterpret_cast<const uint8_t*>(&outRecord),
                                     offsetof(FlashRingRecord, crc16));
    tail_ = (tail_ + 1) % CAPACITY;
    count_--;
    return expected == outRecord.crc16;
  }

  uint32_t pendingCount() const { return count_; }

  static uint16_t computeCrc16(const uint8_t* data, uint32_t length) {
    uint16_t crc = 0xFFFF;
    for (uint32_t i = 0; i < length; ++i) {
      crc ^= static_cast<uint16_t>(data[i]) << 8;
      for (int bit = 0; bit < 8; ++bit) {
        if (crc & 0x8000) {
          crc = static_cast<uint16_t>((crc << 1) ^ 0x1021);
        } else {
          crc = static_cast<uint16_t>(crc << 1);
        }
      }
    }
    return crc;
  }

private:
  uint32_t head_ = 0;
  uint32_t tail_ = 0;
  uint32_t count_ = 0;
  uint32_t nextSeq_ = 1;
};

} // namespace rekasurya
