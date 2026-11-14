"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import { SearchIcon } from "@/components/Icons";
import { SoloRayaMap } from "@/components/SoloRayaMap";
import { DeviceStatusBadge, FaultFamilyBadge } from "@/components/StatusBadges";
import { PageHeader, PageSkeleton } from "@/components/UiPrimitives";
import { formatNum } from "@/lib/format";
import type { CorridorRecord, DeviceRecord } from "@/lib/types";

export default function OperationalMapPage() {
  const { demoResetTick } = useOperationalRole();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [corridors, setCorridors] = useState<CorridorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>("SRG-009");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setDevices(json.data.devices ?? []);
        setCorridors(json.data.corridors ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, demoResetTick]);

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return devices.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
      if (q) {
        const hay = `${d.id} ${d.pole_label} ${d.corridor_name ?? ""} ${d.kabupaten ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [devices, statusFilter, searchQuery]);

  const groupedByCorridor = useMemo(() => {
    return corridors
      .filter((c) => corridorFilter === "ALL" || c.id === corridorFilter)
      .map((c) => ({
        corridor: c,
        items: filteredDevices.filter((d) => d.corridor_id === c.id),
      }));
  }, [corridors, corridorFilter, filteredDevices]);

  if (loading && devices.length === 0) {
    return <PageSkeleton rows={5} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Peta Operasional & Pengelompokan Wilayah Solo Raya"
        subtitle="Visualisasi geospasial WGS84 seluruh 18 titik tiang PJUTS untuk lokalisasi gangguan koridor, geofence sabotase, dan perencanaan rute regu sky-lift."
        actions={
          <Link href="/devices" className="ops-btn-secondary px-3 py-1.5 text-[12px]">
            Tabel Inventaris Lengkap
          </Link>
        }
      />

      {/* Kontrol Pencarian Lokasi & Status Peta */}
      <div className="ops-card p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="w-4 h-4 text-[#5B6B7F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lokasi tiang, ruas jalan, atau kabupaten..."
            className="ops-input w-full pl-9 pr-3 py-1.5 text-[12px]"
          />
        </div>
        <select
          aria-label="Filter status pada peta"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="ops-input px-2.5 py-1.5 text-[12px] cursor-pointer"
        >
          <option value="ALL">Semua Kondisi ({devices.length})</option>
          <option value="TAMPER_CRITICAL">Sabotase Kritis</option>
          <option value="FAULT">Gangguan Aktif</option>
          <option value="WARNING_EWMA">Peringatan EWMA</option>
          <option value="NORMAL">Normal</option>
        </select>
      </div>

      {/* Kanvas Peta Utama + Inspector */}
      <SoloRayaMap
        corridors={corridors}
        devices={filteredDevices}
        selectedCorridorId={corridorFilter}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => setSelectedDeviceId(id)}
        onSelectCorridor={(cid) => setCorridorFilter(cid)}
      />

      {/* Daftar Klaster Tiang per Koridor di Bawah Peta */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groupedByCorridor.map(({ corridor, items }) => (
          <div key={corridor.id} className="ops-card overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#DCE3EC] flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-[#0B192C]">
                  {corridor.kabupaten}
                </div>
                <div className="text-[11px] text-[#5B6B7F]">{corridor.name}</div>
              </div>
              <span className="font-mono text-[11px] text-[#334155]">{items.length} tiang</span>
            </div>

            <div className="divide-y divide-[#DCE3EC]">
              {items.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDeviceId(dev.id)}
                  className={`px-4 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-[#F8FAFC] ${
                    selectedDeviceId === dev.id ? "bg-[#EBF1F8]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[12px] text-[#0B192C]">
                        {dev.id}
                      </span>
                      <DeviceStatusBadge status={dev.status} />
                    </div>
                    <div className="text-[11px] text-[#5B6B7F] truncate mt-0.5">
                      {dev.pole_label} · PV {formatNum(dev.pv_p)} W · SoC {formatNum(dev.soc_pct, 0)}%
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <FaultFamilyBadge family={dev.fault_family} subCode={dev.fault_sub_code} />
                    <Link
                      href={`/devices/${dev.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-medium text-[#062D5B] hover:underline"
                    >
                      Diagnostik →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
