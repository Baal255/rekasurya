"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import { SearchIcon } from "@/components/Icons";
import {
  DeviceStatusBadge,
  FaultFamilyBadge,
  SpatialVerdictBadge,
} from "@/components/StatusBadges";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/UiPrimitives";
import { formatNum, formatWibTime } from "@/lib/format";
import type { CorridorRecord, DeviceRecord } from "@/lib/types";

type SortField = "id" | "status" | "soc_pct" | "pv_p" | "ewma_z" | "uptime_30d_pct";

const STATUS_RANK: Record<string, number> = {
  TAMPER_CRITICAL: 1,
  FAULT: 2,
  WARNING_EWMA: 3,
  OFFLINE: 4,
  NORMAL: 5,
};

export default function DevicesInventoryPage() {
  const { demoResetTick } = useOperationalRole();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [corridors, setCorridors] = useState<CorridorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [variantFilter, setVariantFilter] = useState("ALL");
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>("SRG-009");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal memuat inventaris perangkat.");
      }
      setDevices(json.data.devices);
      setCorridors(json.data.corridors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, demoResetTick]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = devices.filter((d) => {
      if (corridorFilter !== "ALL" && d.corridor_id !== corridorFilter) return false;
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (variantFilter !== "ALL" && d.variant !== variantFilter) return false;
      if (q) {
        const hay = `${d.id} ${d.pole_label} ${d.corridor_name ?? ""} ${d.kabupaten ?? ""} ${d.fault_sub_code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.id.localeCompare(b.id);
      else if (sortField === "status") {
        cmp = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
      } else if (sortField === "soc_pct") cmp = a.soc_pct - b.soc_pct;
      else if (sortField === "pv_p") cmp = a.pv_p - b.pv_p;
      else if (sortField === "ewma_z") cmp = a.ewma_z - b.ewma_z;
      else if (sortField === "uptime_30d_pct") cmp = a.uptime_30d_pct - b.uptime_30d_pct;
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [devices, searchQuery, corridorFilter, statusFilter, variantFilter, sortField, sortAsc]);

  const selectedDevice =
    filteredDevices.find((d) => d.id === selectedId) ?? filteredDevices[0] ?? null;

  if (loading && devices.length === 0) {
    return <PageSkeleton rows={7} />;
  }

  if (error) {
    return (
      <div className="ops-card p-6 border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] text-sm">
        Gagal memuat inventaris perangkat: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventaris Perangkat & Armada PJUTS"
        subtitle="Manajemen seluruh 18 unit kendali REKASURYA pada 5 koridor Solo Raya dengan pencarian, filter teknis, dan inspeksi status 3-kanal."
        meta={
          <span className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-[#F1F5F9] text-[#334155] border border-[#DCE3EC]">
            {filteredDevices.length} dari {devices.length} perangkat ditampilkan
          </span>
        }
        actions={
          <Link href="/map" className="ops-btn-secondary px-3 py-1.5 text-[12px]">
            Tampilkan di Peta Geografis
          </Link>
        }
      />

      {/* Toolbar Pencarian & Filter Gaya Linear/ThingsBoard */}
      <div className="ops-card p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="w-4 h-4 text-[#5B6B7F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID tiang, jalan, kabupaten, atau kode fault (misal F1, F6)..."
            className="ops-input w-full pl-9 pr-3 py-1.5 text-[13px]"
          />
        </div>

        <select
          aria-label="Filter koridor"
          value={corridorFilter}
          onChange={(e) => setCorridorFilter(e.target.value)}
          className="ops-input px-2.5 py-1.5 text-[12px] cursor-pointer"
        >
          <option value="ALL">Semua Koridor</option>
          {corridors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.kabupaten} ({c.pole_count})
            </option>
          ))}
        </select>

        <select
          aria-label="Filter status operasional"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ops-input px-2.5 py-1.5 text-[12px] cursor-pointer"
        >
          <option value="ALL">Semua Status</option>
          <option value="TAMPER_CRITICAL">Sabotase Kritis</option>
          <option value="FAULT">Gangguan Aktif</option>
          <option value="WARNING_EWMA">Peringatan EWMA</option>
          <option value="NORMAL">Normal</option>
          <option value="OFFLINE">Offline</option>
        </select>

        <select
          aria-label="Filter varian perangkat"
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
          className="ops-input px-2.5 py-1.5 text-[12px] cursor-pointer"
        >
          <option value="ALL">Semua Varian</option>
          <option value="KIT_KONVERSI">Kit Konversi (PLN → Surya)</option>
          <option value="RETROFIT_PJUTS">Retrofit PJUTS Warisan</option>
        </select>
      </div>

      {/* Layout Split: Tabel Padat + Quick Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 ops-card overflow-hidden">
          {filteredDevices.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Tidak ada perangkat yang sesuai filter"
                description="Sesuaikan kata kunci pencarian atau reset filter koridor/status."
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCorridorFilter("ALL");
                      setStatusFilter("ALL");
                      setVariantFilter("ALL");
                    }}
                    className="ops-btn-secondary px-3 py-1.5 text-xs cursor-pointer"
                  >
                    Reset Filter
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                    <th className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("id")}
                        className="hover:text-[#0B192C] cursor-pointer"
                      >
                        ID / Tiang {sortField === "id" ? (sortAsc ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("status")}
                        className="hover:text-[#0B192C] cursor-pointer"
                      >
                        Status {sortField === "status" ? (sortAsc ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Koneksi</th>
                    <th className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("soc_pct")}
                        className="hover:text-[#0B192C] cursor-pointer"
                      >
                        Baterai SoC {sortField === "soc_pct" ? (sortAsc ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("pv_p")}
                        className="hover:text-[#0B192C] cursor-pointer"
                      >
                        Daya PV {sortField === "pv_p" ? (sortAsc ? "↑" : "↓") : ""}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Lampu &amp; PWM</th>
                    <th className="py-2.5 px-3">Telemetri</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {filteredDevices.map((dev) => {
                    const isSelected = selectedDevice?.id === dev.id;
                    return (
                      <tr
                        key={dev.id}
                        onClick={() => setSelectedId(dev.id)}
                        className={`cursor-pointer transition-colors hover:bg-[#F8FAFC] ${
                          isSelected ? "bg-[#EBF1F8]/70" : "bg-[#FFFFFF]"
                        }`}
                      >
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-mono font-semibold text-[#0B192C]">{dev.id}</div>
                          <div className="text-[#0B192C] font-medium truncate max-w-[180px]">
                            {dev.pole_label}
                          </div>
                          <div className="text-[11px] text-[#5B6B7F]">
                            {dev.kabupaten} · {dev.variant === "KIT_KONVERSI" ? "Kit Konversi" : "Retrofit"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top space-y-1">
                          <DeviceStatusBadge status={dev.status} />
                          <div>
                            <FaultFamilyBadge
                              family={dev.fault_family}
                              subCode={dev.fault_sub_code}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                              dev.status === "OFFLINE" ? "text-[#5B6B7F]" : "text-[#15803D]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                dev.status === "OFFLINE" ? "bg-[#5B6B7F]" : "bg-[#15803D]"
                              }`}
                            />
                            {dev.status === "OFFLINE" ? "Terputus" : "Terhubung"}
                          </span>
                          <div className="text-[10px] font-mono text-[#5B6B7F]">
                            {dev.data_source}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top font-mono tabular-nums">
                          <div
                            className={`font-semibold ${
                              dev.soc_pct < 25 ? "text-[#B91C1C]" : "text-[#0B192C]"
                            }`}
                          >
                            {formatNum(dev.soc_pct, 0)}%
                          </div>
                          <div className="text-[11px] text-[#5B6B7F]">
                            {formatNum(dev.batt_v)} V · SoH {formatNum(dev.soh_pct, 0)}%
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top font-mono tabular-nums">
                          <div className="text-[#0B192C] font-medium">
                            {formatNum(dev.pv_p)} W
                          </div>
                          <div className="text-[11px] text-[#5B6B7F]">
                            Z={formatNum(dev.ewma_z, 1)}W
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top font-mono tabular-nums">
                          <div className="text-[#0B192C]">
                            {dev.pwm_duty > 0 ? `NYALA ${dev.pwm_duty}%` : "SIAGA (0%)"}
                          </div>
                          <div className="text-[11px] text-[#5B6B7F]">
                            {formatNum(dev.load_p)} W · {formatNum(dev.lux, 0)} lx
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top font-mono text-[11px] text-[#5B6B7F] whitespace-nowrap tabular-nums">
                          {formatWibTime(dev.last_seen_at)}
                        </td>
                        <td
                          className="py-2.5 px-3 align-top text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/devices/${dev.id}`}
                            className="ops-btn-secondary px-2.5 py-1 text-[11px] inline-block"
                          >
                            Diagnostik
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel Pratinjau Cepat Perangkat Terpilih */}
        <aside className="xl:col-span-4 ops-card p-4 space-y-3 xl:sticky xl:top-20">
          {selectedDevice ? (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-[#DCE3EC] pb-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#062D5B]">
                    Ringkasan Aset Terpilih
                  </div>
                  <div className="text-[18px] font-bold font-mono text-[#0B192C]">
                    {selectedDevice.id}
                  </div>
                  <div className="text-[13px] font-medium text-[#0B192C]">
                    {selectedDevice.pole_label}
                  </div>
                  <div className="text-[12px] text-[#5B6B7F]">
                    {selectedDevice.corridor_name} · {selectedDevice.kabupaten}
                  </div>
                </div>
                <DeviceStatusBadge status={selectedDevice.status} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <FaultFamilyBadge
                  family={selectedDevice.fault_family}
                  subCode={selectedDevice.fault_sub_code}
                />
                <SpatialVerdictBadge verdict={selectedDevice.spatial_verdict} />
              </div>

              <dl className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="ops-inset p-2.5">
                  <dt className="text-[11px] text-[#5B6B7F]">Profil Baterai</dt>
                  <dd className="font-mono font-semibold text-[#0B192C] mt-0.5">
                    {selectedDevice.battery_profile}
                  </dd>
                </div>
                <div className="ops-inset p-2.5">
                  <dt className="text-[11px] text-[#5B6B7F]">Uptime 30 Hari</dt>
                  <dd className="font-mono font-semibold text-[#0B192C] tabular-nums mt-0.5">
                    {formatNum(selectedDevice.uptime_30d_pct, 1)}%
                  </dd>
                </div>
                <div className="ops-inset p-2.5">
                  <dt className="text-[11px] text-[#5B6B7F]">Keamanan Pintu / 18650</dt>
                  <dd className="font-mono text-[#0B192C] mt-0.5">
                    {selectedDevice.door_open ? "TERBUKA" : "Tertutup"} ·{" "}
                    {formatNum(selectedDevice.backup_cell_v, 2)}V
                  </dd>
                </div>
                <div className="ops-inset p-2.5">
                  <dt className="text-[11px] text-[#5B6B7F]">Lampu Eksisting</dt>
                  <dd className="text-[#0B192C] font-medium mt-0.5 truncate">
                    {selectedDevice.legacy_lamp}
                  </dd>
                </div>
              </dl>

              <div className="pt-2 border-t border-[#DCE3EC] flex flex-wrap gap-2">
                <Link
                  href={`/devices/${selectedDevice.id}`}
                  className="ops-btn-primary flex-1 text-center px-3 py-2 text-[12px]"
                >
                  Buka Diagnostik 3-Kanal
                </Link>
                <Link
                  href={`/work-orders?device=${selectedDevice.id}`}
                  className="ops-btn-secondary px-3 py-2 text-[12px]"
                >
                  Work Order
                </Link>
              </div>
            </>
          ) : (
            <div className="text-xs text-[#5B6B7F]">Pilih satu baris perangkat untuk melihat detail.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
