"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import {
  DeviceStatusBadge,
  FaultFamilyBadge,
  SpatialVerdictBadge,
} from "@/components/StatusBadges";
import { formatIdr, formatNum } from "@/lib/format";
import {
  SIMULATION_SCENARIOS,
  type SimulationScenarioId,
} from "@/lib/simulator/engine";
import type { DeviceRecord, WorkOrderRecord } from "@/lib/types";
import type { TelemetryInferenceRequest, TelemetryInferenceResponse } from "@/lib/ai/contract";

interface InjectionOutput {
  device: DeviceRecord;
  ai: TelemetryInferenceResponse;
  latencyMs: number;
  createdWorkOrder: WorkOrderRecord | null;
  verifiedWorkOrderIds: string[];
  requestPayload: TelemetryInferenceRequest;
}

export default function FaultSimulatorPage() {
  const { getHeaders, triggerResetDemo, demoResetTick, isResetting } = useOperationalRole();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("SOL-002");
  const [selectedScenario, setSelectedScenario] =
    useState<SimulationScenarioId>("F1_PV_SOILING_SHADING");
  const [beforeDevice, setBeforeDevice] = useState<DeviceRecord | null>(null);
  const [output, setOutput] = useState<InjectionOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    const res = await fetch("/api/devices", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) {
      setDevices(json.data.devices);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices, demoResetTick]);

  const currentTarget = devices.find((d) => d.id === selectedDeviceId) ?? devices[0] ?? null;
  const activeScenarioMeta = SIMULATION_SCENARIOS.find((s) => s.id === selectedScenario)!;

  const runInjection = async () => {
    setBusy(true);
    setError(null);
    if (currentTarget) {
      setBeforeDevice(currentTarget);
    }
    try {
      const res = await fetch("/api/simulator/inject", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          device_id: selectedDeviceId,
          scenario: selectedScenario,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal menjalankan injeksi skenario.");
      }
      setOutput(json.data);
      await loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Banner Eksplisit Lab Simulasi */}
      <div className="scada-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100">
              Laboratorium Injeksi Gangguan &amp; Korelasi Cuaca Koridor
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded border border-amber-700/70 bg-amber-950/60 text-amber-200">
              DATA SIMULASI FISIKA PERANGKAT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Uji bagaimana telemetri 3-kanal (`INA228`, `INA226`), peta kendali `EWMA`, korelasi tetangga koridor, dan pembuatan Work Order merespons 8 skenario nyata tanpa mengklaim uji lapangan fisik.
          </p>
        </div>

        <button
          type="button"
          disabled={isResetting}
          onClick={async () => {
            await triggerResetDemo();
            setOutput(null);
            setBeforeDevice(null);
          }}
          className="px-3 py-1.5 text-xs font-medium rounded border border-[#334155] bg-[#161F30] text-slate-100 hover:border-amber-400 cursor-pointer"
        >
          {isResetting ? "Mereset..." : "Reset Seluruh Armada ke Kondisi Awal"}
        </button>
      </div>

      {/* Panel Kontrol Injeksi */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 scada-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">1. Pilih Tiang &amp; Skenario Uji</h2>

          <div className="text-xs">
            <label htmlFor="sim-device" className="block text-slate-400 mb-1">
              Target Tiang Uji
            </label>
            <select
              id="sim-device"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-2 font-mono text-slate-100"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} · {d.pole_label} ({d.corridor_name}) [{d.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-slate-400">Pilih Skenario (8 Kondisi Fisika):</div>
            <div className="grid grid-cols-1 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
              {SIMULATION_SCENARIOS.map((sc) => {
                const active = sc.id === selectedScenario;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedScenario(sc.id)}
                    className={`p-2.5 text-left rounded border transition-colors cursor-pointer ${
                      active
                        ? "bg-[#0EA5E9]/15 border-[#0EA5E9] text-slate-100"
                        : "bg-[#0B0F17] border-[#1E293B] text-slate-300 hover:border-[#334155]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{sc.label}</span>
                      <span className="text-[10px] font-mono text-sky-300">
                        {sc.defaultTimeOfDay} · {sc.expectedFaultFamily}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {sc.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !selectedDeviceId}
            onClick={runInjection}
            className="w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded bg-[#0EA5E9] text-slate-950 hover:bg-sky-400 disabled:opacity-50 cursor-pointer"
          >
            {busy ? "Mengirim Paket Telemetri..." : `Suntikkan Telemetri: ${activeScenarioMeta.id}`}
          </button>

          {error && (
            <div className="p-2.5 rounded border border-red-700/70 bg-red-950/60 text-xs font-mono text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Hasil Analisis Sebelum vs Sesudah & Output AI Adapter */}
        <div className="lg:col-span-7 space-y-4">
          {!output ? (
            <div className="scada-panel p-6 text-xs text-slate-400 space-y-2">
              <div className="text-sm font-semibold text-slate-200">
                Siap Menguji Skenario Injeksi
              </div>
              <p>
                Klik tombol <strong>Suntikkan Telemetri</strong> di sebelah kiri untuk mengamati:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Perbandingan pembacaan 3-kanal (PV INA228, BATT INA226, LOAD INA226) sebelum &amp; sesudah anomali.
                </li>
                <li>
                  Validasi kontrak JSON <span className="font-mono text-sky-300">AI-CONTRACT-v1.0.0</span> dan keluaran Adaptor AI (EWMA + korelasi koridor).
                </li>
                <li>
                  Pembuktian bahwa <span className="font-mono text-sky-300">WEATHER_CORRIDOR_CLOUDY</span> meredam false-alarm tanpa menerbitkan Work Order palsu.
                </li>
                <li>
                  Penerbitan Work Order otomatis beserta suku cadang jika terjadi gangguan lokal F1–F6.
                </li>
              </ul>
            </div>
          ) : (
            <>
              <div className="scada-panel p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-2.5">
                  <div>
                    <div className="text-[11px] font-mono text-sky-400">
                      HASIL DIAGNOSIS ADAPTIF · LATENSI ADAPTOR {output.latencyMs} ms
                    </div>
                    <h2 className="text-base font-bold text-slate-100 mt-0.5">
                      {output.ai.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <DeviceStatusBadge status={output.device.status} />
                    <FaultFamilyBadge family={output.ai.fault_family} subCode={output.ai.sub_code} />
                    <SpatialVerdictBadge verdict={output.ai.spatial_verdict} />
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">{output.ai.root_cause}</p>

                {/* Tabel Sebelum vs Sesudah */}
                <div className="overflow-x-auto border border-[#1E293B] rounded">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-[#0F1623] border-b border-[#1E293B] text-[10px] uppercase text-slate-400">
                        <th className="py-2 px-3">Parameter Kanal</th>
                        <th className="py-2 px-3">Sebelum Injeksi</th>
                        <th className="py-2 px-3">Sesudah Injeksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                      <tr>
                        <td className="py-1.5 px-3 text-slate-400">PV INA228 (V / A / W)</td>
                        <td className="py-1.5 px-3">
                          {beforeDevice ? `${formatNum(beforeDevice.pv_v)}V / ${formatNum(beforeDevice.pv_i, 2)}A (${formatNum(beforeDevice.pv_p)}W)` : "—"}
                        </td>
                        <td className="py-1.5 px-3 text-sky-300 font-semibold">
                          {formatNum(output.device.pv_v)}V / {formatNum(output.device.pv_i, 2)}A ({formatNum(output.device.pv_p)}W)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-400">BATT INA226 &amp; SoC/SoH</td>
                        <td className="py-1.5 px-3">
                          {beforeDevice ? `${formatNum(beforeDevice.batt_v)}V · SoC ${formatNum(beforeDevice.soc_pct, 0)}%` : "—"}
                        </td>
                        <td className="py-1.5 px-3 text-emerald-300 font-semibold">
                          {formatNum(output.device.batt_v)}V · SoC {formatNum(output.device.soc_pct, 0)}% · SoH {formatNum(output.device.soh_pct, 1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-400">LOAD INA226 &amp; PWM</td>
                        <td className="py-1.5 px-3">
                          {beforeDevice ? `${formatNum(beforeDevice.load_i, 2)}A · PWM ${beforeDevice.pwm_duty}%` : "—"}
                        </td>
                        <td className="py-1.5 px-3">
                          {formatNum(output.device.load_i, 2)}A · PWM rek. {output.ai.recommended_pwm_duty}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-400">EWMA Zₜ / Median Tetangga</td>
                        <td className="py-1.5 px-3">
                          {beforeDevice ? `${formatNum(beforeDevice.ewma_z)} W` : "—"}
                        </td>
                        <td className="py-1.5 px-3 text-amber-300 font-semibold">
                          Z = {formatNum(output.ai.ewma_z)} W / Tetangga {formatNum(output.ai.neighbor_z_median)} W
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-400">Pintu / LIS3DH / 18650</td>
                        <td className="py-1.5 px-3">
                          {beforeDevice ? `${beforeDevice.door_open ? "Terbuka" : "Rapat"} · ${formatNum(beforeDevice.accel_g, 2)}g` : "—"}
                        </td>
                        <td className="py-1.5 px-3">
                          {output.device.door_open ? "TERBUKA" : "Rapat"} · {formatNum(output.device.accel_g, 2)}g · 18650 {formatNum(output.device.backup_cell_v, 2)}V
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Status Tindak Lanjut Work Order */}
                <div className="scada-inset p-3 text-xs space-y-2">
                  {output.createdWorkOrder ? (
                    <div className="space-y-1.5">
                      <div className="font-mono font-bold text-amber-300">
                        WORK ORDER OTOMATIS DITERBITKAN: {output.createdWorkOrder.id} ({output.createdWorkOrder.priority})
                      </div>
                      <div className="text-slate-200">{output.createdWorkOrder.title}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {output.ai.recommended_parts.map((part) => (
                          <span
                            key={part.sku}
                            className="px-2 py-0.5 rounded bg-[#0B0F17] border border-[#1E293B] font-mono text-[11px] text-sky-200"
                          >
                            {part.sku}: {part.name} ({formatIdr(part.estimatedIdr)})
                          </span>
                        ))}
                      </div>
                      <div className="pt-1 flex gap-3">
                        <Link
                          href={`/devices/${output.device.id}`}
                          className="text-sky-400 hover:underline font-medium"
                        >
                          Buka Diagnostik {output.device.id} →
                        </Link>
                        <Link
                          href="/work-orders"
                          className="text-amber-300 hover:underline font-medium"
                        >
                          Tindak Lanjuti di Work Order →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-emerald-300 font-mono">
                      Tidak ada Work Order palsu yang diterbitkan ({output.ai.spatial_verdict} — sistem memverifikasi kondisi aman/cuaca seruas).{" "}
                      <Link href={`/devices/${output.device.id}`} className="underline text-sky-300 ml-1">
                        Lihat Grafik Tiang →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Inspektor Payload AI-CONTRACT-v1.0.0 */}
              <details className="scada-panel p-4 text-xs">
                <summary className="cursor-pointer font-mono font-semibold text-sky-300">
                  Lihat Payload JSON Kontrak AI v1.0.0 (Request &amp; Response)
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <pre className="p-2.5 rounded bg-[#0B0F17] border border-[#1E293B] overflow-x-auto text-[11px] font-mono text-slate-300 max-h-72">
                    {JSON.stringify(output.requestPayload, null, 2)}
                  </pre>
                  <pre className="p-2.5 rounded bg-[#0B0F17] border border-[#1E293B] overflow-x-auto text-[11px] font-mono text-emerald-200 max-h-72">
                    {JSON.stringify(output.ai, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
