# LAPORAN PENGUJIAN & VERIFIKASI — REKASURYA

Tanggal Pelaksanaan: **14 November 2026**  
Cakupan Uji: **TypeScript Static Check, Unit & Integration Tests (Vitest), Build Produksi Next.js 16 + Seed SQLite, QA Browser Multi-Viewport (`http://localhost:3000`), dan Status Toolchain Firmware.**

---

## Ringkasan Eksekutif

| Lapisan Sistem | Perintah / Metode | Status | Bukti Teramati |
| :--- | :--- | :--- | :--- |
| TypeScript & Skema | `npm run typecheck` (`tsc --noEmit`) | **LULUS (0 error)** | Exit code `0` mencakup seluruh modul `src/`, `scripts/`, dan `tests/`. |
| Domain, AI Contract & API DB Logic | `npm test` (`vitest run`) | **LULUS (7/7 uji)** | `tests/rekasurya.test.ts`: 7 pengujian lulus dalam `248 ms` (total durasi `898 ms`). |
| Build Seed & Bundle Produksi | `npm run build` (`prebuild` + `next build`) | **LULUS** | `seed/rekasurya-seed.db` (`0,27 MB`) terbuat; Next.js `16.3.8 (Turbopack)` mengompilasi semua 6 halaman & 14 API route. |
| QA Browser Multi-Viewport | `npx next start -p 3000` + `browser` subagent | **LULUS** | Origin terverifikasi `http://localhost:3000` (`blocked_origins: none`), diuji pada Desktop `1440×900`, Tablet `768×1024`, dan Mobile `390×844`. |
| Firmware C++ (`firmware/`) | Pemeriksaan toolchain `where.exe g++ clang++ gcc pio cl` | **NOT RUN (Toolchain Lokal Kosong)** | Belum ada compiler C++ / PlatformIO di mesin Windows lokal. Pipeline CI `.github/workflows/ci.yml` telah disiapkan untuk mengompilasi `test_firmware_host.cpp` di `ubuntu-latest`. |
| Uji Perangkat Keras Fisik | — | **BELUM DIUJI SECARA FISIK** | Board PCB REKASURYA belum tersedia secara fisik maupun skematik pinout GPIO final; tidak ada klaim uji lapangan. |

---

## 1. Rincian Hasil Uji Integrasi Vitest (`tests/rekasurya.test.ts`)

1. **Seed 5 Koridor / 18 Tiang & Deteksi Manipulasi `audit_log` SHA-256 — LULUS**
   - Mengonfirmasi 5 koridor Solo Raya, 18 perangkat aktif, dan keutuhan `verifyAuditChain(db)` (`valid === true`).
   - Mutasi langsung pada `detail_json` baris `seq = 1` memicu deteksi kegagalan rantai hash (`valid === false`, `brokenAtSeq === 1`).
2. **Kontrak AI v1.0.0 & Peredaman Cuaca Koridor (`WEATHER_CORRIDOR_CLOUDY` vs `F1`) — LULUS**
   - `TelemetryInferenceRequestZ` menolak skema versi salah.
   - Skenario `WEATHER_CORRIDOR_CLOUDY` pada `SOL-002` mengklasifikasikan `CUACA_SERUAS`, `fault_family === "NONE"`, dan **0 Work Order palsu** diterbitkan.
   - Skenario `F1_PV_SOILING_SHADING` pada `SOL-003` memicu `WARNING_EWMA` + `ANOMALI_LOKAL` + Work Order dengan suku cadang `MNT-PV-CLN`.
3. **Klasifikasi `F2`, `F3`, `F4`, `F5`, `F6` & Otorisasi Teknisi — LULUS**
   - Seluruh skenario gangguan mengklasifikasikan keluarga gangguan & suku cadang yang sesuai.
   - Saat `technician_authorized = true` (check-in teknisi), `door_open = true` tidak memicu alarm sabotase `F6`.
