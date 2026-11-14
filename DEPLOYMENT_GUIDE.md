# PANDUAN DEPLOYMENT & OPERASI CI/CD — REKASURYA

Dokumen ini menjelaskan konfigurasi repository GitHub, pipeline integrasi berkelanjutan (CI), mekanisme persistensi SQLite pada deployment serverless Vercel, dan pembatasan keamanan berkas proyek.

---

## 1. Isolasi Proyek & Keamanan Repository (`.gitignore`)

Untuk menjaga privasi anggota tim dan mencegah tercampurnya proyek lain di mesin pengembang:
- Seluruh berkas identitas tim (`CV_*.pdf`, `KTM_*.jpeg`, `TTD_*.jpeg`), folder lokal (`data/`, `.next/`, `node_modules/`), dan file lingkungan (`.env*`) dikecualikan secara eksplisit di `.gitignore`.
- Repository REKASURYA dipisahkan total ke repository mandiri dan tidak pernah menyentuh direktori atau repository proyek lain di ruang kerja yang sama.

---

## 2. Pipeline CI GitHub Actions (`.github/workflows/ci.yml`)

Setiap `push` dan `pull_request` pada branch `main` menjalankan alur otomatis:
1. `npm ci` (memasang dependensi termasuk `better-sqlite3@13.0.3`)
2. `npm run typecheck` (`tsc --noEmit`)
3. `npm test` (`vitest run` untuk pengujian domain & integrasi)
4. `npm run build` (menjalankan `prebuild` `scripts/build-seed.ts` → `next build`)
5. **Kompilasi & Uji Host Firmware C++ (`ubuntu-latest`):** Menjalankan `g++ -std=c++17 -Ifirmware/include -Ifirmware/src firmware/test/test_firmware_host.cpp -o test_firmware_host && ./test_firmware_host` untuk memverifikasi logika HAL & diagnostik di runner Linux meskipun mesin Windows lokal tidak memiliki compiler C++.

---

## 3. Arsitektur Vercel + SQLite (`next.config.ts` & `vercel.json`)

| Berkas | Konfigurasi Kunci | Tujuan |
| :--- | :--- | :--- |
| `package.json` | `"better-sqlite3": "13.0.3"` & `"prebuild": "tsx scripts/build-seed.ts"` | Menjamin ABI native stabil dan membangun snapshot `seed/rekasurya-seed.db` sebelum Next.js memaketkan route |
| `next.config.ts` | `serverExternalPackages: ["better-sqlite3"]` & `outputFileTracingIncludes: { "/*": ["./seed/rekasurya-seed.db"] }` | Mencegah Webpack/Turbopack membundel addon native C++ dan ikut menyertakan database awal ke dalam lambda serverless |
| `src/lib/db/index.ts` | Membaca `process.env.VERCEL === "1"` → menggunakan `/tmp/rekasurya-demo.db` | Menyalin snapshot `seed/rekasurya-seed.db` ke `/tmp` pada saat *cold start* karena direktori kode Vercel bersifat *read-only* |
| `vercel.json` | `framework: "nextjs"`, `buildCommand: "npm run build"` | Menjalankan pipeline prebuild seed otomatis saat deploy di Vercel |

### Variabel Lingkungan Opsional Produksi

- `REKASURYA_AI_SERVICE_URL`: URL dasar layanan PoC Python AI eksternal (opsional; jika kosong, sistem berjalan aman memakai adaptor `MOCK_EWMA_DETERMINISTIC`).
- `REKASURYA_INGEST_KEY`: Token header `x-rekasurya-ingest-key` untuk mengamankan `POST /api/telemetry/ingest` apabila menerima push gateway MQTT nyata.
