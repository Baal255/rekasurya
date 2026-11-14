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
import { EmptyState, PageSkeleton } from "@/components/UiPrimitives";
import { FAULT_FAMILY_LABEL, ROLE_META, formatIdr, formatNum, formatWibTime } from "@/lib/format";
import type {
  CorridorRecord,
  DeviceRecord,
  FaultEventRecord,
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
  faultEvents?: Array<
    FaultEventRecord & {
      pole_label: string;
      corridor_name: string;
      kabupaten: string;
      linked_work_order_id: string | null;
    }
  >;
  auditIntegrity: { valid: boolean; totalEntries: number; headHash: string };
}

export function ConsoleOverview() {
  const { role, demoResetTick } = useOperationalRole();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [corridorFilter, setCorridorFilter] = useState("ALL");
  const [attentionStatusFilter, setAttentionStatusFilter] = useState<string>("ALL");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>("SRG-009");
  const [lastFetchedIso, setLastFetchedIso] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Gagal memuat ringkasan operasi armada.");
      }
      setData(json.data);
      setLastFetchedIso(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview, demoResetTick]);

  const attentionDevices = useMemo(() => {
    if (!data) return [];
    return data.devices.filter((d) => {
      if (d.status === "NORMAL") return false;
      if (corridorFilter !== "ALL" && d.corridor_id !== corridorFilter) return false;
      if (attentionStatusFilter !== "ALL" && d.status !== attentionStatusFilter) return false;
      return true;
    });
  }, [data, corridorFilter, attentionStatusFilter]);

  const corridorSummary = useMemo(() => {
    if (!data) return [];
    return data.corridors.map((c) => {
      const members = data.devices.filter((d) => d.corridor_id === c.id);
      const normal = members.filter((d) => d.status === "NORMAL").length;
      const abnormal = members.length - normal;
      const avgSoc =
        members.length > 0
          ? members.reduce((sum, d) => sum + d.soc_pct, 0) / members.length
          : 0;
      const totalPv = members.reduce((sum, d) => sum + d.pv_p, 0);
      return {
        ...c,
        total: members.length,
        normal,
        abnormal,
        avgSoc,
        totalPv,
      };
    });
  }, [data]);

  const fleetTelemetryAgg = useMemo(() => {
    if (!data || data.devices.length === 0) {
      return { totalPvW: 0, totalLoadW: 0, avgSoc: 0 };
    }
    const totalPvW = data.devices.reduce((s, d) => s + d.pv_p, 0);
    const totalLoadW = data.devices.reduce((s, d) => s + d.load_p, 0);
    const avgSoc = data.devices.reduce((s, d) => s + d.soc_pct, 0) / data.devices.length;
    return { totalPvW, totalLoadW, avgSoc };
  }, [data]);

  if (loading && !data) {
    return <PageSkeleton rows={5} />;
  }

  if (error || !data) {
    return (
      <div className="ops-card p-6 border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] text-sm">
        Gagal memuat ringkasan operasi: {error}
      </div>
    );
  }

  const normalRatio = Math.round((data.stats.normalDevices / Math.max(1, data.stats.totalDevices)) * 100);

  return (
    <div className="space-y-5 min-w-0">
      {/* Command Banner Navy (Prioritas Visual Tinggi — Referensi Struktur Konsol) */}
      <section className="rounded-xl bg-[#062D5B] text-white border border-[#041E3E] overflow-hidden shadow-[0_8px_24px_-12px_rgba(4,30,62,0.45)]">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-white/12">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-mono font-semibold text-[#FEB124] uppercase tracking-wider">
                {ROLE_META[role].label}
              </span>
              <span className="text-white/35">·</span>
              <span className="font-mono text-[#CBD8EA] tabular-nums">
                Pembaruan {formatWibTime(lastFetchedIso)} · Uptime 30h {formatNum(data.stats.avgUptime30dPct, 1)}%
              </span>
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-white leading-tight">
              Pusat Komando Operasi Armada PJUTS
            </h1>
            <p className="text-[13px] text-[#CBD8EA] max-w-2xl leading-relaxed">
              Prioritas gangguan, kondisi koridor Solo Raya, dan antrean regu sky-lift berdasarkan telemetri simulasi tiga kanal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              aria-label="Filter wilayah koridor"
              value={corridorFilter}
              onChange={(e) => setCorridorFilter(e.target.value)}
              className="rounded-[7px] bg-white/10 border border-white/20 text-white px-3 py-1.5 text-[12px] font-medium cursor-pointer focus:outline-none focus:border-[#FEB124]"
            >
              <option value="ALL" className="text-[#0B192C]">
                Semua Koridor (5 Wilayah)
              </option>
              {data.corridors.map((c) => (
                <option key={c.id} value={c.id} className="text-[#0B192C]">
                  {c.kabupaten} — {c.name}
                </option>
              ))}
            </select>
            <Link
              href="/devices"
              className="px-3 py-1.5 rounded-[7px] border border-white/25 bg-white/8 hover:bg-white/15 text-white text-[12px] font-medium transition-colors"
            >
              Lihat Semua {data.stats.totalDevices} Tiang
            </Link>
            <Link href="/simulator" className="ops-btn-amber px-3.5 py-1.5 text-[12px]">
              Uji Injeksi Telemetri
            </Link>
          </div>
        </div>

        {/* Strip 5 Metrik Utama di Dalam Command Banner Navy */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/10 bg-[#041E3E]/55">
          {[
            {
              id: "total",
              label: "Total Perangkat",
              value: data.stats.totalDevices,
              detail: "5 koridor aktif Solo Raya",
              valColor: "text-white",
              onClick: () => setAttentionStatusFilter("ALL"),
              active: attentionStatusFilter === "ALL",
            },
            {
              id: "normal",
              label: "Beroperasi Normal",
              value: data.stats.normalDevices,
              detail: `${normalRatio}% dari armada`,
              valColor: "text-[#86EFAC]",
            },
            {
              id: "fault",
              label: "Mengalami Gangguan",
              value: data.stats.activeFaults,
              detail: "Terlokalisasi F1–F6 (klik filter)",
              valColor: data.stats.activeFaults > 0 ? "text-[#FFD585]" : "text-[#86EFAC]",
              onClick: () =>
                setAttentionStatusFilter((prev) => (prev === "FAULT" ? "ALL" : "FAULT")),
              active: attentionStatusFilter === "FAULT",
            },
            {
              id: "tamper",
              label: "Alarm Sabotase Kritis",
              value: data.stats.tamperCritical,
              detail: "Prioritas darurat F6 / 18650",
              valColor: data.stats.tamperCritical > 0 ? "text-[#FDA4AF]" : "text-[#86EFAC]",
              onClick: () =>
                setAttentionStatusFilter((prev) =>
                  prev === "TAMPER_CRITICAL" ? "ALL" : "TAMPER_CRITICAL"
                ),
              active: attentionStatusFilter === "TAMPER_CRITICAL",
            },
            {
              id: "wo",
              label: "Work Order Terbuka",
              value: `${data.stats.openWorkOrders} Tiket`,
              detail: `${data.stats.openCitizenReports} aduan warga terbuka`,
              valColor: "text-[#FEB124]",
            },
          ].map((item) => {
            const inner = (
              <div className="px-4 py-3 text-left flex flex-col gap-0.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9FB3CE]">
                  {item.label}
                </div>
                <div className={`text-[21px] font-semibold font-mono tabular-nums leading-snug ${item.valColor}`}>
                  {item.value}
                </div>
                <div className="text-[11px] text-[#CBD8EA] truncate">{item.detail}</div>
              </div>
            );

            if (item.onClick) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`cursor-pointer transition-colors hover:bg-white/8 ${
                    item.active ? "bg-white/10 ring-1 ring-inset ring-[#FEB124]/60" : ""
                  }`}
                >
                  {inner}
                </button>
              );
            }
            return <div key={item.id}>{inner}</div>;
          })}
        </div>
      </section>

      {/* Area Operasional Utama: Tabel Perangkat Membutuhkan Perhatian Segera */}
      <section className="ops-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-semibold text-[#062D5B]">
              Perangkat Membutuhkan Perhatian Segera ({attentionDevices.length})
            </h2>
            <p className="text-[12px] text-[#5B6B7F]">
              Diurutkan berdasarkan tingkat urgensi (Sabotase F6 → Gangguan F2–F5 → Peringatan EWMA F1) untuk tindakan langsung operator.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter status gangguan"
              value={attentionStatusFilter}
              onChange={(e) => setAttentionStatusFilter(e.target.value)}
              className="ops-input px-2.5 py-1 text-[12px] cursor-pointer"
            >
              <option value="ALL">Semua Gangguan ({data.stats.activeFaults})</option>
              <option value="TAMPER_CRITICAL">Sabotase Kritis</option>
              <option value="FAULT">Gangguan Aktif (F2–F5)</option>
              <option value="WARNING_EWMA">Peringatan EWMA (F1)</option>
            </select>
            <Link
              href="/alerts"
              className="text-[12px] font-semibold text-[#062D5B] hover:text-[#093B75] hover:underline"
            >
              Semua Log Alarm →
            </Link>
          </div>
        </div>

        {attentionDevices.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Tidak ada perangkat bermasalah pada filter saat ini"
              description="Seluruh tiang pada koridor/status yang dipilih berada pada parameter operasi normal. Gunakan Simulator Telemetri untuk menguji deteksi gangguan."
              action={
                <Link href="/devices" className="ops-btn-secondary px-3 py-1.5 text-xs inline-block">
                  Buka Inventaris Lengkap (18 Tiang)
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                  <th className="py-2.5 px-4">ID &amp; Lokasi Tiang</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Kategori Gangguan</th>
                  <th className="py-2.5 px-3">Bukti Telemetri</th>
                  <th className="py-2.5 px-3">Terakhir Terpantau</th>
                  <th className="py-2.5 px-4 text-right">Tindakan Langsung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {attentionDevices.map((dev) => {
                  const linkedWo = data.openWorkOrders.find((w) => w.device_id === dev.id);
                  return (
                    <tr
                      key={dev.id}
                      onClick={() => setSelectedDeviceId(dev.id)}
                      className={`cursor-pointer transition-colors hover:bg-[#F3F6FA] ${
                        selectedDeviceId === dev.id ? "bg-[#EBF1F8]/70" : "bg-[#FFFFFF]"
                      }`}
                    >
                      <td className="py-3 px-4 align-top">
                        <div className="font-mono font-semibold text-[#062D5B]">{dev.id}</div>
                        <div className="text-[12px] text-[#0B192C] font-medium">{dev.pole_label}</div>
                        <div className="text-[11px] text-[#5B6B7F]">
                          {dev.corridor_name} · {dev.kabupaten}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="space-y-1">
                          <DeviceStatusBadge status={dev.status} />
                          <div>
                            <SpatialVerdictBadge verdict={dev.spatial_verdict} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top space-y-1">
                        <FaultFamilyBadge family={dev.fault_family} subCode={dev.fault_sub_code} />
                        <div className="text-[11px] text-[#5B6B7F]">
                          {FAULT_FAMILY_LABEL[dev.fault_family] ?? dev.fault_family}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top font-mono text-[12px] tabular-nums">
                        <div className="text-[#0B192C]">
                          EWMA Z ={" "}
                          <span
                            className={
                              dev.ewma_z < dev.ewma_lcl
                                ? "text-[#B45309] font-semibold"
                                : "text-[#0B192C]"
                            }
                          >
                            {formatNum(dev.ewma_z, 1)} W
                          </span>
                        </div>
                        <div className="text-[11px] text-[#5B6B7F]">
                          Batt {formatNum(dev.batt_v)} V · SoC {formatNum(dev.soc_pct, 0)}% · PV{" "}
                          {formatNum(dev.pv_p)} W
                        </div>
                        {dev.on_backup_cell === 1 && (
                          <div className="text-[11px] text-[#9D174D] font-semibold">
                            Berjalan di sel 18650 ({formatNum(dev.backup_cell_v, 2)} V)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top font-mono text-[11px] text-[#5B6B7F] whitespace-nowrap tabular-nums">
                        {formatWibTime(dev.last_seen_at)}
                      </td>
                      <td
                        className="py-3 px-4 align-top text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/devices/${dev.id}`}
                            className="ops-btn-primary px-2.5 py-1 text-[11px]"
                          >
                            Diagnostik
                          </Link>
                          <Link
                            href={
                              linkedWo
                                ? `/work-orders?highlight=${linkedWo.id}`
                                : `/work-orders?device=${dev.id}`
                            }
                            className="ops-btn-secondary px-2.5 py-1 text-[11px]"
                          >
                            {linkedWo ? linkedWo.id : "Work Order"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Peta Interaktif Solo Raya */}
      <SoloRayaMap
        corridors={data.corridors}
        devices={data.devices}
        selectedCorridorId={corridorFilter}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => setSelectedDeviceId(id)}
        onSelectCorridor={(cid) => setCorridorFilter(cid)}
        extraHeaderSlot={
          <Link href="/map" className="text-[12px] font-semibold text-[#062D5B] hover:underline">
            Buka Layar Penuh Peta →
          </Link>
        }
      />

      {/* Distribusi Koridor & Antrean Work Order Aktif */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        {/* Ringkasan Kondisi per Koridor */}
        <section className="xl:col-span-5 min-w-0 ops-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE3EC] flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-[#062D5B]">
                Distribusi Kesehatan per Koridor
              </h2>
              <p className="text-[12px] text-[#5B6B7F]">
                Agregasi tiang normal vs gangguan pada 5 ruas Solo Raya
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#DCE3EC]">
            {corridorSummary.map((cor) => (
              <button
                key={cor.id}
                type="button"
                onClick={() => setCorridorFilter((prev) => (prev === cor.id ? "ALL" : cor.id))}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-[#F3F6FA] cursor-pointer ${
                  corridorFilter === cor.id ? "bg-[#EBF1F8]" : "bg-[#FFFFFF]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-semibold text-[#0B192C]">
                      {cor.kabupaten} · {cor.name}
                    </div>
                    <div className="text-[11px] text-[#5B6B7F]">
                      {cor.managing_agency} · Kelas {cor.road_class} ({cor.target_lux} lx)
                    </div>
                  </div>
                  <div className="text-right font-mono text-[12px] tabular-nums shrink-0">
                    <span className="text-[#15803D] font-semibold">{cor.normal} Normal</span>
                    {cor.abnormal > 0 && (
                      <span className="ml-2 text-[#B91C1C] font-semibold">
                        · {cor.abnormal} Gangguan
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-[#EDF1F6] overflow-hidden flex">
                  <div
                    className="bg-[#15803D] h-full"
                    style={{ width: `${(cor.normal / Math.max(1, cor.total)) * 100}%` }}
                  />
                  {cor.abnormal > 0 && (
                    <div
                      className="bg-[#B91C1C] h-full"
                      style={{ width: `${(cor.abnormal / Math.max(1, cor.total)) * 100}%` }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Antrean Work Order Aktif */}
        <section className="xl:col-span-7 min-w-0 ops-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[#062D5B]">
                Antrean Work Order &amp; Paket Suku Cadang ({data.openWorkOrders.length})
              </h2>
              <p className="text-[12px] text-[#5B6B7F]">
                Daftar kebutuhan komponen terpetakan F1–F6 sebelum regu sky-lift berangkat
              </p>
            </div>
            <Link
              href="/work-orders"
              className="ops-btn-secondary px-2.5 py-1 text-[12px]"
            >
              Kelola Semua Tiket
            </Link>
          </div>

          {data.openWorkOrders.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Tidak ada Work Order terbuka"
                description="Semua pekerjaan pemeliharaan sudah diverifikasi normal atau ditutup."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                    <th className="py-2 px-4">Tiket &amp; Tiang</th>
                    <th className="py-2 px-3">Prioritas &amp; Status</th>
                    <th className="py-2 px-3">Suku Cadang Disiapkan</th>
                    <th className="py-2 px-4 text-right">Regu &amp; Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EC]">
                  {data.openWorkOrders.slice(0, 6).map((wo) => {
                    const parts = JSON.parse(wo.parts_checklist_json) as SparePartRecommendation[];
                    const estTotal = parts.reduce((acc, p) => acc + p.estimatedIdr * p.quantity, 0);
                    return (
                      <tr key={wo.id} className="hover:bg-[#F3F6FA]">
                        <td className="py-2.5 px-4 align-top">
                          <div className="font-mono font-semibold text-[#062D5B]">{wo.id}</div>
                          <div className="text-[12px] font-medium text-[#0B192C] mt-0.5">
                            {wo.title}
                          </div>
                          <div className="text-[11px] text-[#5B6B7F]">
                            Tiang{" "}
                            <Link
                              href={`/devices/${wo.device_id}`}
                              className="font-mono text-[#062D5B] font-semibold hover:underline"
                            >
                              {wo.device_id}
                            </Link>{" "}
                            · {wo.kabupaten}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top space-y-1">
                          <div>
                            <PriorityBadge priority={wo.priority} />
                          </div>
                          <div>
                            <WorkOrderStatusBadge status={wo.status} />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          {parts.length === 0 ? (
                            <span className="text-[#5B6B7F]">Inspeksi visual / tanpa SKU</span>
                          ) : (
                            <div className="space-y-0.5">
                              {parts.map((p) => (
                                <div key={p.sku} className="text-[#0B192C]">
                                  <span className="font-mono font-semibold text-[#062D5B]">{p.sku}</span> ·{" "}
                                  {p.name} ({p.quantity} {p.unit})
                                </div>
                              ))}
                              <div className="font-mono text-[11px] text-[#5B6B7F] tabular-nums">
                                Est. {formatIdr(estTotal)}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 align-top text-right">
                          <div className="text-[#0B192C] font-medium">{wo.truck_unit}</div>
                          <div className="text-[11px] text-[#5B6B7F]">{wo.assigned_team}</div>
                          <Link
                            href={`/work-orders?highlight=${wo.id}`}
                            className="inline-block mt-1 text-[11px] font-semibold text-[#062D5B] hover:underline"
                          >
                            Proses Tiket →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Ringkasan Operasi Energi & Integritas Log */}
      <section className="ops-card p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-semibold text-[#062D5B]">
              Ringkasan Operasi Energi &amp; Keandalan Armada
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#EDF1F6] border border-[#DCE3EC] text-[#334155]">
              INTEGRITAS AUDIT SHA-256: {data.auditIntegrity.valid ? "UTUH" : "RUSAK"} ({data.auditIntegrity.totalEntries} entri)
            </span>
          </div>
          <p className="text-[12px] text-[#5B6B7F]">
            Agregasi telemetri simulasi 18 tiang dipisahkan secara eksplisit dari proyeksi model proposal 2-aliran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 font-mono text-[12px] tabular-nums">
          <div>
            <div className="text-[11px] font-sans text-[#5B6B7F]">Total Daya PV (Simulasi)</div>
            <div className="text-[15px] font-semibold text-[#0B192C]">
              {formatNum(fleetTelemetryAgg.totalPvW, 1)} W
            </div>
          </div>
          <div>
            <div className="text-[11px] font-sans text-[#5B6B7F]">Rata-Rata SoC Baterai</div>
            <div className="text-[15px] font-semibold text-[#15803D]">
              {formatNum(fleetTelemetryAgg.avgSoc, 1)}%
            </div>
          </div>
          <div>
            <div className="text-[11px] font-sans text-[#5B6B7F]">
              Proyeksi Manfaat/Thn (Asumsi Proposal)
            </div>
            <div className="text-[15px] font-semibold text-[#062D5B]">
              {formatIdr(data.stats.annualSavingsEstimatedIdr)}
            </div>
          </div>
          <Link href="/energy" className="ops-btn-secondary px-3 py-1.5 font-sans text-[12px]">
            Buka Analitik Energi →
          </Link>
        </div>
      </section>
    </div>
  );
}
