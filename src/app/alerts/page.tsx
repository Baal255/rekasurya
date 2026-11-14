"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import { SearchIcon } from "@/components/Icons";
import {
  FaultFamilyBadge,
  PriorityBadge,
  SpatialVerdictBadge,
  WorkOrderStatusBadge,
} from "@/components/StatusBadges";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/UiPrimitives";
import { FAULT_FAMILY_LABEL, formatIdr, formatNum, formatWibTime } from "@/lib/format";
import type { CorridorRecord, FaultEventRecord, SparePartRecommendation } from "@/lib/types";

type EnrichedFaultEvent = FaultEventRecord & {
  pole_label: string;
  corridor_id: string;
  corridor_name: string;
  kabupaten: string;
  device_status: string;
  linked_work_order_id: string | null;
  work_order_status: string | null;
};

export default function AlertsManagementPage() {
  const { demoResetTick } = useOperationalRole();
  const [faults, setFaults] = useState<EnrichedFaultEvent[]>([]);
  const [corridors, setCorridors] = useState<CorridorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [familyFilter, setFamilyFilter] = useState<string>("ALL");
  const [corridorFilter, setCorridorFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal memuat daftar alarm gangguan.");
      }
      setFaults(json.data.faultEvents ?? []);
      setCorridors(json.data.corridors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts, demoResetTick]);

  const filteredFaults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return faults.filter((f) => {
      if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
      if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
      if (familyFilter !== "ALL" && f.fault_family !== familyFilter) return false;
      if (corridorFilter !== "ALL" && f.corridor_id !== corridorFilter) return false;
      if (q) {
        const hay = `${f.id} ${f.device_id} ${f.pole_label} ${f.title} ${f.sub_code} ${f.kabupaten}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [faults, statusFilter, severityFilter, familyFilter, corridorFilter, searchQuery]);

  const activeFault =
    filteredFaults.find((f) => f.id === selectedId) ?? filteredFaults[0] ?? null;

  if (loading && faults.length === 0) {
    return <PageSkeleton rows={6} />;
  }

  if (error) {
    return (
      <div className="ops-card p-6 border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] text-sm">
        Gagal memuat alarm: {error}
      </div>
    );
  }

  const activeParts = activeFault
    ? (JSON.parse(activeFault.recommended_parts_json || "[]") as SparePartRecommendation[])
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manajemen Gangguan & Alarm"
        subtitle="Daftar insiden terstruktur ala Linear untuk meninjau gangguan terdeteksi F1–F6, bukti telemetri pemicu, serta keterkaitan Work Order lapangan."
        meta={
          <span className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-[#F1F5F9] text-[#334155] border border-[#DCE3EC]">
            {faults.filter((f) => f.status !== "RESOLVED").length} Aktif · {faults.length} Total Kejadian
          </span>
        }
        actions={
          <Link href="/work-orders" className="ops-btn-primary px-3 py-1.5 text-[12px]">
            Kelola Work Order Terkait
          </Link>
        }
      />

      {/* Bar Filter Multi-Kriteria Gaya Linear */}
      <div className="ops-card p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Semua Status" },
              { id: "ACTIVE", label: "Aktif" },
              { id: "ACKNOWLEDGED", label: "Dikonfirmasi" },
              { id: "RESOLVED", label: "Pulih / Selesai" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-md border cursor-pointer transition-colors ${
                  statusFilter === tab.id
                    ? "bg-[#EBF1F8] border-[#062D5B] text-[#062D5B] font-semibold"
                    : "bg-[#FFFFFF] border-[#DCE3EC] text-[#5B6B7F] hover:text-[#0B192C]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[#5B6B7F]">
            Analitik: <span className="font-mono text-[#0B192C]">Baseline EWMA Deterministik</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="w-4 h-4 text-[#5B6B7F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode insiden, ID tiang, lokasi, atau sub-kode..."
              className="ops-input w-full pl-9 pr-3 py-1.5 text-[12px]"
            />
          </div>

          <select
            aria-label="Filter tingkat urgensi"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="ops-input px-2.5 py-1.5 text-[12px] cursor-pointer"
          >
            <option value="ALL">Semua Urgensi</option>
            <option value="CRITICAL">Kritis</option>
            <option value="HIGH">Tinggi</option>
            <option value="MEDIUM">Sedang</option>
            <option value="LOW">Rendah</option>
          </select>

          <select
            aria-label="Filter komponen gangguan"
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="ops-input px-2.5 py-1.5 text-[12px] cursor-pointer"
          >
            <option value="ALL">Semua Komponen (F1–F6)</option>
            <option value="F1">F1 · Panel Surya / Shading</option>
            <option value="F2">F2 · Baterai SoH / UVLO</option>
            <option value="F3">F3 · SCC MPPT</option>
            <option value="F4">F4 · Driver &amp; LED</option>
            <option value="F5">F5 · Suhu Berlebih</option>
            <option value="F6">F6 · Sabotase &amp; Pencurian</option>
          </select>

          <select
            aria-label="Filter wilayah koridor"
            value={corridorFilter}
            onChange={(e) => setCorridorFilter(e.target.value)}
            className="ops-input px-2.5 py-1.5 text-[12px] cursor-pointer"
          >
            <option value="ALL">Semua Lokasi</option>
            {corridors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kabupaten}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Split Panel: Daftar Insiden + Detail Inspeksi */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start min-w-0">
        <div className="xl:col-span-7 min-w-0 ops-card overflow-hidden">
          {filteredFaults.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Tidak ada alarm yang cocok dengan filter"
                description="Semua alarm pada kombinasi filter tersebut telah ditangani atau tidak ada insiden."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                    <th className="py-2.5 px-3">Insiden &amp; Tiang</th>
                    <th className="py-2.5 px-3">Jenis Gangguan</th>
                    <th className="py-2.5 px-3">Urgensi &amp; Waktu</th>
                    <th className="py-2.5 px-3">Status &amp; WO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {filteredFaults.map((fe) => {
                    const isSelected = activeFault?.id === fe.id;
                    return (
                      <tr
                        key={fe.id}
                        onClick={() => setSelectedId(fe.id)}
                        className={`cursor-pointer transition-colors hover:bg-[#F8FAFC] ${
                          isSelected ? "bg-[#EBF1F8]/75" : "bg-[#FFFFFF]"
                        }`}
                      >
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-mono font-semibold text-[#0B192C] whitespace-nowrap">
                            {fe.id}
                          </div>
                          <div className="font-mono text-[11px] font-semibold text-[#062D5B] mt-0.5">
                            {fe.device_id} · {fe.pole_label}
                          </div>
                          <div className="text-[11px] text-[#5B6B7F]">{fe.kabupaten}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top space-y-1">
                          <FaultFamilyBadge family={fe.fault_family} subCode={fe.sub_code} />
                          <div className="text-[#0B192C] font-medium leading-snug">{fe.title}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top space-y-1 whitespace-nowrap">
                          <PriorityBadge priority={fe.severity} />
                          <div className="font-mono text-[11px] text-[#5B6B7F] tabular-nums">
                            {formatWibTime(fe.detected_at)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top space-y-1 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-md border ${
                              fe.status === "RESOLVED"
                                ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]"
                                : fe.status === "ACKNOWLEDGED"
                                ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                                : "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]"
                            }`}
                          >
                            {fe.status === "RESOLVED"
                              ? "Pulih"
                              : fe.status === "ACKNOWLEDGED"
                              ? "Dikonfirmasi"
                              : "Aktif"}
                          </span>
                          {fe.linked_work_order_id && (
                            <div className="font-mono text-[11px] text-[#062D5B]">
                              {fe.linked_work_order_id}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel Detail Alarm Terpilih */}
        <aside className="xl:col-span-5 min-w-0 ops-card p-4 space-y-3.5 xl:sticky xl:top-20">
          {activeFault ? (
            <>
              <div className="flex items-start justify-between gap-2 border-b border-[#DCE3EC] pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
                    <span className="font-bold text-[#0B192C]">{activeFault.id}</span>
                    <PriorityBadge priority={activeFault.severity} />
                    <FaultFamilyBadge
                      family={activeFault.fault_family}
                      subCode={activeFault.sub_code}
                    />
                  </div>
                  <h2 className="text-[16px] font-semibold text-[#0B192C] mt-1">
                    {activeFault.title}
                  </h2>
                  <div className="text-[12px] text-[#5B6B7F]">
                    {activeFault.device_id} · {activeFault.pole_label} ({activeFault.corridor_name})
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-[13px]">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                  Indikasi Gangguan &amp; Bukti Simulasi
                </div>
                <p className="text-[#0B192C] leading-relaxed">{activeFault.root_cause}</p>
                <div className="ops-inset p-2.5 text-[11px] text-[#334155] space-y-1">
                  <div>
                    Metode demo <span className="font-mono text-[#0B192C]">EWMA per sampel dan aturan fisika</span>
                  </div>
                  <div className="font-mono tabular-nums flex flex-wrap gap-3">
                    <span>EWMA Z: {formatNum(activeFault.ewma_z, 1)} W</span>
                    <span>Latensi skenario demo: {activeFault.detection_latency_sec} dtk</span>
                  </div>
                  <div className="pt-1">
                    <SpatialVerdictBadge verdict={activeFault.spatial_verdict} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                  Rekomendasi Suku Cadang Terkait ({FAULT_FAMILY_LABEL[activeFault.fault_family] ?? activeFault.fault_family})
                </div>
                {activeParts.length === 0 ? (
                  <div className="ops-inset p-2.5 text-[12px] text-[#5B6B7F]">
                    Tidak membutuhkan penggantian suku cadang berat.
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-[12px]">
                    {activeParts.map((part) => (
                      <li
                        key={part.sku}
                        className="ops-inset px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-mono font-semibold text-[#062D5B] mr-1.5">
                            {part.sku}
                          </span>
                          <span className="font-medium text-[#0B192C]">{part.name}</span>
                          <div className="text-[11px] text-[#5B6B7F]">{part.notes}</div>
                        </div>
                        <span className="font-mono text-[#0B192C] whitespace-nowrap tabular-nums">
                          {part.quantity} {part.unit} · {formatIdr(part.estimatedIdr)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {activeFault.linked_work_order_id && (
                <div className="ops-inset p-3 flex items-center justify-between gap-2 text-[12px]">
                  <div>
                    <div className="text-[11px] text-[#5B6B7F]">Work Order Terhubung</div>
                    <div className="font-mono font-semibold text-[#0B192C]">
                      {activeFault.linked_work_order_id}
                    </div>
                  </div>
                  {activeFault.work_order_status && (
                    <WorkOrderStatusBadge status={activeFault.work_order_status} />
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#DCE3EC]">
                <Link
                  href={`/devices/${activeFault.device_id}`}
                  className="ops-btn-primary flex-1 text-center px-3 py-2 text-[12px]"
                >
                  Periksa Diagnostik {activeFault.device_id}
                </Link>
                <Link
                  href={
                    activeFault.linked_work_order_id
                      ? `/work-orders?highlight=${activeFault.linked_work_order_id}`
                      : `/work-orders?device=${activeFault.device_id}`
                  }
                  className="ops-btn-secondary px-3 py-2 text-[12px]"
                >
                  Buka Work Order
                </Link>
              </div>
            </>
          ) : (
            <div className="text-xs text-[#5B6B7F]">
              Pilih satu baris gangguan untuk meninjau akar masalah &amp; rekomendasi suku cadang.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
