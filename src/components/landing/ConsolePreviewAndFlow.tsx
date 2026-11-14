"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RekasuryaLogo } from "@/components/RekasuryaLogo";
import { DeviceStatusBadge, FaultFamilyBadge } from "@/components/StatusBadges";
import { FAULT_FAMILY_PLAIN_LABEL, formatIdr, formatNum } from "@/lib/format";
import type {
  CorridorRecord,
  DeviceRecord,
  SparePartRecommendation,
  WorkOrderRecord,
} from "@/lib/types";

interface ConsolePreviewAndFlowProps {
  stats: {
    totalDevices: number;
    normalDevices: number;
    activeFaults: number;
    tamperCritical: number;
    openWorkOrders: number;
    avgUptime30dPct: number;
  };
  corridors: CorridorRecord[];
  priorityDevices: DeviceRecord[];
  leadWorkOrder:
    | (WorkOrderRecord & { pole_label: string; corridor_name: string; kabupaten: string })
    | null;
  leadWorkOrderParts: SparePartRecommendation[];
}

export function ConsolePreviewAndFlow({
  stats,
  corridors,
  priorityDevices,
  leadWorkOrder,
  leadWorkOrderParts,
}: ConsolePreviewAndFlowProps) {
  const [batteryFaultSimulated, setBatteryFaultSimulated] = useState(false);

  // Cari tiang Normal pertama sebagai sasaran simulasi terisolasi di browser (tanpa mengubah DB SQLite)
  const targetNormalPole =
    priorityDevices.find((d) => d.status === "NORMAL") ?? priorityDevices[0] ?? null;

  const displayedDevices = priorityDevices.map((dev) => {
    if (batteryFaultSimulated && targetNormalPole && dev.id === targetNormalPole.id) {
      return {
        ...dev,
        status: "WARNING_EWMA" as const,
        fault_family: "F2" as const,
        fault_sub_code: "F2_01_BATT_DEGRADATION",
        soc_pct: 24,
        batt_v: 21.8,
        spatial_verdict: "ANOMALI_LOKAL" as const,
        isSimulatedTarget: true,
      };
    }
    return { ...dev, isSimulatedTarget: false };
  });

  const displayedNormalCount =
    batteryFaultSimulated && targetNormalPole?.status === "NORMAL"
      ? Math.max(0, stats.normalDevices - 1)
      : stats.normalDevices;
  const displayedFaultCount =
    batteryFaultSimulated && targetNormalPole?.status === "NORMAL"
      ? stats.activeFaults + 1
      : stats.activeFaults;

  const summaryTask =
    batteryFaultSimulated && targetNormalPole
      ? {
          badge: "Simulasi aktif",
          title: `Persiapan pemeriksaan baterai · ${targetNormalPole.id}`,
          deviceId: targetNormalPole.id,
          poleLabel: targetNormalPole.pole_label,
          corridorName: `${targetNormalPole.corridor_name} (${targetNormalPole.kabupaten})`,
          faultPlain: "Baterai melemah",
          faultCode: "F2",
          diagnosisSummary:
            "Tegangan baterai turun lebih cepat saat lampu menyala malam hari (sisa daya 24%, 21,8 V), sementara tiang sekitar di koridor yang sama tetap normal.",
          teamLabel: "Regu Pemeliharaan Wilayah I · Kendaraan tangga/sky-lift",
          parts: [
            {
              sku: "BAT-LFP-25V40",
              name: "Paket baterai LiFePO4 25,6 V 40 Ah",
              quantity: 1,
              unit: "unit",
              estimatedIdr: 3450000,
            },
            {
              sku: "BMS-PROT-24V",
              name: "Modul proteksi baterai (BMS) & konektor MC4",
              quantity: 1,
              unit: "set",
              estimatedIdr: 225000,
            },
          ],
        }
      : leadWorkOrder
      ? {
          badge: "Tugas prioritas",
          title: leadWorkOrder.title,
          deviceId: leadWorkOrder.device_id,
          poleLabel: leadWorkOrder.pole_label,
          corridorName: leadWorkOrder.corridor_name,
          faultPlain:
            FAULT_FAMILY_PLAIN_LABEL[
              priorityDevices.find((d) => d.id === leadWorkOrder.device_id)?.fault_family ?? "NONE"
            ] ?? "Perlu diperiksa",
          faultCode:
            priorityDevices.find((d) => d.id === leadWorkOrder.device_id)?.fault_family ?? "",
          diagnosisSummary: leadWorkOrder.diagnosis_summary,
          teamLabel: `${leadWorkOrder.assigned_team} · ${leadWorkOrder.truck_unit}`,
          parts: leadWorkOrderParts.slice(0, 2),
        }
      : null;

  return (
    <section
      id="pratinjau"
      data-nav="light"
      className="py-12 sm:py-16 bg-white border-y border-[#DCE3EC]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Header Seksi Pratinjau Konsol */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-[#062D5B] leading-tight">
              Pratinjau konsol &amp; persiapan tugas teknisi
            </h2>
            <p className="text-[14.5px] text-[#334155] leading-relaxed">
              Coba simulasikan gangguan pada salah satu tiang normal untuk melihat bagaimana
              status berubah dan daftar suku cadang langsung disiapkan untuk teknisi.
            </p>
            <p className="text-[12.5px] text-[#5B6B7F]">
              Data simulasi dari {stats.totalDevices} tiang contoh Solo Raya · Simulasi di sini
              berjalan lokal di peramban dan tidak mengubah data utama.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link href="/console" className="ops-btn-primary px-4 py-2 text-[13px]">
              Buka Konsol Lengkap →
            </Link>
            <Link href="/simulator" className="ops-btn-secondary px-4 py-2 text-[13px]">
              Buka simulator lengkap →
            </Link>
          </div>
        </div>

        {/* Bar Kontrol Interaktif Utama di Homepage */}
        <div
          className="rounded-xl bg-[#F4F6F9] border border-[#DCE3EC] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:min-h-[64px]"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setBatteryFaultSimulated(true)}
              aria-pressed={batteryFaultSimulated}
              className={`px-4 py-2 rounded-[7px] text-[13px] font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#062D5B] ${
                batteryFaultSimulated
                  ? "bg-[#062D5B] text-white"
                  : "bg-[#FEB124] hover:bg-[#E59A10] text-[#062D5B] shadow-sm"
              }`}
            >
              Simulasikan gangguan baterai
            </button>

            <button
              type="button"
              onClick={() => setBatteryFaultSimulated(false)}
              disabled={!batteryFaultSimulated}
              className="px-3.5 py-2 rounded-[7px] text-[13px] font-medium border border-[#C4D0DE] bg-white text-[#062D5B] hover:bg-[#EDF1F6] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#062D5B]"
            >
              Ulangi simulasi
            </button>
          </div>

          <div className="text-[12.5px] text-[#334155]">
            {batteryFaultSimulated && targetNormalPole ? (
              <span>
                Tiang <strong className="text-[#062D5B]">{targetNormalPole.id}</strong> berubah dari{" "}
                <strong>Normal</strong> menjadi <strong>Perlu diperiksa</strong> (
                <strong>Baterai melemah</strong>).
              </span>
            ) : (
              <span>
                Tekan tombol di sebelah kiri untuk menguji perubahan status{" "}
                <strong>Normal → Perlu diperiksa</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Grid Konsol + Panel Tugas Teknisi (Tinggi stabil) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Pratinjau Konsol (7 kolom) */}
          <div className="lg:col-span-7 min-w-0 rounded-2xl border border-[#DCE3EC] bg-[#F4F6F9] shadow-[var(--sh-3)] overflow-hidden flex flex-col lg:min-h-[490px]">
            {/* Bar Jendela Minimal */}
            <div className="h-9 bg-white border-b border-[#DCE3EC] px-3.5 flex items-center justify-between text-[11.5px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DCE3EC]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#DCE3EC]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#DCE3EC]" />
                <span className="ml-2 font-mono text-[#5B6B7F]">/console</span>
              </div>
              <span className="text-[11.5px] text-[#5B6B7F]">
                Data simulasi dari {stats.totalDevices} tiang
              </span>
            </div>

            {/* Isi Pratinjau Konsol */}
            <div className="grid grid-cols-1 sm:grid-cols-12 flex-1">
              {/* Mini Sidebar Navy */}
              <div className="hidden sm:flex sm:col-span-3 bg-[#062D5B] text-white p-3 flex-col justify-between min-h-[370px]">
                <div className="space-y-4">
                  <RekasuryaLogo variant="on-dark" height={24} />
                  <div className="space-y-1 text-[11.5px]">
                    <div className="px-2 py-1.5 rounded bg-white/15 border-l-2 border-[#FEB124] font-semibold text-white">
                      Ringkasan
                    </div>
                    <div className="px-2 py-1 text-white/75">Daftar Tiang</div>
                    <div className="px-2 py-1 text-white/75 flex items-center justify-between">
                      <span>Gangguan</span>
                      <span className="px-1.5 rounded bg-[#FEB124] text-[#041E3E] font-mono text-[10px] font-bold tabular-nums">
                        {displayedFaultCount}
                      </span>
                    </div>
                    <div className="px-2 py-1 text-white/75">Tugas Teknisi</div>
                    <div className="px-2 py-1 text-white/75">Peta Lokasi</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/15 text-[10.5px] text-white/70">
                  {corridors.length} koridor · Kesiapan {stats.avgUptime30dPct}%
                </div>
              </div>

              {/* Area Utama Pratinjau */}
              <div className="sm:col-span-9 p-3.5 space-y-3 bg-[#F4F6F9] min-w-0">
                {/* Ringkasan Angka */}
                <div className="rounded-lg bg-[#062D5B] text-white p-3 grid grid-cols-4 gap-2 text-center sm:text-left">
                  <div>
                    <div className="text-[10.5px] text-white/70">Total tiang</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums">
                      {stats.totalDevices}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-white/70">Normal</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums text-[#A7F3D0]">
                      {displayedNormalCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-white/70">Perlu dicek</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums text-[#FFD585]">
                      {displayedFaultCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-white/70">Darurat</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums text-[#FEB124]">
                      {stats.tamperCritical}
                    </div>
                  </div>
                </div>

                {/* Daftar Kondisi Tiang */}
                <div className="rounded-lg bg-white border border-[#DCE3EC] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#DCE3EC] flex items-center justify-between text-[11.5px]">
                    <span className="font-semibold text-[#062D5B]">
                      Gangguan paling mendesak
                    </span>
                    <span className="text-[#5B6B7F]">5 tiang contoh</span>
                  </div>
                  <div className="divide-y divide-[#DCE3EC]">
                    {displayedDevices.map((dev) => (
                      <Link
                        key={dev.id}
                        href={`/devices/${dev.id}`}
                        className={`px-3 py-2.5 flex items-center justify-between gap-2 transition-all duration-300 text-[12px] min-h-[58px] ${
                          dev.isSimulatedTarget
                            ? "bg-[#FFF8E7] ring-2 ring-inset ring-[#FEB124] animate-motion-in"
                            : "hover:bg-[#F3F6FA]"
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-semibold text-[#062D5B]">
                              {dev.id}
                            </span>
                            <span className="font-medium text-[#0B192C]">
                              {FAULT_FAMILY_PLAIN_LABEL[dev.fault_family] ?? dev.fault_family}
                            </span>
                            {dev.fault_family !== "NONE" && (
                              <span className="text-[10.5px] font-mono text-[#5B6B7F]">
                                ({dev.fault_family})
                              </span>
                            )}
                            {dev.isSimulatedTarget && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#FEB124] text-[#062D5B]">
                                Target Simulasi
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5B6B7F] truncate">
                            {dev.pole_label} · {dev.kabupaten}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={`hidden sm:inline font-mono text-[11px] tabular-nums transition-colors duration-300 ${dev.isSimulatedTarget ? "text-[#B45309] font-bold" : "text-[#334155]"}`}>
                            Baterai {formatNum(dev.soc_pct, 0)}%
                          </span>
                          <DeviceStatusBadge status={dev.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Ringkasan Tugas Teknisi (5 kolom, min-height stabil) */}
          <div className="lg:col-span-5 min-w-0 flex flex-col">
            <div
              className={`ops-card p-5 border-t-4 flex-1 flex flex-col justify-between min-h-[450px] lg:min-h-[490px] transition-colors ${
                batteryFaultSimulated
                  ? "border-t-[#FEB124] bg-[#FFFDF7]"
                  : "border-t-[#062D5B] bg-white"
              }`}
            >
              {summaryTask ? (
                <div
                  key={batteryFaultSimulated ? "simulated" : "initial"}
                  className="space-y-3.5 animate-motion-in flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[12px] font-medium text-[#5B6B7F]">
                          {batteryFaultSimulated
                            ? "Simulasi tugas teknisi baru"
                            : "Ringkasan tugas teknisi aktif"}
                        </div>
                        <h3 className="text-[16px] font-semibold text-[#062D5B] mt-0.5 leading-snug">
                          {summaryTask.title}
                        </h3>
                      </div>
                      <FaultFamilyBadge family={summaryTask.faultCode || "NONE"} />
                    </div>

                    <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3 space-y-2 text-[12.5px]">
                      <div>
                        <div className="text-[11px] font-medium text-[#5B6B7F]">Lokasi tiang</div>
                        <div className="font-semibold text-[#062D5B]">
                          {summaryTask.deviceId} · {summaryTask.poleLabel}
                        </div>
                        <div className="text-[11.5px] text-[#5B6B7F]">{summaryTask.corridorName}</div>
                      </div>
                      <div className="pt-2 border-t border-[#DCE3EC]">
                        <div className="text-[11px] font-medium text-[#5B6B7F]">
                          Dugaan penyebab
                        </div>
                        <div className="text-[#0B192C] font-medium">
                          {summaryTask.faultPlain}
                          {summaryTask.faultCode && summaryTask.faultCode !== "NONE"
                            ? ` (${summaryTask.faultCode})`
                            : ""}
                        </div>
                        <p className="text-[12px] text-[#334155] mt-0.5 leading-relaxed">
                          {summaryTask.diagnosisSummary}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[12px] font-semibold text-[#062D5B]">
                        Komponen yang perlu dicek &amp; disiapkan
                      </div>
                      <ul className="space-y-1.5">
                        {summaryTask.parts.map((part) => (
                          <li
                            key={part.sku}
                            className="flex items-center justify-between gap-2 text-[12px] px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-[#0B192C] truncate">{part.name}</div>
                              <div className="text-[10.5px] font-mono text-[#5B6B7F]">
                                Kode: {part.sku}
                              </div>
                            </div>
                            <span className="font-mono text-[11.5px] text-[#334155] shrink-0">
                              {part.quantity} {part.unit} ({formatIdr(part.estimatedIdr)})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-[#DCE3EC] flex flex-wrap items-center justify-between gap-2 text-[12px]">
                    <span className="text-[#5B6B7F] truncate">{summaryTask.teamLabel}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        href="/work-orders"
                        className="font-semibold text-[#062D5B] hover:underline"
                      >
                        Lihat Tugas Teknisi →
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[13.5px] text-[#5B6B7F]">
                  Semua tugas teknisi pada data simulasi sedang dalam status selesai. Gunakan tombol{" "}
                  <strong>Simulasikan gangguan baterai</strong> atau buka halaman{" "}
                  <Link href="/simulator" className="text-[#062D5B] font-semibold underline">
                    Simulator
                  </Link>{" "}
                  untuk mencoba skenario baru.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
