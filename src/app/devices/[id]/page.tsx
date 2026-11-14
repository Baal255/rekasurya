"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useOperationalRole } from "@/components/AppShell";
import { PcbSchematicCard } from "@/components/PcbSchematicCard";
import {
  DeviceStatusBadge,
  FaultFamilyBadge,
  SpatialVerdictBadge,
  WorkOrderStatusBadge,
} from "@/components/StatusBadges";
import { TelemetryCharts } from "@/components/TelemetryCharts";
import { formatIdr, formatNum, formatWibTime } from "@/lib/format";
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
  const [allDevices, setAllDevices] = useState<Array<{ id: string; pole_label: string; status: string }>>([]);
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
      setPwmTarget(detailJson.data.device.pwm_duty || 55);
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
    return (
      <div className="scada-panel p-8 text-center text-sm font-mono text-slate-400">
        Memuat diagnostik 3-kanal untuk {deviceId}...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="scada-panel p-6 border-red-700/70 text-red-200 space-y-3">
        <div className="text-sm">{error}</div>
        <Link href="/" className="inline-block text-xs text-sky-400 hover:underline">
          ← Kembali ke Peta Armada Solo Raya
        </Link>
      </div>
    );
  }

  const { device, corridor, history, faultEvents, workOrders, corridorNeighbors } = detail;
  const maintenanceActive =
    Boolean(device.maintenance_until) &&
    new Date(device.maintenance_until!).getTime() > Date.now();

  return (
    <div className="space-y-5">
      {/* Header Tiang + Pemilih Cepat */}
      <div className="scada-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <Link href="/" className="hover:text-sky-300">
              Armada Solo Raya
            </Link>
            <span>/</span>
            <span>{corridor.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold font-mono text-slate-100">{device.id}</h1>
            <DeviceStatusBadge status={device.status} />
            <FaultFamilyBadge family={device.fault_family} subCode={device.fault_sub_code} />
            <SpatialVerdictBadge verdict={device.spatial_verdict} />
          </div>
          <div className="text-xs text-slate-300">
            {device.pole_label} · {corridor.kabupaten} ({corridor.road_class}, target SNI{" "}
            {corridor.target_lux} lx) · Eksisting: {device.legacy_lamp} · Skenario:{" "}
            <span className="font-mono text-sky-300">{device.active_scenario}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="device-jump" className="text-xs text-slate-400 font-mono">
            Ganti Tiang:
          </label>
          <select
            id="device-jump"
            value={device.id}
            onChange={(e) => router.push(`/devices/${e.target.value}`)}
            className="bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-[#0EA5E9]"
          >
            {allDevices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.pole_label} [{d.status}]
              </option>
            ))}
          </select>
          <Link
            href="/simulator"
            className="px-3 py-1.5 text-xs font-medium rounded border border-[#334155] bg-[#161F30] text-slate-200 hover:border-[#0EA5E9]"
          >
            Uji di Simulator
          </Link>
        </div>
      </div>

      {/* Skematik PCB 3-Kanal Terisolasi */}
      <PcbSchematicCard device={device} />

      {/* Matriks 5 Sensor NTC + Kondisi Keamanan & Kendali Jarak Jauh */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 scada-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Matriks 5 Kanal Suhu (ADS1115 NTC + LM75B) &amp; Kesehatan Subsistem
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
            {[
              { label: "NTC Panel PV", val: device.temp_panel_c, limit: 75 },
              { label: "NTC Baterai", val: device.temp_batt_c, limit: 50 },
              { label: "NTC SCC MPPT", val: device.temp_scc_c, limit: 60 },
              { label: "NTC Driver LED", val: device.temp_driver_c, limit: 65 },
              { label: "PCB LM75B", val: device.temp_board_c, limit: 60 },
            ].map((sensor) => {
              const hot = sensor.val >= sensor.limit;
              return (
                <div
                  key={sensor.label}
                  className={`p-2.5 rounded border ${
                    hot
                      ? "bg-red-950/60 border-red-600/70 text-red-200"
                      : "bg-[#0B0F17] border-[#1E293B] text-slate-200"
                  }`}
                >
                  <div className="text-[10px] text-slate-400">{sensor.label}</div>
                  <div className="text-base font-bold mt-0.5">{formatNum(sensor.val)} °C</div>
                  <div className="text-[10px] text-slate-500">Ambang {sensor.limit}°C</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
            <div className="scada-inset p-2.5">
              <div className="text-[10px] text-slate-400">Komisi &amp; Inspeksi</div>
              <div className="text-slate-200 mt-0.5">{device.commissioned_at}</div>
              <div className="text-[10px] text-slate-500">Uptime 30h: {device.uptime_30d_pct}%</div>
            </div>
            <div className="scada-inset p-2.5">
              <div className="text-[10px] text-slate-400">Geofence GNSS</div>
              <div className="text-slate-200 mt-0.5">Radius {device.geofence_radius_m} m</div>
              <div className="text-[10px] text-slate-500">
                {device.lat.toFixed(4)}, {device.lng.toFixed(4)}
              </div>
            </div>
            <div className="scada-inset p-2.5">
              <div className="text-[10px] text-slate-400">Otorisasi Teknisi</div>
              <div className={maintenanceActive ? "text-emerald-300 font-semibold mt-0.5" : "text-slate-300 mt-0.5"}>
                {maintenanceActive ? "AKTIF (90m)" : "Terproteksi F6"}
              </div>
              <div className="text-[10px] text-slate-500">
                {maintenanceActive ? formatWibTime(device.maintenance_until) : "Alarm pintu aktif"}
              </div>
            </div>
            <div className="scada-inset p-2.5">
              <div className="text-[10px] text-slate-400">Sumber Data</div>
              <div className="text-sky-300 font-semibold mt-0.5">{device.data_source}</div>
              <div className="text-[10px] text-slate-500">{formatWibTime(device.last_seen_at)}</div>
            </div>
          </div>
        </div>

        {/* Panel Perintah Jarak Jauh */}
        <div className="lg:col-span-5 scada-panel p-4 flex flex-col justify-between gap-3">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Kendali Aman &amp; Mode Pemeliharaan (MQTT QoS 1)
            </h2>
            <p className="text-xs text-slate-400">
              Perintah dibatasi langsung oleh aturan keselamatan firmware: penguncian PWM 0% bila baterai di bawah UVLO serta derating termal driver.
            </p>

            <div className="scada-inset p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <label htmlFor="pwm-range" className="text-slate-300">
                  Target Duty PWM PC817:
                </label>
                <span className="text-sky-300 font-bold">{pwmTarget}%</span>
              </div>
              <input
                id="pwm-range"
                type="range"
                min={0}
                max={100}
                step={5}
                value={pwmTarget}
                onChange={(e) => setPwmTarget(Number(e.target.value))}
                className="w-full accent-[#0EA5E9]"
              />
              <button
                type="button"
                disabled={busyCmd}
                onClick={() => sendCommand({ command: "SET_PWM_DUTY", pwm_duty: pwmTarget })}
                className="w-full py-1.5 text-xs font-semibold rounded bg-[#0EA5E9] text-slate-950 hover:bg-sky-400 disabled:opacity-50 cursor-pointer"
              >
                Kirim Perintah PWM ({pwmTarget}%)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
                className="py-1.5 px-2 text-xs font-medium rounded border border-[#334155] bg-[#161F30] text-slate-200 hover:border-amber-400 cursor-pointer"
              >
                {maintenanceActive ? "Nonaktifkan Mode Servis" : "Aktifkan Mode Servis 90m"}
              </button>
              <button
                type="button"
                disabled={busyCmd}
                onClick={() => sendCommand({ command: "REQUEST_DIAGNOSTIC_PING" })}
                className="py-1.5 px-2 text-xs font-medium rounded border border-[#334155] bg-[#161F30] text-slate-200 hover:border-sky-400 cursor-pointer"
              >
                Ping Sinkronisasi DS3231
              </button>
            </div>

            {device.status !== "NORMAL" && (
              <button
                type="button"
                disabled={busyCmd}
                onClick={simulateRecoveryHere}
                className="w-full py-1.5 text-xs font-semibold rounded border border-emerald-600/70 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60 cursor-pointer"
              >
                Simulasikan Telemetri Pemulihan Normal (Setelah Perbaikan)
              </button>
            )}
          </div>

          {commandFeedback && (
            <div
              className={`p-2.5 rounded border text-xs font-mono ${
                commandFeedback.ok
                  ? "bg-emerald-950/70 border-emerald-700/70 text-emerald-200"
                  : "bg-red-950/70 border-red-700/70 text-red-200"
              }`}
            >
              {commandFeedback.message}
            </div>
          )}
        </div>
      </div>

      {/* Grafik 48 Jam EWMA + Daya Aktual vs Ekspektasi + SoC */}
      <TelemetryCharts
        history={history}
        ewmaUcl={device.ewma_ucl}
        ewmaLcl={device.ewma_lcl}
        neighborMedianZ={device.neighbor_z_median}
      />

      {/* Perbandingan Spasial Tiang Tetangga Satu Koridor */}
      <div className="scada-panel p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-1">
          Korelasi Spasial Tetangga Koridor ({corridor.name})
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Membedakan gangguan terlokalisasi pada 1 tiang ({device.id}: Z = {formatNum(device.ewma_z)} W) terhadap penurunan iradiansi cuaca seruas.
        </p>
        <div className="overflow-x-auto border border-[#1E293B] rounded">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0F1623] border-b border-[#1E293B] text-[11px] uppercase text-slate-400">
                <th className="py-2 px-3">Tiang</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Daya PV</th>
                <th className="py-2 px-3">Lux</th>
                <th className="py-2 px-3">EWMA Zₜ</th>
                <th className="py-2 px-3">SoC</th>
                <th className="py-2 px-3">Vonis Spasial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              <tr className="bg-[#0EA5E9]/10">
                <td className="py-2 px-3 font-bold text-sky-300">
                  {device.id} (Sedang Diinspeksi)
                </td>
                <td className="py-2 px-3">
                  <DeviceStatusBadge status={device.status} />
                </td>
                <td className="py-2 px-3">{formatNum(device.pv_p)} W</td>
                <td className="py-2 px-3">{formatNum(device.lux, 0)} lx</td>
                <td className="py-2 px-3 font-bold">{formatNum(device.ewma_z)} W</td>
                <td className="py-2 px-3">{formatNum(device.soc_pct, 0)}%</td>
                <td className="py-2 px-3">
                  <SpatialVerdictBadge verdict={device.spatial_verdict} />
                </td>
              </tr>
              {corridorNeighbors.map((nb) => (
                <tr key={nb.id} className="hover:bg-[#161F30]/60">
                  <td className="py-2 px-3">
                    <Link href={`/devices/${nb.id}`} className="text-slate-200 hover:text-sky-300">
                      {nb.id} · {nb.pole_label}
                    </Link>
                  </td>
                  <td className="py-2 px-3">
                    <DeviceStatusBadge status={nb.status} />
                  </td>
                  <td className="py-2 px-3">{formatNum(nb.pv_p)} W</td>
                  <td className="py-2 px-3">{formatNum(nb.lux, 0)} lx</td>
                  <td className="py-2 px-3">{formatNum(nb.ewma_z)} W</td>
                  <td className="py-2 px-3">{formatNum(nb.soc_pct, 0)}%</td>
                  <td className="py-2 px-3">
                    <SpatialVerdictBadge verdict={nb.spatial_verdict} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kejadian Gangguan & Work Order Tiang */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="scada-panel p-4 space-y-2.5">
          <h2 className="text-sm font-semibold text-slate-100">
            Riwayat Kejadian Gangguan ({faultEvents.length})
          </h2>
          {faultEvents.length === 0 ? (
            <div className="text-xs text-slate-400">Belum ada catatan gangguan untuk tiang ini.</div>
          ) : (
            faultEvents.map((fe) => (
              <div key={fe.id} className="scada-inset p-3 text-xs space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-100">{fe.id}</span>
                  <span className="text-slate-400">{fe.status} · {formatWibTime(fe.detected_at)}</span>
                </div>
                <div className="font-semibold text-slate-100">{fe.title}</div>
                <p className="text-slate-300">{fe.root_cause}</p>
                <div className="font-mono text-[11px] text-slate-400">
                  Latensi: {fe.detection_latency_sec} detik · Keyakinan: {Math.round(fe.confidence * 100)}%
                </div>
              </div>
            ))
          )}
        </div>

        <div className="scada-panel p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Work Order Terhubung ({workOrders.length})
            </h2>
            <Link href="/work-orders" className="text-xs text-sky-400 hover:underline">
              Kelola di Halaman Work Order →
            </Link>
          </div>
          {workOrders.length === 0 ? (
            <div className="text-xs text-slate-400">Belum ada Work Order untuk tiang ini.</div>
          ) : (
            workOrders.map((wo) => (
              <div key={wo.id} className="scada-inset p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-100">{wo.id}</span>
                  <WorkOrderStatusBadge status={wo.status} />
                </div>
                <div className="font-semibold text-slate-100">{wo.title}</div>
                <p className="text-slate-300">{wo.diagnosis_summary}</p>
                <div className="text-[11px] font-mono text-slate-400">
                  Regu: {wo.assigned_team} ({wo.truck_unit})
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
