"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import {
  DeviceStatusBadge,
  FaultFamilyBadge,
  SpatialVerdictBadge,
} from "@/components/StatusBadges";
import { PageHeader } from "@/components/UiPrimitives";
import { formatIdr, formatNum } from "@/lib/format";
import {
  SIMULATION_SCENARIOS,
  type SimulationScenarioId,
} from "@/lib/simulator/scenarios";
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
      <PageHeader
        title="Simulator Skenario Gangguan Tiang"
        subtitle="Coba berbagai skenario pada tiang contoh—seperti panel tertutup pohon, baterai melemah, atau cuaca mendung—dan lihat bagaimana dugaan penyebab serta daftar suku cadang otomatis disiapkan."
        meta={
          <span className="text-[12px] text-[#5B6B7F]">
            Lingkungan uji simulasi · 18 tiang contoh Solo Raya
          </span>
        }
        actions={
          <button
            type="button"
            disabled={isResetting}
            onClick={async () => {
              await triggerResetDemo();
              setOutput(null);
              setBeforeDevice(null);
            }}
            className="ops-btn-secondary px-3 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
          >
            {isResetting ? "Mengembalikan..." : "Ulangi Data Awal Simulasi"}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Panel Pemilihan Perangkat & Skenario Ringkas */}
        <section className="lg:col-span-5 ops-card p-4 space-y-4">
          <div>
            <h2 className="text-[14px] font-semibold text-[#0B192C]">
              1. Pilih Tiang &amp; Skenario Gangguan
            </h2>
            <p className="text-[12px] text-[#5B6B7F]">
              Pilih salah satu tiang dan skenario kondisi lapangan untuk melihat respons konsol.
            </p>
          </div>

          <div className="text-[12px]">
            <label htmlFor="sim-device" className="block text-[#334155] font-medium mb-1">
              Tiang yang Diuji
            </label>
            <select
              id="sim-device"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="ops-input w-full px-2.5 py-2 font-mono text-[12px]"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} · {d.pole_label} ({d.corridor_name}) [{d.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="text-[12px] font-medium text-[#334155]">
              Pilih Skenario ({SIMULATION_SCENARIOS.length} Skenario):
            </div>
            <div className="divide-y divide-[#DCE3EC] border border-[#DCE3EC] rounded-md max-h-[320px] overflow-y-auto">
              {SIMULATION_SCENARIOS.map((sc) => {
                const active = sc.id === selectedScenario;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedScenario(sc.id)}
                    className={`w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                      active ? "bg-[#EBF1F8]" : "bg-[#FFFFFF] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[12px] font-semibold ${
                          active ? "text-[#062D5B]" : "text-[#0B192C]"
                        }`}
                      >
                        {sc.label}
                      </span>
                      <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#334155]">
                        {sc.defaultTimeOfDay} · {sc.expectedFaultFamily}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="ops-inset p-3 text-[12px] text-[#334155]">
              <div className="font-semibold text-[#0B192C] mb-0.5">{activeScenarioMeta.label}</div>
              {activeScenarioMeta.description}
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !selectedDeviceId}
            onClick={runInjection}
            className="ops-btn-amber w-full py-2.5 text-[12.5px] cursor-pointer disabled:opacity-50"
          >
            {busy ? "Menjalankan Simulasi..." : `Jalankan Skenario: ${activeScenarioMeta.label}`}
          </button>

          {error && (
            <div className="p-2.5 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] text-[12px] font-mono text-[#991B1B]">
              {error}
            </div>
          )}
        </section>

        {/* Hasil Analisis Sebelum vs Sesudah */}
        <section className="lg:col-span-7 space-y-4">
          {!output ? (
            <div className="ops-card p-6 space-y-3 text-[13px] text-[#334155]">
              <div className="text-[15px] font-semibold text-[#0B192C]">
                Siap Menguji Skenario Gangguan
              </div>
              <p>
                Pilih skenario lalu tekan tombol <strong>Jalankan Skenario</strong> di sebelah kiri
                untuk melihat hasil perubahan pada tiang dan tugas teknisi:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-[12.5px]">
                <li>
                  Perbandingan pengukuran panel surya, baterai, dan lampu LED sebelum dan sesudah skenario dijalankan.
                </li>
                <li>
                  Pembandingan daya panel terhadap tiang sekitar untuk membedakan cuaca mendung dari gangguan lokal.
                </li>
                <li>
                  Skenario mendung sekoridor (<span className="font-mono text-[#062D5B]">WEATHER_CORRIDOR_CLOUDY</span>) tidak membuat tugas teknisi palsu.
                </li>
                <li>
                  Pembuatan tugas teknisi beserta lokasi dan daftar suku cadang bila terdeteksi gangguan <span className="font-mono text-[#062D5B]">F1–F6</span>.
                </li>
              </ul>
            </div>
          ) : (
            <>
              <div className="ops-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#DCE3EC] pb-3">
                  <div>
                    <div className="text-[11.5px] text-[#5B6B7F]">
                      Hasil pembandingan sensor &amp; EWMA · {output.latencyMs} ms
                    </div>
                    <h2 className="text-[16px] font-bold text-[#0B192C] mt-0.5">
                      {output.ai.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <DeviceStatusBadge status={output.device.status} />
                    <FaultFamilyBadge family={output.ai.fault_family} subCode={output.ai.sub_code} />
                    <SpatialVerdictBadge verdict={output.ai.spatial_verdict} />
                  </div>
                </div>

                <p className="text-[13px] text-[#0B192C] leading-relaxed">{output.ai.root_cause}</p>

                <div className="overflow-x-auto border border-[#DCE3EC] rounded-md">
                  <table className="w-full text-left border-collapse text-[12px] font-mono tabular-nums">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-sans font-semibold uppercase text-[#5B6B7F]">
                        <th className="py-2 px-3">Parameter Kanal</th>
                        <th className="py-2 px-3">Sebelum Injeksi</th>
                        <th className="py-2 px-3">Sesudah Injeksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC]">
                      <tr>
                        <td className="py-2 px-3 font-sans text-[#5B6B7F]">PV INA228</td>
                        <td className="py-2 px-3">
                          {beforeDevice
                            ? `${formatNum(beforeDevice.pv_v)}V / ${formatNum(beforeDevice.pv_i, 2)}A (${formatNum(beforeDevice.pv_p)}W)`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-[#062D5B] font-semibold">
                          {formatNum(output.device.pv_v)}V / {formatNum(output.device.pv_i, 2)}A (
                          {formatNum(output.device.pv_p)}W)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans text-[#5B6B7F]">Baterai &amp; SoC/SoH</td>
                        <td className="py-2 px-3">
                          {beforeDevice
                            ? `${formatNum(beforeDevice.batt_v)}V · SoC ${formatNum(beforeDevice.soc_pct, 0)}%`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-[#15803D] font-semibold">
                          {formatNum(output.device.batt_v)}V · SoC {formatNum(output.device.soc_pct, 0)}% · SoH{" "}
                          {formatNum(output.device.soh_pct, 1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans text-[#5B6B7F]">Beban LED &amp; PWM</td>
                        <td className="py-2 px-3">
                          {beforeDevice
                            ? `${formatNum(beforeDevice.load_i, 2)}A · PWM ${beforeDevice.pwm_duty}%`
                            : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {formatNum(output.device.load_i, 2)}A · PWM rek. {output.ai.recommended_pwm_duty}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans text-[#5B6B7F]">EWMA Zₜ / Tetangga</td>
                        <td className="py-2 px-3">
                          {beforeDevice ? `${formatNum(beforeDevice.ewma_z)} W` : "—"}
                        </td>
                        <td className="py-2 px-3 text-[#B45309] font-semibold">
                          Z = {formatNum(output.ai.ewma_z)} W / Tetangga{" "}
                          {formatNum(output.ai.neighbor_z_median)} W
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans text-[#5B6B7F]">Pintu / LIS3DH / 18650</td>
                        <td className="py-2 px-3">
                          {beforeDevice
                            ? `${beforeDevice.door_open ? "Terbuka" : "Rapat"} · ${formatNum(beforeDevice.accel_g, 2)}g`
                            : "—"}
                        </td>
                        <td className="py-2 px-3">
                          {output.device.door_open ? "TERBUKA" : "Rapat"} ·{" "}
                          {formatNum(output.device.accel_g, 2)}g · 18650{" "}
                          {formatNum(output.device.backup_cell_v, 2)}V
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="ops-inset p-3 text-[12px] space-y-2">
                  {output.createdWorkOrder ? (
                    <div className="space-y-1.5">
                      <div className="font-mono font-bold text-[#B45309]">
                        WORK ORDER OTOMATIS DITERBITKAN: {output.createdWorkOrder.id} (
                        {output.createdWorkOrder.priority})
                      </div>
                      <div className="font-medium text-[#0B192C]">
                        {output.createdWorkOrder.title}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {output.ai.recommended_parts.map((part) => (
                          <span
                            key={part.sku}
                            className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#DCE3EC] font-mono text-[11px] text-[#062D5B]"
                          >
                            {part.sku}: {part.name} ({formatIdr(part.estimatedIdr)})
                          </span>
                        ))}
                      </div>
                      <div className="pt-1 flex flex-wrap gap-3">
                        <Link
                          href={`/devices/${output.device.id}`}
                          className="text-[#062D5B] hover:underline font-semibold"
                        >
                          Buka Diagnostik {output.device.id} →
                        </Link>
                        <Link
                          href={`/work-orders?highlight=${output.createdWorkOrder.id}`}
                          className="text-[#B45309] hover:underline font-semibold"
                        >
                          Tindak Lanjuti di Work Order →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[#15803D] font-mono">
                      Tidak ada Work Order palsu yang diterbitkan ({output.ai.spatial_verdict} —
                      kondisi aman/cuaca seruas terverifikasi).{" "}
                      <Link
                        href={`/devices/${output.device.id}`}
                        className="underline text-[#062D5B] ml-1"
                      >
                        Lihat Grafik Tiang →
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <details className="ops-card p-4 text-[12px]">
                <summary className="cursor-pointer font-mono font-semibold text-[#062D5B]">
                  Lihat Payload JSON Kontrak AI v1.0.0 (Request &amp; Response)
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <pre className="p-3 rounded bg-[#F8FAFC] border border-[#DCE3EC] overflow-x-auto text-[11px] font-mono text-[#0B192C] max-h-72">
                    {JSON.stringify(output.requestPayload, null, 2)}
                  </pre>
                  <pre className="p-3 rounded bg-[#F8FAFC] border border-[#DCE3EC] overflow-x-auto text-[11px] font-mono text-[#065F46] max-h-72">
                    {JSON.stringify(output.ai, null, 2)}
                  </pre>
                </div>
              </details>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
