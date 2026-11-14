# REKASURYA — Platform Diagnostik, Pemeliharaan & Penghematan Energi PJUTS Solo Raya

> **Status Sistem & Keterbukaan Kejujuran Demo**
> - **Data Telemetri:** Menjalankan **MODE DEMO · DATA SIMULASI** terkalibrasi fisika (18 tiang pada 5 koridor wilayah Solo Raya). Belum terhubung ke hardware lapangan secara fisik.
> - **Layanan AI:** Menggunakan **AI ADAPTER SIMULASI (`MOCK_EWMA_DETERMINISTIC`)** berbasis kontrak JSON ketat `AI-CONTRACT-v1.0.0`, menunggu endpoint PoC Python eksternal (`REKASURYA_AI_SERVICE_URL`).
> - **Aduan Warga:** Modul internal terinspirasi alur pelayanan **ULAS Surakarta** dengan data warga simulasi — **bukan integrasi resmi** sistem Pemerintah Kota Surakarta.
> - **Firmware C++:** Terstruktur dengan Hardware Abstraction Layer (`IHardwareHal`) dan `MockHardwareHal`; belum dikompilasi/diuji pada board fisik ESP32-WROOM-32E karena keterbatasan toolchain lokal serta belum tersedianya skematik pinout PCB final.

---

## Ringkasan Nilai Operasional

REKASURYA berfokus mengubah telemetri energi surya menjadi **tindakan pemeliharaan terarah**, bukan sekadar grafik sensor pasif. Alur inti platform meliputi:

**DETEKSI GANGGUAN (F1–F6) → LOKALISASI KOMPONEN → WORK ORDER & SUKU CADANG → CHECK-IN TEKNISI (OTORISASI PANEL) → VERIFIKASI PEMULIHAN TELEMETRI → PENGUKURAN DAMPAK (kWh / Rp / CO₂e)**

### Kemampuan Utama yang Diimplementasikan

1. **Dashboard Peta & Armada Solo Raya (`/`):** Peta GIS interaktif 5 koridor (Surakarta, Sukoharjo, Karanganyar, Klaten, Sragen), filter koridor & status, tabel triase 3-kanal (`INA228` PV 85 V, `INA226` Baterai & Beban, `EWMA Z`, sel cadangan `18650`), serta antrean suku cadang aktif.
2. **Diagnostik 3-Kanal Terisolasi (`/devices/[id]`):** Diagram blok PCB sesuai *ARSITEKTUR BOARD REKASURYA.pdf*, grafik 48 jam Peta Kendali `EWMA` vs daya ekspektasi vs `SoC`/suhu `NTC` 5 kanal, tabel korelasi spasial tiang tetangga satu koridor, dan panel perintah jarak jauh aman `UVLO`/derating termal.
3. **Manajemen Work Order, Suku Cadang & Kanal Aduan Warga (`/work-orders`):** Siklus `OPEN → ASSIGNED → IN_PROGRESS (Check-In GPS + Otorisasi Buka Panel 90 menit) → VERIFIED (wajib lolos pemeriksaan telemetri normal) → CLOSED`, plus modul simulasi aduan warga dengan pencocokan spasial Haversine ke tiang terdekat.
4. **Kalkulator Penghematan 2-Aliran & Kepatuhan Regulasi (`/energy`):** Memisahkan **Aliran 1 (Konversi PLN → Surya)** dari **Aliran 2 (Efisiensi O&M PJUTS Warisan)** dengan matriks perbandingan 4 jenis lampu (`SON-T 250 W`, `Merkuri 150 W`, `LED 100 W`, `LED 60 W`), konteks pendanaan PP No. 4/2023 ($\ge 10\%$ PBJT-TL), serta matriks Permenhub PM 47/2023 & SNI 7391:2008.
5. **Laboratorium Injeksi Gangguan & Cuaca Koridor (`/simulator`):** 8 skenario uji fisika termasuk pembuktian peredaman alarm palsu cuaca seruas (`WEATHER_CORRIDOR_CLOUDY`).
6. **Arsitektur, Kontrak AI & Audit Log SHA-256 (`/architecture`):** Penguji JSON langsung `POST /api/ai/infer`, tabel resolusi konflik spesifikasi, tautan model 3D referensi kit (*Claude Artifact*), dan verifikator rantai hash `audit_log`.

---

## Panduan Menjalankan Secara Lokal

### Prasyarat
- Node.js 22+ / 24+ dan npm.
- Dependency SQLite: `better-sqlite3` dipin tepat ke versi `13.0.3` untuk stabilitas native addon di Windows maupun Linux (Vercel).

### Perintah Pengembangan & Uji

```bash
npm install
npm run seed         # Membangun basis data awal seed/rekasurya-seed.db
npm run typecheck    # Pemeriksaan tipe TypeScript (tsc --noEmit)
npm test             # Menjalankan rangkaian uji Vitest (tests/rekasurya.test.ts)
npm run dev          # Server pengembangan http://localhost:3000
npm run build        # Membangun seed + kompilasi produksi Next.js
npm run start        # Menjalankan server produksi lokal
```

---

## Indeks Dokumentasi Lengkap

| Dokumen | Cakupan |
| :--- | :--- |
| [ARCHITECTURE.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/ARCHITECTURE.md) | Arsitektur full-stack, skema basis data SQLite, alur data, dan rantai hash audit |
| [HARDWARE_REQUIREMENTS_AND_CONFLICTS.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/HARDWARE_REQUIREMENTS_AND_CONFLICTS.md) | Verifikasi komponen PCB, delta AURORA → REKASURYA, 7 konflik dokumen & batas fisik |
| [RESEARCH_AND_UX_BENCHMARK.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/RESEARCH_AND_UX_BENCHMARK.md) | Riset platform IIoT & adaptasi alur layanan ULAS Surakarta |
| [DESIGN_SYSTEM.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/DESIGN_SYSTEM.md) | Sistem desain SCADA/NOC anti-AI-slop, palet, tipografi tabular, & pola interaksi |
| [API_DOCUMENTATION.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/API_DOCUMENTATION.md) | Referensi 14 endpoint REST API App Router + skema permintaan/respons |
| [AI_INTEGRATION_CONTRACT.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/AI_INTEGRATION_CONTRACT.md) | Spesifikasi ketat `AI-CONTRACT-v1.0.0`, taksonomi `F1–F6`, dan adaptor failover |
| [FIRMWARE_GUIDE.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/FIRMWARE_GUIDE.md) | Arsitektur modular firmware ESP32-WROOM-32E, HAL, state machine, & ring buffer W25Q |
| [TEST_REPORT.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/TEST_REPORT.md) | Laporan bukti pengujian TypeScript, Vitest, Build, QA Browser, dan keterbatasan firmware |
| [DEPLOYMENT_GUIDE.md](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/DEPLOYMENT_GUIDE.md) | Arsitektur deployment GitHub CI, Vercel + `/tmp` SQLite copy, dan keamanan repo |
