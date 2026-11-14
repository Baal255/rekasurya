"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useOperationalRole } from "@/components/AppShell";
import { PcbSchematicCard } from "@/components/PcbSchematicCard";
import {
  DeviceStatusBadge,
  FaultFamilyBadge,
  PriorityBadge,
  SpatialVerdictBadge,
  WorkOrderStatusBadge,
} from "@/components/StatusBadges";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { PageHeader, PageSkeleton } from "@/components/UiPrimitives";
import { formatNum, formatWibTime } from "@/lib/format";
import type {
  AiInvocationRecord,
  CitizenReportRecord,
  CorridorRecord,
  DeviceRecord,
  FaultEventRecord,
  TelemetryHistoryRecord,
  WorkOrderRecord,
} from "@/lib/types";

interface DeviceDetailPayload {
  device: DeviceRecord;
  corridor: CorridorRecord;
  history: TelemetryHistoryRecord[];
  faultEvents: FaultEventRecord[];
  workOrders: WorkOrderRecord[];
  citizenReports: CitizenReportRecord[];
  corridorNeighbors: Array<{
    id: string;
    pole_label: string;
    status: string;
    fault_family: string;
    pv_p: number;
    lux: number;
    ewma_z: number;
    spatial_verdict: string;
    soc_pct: number;
  }>;
  aiInvocations: AiInvocationRecord[];
}

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getHeaders, demoResetTick } = useOperationalRole();
  const deviceId = params?.id ?? "SRG-009";

  const [detail, setDetail] = useState<DeviceDetailPayload | null>(null);
  const [allDevices, setAllDevices] = useState<
    Array<{ id: string; pole_label: string; status: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pwmTarget, setPwmTarget] = useState(55);
  const [commandFeedback, setCommandFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [busyCmd, setBusyCmd] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, listRes] = await Promise.all([
        fetch(`/api/devices/${encodeURIComponent(deviceId)}`, { cache: "no-store" }),
        fetch("/api/devices", { cache: "no-store" }),
      ]);
      const detailJson = await detailRes.json();
      const listJson = await listRes.json();
      if (!detailRes.ok || !detailJson.ok) {
        throw new Error(detailJson.error || `Gagal memuat perangkat ${deviceId}.`);
      }
      setDetail(detailJson.data);
      setPwmTarget(detailJson.data.device.pwm_duty ?? 55);
      if (listJson.ok) {
        setAllDevices(listJson.data.devices);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadData();
  }, [loadData, demoResetTick]);

  const sendCommand = async (payload: Record<string, unknown>) => {
    setBusyCmd(true);
    setCommandFeedback(null);
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/command`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setCommandFeedback({ ok: false, message: json.error || "Perintah ditolak." });
      } else {
        setCommandFeedback({ ok: true, message: json.data.message });
        await loadData();
      }
    } catch (err) {
      setCommandFeedback({
        ok: false,
        message: err instanceof Error ? err.message : "Gagal menghubungi server.",
      });
    } finally {
      setBusyCmd(false);
    }
  };

  const simulateRecoveryHere = async () => {
    setBusyCmd(true);
    setCommandFeedback(null);
    try {
      const res = await fetch("/api/simulator/inject", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ device_id: deviceId, scenario: "NORMAL_CLEAR_DAY" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setCommandFeedback({ ok: false, message: json.error || "Gagal memulihkan simulasi." });
      } else {
        setCommandFeedback({
          ok: true,
          message: `Telemetri ${deviceId} dipulihkan ke kondisi NORMAL (simulasi lab).`,
        });
        await loadData();
      }
    } finally {
      setBusyCmd(false);
    }
  };

  if (loading && !detail) {
    return <PageSkeleton rows={6} />;
  }

  if (error || !detail) {
    return (
      <div className="ops-card p-6 border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] space-y-3">
        <div className="text-sm font-medium">{error}</div>
        <Link href="/devices" className="inline-block text-xs font-medium text-[#062D5B] hover:underline">
          ← Kembali ke Inventaris Perangkat
        </Link>
      </div>
    );
  }

  const { device, corridor, history, faultEvents, workOrders, corridorNeighbors, aiInvocations } =
    detail;
  const maintenanceActive =
    Boolean(device.maintenance_until) &&
    new Date(device.maintenance_until!).getTime() > Date.now();
  const activeFault = faultEvents.find((fault) => fault.status !== "RESOLVED");

  return (
    <div className="space-y-5 min-w-0">
      {/* 1. Identitas Perangkat, Status & Pemilih Cepat */}
      <PageHeader
        title={`${device.id} — ${device.pole_label}`}
        subtitle={`${corridor.name} · ${corridor.kabupaten} (${corridor.road_class}, target demo ${corridor.target_lux} lx) · Lampu warisan: ${device.legacy_lamp}`}
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <DeviceStatusBadge status={device.status} />
            <FaultFamilyBadge family={device.fault_family} subCode={device.fault_sub_code} />
            <SpatialVerdictBadge verdict={device.spatial_verdict} />
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="device-jump"
              aria-label="Pilih perangkat lain"
              value={device.id}
              onChange={(e) => router.push(`/devices/${e.target.value}`)}
              className="ops-input px-2.5 py-1.5 text-[12px] font-mono cursor-pointer max-w-[260px]"
            >
              {allDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} — {d.pole_label} [{d.status}]
                </option>
              ))}
            </select>
            <Link href="/simulator" className="ops-btn-secondary px-3 py-1.5 text-[12px]">
              Uji di Simulator
            </Link>
          </div>
        }
      />

      {/* 2. Ringkasan Kondisi Operasional Saat Ini (Strip Ringkas 5 Metrik) */}
      <section className="ops-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#DCE3EC] text-[13px]">
          <div className="p-3.5">
            <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">Konektivitas</div>
            <div className="mt-0.5 font-mono font-semibold text-[#15803D]">
              {device.status === "OFFLINE" ? "TERPUTUS" : "TERHUBUNG"} ({device.data_source})
            </div>
            <div className="text-[11px] font-mono text-[#5B6B7F] tabular-nums">
              {formatWibTime(device.last_seen_at)}
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">EWMA Residu Zₜ</div>
            <div
              className={`mt-0.5 font-mono font-semibold tabular-nums ${
                device.ewma_z < device.ewma_lcl ? "text-[#B45309]" : "text-[#15803D]"
              }`}
            >
              {formatNum(device.ewma_z, 1)} W
            </div>
            <div className="text-[11px] font-mono text-[#5B6B7F] tabular-nums">
              LCL {formatNum(device.ewma_lcl, 1)} W · Tetangga {formatNum(device.neighbor_z_median, 1)} W
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">Keamanan &amp; 18650</div>
            <div
              className={`mt-0.5 font-mono font-semibold ${
                device.door_open || device.on_backup_cell ? "text-[#9D174D]" : "text-[#0B192C]"
              }`}
            >
              Pintu {device.door_open ? "TERBUKA" : "Rapat"} · {formatNum(device.accel_g, 2)} g
            </div>
            <div className="text-[11px] font-mono text-[#5B6B7F] tabular-nums">
              18650: {formatNum(device.backup_cell_v, 2)} V{" "}
              {device.on_backup_cell ? "(AKTIF)" : "(Standby)"}
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">Otorisasi Servis</div>
            <div
              className={`mt-0.5 font-mono font-semibold ${
                maintenanceActive ? "text-[#062D5B]" : "text-[#0B192C]"
              }`}
            >
              {maintenanceActive ? "MODE SERVIS AKTIF" : "Anti-Tamper Penuh"}
            </div>
            <div className="text-[11px] font-mono text-[#5B6B7F]">
              {maintenanceActive ? formatWibTime(device.maintenance_until) : "Alarm pintu aktif"}
            </div>
          </div>
          <div className="p-3.5">
            <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">Uptime 30 Hari</div>
            <div className="mt-0.5 font-mono font-semibold text-[#0B192C] tabular-nums">
              {formatNum(device.uptime_30d_pct, 1)}%
            </div>
            <div className="text-[11px] text-[#5B6B7F]">
              Varian {device.variant === "KIT_KONVERSI" ? "Kit Konversi" : "Retrofit PJUTS"}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Perbandingan Terstruktur 3-Kanal + Skematik Topologi PCB */}
      <section className="space-y-4">
        <div className="ops-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[#0B192C]">
                Perbandingan Tiga Kanal Daya
              </h2>
              <p className="text-[12px] text-[#5B6B7F]">
                Memisahkan pengukuran sisi PV tegangan tinggi (INA228), baterai LiFePO4 (INA226), dan jalur daya LED eksternal (INA226).
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#5B6B7F]">
              Skenario aktif: {device.active_scenario}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                  <th className="py-2.5 px-4">Kanal Sensor</th>
                  <th className="py-2.5 px-3">IC &amp; Isolasi</th>
                  <th className="py-2.5 px-3">Tegangan (V)</th>
                  <th className="py-2.5 px-3">Arus (A)</th>
                  <th className="py-2.5 px-3">Daya (W)</th>
                  <th className="py-2.5 px-4">Parameter Tambahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC] font-mono tabular-nums">
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-[#0B192C]">
                    Kanal 1 · Panel Surya (PV)
                  </td>
                  <td className="py-3 px-3 text-[12px] text-[#5B6B7F]">INA228 (85V) + B0303S/ADuM1250</td>
                  <td className="py-3 px-3">{formatNum(device.pv_v)} V</td>
                  <td className="py-3 px-3">{formatNum(device.pv_i, 2)} A</td>
                  <td className="py-3 px-3 font-semibold text-[#062D5B]">
                    {formatNum(device.pv_p)} W
                  </td>
                  <td className="py-3 px-4 font-sans text-[12px] text-[#334155]">
                    Ekspektasi regresi: <span className="font-mono">{formatNum(device.expected_p_chg)} W</span> (Residu{" "}
                    <span className="font-mono">{formatNum(device.residual_w)} W</span>)
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-[#0B192C]">
                    Kanal 2 · Pack Baterai
                  </td>
                  <td className="py-3 px-3 text-[12px] text-[#5B6B7F]">INA226 (36 V) + B0303S/ADuM1250</td>
                  <td className="py-3 px-3">{formatNum(device.batt_v)} V</td>
                  <td className="py-3 px-3">{formatNum(device.batt_i, 2)} A</td>
                  <td className="py-3 px-3 font-semibold text-[#0B192C]">
                    {formatNum(device.batt_p)} W
                  </td>
                  <td className="py-3 px-4 font-sans text-[12px] text-[#334155]">
                    SoC <span className="font-mono font-semibold">{formatNum(device.soc_pct, 0)}%</span> · SoH{" "}
                    <span className="font-mono">{formatNum(device.soh_pct, 1)}%</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-sans font-semibold text-[#0B192C]">
                    Kanal 3 · Beban Lampu LED
                  </td>
                  <td className="py-3 px-3 text-[12px] text-[#5B6B7F]">INA226 pada keluaran SCC LOAD</td>
                  <td className="py-3 px-3">{formatNum(device.load_v)} V</td>
                  <td className="py-3 px-3">{formatNum(device.load_i, 2)} A</td>
                  <td className="py-3 px-3 font-semibold text-[#B45309]">
                    {formatNum(device.load_p)} W
                  </td>
                  <td className="py-3 px-4 font-sans text-[12px] text-[#334155]">
                    PWM <span className="font-mono">{device.pwm_duty}%</span> · Lux{" "}
                    <span className="font-mono">{formatNum(device.lux, 0)} lx</span> · PIR{" "}
                    <span className="font-mono">{device.pir_active ? "AKTIF" : "DIAM"}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <PcbSchematicCard device={device} />
      </section>

      {/* 4. Grafik Historis Bergaya Grafana + Time Range Selector */}
      <TelemetryCharts
        history={history}
        ewmaUcl={device.ewma_ucl}
        ewmaLcl={device.ewma_lcl}
        neighborMedianZ={device.neighbor_z_median}
      />

      {/* 5. Kondisi Baterai & Matriks 5 Sensor Suhu NTC */}
      <section className="ops-card p-4 space-y-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0B192C]">
            Kondisi Pack Baterai &amp; Matriks 5 Kanal Suhu (ADS1115 NTC + LM75B)
          </h2>
          <p className="text-[12px] text-[#5B6B7F]">
            Profil demo {device.battery_profile}. Empat kanal NTC dan satu kanal suhu PCB ditampilkan dengan ambang simulasi.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono tabular-nums">
          {[
            { label: "NTC Panel PV", val: device.temp_panel_c, limit: 75 },
            { label: "NTC Baterai LiFePO4", val: device.temp_batt_c, limit: 50 },
            { label: "NTC SCC MPPT", val: device.temp_scc_c, limit: 60 },
            { label: "NTC Driver LED", val: device.temp_driver_c, limit: 65 },
            { label: "Sensor PCB LM75B", val: device.temp_board_c, limit: 60 },
          ].map((sensor) => {
            const hot = sensor.val >= sensor.limit;
            return (
              <div
                key={sensor.label}
                className={`p-3 rounded-md border ${
                  hot
                    ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
                    : "bg-[#F8FAFC] border-[#DCE3EC] text-[#0B192C]"
                }`}
              >
                <div className="font-sans text-[11px] text-[#5B6B7F]">{sensor.label}</div>
                <div className="text-[18px] font-bold mt-0.5">{formatNum(sensor.val)} °C</div>
                <div className="text-[11px] text-[#5B6B7F]">Ambang: {sensor.limit} °C</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Diagnosis Gangguan & Bukti Pendukung (dengan Kejujuran AI Eksplisit) */}
      <section className="ops-card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#DCE3EC] pb-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[#0B192C]">
              Diagnosis Gangguan, Korelasi Koridor &amp; Bukti Pendukung
            </h2>
            <p className="text-[12px] text-[#5B6B7F]">
              Diagnosis demo berbasis aturan dan EWMA per sampel. PoC GPT Astra menunggu hasil.
            </p>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-[#FEF3C7]/70 border border-[#F59E0B]/30 text-[#92400E]">
            DIAGNOSIS SIMULASI
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
          <div className="lg:col-span-5 min-w-0 ops-inset p-3.5 space-y-2 text-[13px]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
              Alarm Aktif pada Demo
            </div>
            <div className="font-semibold text-[#0B192C]">
              {activeFault?.title ?? "Tidak ada alarm aktif"}
            </div>
            <p className="text-[12px] text-[#334155] leading-relaxed">
              {activeFault?.root_cause ?? "Status perangkat dan riwayat tersedia pada halaman ini."}
            </p>
            <div className="pt-2 border-t border-[#DCE3EC] text-[11px] font-mono text-[#5B6B7F] space-y-1">
              <div>
                Mode Inferensi:{" "}
                <span className="text-[#0B192C]">
                  {aiInvocations[0]?.adapter_mode ?? "MOCK_EWMA_DETERMINISTIC"}
                </span>
              </div>
              <div>
                Vonis Spasial Koridor:{" "}
                <span className="text-[#0B192C]">{device.spatial_verdict}</span> (Z tiang{" "}
                {formatNum(device.ewma_z, 1)} W vs median tetangga{" "}
                {formatNum(device.neighbor_z_median, 1)} W)
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 min-w-0 overflow-x-auto border border-[#DCE3EC] rounded-md">
            <table className="w-full text-left border-collapse text-[12px] font-mono tabular-nums">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-sans font-semibold uppercase text-[#5B6B7F]">
                  <th className="py-2 px-3">Tiang Satu Koridor</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Daya PV</th>
                  <th className="py-2 px-3">Lux</th>
                  <th className="py-2 px-3">EWMA Zₜ</th>
                  <th className="py-2 px-3">Vonis Spasial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                <tr className="bg-[#EBF1F8]">
                  <td className="py-2 px-3 font-semibold text-[#062D5B]">
                    {device.id} (Diinspeksi)
                  </td>
                  <td className="py-2 px-3">
                    <DeviceStatusBadge status={device.status} />
                  </td>
                  <td className="py-2 px-3">{formatNum(device.pv_p)} W</td>
                  <td className="py-2 px-3">{formatNum(device.lux, 0)} lx</td>
                  <td className="py-2 px-3 font-semibold">{formatNum(device.ewma_z, 1)} W</td>
                  <td className="py-2 px-3">
                    <SpatialVerdictBadge verdict={device.spatial_verdict} />
                  </td>
                </tr>
                {corridorNeighbors.map((nb) => (
                  <tr key={nb.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2 px-3 font-sans">
                      <Link href={`/devices/${nb.id}`} className="text-[#062D5B] hover:underline font-medium">
                        {nb.id} · {nb.pole_label}
                      </Link>
                    </td>
                    <td className="py-2 px-3">
                      <DeviceStatusBadge status={nb.status} />
                    </td>
                    <td className="py-2 px-3">{formatNum(nb.pv_p)} W</td>
                    <td className="py-2 px-3">{formatNum(nb.lux, 0)} lx</td>
                    <td className="py-2 px-3">{formatNum(nb.ewma_z, 1)} W</td>
                    <td className="py-2 px-3">
                      <SpatialVerdictBadge verdict={nb.spatial_verdict} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7 & 8. Riwayat Kejadian/Alarm & Riwayat Pemeliharaan Work Order */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="ops-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-2">
            <h2 className="text-[14px] font-semibold text-[#0B192C]">
              7. Riwayat Kejadian &amp; Alarm ({faultEvents.length})
            </h2>
            <Link href="/alerts" className="text-[12px] text-[#062D5B] hover:underline">
              Manajemen Alarm →
            </Link>
          </div>
          {faultEvents.length === 0 ? (
            <div className="text-xs text-[#5B6B7F]">Belum ada riwayat alarm untuk tiang ini.</div>
          ) : (
            <div className="space-y-2">
              {faultEvents.map((fe) => (
                <div key={fe.id} className="ops-inset p-3 text-[12px] space-y-1">
                  <div className="flex items-center justify-between gap-2 font-mono">
                    <span className="font-semibold text-[#0B192C]">{fe.id}</span>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={fe.severity} />
                      <span className="text-[11px] text-[#5B6B7F]">
                        {fe.status} · {formatWibTime(fe.detected_at)}
                      </span>
                    </div>
                  </div>
                  <div className="font-semibold text-[#0B192C]">{fe.title}</div>
                  <p className="text-[#334155]">{fe.root_cause}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ops-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DCE3EC] pb-2">
            <h2 className="text-[14px] font-semibold text-[#0B192C]">
              8. Riwayat Pemeliharaan Work Order ({workOrders.length})
            </h2>
            <Link href="/work-orders" className="text-[12px] text-[#062D5B] hover:underline">
              Buka Work Order →
            </Link>
          </div>
          {workOrders.length === 0 ? (
            <div className="text-xs text-[#5B6B7F]">Belum ada Work Order untuk tiang ini.</div>
          ) : (
            <div className="space-y-2">
              {workOrders.map((wo) => (
                <div key={wo.id} className="ops-inset p-3 text-[12px] space-y-1.5">
                  <div className="flex items-center justify-between gap-2 font-mono">
                    <Link
                      href={`/work-orders?highlight=${encodeURIComponent(wo.id)}`}
                      className="font-semibold text-[#087F72] hover:underline"
                    >
                      {wo.id}
                    </Link>
                    <WorkOrderStatusBadge status={wo.status} />
                  </div>
                  <div className="font-semibold text-[#0B192C]">{wo.title}</div>
                  <p className="text-[#334155]">{wo.diagnosis_summary}</p>
                  <div className="text-[11px] font-mono text-[#5B6B7F]">
                    Regu: {wo.assigned_team} ({wo.truck_unit}) · SLA {formatWibTime(wo.sla_deadline)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 9. Informasi Lokasi, Konfigurasi Geofence & Kendali Aman Jarak Jauh */}
      <section className="ops-card p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-[14px] font-semibold text-[#0B192C]">
            9. Lokasi, Geofence &amp; Konfigurasi Perangkat
          </h2>
          <dl className="grid grid-cols-2 gap-2.5 text-[12px]">
            <div className="ops-inset p-2.5">
              <dt className="text-[11px] text-[#5B6B7F]">Koordinat GNSS</dt>
              <dd className="font-mono font-semibold text-[#0B192C] tabular-nums mt-0.5">
                {device.lat.toFixed(5)}, {device.lng.toFixed(5)}
              </dd>
            </div>
            <div className="ops-inset p-2.5">
              <dt className="text-[11px] text-[#5B6B7F]">Radius Geofence</dt>
              <dd className="font-mono font-semibold text-[#0B192C] tabular-nums mt-0.5">
                {device.geofence_radius_m} meter
              </dd>
            </div>
            <div className="ops-inset p-2.5">
              <dt className="text-[11px] text-[#5B6B7F]">Tanggal Komisi</dt>
              <dd className="font-mono text-[#0B192C] mt-0.5">{device.commissioned_at}</dd>
            </div>
            <div className="ops-inset p-2.5">
              <dt className="text-[11px] text-[#5B6B7F]">Instansi Pengelola</dt>
              <dd className="text-[#0B192C] font-medium mt-0.5">{corridor.managing_agency}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-7 space-y-3 border-t lg:border-t-0 lg:border-l border-[#DCE3EC] pt-4 lg:pt-0 lg:pl-5">
          <div>
            <h3 className="text-[14px] font-semibold text-[#0B192C]">
              Simulasi Kendali Lampu
            </h3>
            <p className="text-[12px] text-[#5B6B7F]">
              Uji respons demo terhadap UVLO, iluminansi, dan suhu driver. Aksi memperbarui snapshot simulasi.
            </p>
          </div>

          <div className="ops-inset p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <label htmlFor="pwm-range" className="font-medium text-[#0B192C]">
                Target Duty PWM Optocoupler PC817:
              </label>
              <span className="font-mono font-bold text-[#062D5B] tabular-nums">{pwmTarget}%</span>
            </div>
            <input
              id="pwm-range"
              type="range"
              min={0}
              max={100}
              step={5}
              value={pwmTarget}
              onChange={(e) => setPwmTarget(Number(e.target.value))}
              className="w-full accent-[#062D5B]"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyCmd}
                onClick={() => sendCommand({ command: "SET_PWM_DUTY", pwm_duty: pwmTarget })}
                className="ops-btn-primary px-3.5 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
              >
                Simulasikan PWM ({pwmTarget}%)
              </button>
              <button
                type="button"
                disabled={busyCmd}
                onClick={() =>
                  sendCommand({
                    command: "SET_MAINTENANCE_MODE",
                    enabled: !maintenanceActive,
                    duration_minutes: 90,
                  })
                }
                className="ops-btn-secondary px-3 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
              >
                {maintenanceActive ? "Nonaktifkan Mode Servis" : "Aktifkan Mode Servis 90 Menit"}
              </button>
              <button
                type="button"
                disabled={busyCmd}
                onClick={() => sendCommand({ command: "REQUEST_DIAGNOSTIC_PING" })}
                className="ops-btn-secondary px-3 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
              >
                Simulasikan Ping DS3231
              </button>
              {device.status !== "NORMAL" && (
                <button
                  type="button"
                  disabled={busyCmd}
                  onClick={simulateRecoveryHere}
                  className="px-3 py-1.5 text-[12px] font-semibold rounded-md border border-[#15803D] bg-[#ECFDF5] text-[#065F46] hover:bg-[#D1FAE5] cursor-pointer disabled:opacity-50"
                >
                  Simulasikan Pemulihan Normal
                </button>
              )}
            </div>
          </div>

          {commandFeedback && (
            <div
              className={`p-3 rounded-md border text-[12px] font-mono ${
                commandFeedback.ok
                  ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
                  : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
              }`}
            >
              {commandFeedback.message}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