4. **Siklus Penuh Work Order (`CHECKIN` → Tolak `VERIFY` Prematur → Pemulihan → `VERIFY` → `CLOSED`) — LULUS**
   - `CHECKIN` mengaktifkan jendela `maintenance_until`.
   - `VERIFY` pada `SKH-107` yang masih `FAULT` ditolak dengan `WorkOrderTransitionError` (HTTP `409 Conflict`).
   - Setelah injeksi `NORMAL_CLEAR_DAY`, `VERIFY` berhasil (`verification_passed === 1`), menyelesaikan `fault_events`, menutup WO, dan memperbarui status aduan warga terkait (`ID. 2026007610`) menjadi `Resolved`.
5. **Pencocokan Spasial Aduan Warga Demo Haversine — LULUS**
   - Laporan baru di koordinat Klaten menghasilkan tiket `ID. 2026XXXXXX`, terhubung ke `KLT-018` (`< 100 m`), dan otomatis bertautan ke `WO-2026-0004`.
6. **Kalkulator Energi 2-Aliran (`src/lib/energy/calculator.ts`) — LULUS**
   - Payback konversi `SON_T_250W` berada pada rentang keekonomian target (±3,7–4,4 thn pada parameter default), Aliran 1 dan Aliran 2 terpisah akurat, dan `LED_60W` ditandai secara jujur tidak layak konversi murni (`economicallyAttractive === false`).
7. **Proteksi Perintah Jarak Jauh Firmware (`executeDeviceCommand`) — LULUS**
   - Perintah PWM ke `SRG-009` (tegangan baterai `0 V`) ditolak oleh proteksi **UVLO**.
   - Perintah PWM siang hari pada `SOL-001` (`lux >= 50`) dibatasi otomatis ke `0%`.

---

## 2. Hasil Verifikasi Browser Nyata (`http://localhost:3000`)

Pengujian dilakukan terhadap build produksi (`npx next start -p 3000`) via subagent browser terisolasi:
- **Halaman `/` (Desktop `1440×900`):** Header menampilkan tegas `MODE DEMO · DATA SIMULASI` dan `AI ADAPTER SIMULASI v1.0.0 — MENUNGGU POC GPT ASTRA`; filter koridor SVG Solo Raya (contoh `Kab. Sukoharjo (4)` → `Semua (18)`) serta tabel 18 tiang berfungsi penuh tanpa overlap. Bukti tangkapan layar akhir terverifikasi host: `final_step_34.png`.
- **Halaman `/devices/SRG-009` & `/devices/KRA-042`:** Diagram PCB 3-kanal (`INA228`, `INA226`, `PC817`, `18650`), matriks 5 NTC, 3 grafik SVG (`EWMA`, `PV Aktual vs Ekspektasi`, `SoC`), korelasi tetangga, serta aksi `Ping Sinkronisasi DS3231` merespons normal.
- **Halaman `/simulator`:** Injeksi `WEATHER_CORRIDOR_CLOUDY` pada `SOL-002` mengembalikan vonis `CUACA_SERUAS` tanpa menerbitkan Work Order palsu; tombol reset mengembalikan data bersih.
- **Halaman `/work-orders` (Desktop & Mobile `390×844`):**
  - Check-in GPS pada `WO-2026-0001` mengaktifkan otorisasi buka panel 90 menit.
  - Tab *Kanal Aduan Warga · Alur ULAS* menampilkan disklamer non-resmi Pemkot Surakarta, menerbitkan tiket simulasi `ID. 2026007611` dan mencocokkannya ke `SKH-107` / `WO-2026-0003`.
  - Pada lebar `390px`, tata letak bebas *horizontal page overflow* (`document.body.clientWidth <= 390px`).
- **Halaman `/energy` & `/architecture` (Tablet `768×1024`):** Kalkulator 2-aliran merespons perubahan preset & lampu (`MERKURI_150W`), penguji kontrak AI `POST /api/ai/infer` mengembalikan JSON tervalidasi Zod (`latensi 2 ms`), dan rantai hash `audit_log` berstatus `UTUH & TERVERIFIKASI`.
- **Error Konsol / HTTP 500:** 0 error teramati.
