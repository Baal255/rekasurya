# Laporan Pengujian Produksi & Verifikasi End-to-End — REKASURYA

Seluruh pengujian di bawah ini dijalankan **setelah penyuntingan kode terakhir** pada branch `redesign/industrial-dashboard` sebelum proses penggabungan (*merge*) ke `main`.

---

## 1. Pengujian Statis, Unit Test & Production Build

| Pemeriksaan | Perintah | Hasil Observasi |
| --- | --- | --- |
| Pemeriksaan Tipe TypeScript | `npm run typecheck` (`tsc --noEmit`) | Lulus (`exit code 0`), nol error kompilasi |
| Pengujian Otomatis Domain & API | `npm test` (`vitest run`) | **1 file lulus (`tests/rekasurya.test.ts`), 7/7 test lulus** (`219ms` eksekusi test, total `863ms`) |
| Pembuatan Seed SQLite | `npm run prebuild` (`tsx scripts/build-seed.ts`) | Menghasilkan `seed\rekasurya-seed.db` berukuran `0.27 MB` |
| Optimasi Build Produksi | `npm run build` (`next build`, Next.js `16.3.8` Turbopack) | Berhasil dikompilasi (`3.1s`), `11/11` halaman statis terbuat, seluruh rute aplikasi (`/`, `/console`, `/dashboard`, `/devices`, `/devices/[id]`, `/alerts`, `/work-orders`, `/map`, `/energy`, `/simulator`, `/architecture`) dan `/api/*` siap dijalankan |

---

## 2. Pengujian Responsivitas & Kebebasan Luapan Horizontal (`390×844`)

Server dijalankan secara lokal dalam mode produksi (`npx next start -p 3000`, siap dalam `408ms`) dan diperiksa melalui browser otomatis Playwright pada empat viewport (`1440×900`, `1366×768`, `768×1024`, dan `390×844`):

| Rute Uji | `scrollWidth` (`390×844`) | `innerWidth` (`390×844`) | Status Luapan Horizontal |
| --- | --- | --- | --- |
| `/` (Homepage Publik) | `384 px` | `390 px` | Bebas luapan (`384 <= 390`) |
| `/console` (Konsol Utama) | `384 px` | `390 px` | Bebas luapan (`384 <= 390`) |
| `/devices/SRG-009` (Diagnostik Tiang) | `384 px` | `390 px` | Bebas luapan (`384 <= 390`) |
| `/alerts` (Manajemen Gangguan) | `384 px` | `390 px` | Bebas luapan (`384 <= 390`) |
| `/work-orders` (Work Order & ULAS) | `384 px` | `390 px` | Bebas luapan (`384 <= 390`) |

---

## 3. Verifikasi Aset Logo Resmi & Kontras Permukaan

- **Navbar & Hero Gelap (`/`)**: `/rekasurya-logo-on-dark.png` (`862×441 px`, `complete: true`) tampil tajam dengan wordmark putih dan aksen matahari Amber di atas latar Navy `#062D5B`.
- **Header Scrolled (`/` pada `#pratinjau` / `#diagnosis`)**: `LandingNav` otomatis beralih dari mode transparan/gelap menjadi `.glass-light` dan memuat `/rekasurya-logo-on-light.png` (`862×441 px`, `complete: true`) dengan wordmark Navy `#062D5B` di atas latar putih tembus cahaya.
- **Sidebar Konsol (`/console`)**: Memuat `/rekasurya-logo-on-dark.png` di pojok kiri atas sidebar Navy `#062D5B` tanpa pemotongan atau distorsi rasio aspek.

---

## 4. Verifikasi Alur Interaktif End-to-End & Kebersihan Log

1. **Alur Homepage → Konsol (`/`)**: Memilih tiang `KLT-018` pada kartu *Inspektor Node Langsung* memperbarui telemetri secara langsung ke `Tiang JG-018 (Jonggrangan)` (`F2_01_BATT_SOH_DEGRADATION`), lalu klik CTA **Buka Konsol Operasional** menavigasikan browser ke `/console`.
2. **Filter & Pergantian Peran (`/console`)**: Mengubah peran dari `Operator Dishub` menjadi `Teknisi Sky-Lift` lalu memilih filter wilayah `Kab. Klaten (3)` mempersempit peta dan antrean ke 3 tiang Klaten (`KLT-017`, `KLT-018`, `KLT-019`).
3. **Inspeksi Gangguan (`/alerts`)**: Memilih baris `FLT-2026-0001` (`SRG-009`) mengisi panel inspektor kanan secara lengkap bersama bukti sensor (`LIS3DH 3,18 g`, sel `18650 4,02 V`, `EWMA Zₜ -19,2 W`), SKU `BAT-LFP-256-40`, serta tiket `WO-2026-0001`.
4. **Suntikan Simulator & Reset Basis Data (`/simulator`)**: Menyuntikkan skenario `F1_PV_SOILING_SHADING` ke `SOL-002` berhasil melahirkan `WO-2026-0005` (`MNT-PV-CLN`) dengan residu `Zₜ -94,6 W`; tombol **Reset Seluruh Armada ke Snapshot Awal** memulihkan armada kembali ke `18 tiang`, `4 gangguan aktif`, dan `4 Work Order` serta mencatat jejak hash SHA-256 `DEMO_DATABASE_RESET`.
5. **Log Konsol & Jaringan**: Tercatat **0** `console.error`, **0** `pageerror`, dan **0** respons HTTP `>= 400` sepanjang seluruh pemeriksaan pada build final.
