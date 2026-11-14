# Panduan & Status Deployment Vercel — REKASURYA

Dokumen ini mencatat konfigurasi produksi Next.js/SQLite untuk **Vercel** serta status autentikasi dan deployment aktual saat ini.

---

## 1. Konfigurasi Siap-Vercel dalam Repository

Seluruh penyesuaian yang diperlukan agar Next.js + `better-sqlite3` berjalan baik di lingkungan serverless Vercel telah dikonfigurasi:

1. **[vercel.json](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/vercel.json)**
   - `framework`: `"nextjs"`
   - `installCommand`: `"npm install"`
   - `buildCommand`: `"npm run build"` (secara otomatis menjalankan `prebuild`: `tsx scripts/build-seed.ts` untuk menyusun `seed/rekasurya-seed.db`)
2. **[next.config.ts](file:///c:/Users/LENOVO/Documents/Antigravity/Hackathon%20UNS/next.config.ts)**
   - `serverExternalPackages: ["better-sqlite3"]` menjaga modul native C++ SQLite tidak dibundel keliru oleh Turbopack/Webpack.
   - `outputFileTracingIncludes: { "/*": ["./seed/rekasurya-seed.db"] }` menyertakan berkas seed SQLite ke dalam seluruh fungsi server agar dapat disalin ke direktori writable (`/tmp`) saat *cold start* di Vercel.
3. **Verifikasi Build Produksi Lokal**
   - `npm run build` telah lolos dengan kode keluar `0` pada Next.js `16.3.8` (Turbopack), memvalidasi rute dinamis `/` (`ƒ /`) dan `/devices/[id]` (`ƒ /devices/[id]`), seluruh rute API `ƒ /api/*`, serta 11 halaman statis lainnya.

---

## 2. Catatan Penting Persistensi SQLite di Serverless

- Karena sistem berkas root fungsi Vercel bersifat *read-only*, basis data operasional pada deployment demo disalin dari `seed/rekasurya-seed.db` ke penyimpanan sementara `/tmp` per instansi container.
- Hal ini sesuai untuk demonstrasi interaktif dan simulasi terisolasi; untuk deployment produksi multi-regu jangka panjang, adaptor penyimpanan disarankan diarahkan ke Postgres / Turso eksternal serta variabel lingkungan `REKASURYA_AI_SERVICE_URL` disetel ke endpoint model AI eksternal.

---

## 3. Status Deployment Saat Ini

- **Pengujian Build Lokal**: **Siap & Lulus (`exit 0`)**, melayani Homepage `/` dan seluruh konsol `/console` secara penuh di lingkungan Node lokal (`http://localhost:3000`).
- **Status Plugin Vercel (`vercel-plugin`)**: Melalui pemeriksaan akun plugin Antigravity, konektor `vercel-plugin_vercel` **belum terautentikasi** pada sesi pengguna saat ini (memerlukan login pengguna terlebih dahulu melalui kartu plugin Vercel di percakapan).
- Oleh karena itu, aplikasi **belum dipublikasikan ke domain `*.vercel.app`** secara langsung dalam sesi ini. Begitu akun Vercel terhubung melalui kartu plugin atau CLI terautentikasi, jalankan `vercel --prod` pada direktori root repository (atau hubungkan repository GitHub `Baal255/rekasurya` di Dashboard Vercel dengan Root Directory `.` dan Build Command `npm run build`).
