# ARSITEKTUR SISTEM — REKASURYA

## 1. Gambaran Umum Lapisan Sistem

Platform REKASURYA dibangun di atas arsitektur berlapis yang memisahkan akuisisi tepi (*edge*), ingestion & validasi kontrak, layanan domain pemeliharaan, persistensi relasional teraudit, dan antarmuka SCADA berbasis web:

```
+-------------------------------------------------------------------------+
| LAYER 5 — ANTARMUKA OPERATOR, TEKNISI & AUDITOR (Next.js 16 App Router) |
|  / (Peta & Armada) · /devices/[id] · /work-orders · /energy · /simulator |
+-------------------------------------------------------------------------+
                                    │ REST JSON (/api/*) + x-rekasurya-role
+-------------------------------------------------------------------------+
| LAYER 4 — LAYANAN DOMAIN & KONTRAK (src/lib/domain/* & src/lib/ai/*)    |
|  telemetry.ts · work-orders.ts · citizen-reports.ts · commands.ts       |
|  energy/calculator.ts · simulator/engine.ts · audit.ts (SHA-256 Chain)  |
+-------------------------------------------------------------------------+
                    │                                   │
                    ▼                                   ▼
+----------------------------------+  +-----------------------------------+
| LAYER 3A — PERSISTENSI SQLITE    |  | LAYER 3B — ADAPTOR AI v1.0.0      |
|  better-sqlite3@13.0.3 (WAL)     |  |  1. External HTTP POC_ASTRA (3s)  |
|  seed/rekasurya-seed.db -> /tmp  |  |  2. Fallback / MOCK_EWMA lokal    |
+----------------------------------+  +-----------------------------------+
                                    ▲
                                    │ Telemetri JSON / Simulasi Injeksi
+-------------------------------------------------------------------------+
| LAYER 2 & 1 — FIRMWARE KENDALI ESP32-WROOM-32E & HAL (firmware/)         |
|  SensorPipeline · EdgeDiagnostics (F1-F6) · AdaptiveDimmer · W25Q Ring   |
|  IHardwareHal <-> MockHardwareHal (siap dipetakan ke driver fisik PCB)   |
+-------------------------------------------------------------------------+
```

---

## 2. Skema Basis Data SQLite (`src/lib/db/schema.ts`)

Seluruh operasi penting berjalan dalam transaksi ACID SQLite:

| Tabel | Fungsi Utama | Relasi & Indeks Kunci |
| :--- | :--- | :--- |
| `meta` | Penanda migrasi & penghitung sekuens ID deterministik (`FLT`, `WO`, `AI`, `CIT`) | `key PRIMARY KEY` |
| `corridors` | 5 koridor jalan raya Solo Raya lengkap dengan kelas jalan & target lux SNI | `id PRIMARY KEY` |
| `devices` | Status terkini 3-kanal (`pv_*`, `batt_*`, `load_*`), 5 kanal suhu, `ewma_z`, koordinat GNSS, dan jendela `maintenance_until` | `corridor_id -> corridors(id)` |
| `telemetry_history` | Rangkaian waktu (*time-series*) telemetri historis 48 jam per perangkat | `idx_telemetry_device_time (device_id, recorded_at)` |
| `fault_events` | Catatan gangguan `F1–F6` lengkap dengan sub-kode, rekomendasi suku cadang, latensi deteksi, dan status resolusi | `device_id -> devices(id)` |
| `work_orders` | Siklus tiket kerja teknisi (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `VERIFIED`, `CLOSED`), check-in GPS, dan gerbang `verification_passed` | `device_id`, `fault_event_id` |
| `citizen_reports` | Aduan warga demo (`ID. 2026XXXXXX`) dengan lini masa JSON dan tautan tiang/WO terdekat | `matched_device_id`, `linked_work_order_id` |
| `ai_invocations` | Jejak pemanggilan adaptor AI beserta `input_hash` SHA-256, mode adaptor, latensi, dan vonis | `device_id -> devices(id)` |
| `audit_log` | Buku besar kejadian tak terbantahkan berantai hash SHA-256 (`seq`, `prev_hash`, `entry_hash`) | `seq UNIQUE` |

---

## 3. Rantai Hash Audit (`src/lib/audit.ts`)

Setiap peristiwa mutasi (`FAULT_DETECTED`, `WORK_ORDER_*`, `CITIZEN_REPORT_SUBMITTED`, `DEVICE_COMMAND_*`, `DEMO_DATABASE_RESET`) dicatat ke `audit_log` melalui `appendAudit(db, ...)`. Setiap baris mengikat:

$$\text{entry\_hash} = \text{SHA256}(\text{seq} \mid \text{actor\_role} \mid \text{actor\_name} \mid \text{action} \mid \text{entity\_type} \mid \text{entity\_id} \mid \text{detail\_json} \mid \text{prev\_hash} \mid \text{created\_at})$$

Fungsi `verifyAuditChain(db)` menghitung ulang hash setiap baris dari `seq = 1` terhadap `GENESIS_HASH = "REKASURYA-GENESIS-0000000000000000"`. Jika satu karakter pun diubah secara langsung di SQLite, pemeriksaan mengembalikan `valid: false` beserta nomor urut yang rusak (`brokenAtSeq`).

---

## 4. Isolasi Serverless Vercel (`src/lib/db/index.ts`)

Di lingkungan serverless Vercel (`process.env.VERCEL === "1"`), sistem file aplikasi bersifat *read-only* kecuali `/tmp`. Pada fase build (`npm run prebuild`), skrip `scripts/build-seed.ts` membangun `seed/rekasurya-seed.db` yang disertakan dalam bundle melalui `outputFileTracingIncludes` di `next.config.ts`. Saat *cold start*, jika `/tmp/rekasurya-demo.db` belum ada, file seed disalin ke `/tmp` lalu dibuka dengan mode WAL sehingga seluruh aksi simulasi dan Work Order berjalan persisten selama masa hidup instans.
