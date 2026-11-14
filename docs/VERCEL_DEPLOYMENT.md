# Panduan & Status Deployment Produksi Vercel — REKASURYA

Dokumen ini mencatat konfigurasi produksi Next.js/SQLite pada **Vercel** serta detail deployment publik aktual yang telah berjalan dan terverifikasi.

---

## 1. Informasi Deployment Produksi Terverifikasi

- **URL Produksi Utama**: https://rekasurya.vercel.app/
- **Alias Produksi Tambahan**:
  - https://rekasurya-baal5.vercel.app/
  - https://rekasurya-git-main-baal5.vercel.app/
- **Proyek Vercel**: `rekasurya` (`prj_ijwS4UeVTYptjxaqin16Z2cizy18`)
- **Tim / Akun Pemilik**: `Baal` (`team_sU1BXrsYTxgtb74a2WtXhsAx`, slug `baal5`, pengguna `baal255`)
- **Repository GitHub Terhubung**: `Baal255/rekasurya` (branch produksi: `main`, commit terbuild: `03bc3b0c103e2ad335be3660176140846f91737d`)
- **Deployment Awal Produksi**: `dpl_B4ynCVTv4PtMFfa5bdnr1apVy3dQ` (status **`READY`**, target **`production`**, region `iad1`)
- **Akses Publik (`ssoProtection` & `passwordProtection`)**: Dinonaktifkan (`enabled: false`), sehingga URL dapat diakses langsung tanpa halaman login Vercel.

---

## 2. Konfigurasi Proyek & SQLite Serverless

1. **[vercel.json](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/vercel.json)**
   - `framework`: `"nextjs"`
   - `installCommand`: `"npm install"`
   - `buildCommand`: `"npm run build"` (otomatis menjalankan `prebuild`: `tsx scripts/build-seed.ts` untuk menyusun `seed/rekasurya-seed.db`)
2. **[next.config.ts](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/next.config.ts)**
   - `serverExternalPackages: ["better-sqlite3"]` menjaga modul native C++ SQLite berjalan pada fungsi Lambda Node.js Vercel.
   - `outputFileTracingIncludes: { "/*": ["./seed/rekasurya-seed.db"] }` menyertakan berkas seed SQLite agar disalin otomatis ke `/tmp` saat *cold start* serverless.

---

## 3. Verifikasi Live URL Produksi

Pemeriksaan browser langsung terhadap `https://rekasurya.vercel.app/` membuktikan:
- `/`, `/console`, `/api/overview`, `/devices/SRG-009`, `/api/devices/SRG-009`, dan `/energy` seluruhnya mengembalikan **HTTP 200 OK**.
- Logo `/rekasurya-logo-on-dark.png` termuat (`32.378 bytes`, `complete && naturalWidth > 0`), data armada `18` tiang, `4` gangguan aktif, `4` Work Order, serta kalkulasi PP 4/2023 berjalan utuh pada runtime produksi Vercel dengan **0** `console.error`, **0** `pageerror`, dan **0** respons HTTP `>= 400`.
- Bukti visual produksi tersimpan di [after-14-vercel-production.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/after/after-14-vercel-production.png) dan [after-15-vercel-console.png](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/docs/visual-qa/after/after-15-vercel-console.png).

---

## 4. Catatan Persistensi Data Demo di Serverless

- Karena sistem berkas root Vercel bersifat *read-only*, basis data operasional pada deployment publik disalin dari `seed/rekasurya-seed.db` ke penyimpanan sementara `/tmp` per instansi Lambda. Untuk operasi produksi multi-regu jangka panjang, adaptor penyimpanan disarankan mengarah ke database eksternal persisten (mis. Postgres/Turso) serta menyetel `REKASURYA_AI_SERVICE_URL` untuk endpoint AI PoC terpisah.
