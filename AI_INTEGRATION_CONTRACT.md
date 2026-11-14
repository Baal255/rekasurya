# KONTRAK INTEGRASI LAYANAN AI — `AI-CONTRACT-v1.0.0`

Dokumen ini mendefinisikan antarmuka resmi antara platform web/backend REKASURYA (`src/lib/ai/contract.ts`, `src/lib/ai/adapter.ts`) dan layanan model AI eksternal (disiapkan untuk integrasi PoC Python tim AI / GPT Astra tanpa mengubah UI maupun skema database).

---

## 1. Strategi Fail-Safe & Kejujuran Mode Saat Ini

- **Mode Default (`MOCK_EWMA_DETERMINISTIC`):** Jika variabel lingkungan `REKASURYA_AI_SERVICE_URL` tidak diatur, platform menjalankan model baseline deterministik lokal berbasis fisika panel PV (derating suhu $-0,4\%/^\circ\text{C}$, *taper* SoC $> 90\%$), **EWMA ($\lambda = 0,20$, $\pm 3\sigma = \pm 16,5\text{ W}$)**, korelasi median koridor, dan aturan komponen `F1–F6`. UI secara eksplisit melabeli mode ini sebagai **`AI ADAPTER SIMULASI v1.0.0 — MENUNGGU POC GPT ASTRA`**.
- **Mode Eksternal (`EXTERNAL_POC_ASTRA`) & Failover (`FALLBACK_LOCAL`):** Saat `REKASURYA_AI_SERVICE_URL` diisi (mis. layanan FastAPI Python), adaptor memanggil `POST {URL}/infer` dengan batas waktu `3.000 ms` dan memvalidasi keluaran dengan `TelemetryInferenceResponseZ`. Jika timeout atau skema tidak valid, platform otomatis beralih ke `FALLBACK_LOCAL` dengan menandai `fallback_used: true` tanpa menghentikan operasi dashboard.

---

## 2. Skema Request (`TelemetryInferenceRequestZ`)

```json
{
  "schema_version": "1.0.0",
  "device_id": "KRA-042",
  "recorded_at": "2026-11-14T11:30:00.000Z",
  "profile": {
    "nominal_pv_wp": 300,
    "nominal_batt_v": 25.6,
    "nominal_batt_ah": 40,
    "nominal_led_w": 40,
    "geofence_radius_m": 15
  },
  "sensors": {
    "pv_v": 36.2,
    "pv_i": 2.32,
    "batt_v": 26.5,
    "batt_i": 3.15,
    "load_v": 24.8,
    "load_i": 0,
    "soc_pct": 64,
    "soh_pct": 95,
    "temp_panel_c": 44.5,
    "temp_batt_c": 32.1,
    "temp_scc_c": 35.8,
    "temp_driver_c": 30.2,
    "temp_board_c": 33.4,
    "lux": 78500,
    "pir_active": false,
    "pwm_duty": 0,
    "door_open": false,
    "accel_g": 1.0,
    "backup_cell_v": 4.08,
    "geofence_drift_m": 1.2
  },
  "context": {
    "prev_ewma_z": -52.1,
    "technician_authorized": false,
    "corridor_neighbors": [
      { "device_id": "KRA-041", "ewma_z": -1.4, "pv_power_w": 196.2, "lux": 79000 },
      { "device_id": "KRA-043", "ewma_z": 0.9, "pv_power_w": 201.5, "lux": 78200 }
    ]
  }
}
```

---

## 3. Skema Response (`TelemetryInferenceResponseZ`) & Taksonomi

Respons wajib lolos `.strict()` pada field berikut:
`schema_version`, `adapter_mode`, `model_version`, `is_simulated_poc`, `fallback_used`, `predicted_p_chg_w`, `residual_w`, `ewma_z`, `ewma_ucl`, `ewma_lcl`, `neighbor_z_median`, `spatial_verdict` (`NORMAL` | `CUACA_SERUAS` | `ANOMALI_LOKAL`), `fault_family` (`NONE` | `F1`..`F6`), `sub_code`, `severity`, `title`, `root_cause`, `confidence`, `uncertainty_band`, `recommended_pwm_duty`, `recommended_parts[]`.

### Pemetaan Keluarga Gangguan (`FAULT_TAXONOMY`)
- **`F1`:** `F1_01_PV_SOILING_SHADING`, `F1_02_PV_OPEN_CIRCUIT`, `F1_03_PV_UNDERPERFORM_CELL`
- **`F2`:** `F2_01_BATT_SOH_DEGRADATION`, `F2_02_BATT_UVLO_LOCKOUT`, `F2_03_BATT_SUDDEN_DISCONNECT`
- **`F3`:** `F3_01_SCC_CHARGE_FAIL`, `F3_02_SCC_LVD_CUTOFF`
- **`F4`:** `F4_01_LED_OPEN_CIRCUIT`, `F4_02_LED_OVERCURRENT_SHORT`, `F4_03_DAYLIGHT_RELAY_STUCK`
- **`F5`:** `F5_01_BATT_OVERHEAT`, `F5_02_CONTROLLER_OVERHEAT`
- **`F6`:** `F6_01_DOOR_FORCED_OPEN`, `F6_02_CABLE_BATT_THEFT`, `F6_03_GEOFENCE_DISPLACEMENT`
