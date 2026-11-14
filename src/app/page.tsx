"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import { SoloRayaMap } from "@/components/SoloRayaMap";
import {
  DeviceStatusBadge,
  FaultFamilyBadge,
  PriorityBadge,
  SpatialVerdictBadge,
  WorkOrderStatusBadge,
} from "@/components/StatusBadges";
import { formatIdr, formatNum, formatWibTime } from "@/lib/format";
import type {
  CorridorRecord,
  DeviceRecord,
  SparePartRecommendation,
  WorkOrderRecord,
} from "@/lib/types";

interface OverviewData {
  stats: {
    totalDevices: number;
    normalDevices: number;
    activeFaults: number;
    tamperCritical: number;
    openWorkOrders: number;
    openCitizenReports: number;
    avgUptime30dPct: number;
    annualSavingsEstimatedIdr: number;
  };
  corridors: CorridorRecord[];
  devices: DeviceRecord[];
  openWorkOrders: Array<
    WorkOrderRecord & { pole_label: string; corridor_name: string; kabupaten: string }
  >;
  auditIntegrity: { valid: boolean; totalEntries: number; headHash: string };
}

export default function FleetOverviewPage() {
  const { demoResetTick } = useOperationalRole();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>("SRG-009");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal memuat ringkasan armada.");
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview, demoResetTick]);

  const filteredDevices = useMemo(() => {
    if (!data) return [];
    return data.devices.filter((d) => {
      if (corridorFilter !== "ALL" && d.corridor_id !== corridorFilter) return false;
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const hay = `${d.id} ${d.pole_label} ${d.corridor_name ?? ""} ${d.fault_sub_code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, corridorFilter, statusFilter, searchQuery]);

  if (loading && !data) {
    return (
      <div className="scada-panel p-8 text-center text-sm font-mono text-slate-400">
        Memuat telemetri armada PJUTS Solo Raya...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="scada-panel p-6 border-red-700/70 text-red-200 text-sm">
        Gagal memuat data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Alur Nilai Operasional Utama */}
      <div className="scada-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
          <span className="text-sky-400 font-semibold">ALUR OPERASI:</span>
          {[
            "1. Deteksi F1–F6",
            "2. Lokalisasi Komponen",
            "3. Work Order + Suku Cadang",
            "4. Check-In Teknisi",
            "5. Verifikasi Telemetri",
            "6. Dampak Rupiah/kWh",
          ].map((step, i) => (
            <React.Fragment key={step}>
              <span className="px-2 py-0.5 rounded bg-[#161F30] border border-[#1E293B] text-slate-200">
                {step}
              </span>
              {i < 5 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Audit SHA-256:{" "}
          <span className={data.auditIntegrity.valid ? "text-emerald-400" : "text-red-400"}>
            {data.auditIntegrity.valid
              ? `VALID (${data.auditIntegrity.totalEntries} entri)`
              : "RUSAK"}
          </span>
        </div>
      </div>

      {/* Strip KPI Operasional */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className="scada-panel p-3.5 text-left hover:border-[#334155] transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Kesehatan Armada
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
            {data.stats.normalDevices}
            <span className="text-sm font-normal text-slate-400">/{data.stats.totalDevices} tiang</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            5 koridor · Solo Raya (data simulasi)
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter((prev) => (prev === "FAULT" ? "ALL" : "FAULT"))
          }
          className="scada-panel p-3.5 text-left hover:border-[#334155] transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Gangguan / Anomali Aktif
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-300">
            {data.stats.activeFaults}
            <span className="text-xs font-normal text-fuchsia-300 ml-2">
              ({data.stats.tamperCritical} sabotase)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Terlokalisasi per komponen F1–F6
          </div>
        </button>

        <Link
          href="/work-orders"
          className="scada-panel p-3.5 text-left hover:border-[#0EA5E9]/60 transition-colors"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Work Order &amp; Aduan Warga
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-sky-300">
            {data.stats.openWorkOrders} WO
            <span className="text-xs font-normal text-slate-400 ml-2">
              · {data.stats.openCitizenReports} aduan
            </span>
          </div>
          <div className="mt-1 text-[11px] text-sky-400">
            Buka antrean regu &amp; suku cadang →
          </div>
        </Link>

        <div className="scada-panel p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Uptime Rata-Rata 30 Hari
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-100">
            {formatNum(data.stats.avgUptime30dPct, 1)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Target layanan SNI/Dishub ≥ 98,5%
          </div>
        </div>

        <Link
          href="/energy"
          className="col-span-2 lg:col-span-1 scada-panel p-3.5 text-left hover:border-[#0EA5E9]/60 transition-colors"
        >
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Proyeksi Manfaat/Thn (Baseline)
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-300">
            {formatIdr(data.stats.annualSavingsEstimatedIdr)}
          </div>
          <div className="mt-1 text-[11px] text-sky-400">
            Model 2-aliran (asumsi terbuka) →
          </div>
        </Link>
      </div>

      {/* Peta GIS Solo Raya */}
      <SoloRayaMap
        corridors={data.corridors}
        devices={data.devices}
        selectedCorridorId={corridorFilter}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => setSelectedDeviceId(id)}
        onSelectCorridor={(cid) => setCorridorFilter(cid)}
      />

      {/* Antrean Work Order Prioritas + Kebutuhan Suku Cadang */}
      <div className="scada-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Triase Tindak Lanjut: Work Order Aktif &amp; Rekomendasi Suku Cadang Regu
            </h2>
            <p className="text-xs text-slate-400">
              Setiap anomali memetakan SKU suku cadang agar truk sky-lift hanya berangkat 1 kali (zero wasted dispatch).
            </p>
          </div>
          <Link
            href="/work-orders"
            className="px-3 py-1.5 text-xs font-medium rounded border border-[#334155] bg-[#161F30] text-slate-100 hover:border-[#0EA5E9]"
          >
            Kelola Semua Work Order
          </Link>
        </div>

        {data.openWorkOrders.length === 0 ? (
          <div className="scada-inset p-4 text-xs text-emerald-300 font-mono">
            Seluruh Work Order terbuka telah diselesaikan &amp; terverifikasi normal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.openWorkOrders.map((wo) => {
              const parts = JSON.parse(wo.parts_checklist_json) as SparePartRecommendation[];
              return (
                <div
                  key={wo.id}
                  className="scada-inset p-3.5 flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <PriorityBadge priority={wo.priority} />
                        <span className="font-bold text-slate-100">{wo.id}</span>
                        <span className="text-slate-400">· {wo.device_id}</span>
                      </div>
                      <WorkOrderStatusBadge status={wo.status} />
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-100">{wo.title}</div>
                    <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                      {wo.diagnosis_summary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parts.map((part) => (
                        <span
                          key={part.sku}
                          className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#0B0F17] border border-[#1E293B] text-sky-200"
                        >
                          {part.quantity} {part.unit} · {part.name} ({formatIdr(part.estimatedIdr)})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E293B] text-[11px] font-mono text-slate-400">
                    <span>
                      {wo.assigned_team} ({wo.truck_unit})
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/devices/${wo.device_id}`}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        Lihat Tiang →
                      </Link>
                      <Link
                        href={`/work-orders?highlight=${wo.id}`}
                        className="text-amber-300 hover:text-amber-200"
                      >
                        Tindak Lanjuti →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabel Armada Telemetri 3-Kanal */}
      <div className="scada-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Tabel Armada Telemetri 3-Kanal ({filteredDevices.length} dari {data.devices.length} Tiang)
            </h2>
            <p className="text-xs text-slate-400">
              Kanal INA228 (PV) · INA226 (Baterai &amp; Beban LED) · EWMA Residu · Korelasi Koridor · Sel Cadangan 18650
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID tiang / ruas / kode F..."
              className="bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#0EA5E9]"
            />
            <select
              aria-label="Filter status tiang"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#0EA5E9]"
            >
              <option value="ALL">Semua Status</option>
              <option value="TAMPER_CRITICAL">Sabotase Kritis (F6)</option>
              <option value="FAULT">Gangguan Aktif (F2–F5)</option>
              <option value="WARNING_EWMA">Peringatan EWMA (F1)</option>
              <option value="NORMAL">Normal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-[#1E293B] rounded">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0F1623] border-b border-[#1E293B] text-[11px] font-mono uppercase text-slate-400">
                <th className="py-2.5 px-3">Tiang &amp; Ruas</th>
                <th className="py-2.5 px-3">Status &amp; Diagnosis</th>
                <th className="py-2.5 px-3">PV (INA228)</th>
                <th className="py-2.5 px-3">Baterai (INA226)</th>
                <th className="py-2.5 px-3">Beban &amp; PWM</th>
                <th className="py-2.5 px-3">EWMA &amp; Spasial</th>
                <th className="py-2.5 px-3">Keamanan</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {filteredDevices.map((dev) => (
                <tr
                  key={dev.id}
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className={`hover:bg-[#161F30]/80 cursor-pointer transition-colors ${
                    selectedDeviceId === dev.id ? "bg-[#161F30]/60" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 align-top">
                    <div className="font-mono font-bold text-slate-100">{dev.id}</div>
                    <div className="text-[11px] text-slate-300">{dev.pole_label}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {dev.corridor_name} · {dev.variant}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top space-y-1">
                    <div>
                      <DeviceStatusBadge status={dev.status} />
                    </div>
                    <div>
                      <FaultFamilyBadge family={dev.fault_family} subCode={dev.fault_sub_code} />
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top font-mono">
                    <div className="text-slate-100">{formatNum(dev.pv_p)} W</div>
                    <div className="text-[11px] text-slate-400">
                      {formatNum(dev.pv_v)} V / {formatNum(dev.pv_i, 2)} A
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top font-mono">
                    <div className="text-slate-100">
                      {formatNum(dev.batt_v)} V · SoC {formatNum(dev.soc_pct, 0)}%
                    </div>
                    <div className="text-[11px] text-slate-400">
                      SoH {formatNum(dev.soh_pct, 1)}% · {formatNum(dev.temp_batt_c)}°C
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top font-mono">
                    <div className="text-slate-100">
                      {formatNum(dev.load_p)} W ({formatNum(dev.load_i, 2)} A)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      PWM {dev.pwm_duty}% · {formatNum(dev.lux, 0)} lx
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top font-mono space-y-1">
                    <div
                      className={
                        dev.ewma_z < dev.ewma_lcl ? "text-amber-300 font-semibold" : "text-slate-200"
                      }
                    >
                      Z = {formatNum(dev.ewma_z, 1)} W
                    </div>
                    <div>
                      <SpatialVerdictBadge verdict={dev.spatial_verdict} />
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top font-mono text-[11px]">
                    <div className={dev.door_open ? "text-fuchsia-300 font-semibold" : "text-slate-300"}>
                      Pintu: {dev.door_open ? "TERBUKA" : "Rapat"}
                    </div>
                    <div className="text-slate-400">
                      18650: {formatNum(dev.backup_cell_v, 2)} V
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatWibTime(dev.last_seen_at)}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                    <Link
                      href={`/devices/${dev.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-block px-2.5 py-1 text-[11px] font-medium rounded bg-[#0EA5E9]/15 border border-[#0EA5E9]/50 text-sky-200 hover:bg-[#0EA5E9]/25"
                    >
                      Diagnostik
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
