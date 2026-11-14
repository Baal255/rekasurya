# DOKUMENTASI REST API — REKASURYA

Seluruh endpoint Next.js App Router berada di `src/app/api/*`, menggunakan pembungkus respons standar:
- **Sukses:** `{ "ok": true, "data": { ... } }`
- **Gagal:** `{ "ok": false, "error": "Pesan bahasa Indonesia", "code": "...", "details": [...] }`
- **Header Audit Opsional:** `x-rekasurya-role` (`OPERATOR_DISHUB` / `TEKNISI_SKYLIFT` / `AUDITOR_PJU`) dan `x-rekasurya-actor` dicatat ke `audit_log`.

---

## Daftar Endpoint

| Metode | Path | Fungsi | Kode Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/overview` | Mengambil ringkasan armada, 5 koridor, 18 perangkat, WO terbuka, jumlah aduan, dan status integritas SHA-256 `audit_log` | `200` |
| `GET` | `/api/devices` | Daftar perangkat dengan filter opsional `?corridor=`, `?status=`, `?faultFamily=`, `?search=` | `200` |
| `GET` | `/api/devices/[id]` | Detail lengkap tiang, riwayat telemetri 48 sampel, perbandingan tetangga koridor, kejadian gangguan, WO, dan log AI | `200`, `404` |
| `POST` | `/api/devices/[id]/command` | Mengirim perintah `SET_PWM_DUTY`, `SET_MAINTENANCE_MODE`, atau `REQUEST_DIAGNOSTIC_PING` dengan pagar pengaman UVLO/derating | `200`, `400`, `404` |
| `POST` | `/api/telemetry/ingest` | Menerima payload sesuai `AI-CONTRACT-v1.0.0`, menjalankan inferensi AI, memperbarui DB, dan otomatis menerbitkan Work Order jika perlu | `201`, `400`, `401` |
| `GET` | `/api/work-orders` | Daftar Work Order diperkaya data tiang & koridor (`?status=`, `?deviceId=`, `?priority=`) | `200` |
| `POST` | `/api/work-orders` | Menerbitkan Work Order inspeksi manual | `201`, `400`, `404` |
| `PATCH` | `/api/work-orders/[id]` | Transisi `ASSIGN`, `CHECKIN` (mengaktifkan `maintenance_until` +90 menit), `VERIFY` (mewajibkan telemetri `NORMAL`), `CLOSE`, `UPDATE_NOTES` | `200`, `404`, `409` |
| `GET` | `/api/citizen-reports` | Daftar / lacak tiket aduan warga demo (`?id=`, `?phone_last4=`, `?status=`) | `200` |
| `POST` | `/api/citizen-reports` | Menerima aduan warga demo, menghitung jarak Haversine ke tiang terdekat, dan menautkan/menerbitkan Work Order | `201`, `400` |
| `POST` | `/api/simulator/inject` | Menyuntikkan salah satu dari 8 skenario fisika perangkat ke target `device_id` (`SIMULATED`) | `200`, `400`, `404` |
| `POST` | `/api/simulator/reset` | Mengembalikan basis data demo ke snapshot awal Solo Raya dan mencatat event reset di `audit_log` | `200` |
| `GET` | `/api/ai/contract` | Mengembalikan versi kontrak `1.0.0`, contoh request, taksonomi `F1–F6`, serta 25 log invokasi terbaru | `200` |
| `POST` | `/api/ai/infer` | Menguji validasi skema `TelemetryInferenceRequestZ` & menjalankan inferensi AI secara *stateless* | `200`, `400` |
| `GET`/`POST` | `/api/energy/calculate` | Menghitung penghematan Aliran 1 & Aliran 2 berdasarkan parameter jenis lampu, tarif PLN, dan biaya trip sky-lift | `200`, `400` |
| `GET` | `/api/audit` | Mengambil `audit_log` terbaru (`?limit=`) beserta hasil verifikasi keutuhan rantai hash SHA-256 | `200` |

---

## Contoh Pemanggilan Penting

### 1. Injeksi Skenario Simulasi (`POST /api/simulator/inject`)
```json
{
  "device_id": "SOL-002",
  "scenario": "WEATHER_CORRIDOR_CLOUDY"
}
```
Respons mengembalikan `spatial_verdict: "CUACA_SERUAS"`, `fault_family: "NONE"`, dan `createdWorkOrder: null`.

### 2. Verifikasi Pemulihan Work Order (`PATCH /api/work-orders/WO-2026-0003`)
```json
{
  "action": "VERIFY",
  "technician_notes": "Driver Buck CC-CV 40W telah diganti, arus LED kembali stabil 1,55 A."
}
```
Jika `SKH-107` masih berstatus `FAULT` atau `batt_v` di bawah ambang aman, endpoint mengembalikan HTTP **`409 Conflict`** dengan alasan penolakan yang jelas.
