import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { verifyAuditChain } from "@/lib/audit";
import { AI_CONTRACT_VERSION, TelemetryInferenceRequestZ } from "@/lib/ai/contract";
import { runAiInference } from "@/lib/ai/adapter";
import { ensureSeeded, openDb, setTestDb } from "@/lib/db";
import { listCitizenReports, submitCitizenReport } from "@/lib/domain/citizen-reports";
import { executeDeviceCommand } from "@/lib/domain/commands";
import { injectSimulationScenario } from "@/lib/domain/telemetry";
import {
  listWorkOrders,
  transitionWorkOrder,
  WorkOrderTransitionError,
} from "@/lib/domain/work-orders";
import { calculateEnergyAndSavings, DEFAULT_ENERGY_INPUT } from "@/lib/energy/calculator";

let db: Database.Database;

beforeEach(() => {
  db = openDb(":memory:");
  ensureSeeded(db);
  setTestDb(db);
});

afterEach(() => {
  setTestDb(null);
  db.close();
});

describe("REKASURYA Platform Integration & Domain Verification", () => {
  it("membuat 5 koridor, 18 tiang Solo Raya, serta rantai hash SHA-256 audit_log yang valid dan anti-tamper", () => {
    const corridors = db.prepare("SELECT COUNT(*) AS n FROM corridors").get() as { n: number };
    const devices = db.prepare("SELECT COUNT(*) AS n FROM devices").get() as { n: number };
    expect(corridors.n).toBe(5);
    expect(devices.n).toBe(18);

    const chainBefore = verifyAuditChain(db);
    expect(chainBefore.valid).toBe(true);
    expect(chainBefore.totalEntries).toBeGreaterThanOrEqual(2);

    // Uji deteksi manipulasi: ubah isi JSON audit secara langsung
    db.prepare("UPDATE audit_log SET detail_json = ? WHERE seq = 1").run(
      JSON.stringify({ tampered: true })
    );
    const chainAfter = verifyAuditChain(db);
    expect(chainAfter.valid).toBe(false);
    expect(chainAfter.brokenAtSeq).toBe(1);
  });

  it("memvalidasi kontrak AI v1.0.0 dan membedakan shading lokal (F1) vs mendung seruas koridor (CUACA_SERUAS)", async () => {
    expect(() =>
      TelemetryInferenceRequestZ.parse({
        schema_version: "0.9.0",
        device_id: "SOL-001",
      })
    ).toThrow();

    // 1. Skenario Mendung Koridor Seruas -> tidak boleh menerbitkan Work Order palsu
    const wosBeforeCloudy = listWorkOrders(db).length;
    const cloudyRes = await injectSimulationScenario(db, {
      deviceId: "SOL-002",
      scenario: "WEATHER_CORRIDOR_CLOUDY",
    });
    expect(cloudyRes.ai.schema_version).toBe(AI_CONTRACT_VERSION);
    expect(cloudyRes.ai.fault_family).toBe("NONE");
    expect(cloudyRes.ai.sub_code).toBe("OK");
    expect(cloudyRes.ai.spatial_verdict).toBe("CUACA_SERUAS");
    expect(cloudyRes.createdWorkOrder).toBeNull();
    expect(listWorkOrders(db).length).toBe(wosBeforeCloudy);

    // 2. Skenario F1 Soiling/Shading lokal pada 1 tiang -> menerbitkan WO + suku cadang MNT-PV-CLN
    const localF1 = await injectSimulationScenario(db, {
      deviceId: "SOL-003",
      scenario: "F1_PV_SOILING_SHADING",
    });
    expect(localF1.ai.fault_family).toBe("F1");
    expect(localF1.ai.sub_code).toBe("F1_01_PV_SOILING_SHADING");
    expect(localF1.ai.spatial_verdict).toBe("ANOMALI_LOKAL");
    expect(localF1.device.status).toBe("WARNING_EWMA");
    expect(localF1.createdWorkOrder).not.toBeNull();
    expect(localF1.ai.recommended_parts[0]?.sku).toBe("MNT-PV-CLN");
  });

  it("mendeteksi skenario F2, F3, F4, F5, dan F6 dengan tepat serta menekan alarm F6 saat teknisi terotorisasi", async () => {
    const f2 = await injectSimulationScenario(db, {
      deviceId: "SOL-001",
      scenario: "F2_BATTERY_DEGRADATION",
    });
    expect(f2.ai.fault_family).toBe("F2");
    expect(f2.device.status).toBe("FAULT");

    const f3 = await injectSimulationScenario(db, {
      deviceId: "SKH-105",
      scenario: "F3_SCC_FAILURE",
    });
    expect(f3.ai.fault_family).toBe("F3");
    expect(f3.ai.recommended_parts.some((p) => p.sku.includes("SCC"))).toBe(true);

    const f4 = await injectSimulationScenario(db, {
      deviceId: "KRA-041",
      scenario: "F4_LED_DRIVER_OPEN",
    });
    expect(f4.ai.fault_family).toBe("F4");

    const f5 = await injectSimulationScenario(db, {
      deviceId: "KLT-017",
      scenario: "F5_THERMAL_OVERHEAT",
    });
    expect(f5.ai.fault_family).toBe("F5");
    expect(f5.ai.severity).toBe("CRITICAL");

    const f6 = await injectSimulationScenario(db, {
      deviceId: "SRG-008",
      scenario: "F6_TAMPER_THEFT",
    });
    expect(f6.ai.fault_family).toBe("F6");
    expect(f6.device.status).toBe("TAMPER_CRITICAL");
    expect(f6.device.on_backup_cell).toBe(1);

    // Uji penekanan alarm buka pintu saat teknisi telah check-in (technician_authorized = true)
    const authRes = await runAiInference({
      schema_version: AI_CONTRACT_VERSION,
      device_id: "SOL-004",
      recorded_at: new Date().toISOString(),
      profile: {
        nominal_pv_wp: 300,
        nominal_batt_v: 25.6,
        nominal_batt_ah: 40,
        nominal_led_w: 40,
        geofence_radius_m: 15,
      },
      sensors: {
        pv_v: 38.0,
        pv_i: 5.5,
        batt_v: 26.8,
        batt_i: 6.2,
        load_v: 24.8,
        load_i: 0,
        soc_pct: 75,
        soh_pct: 96,
        temp_panel_c: 40,
        temp_batt_c: 31,
        temp_scc_c: 34,
        temp_driver_c: 29,
        temp_board_c: 32,
        lux: 78000,
        pir_active: false,
        pwm_duty: 0,
        door_open: true,
        accel_g: 1.4,
        backup_cell_v: 4.1,
        geofence_drift_m: 1.0,
      },
      context: {
        prev_ewma_z: 0,
        technician_authorized: true,
        corridor_neighbors: [],
      },
    });
    expect(authRes.result.fault_family).toBe("NONE");
    expect(authRes.result.sub_code).toBe("OK");
  });

  it("menjalankan siklus lengkap Work Order: check-in otorisasi panel -> penolakan verifikasi sebelum pulih -> verifikasi telemetri normal -> tutup tiket & aduan Resolved", async () => {
    const actor = { role: "TEKNISI_SKYLIFT", name: "Regu PJU Sukoharjo" };

    // WO-2026-0003 ada di SKH-107 (status awal IN_PROGRESS, terhubung ke ID. 2026007610)
    // Simulasikan WO-2026-0001 (SRG-009, status awal ASSIGNED) check-in dahulu
    const checkedIn = transitionWorkOrder(db, "WO-2026-0001", { action: "CHECKIN" }, actor);
    expect(checkedIn.status).toBe("IN_PROGRESS");
    expect(checkedIn.maintenance_until).not.toBeNull();

    // Uji penolakan VERIFY ketika telemetri SKH-107 masih berstatus FAULT (409 Conflict)
    expect(() =>
      transitionWorkOrder(db, "WO-2026-0003", { action: "VERIFY" }, actor)
    ).toThrow(WorkOrderTransitionError);

    // Simulasikan perbaikan & telemetri pemulihan normal pada SKH-107
    await injectSimulationScenario(db, {
      deviceId: "SKH-107",
      scenario: "NORMAL_CLEAR_DAY",
    });

    // Sekarang VERIFY berhasil & menyelesaikan fault + aduan warga ID. 2026007610
    const verified = transitionWorkOrder(db, "WO-2026-0003", { action: "VERIFY" }, actor);
    expect(verified.status).toBe("VERIFIED");
    expect(verified.verification_passed).toBe(1);

    const closed = transitionWorkOrder(db, "WO-2026-0003", { action: "CLOSE" }, actor);
    expect(closed.status).toBe("CLOSED");

    const linkedCitizen = listCitizenReports(db, { id: "ID. 2026007610" })[0];
    expect(linkedCitizen.status).toBe("Resolved");
    expect(linkedCitizen.timeline.some((t) => t.status === "Resolved")).toBe(true);
  });

  it("mencocokkan aduan warga baru (adaptasi ULAS) ke tiang terdekat via Haversine & menautkan Work Order", () => {
    const res = submitCitizenReport(db, {
      channel: "Lapor Mas Wali (WA)",
      reporter_alias: "Warga Penguji Klaten",
      phone_last4: "8899",
      corridor_name: "Jl. Solo–Jogja (Jonggrangan)",
      description: "Lampu tiang depan sekolah mati total malam ini.",
      lat: -7.7026,
      lng: 110.6106,
      auto_create_work_order: true,
    });

    expect(res.report.id.startsWith("ID. ")).toBe(true);
    expect(res.nearestDevice?.id).toBe("KLT-018");
    expect(res.distanceMeters).toBeLessThan(100);
    // KLT-018 sudah punya WO-2026-0004 terbuka -> otomatis ditautkan!
    expect(res.linkedWorkOrderId).toBe("WO-2026-0004");
  });

  it("menghitung penghematan 2-aliran dengan payback SON-T ~3,7–4,5 thn dan kejujuran teknis terhadap LED 60W", () => {
    const res = calculateEnergyAndSavings(DEFAULT_ENERGY_INPUT);
    expect(res.lampSpecs.paybackYears).toBeGreaterThan(3.2);
    expect(res.lampSpecs.paybackYears).toBeLessThan(5.0);
    expect(res.stream1Conversion.totalCapexIdr).toBe(100 * 6_500_000);
    expect(res.stream2FleetOAndM.retrofitCapexTotalIdr).toBe(354 * 1_150_000);
    expect(res.combined.totalAnnualBenefitIdr).toBe(
      res.stream1Conversion.totalAnnualNetIdr + res.stream2FleetOAndM.totalAnnualOAndMSavingsIdr
    );

    const led60 = res.comparisonByLampType.find((c) => c.type === "LED_60W")!;
    expect(led60.economicallyAttractive).toBe(false);
  });

  it("menegakkan batas keselamatan firmware pada perintah PWM jarak jauh (UVLO & daylight clamp)", async () => {
    // SRG-009 bertegangan baterai 0 V (baterai dicabut) -> perintah PWM ditolak UVLO
    expect(() =>
      executeDeviceCommand(
        db,
        "SRG-009",
        { command: "SET_PWM_DUTY", pwm_duty: 60 },
        { role: "OPERATOR_DISHUB", name: "Operator Uji" }
      )
    ).toThrow(/UVLO/);

    // SOL-001 normal pada siang hari (lux > 50) -> PWM dibatasi ke 0% otomatis
    const cmdRes = executeDeviceCommand(
      db,
      "SOL-001",
      { command: "SET_PWM_DUTY", pwm_duty: 80 },
      { role: "OPERATOR_DISHUB", name: "Operator Uji" }
    );
    expect(cmdRes.clampedBySafety).toBe(true);
    expect(cmdRes.appliedPwmDuty).toBe(0);

    // Rantai audit tetap utuh setelah seluruh operasi
    expect(verifyAuditChain(db).valid).toBe(true);
  });
});
