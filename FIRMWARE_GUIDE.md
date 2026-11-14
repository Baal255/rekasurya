# PANDUAN ARSITEKTUR FIRMWARE — REKASURYA (`ESP32-WROOM-32E`)

> **Peringatan Jujur Pengujian Fisik:** Firmware dalam folder `firmware/` telah disusun secara modular berdasarkan `ARSITEKTUR BOARD REKASURYA.pdf` dan dapat diinstansiasi memakai `MockHardwareHal`. **Firmware ini belum dikompilasi di mesin lokal (tidak tersedia compiler C++ / PlatformIO lokal) dan belum diuji pada perangkat keras fisik.**

---

## 1. Struktur Modul (`firmware/`)

```
firmware/
├── platformio.ini                 # Target ESP32 Arduino + native host test env
├── include/
│   ├── rekasurya_config.h         # Profil 24V 40Ah/50Ah & 12V, alamat I2C, batas UVLO/termal, placeholder pin
│   ├── rekasurya_types.h          # Enum FirmwareState, FaultFamily F1-F6, FaultSubCode, RawSensorFrame
│   └── hal/
│       └── i_hardware_hal.h       # Antarmuka abstrak I2C/SPI/UART/PWM/W25Q/Watchdog
├── src/
│   ├── hal/mock_hardware_hal.h    # Adaptor mock deterministik untuk uji logika tanpa board fisik
│   ├── app/
│   │   ├── sensor_pipeline.h      # Validasi rentang fisik 3 kanal, SoC/SoH, & hitung geofence Haversine
│   │   ├── edge_diagnostics.h     # EWMA lokal, klasifikasi F1-F6, & peredaman alarm selama otorisasi teknisi
│   │   ├── adaptive_dimmer.h      # Kontrol PWM PC817 (200-500 Hz) dengan proteksi UVLO & derating suhu
│   │   └── offline_buffer.h       # Store-and-forward ring buffer Flash W25Q dengan integritas CRC-16
│   └── main.cpp                   # Kelas pengendali utama RekasuryaController
└── test/
    └── test_firmware_host.cpp     # Skenario unit test host (C++17)
```

---

## 2. Alur Eksekusi `RekasuryaController` (`firmware/src/main.cpp`)

1. **`boot()`:** Memanggil `hal_.initPeripherals()`, menyegarkan *Task Watchdog Timer* (`feedWatchdog()`), dan berpindah dari `BOOT_SELFTEST` ke mode operasional.
2. **`stepCycle(dtSeconds, forceUplink)`:**
   - **Akuisisi & Validasi:** Membaca `RawSensorFrame` lalu menghitung daya nyata PV (`INA228`), BATT (`INA226`), LOAD (`INA226`), 5 suhu (`ADS1115 NTC` + `LM75B`), intensitas cahaya `BH1750`, getaran `LIS3DH`, pintu kotak IP65, sel cadangan `18650`, dan koordinat GNSS.
   - **Peredupan Aman (`AdaptiveDimmer`):** Menetapkan duty cycle `PWM` optocoupler `PC817` (400 Hz). Mematikan beban saat siang (`lux >= 120`), menjaga batas minimal aman `PWM_MIN_SAFE_PCT` (25%) pada malam hari, melakukan *boost* ke 100% saat PIR aktif, serta mengunci ke 0% jika baterai mencapai ambang **UVLO** (`22,0 V` pada sistem 24 V; `11,0 V` pada sistem 12 V).
   - **Diagnostik Tepi (`EdgeDiagnostics`):** Mengevaluasi `F1–F6` termasuk transisi cepat `TAMPER_EMERGENCY_18650` (mengaktifkan buzzer lokal dan memaksa publikasi MQTT QoS 1).
   - **Buffer Offline `W25Q` (`OfflineRingBuffer`):** Jika modem `LTE Cat-1` terputus, frame berserta stempel waktu `DS3231MZ` dikemas dengan checksum `CRC-16` (`0x1021`) dan disimpan ke slot ring buffer 64-entry, lalu dikirim berurutan via `flushOfflineBuffer()` begitu broker MQTT tersambung kembali.

---

## 3. Daftar Penyesuaian Wajib Sebelum Flashing PCB Pertama

Seluruh konstanta pada `PinConfigPlaceholder` (`firmware/include/rekasurya_config.h` baris 64–77) wajib dicocokkan terhadap *netlist* KiCad/Altium final (pin SDA/SCL terisolasi vs lokal, UART1 TX/RX modem LTE Cat-1, CS SPI Flash W25Q, GPIO output anoda `PC817`, serta pin interupsi `LIS3DH`).
