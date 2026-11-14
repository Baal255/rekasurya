# SISTEM DESAIN INDUSTRI (ANTI-AI-SLOP) — REKASURYA

## 1. Prinsip Desain UI REKASURYA

Antarmuka REKASURYA dirancang menyerupai konsol operasi jaringan infrastruktur (*NOC / SCADA Control Room*) untuk Dinas Perhubungan dan teknisi lapangan, dengan menolak estetika dasbor AI generik:

- **Dilarang Glassmorphism Dekoratif:** Tidak memakai kartu buram (`backdrop-blur`), bingkai bercahaya (*glowing borders*), gradien warna pelangi tanpa fungsi, atau animasi berulang yang mengganggu pembacaan operator.
- **Setiap Pixel Memicu Keputusan:** Tidak ada kartu angka tanpa konteks. Setiap metrik menampilkan satuan teknik (`V`, `A`, `W`, `%`, `°C`, `lx`, `m`, `Rp`), ambang batas acuan, atau tombol aksi langsung ke Work Order / diagnostik perangkat.
- **Kejujuran Status Sistem Permanen:** Header komando selalu menempelkan label `MODE DEMO · DATA SIMULASI` dan `AI ADAPTER SIMULASI v1.0.0 — MENUNGGU POC GPT ASTRA`.

---

## 2. Token Warna & Semantik Status (`src/app/globals.css`)

| Token / Elemen | Nilai Hex | Fungsi Operasional |
| :--- | :--- | :--- |
| `--bg-canvas` | `#0B0F17` | Latar belakang utama ruang kendali berintensitas silau rendah |
| `--bg-panel` | `#111827` | Permukaan panel kerja dengan border teknis `1px solid #1E293B` |
| `--bg-inset` | `#161F30` | Sub-panel tabel, checklist suku cadang, & kanvas diagram blok |
| `--accent-sky` | `#0EA5E9` | Aksi primer operator, koridor aktif, & tautan diagnostik |
| Status `NORMAL` | `#10B981` | Tiang sehat & telemetri terverifikasi pulih |
| Status `WARNING_EWMA` (`F1`) | `#F59E0B` | Peringatan dini degradasi pengisian / *soiling* sebelum lampu padam |
| Status `FAULT` (`F2–F5`) | `#EF4444` | Gangguan perangkat keras (baterai, SCC, driver Buck CC-CV, overheat) |
| Status `TAMPER_CRITICAL` (`F6`) | `#D946EF` | Sabotase / buka paksa kotak IP65 / pelaporan via sel cadangan `18650` |
| Status `OFFLINE` | `#64748B` | Perangkat terputus tanpa sinyal cadangan |

---

## 3. Tipografi & Penjajaran Numerik (`src/app/layout.tsx`)

1. **Antarmuka & Label Bahasa Indonesia:** `Plus Jakarta Sans` untuk keterbacaan tabel dan laporan teknis panjang.
2. **Telemetri, Kode, Koordinat, & Rupiah:** `JetBrains Mono` dengan `font-variant-numeric: tabular-nums` wajib diterapkan agar angka pada kolom tegangan (`25,6 V`), arus (`1,55 A`), residu `EWMA Z`, hash SHA-256, dan ID tiket (`WO-2026-0001`, `ID. 2026007610`) sejajar vertikal tanpa bergetar saat nilai diperbarui.

---

## 4. Responsivitas Multi-Perangkat

- **Desktop (`1440×900`):** Grid 12 kolom (peta 8 kolom + kartu triase tiang 4 kolom), tabel armada lengkap, dan penguji kontrak AI dua kolom berdampingan.
- **Tablet (`768×1024`) & Ponsel (`390×844`):** Teknisi lapangan menggunakan tablet/ponsel saat berada di bawah tiang PJU untuk melihat SKU suku cadang, menekan tombol *Check-In Teknisi GPS*, dan menjalankan *Verifikasi Pemulihan*. Semua tabel dibungkus `overflow-x-auto` dan bilah navigasi menggunakan gulir horizontal bersih tanpa memotong elemen.
