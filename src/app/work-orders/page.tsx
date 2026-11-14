"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import { SearchIcon } from "@/components/Icons";
import {
  CitizenStatusBadge,
  DeviceStatusBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/components/StatusBadges";
import { EmptyState, PageHeader, PageSkeleton } from "@/components/UiPrimitives";
import type { EnrichedCitizenReport } from "@/lib/domain/citizen-reports";
import type { EnrichedWorkOrder } from "@/lib/domain/work-orders";
import { formatIdr, formatWibTime } from "@/lib/format";
import type { SparePartRecommendation } from "@/lib/types";

const CORRIDOR_COORDS = [
  { label: "Surakarta — Jl. Ahmad Yani (Kleco–Gilingan)", lat: -7.5542, lng: 110.7854 },
  { label: "Sukoharjo — Jl. Raya Solo–Sukoharjo (Grogol)", lat: -7.6815, lng: 110.8351 },
  { label: "Karanganyar — Jl. Lawu (Pasar Jungke)", lat: -7.5955, lng: 110.9462 },
  { label: "Klaten — Jl. Solo–Jogja (Jonggrangan)", lat: -7.7024, lng: 110.6104 },
  { label: "Sragen — Ringroad Utara Sragen", lat: -7.4201, lng: 111.0155 },
];

const WO_STATUS_TABS = [
  { id: "ALL", label: "Semua Status" },
  { id: "OPEN", label: "Belum Ditangani" },
  { id: "ASSIGNED", label: "Ditugaskan" },
  { id: "IN_PROGRESS", label: "Dalam Pengerjaan" },
  { id: "VERIFIED", label: "Terverifikasi" },
  { id: "CLOSED", label: "Selesai" },
];

export default function WorkOrdersAndCitizenPage() {
  const { getHeaders, demoResetTick } = useOperationalRole();
  const [activeTab, setActiveTab] = useState<"WO" | "ULAS">("WO");

  // State Work Order
  const [workOrders, setWorkOrders] = useState<EnrichedWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [woFeedback, setWoFeedback] = useState<{
    woId: string;
    ok: boolean;
    message: string;
  } | null>(null);
  const [busyWoId, setBusyWoId] = useState<string | null>(null);

  // State Create Manual WO
  const [showCreateWo, setShowCreateWo] = useState(false);
  const [devicesList, setDevicesList] = useState<Array<{ id: string; pole_label: string }>>([]);
  const [newWoDevice, setNewWoDevice] = useState("SOL-001");
  const [newWoTitle, setNewWoTitle] = useState("");
  const [newWoSummary, setNewWoSummary] = useState("");
  const [newWoPriority, setNewWoPriority] = useState<"DARURAT" | "TINGGI" | "SEDANG" | "RENDAH">(
    "SEDANG"
  );

  // State Citizen Reports (Simulasi Alur ULAS)
  const [reports, setReports] = useState<EnrichedCitizenReport[]>([]);
  const [trackId, setTrackId] = useState("");
  const [trackPhoneLast4, setTrackPhoneLast4] = useState("");
  const [citChannel, setCitChannel] = useState<
    "Web ULAS" | "Lapor Mas Wali (WA)" | "Solo Destination" | "SP4N LAPOR!"
  >("Web ULAS");
  const [citAlias, setCitAlias] = useState("Warga Simulasi Solo Raya");
  const [citPhone4, setCitPhone4] = useState("5512");
  const [citCorridorIdx, setCitCorridorIdx] = useState(1);
  const [citDesc, setCitDesc] = useState(
    "Lampu tiang PJU di tepi jalan padam dan berkedip sejak pukul 19.30 WIB."
  );
  const [citFollowUp, setCitFollowUp] = useState("");
  const [citSubmitResult, setCitSubmitResult] = useState<string | null>(null);
  const [busyCit, setBusyCit] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [woRes, citRes, devRes] = await Promise.all([
        fetch(`/api/work-orders?status=${encodeURIComponent(statusFilter)}`, { cache: "no-store" }),
        fetch("/api/citizen-reports", { cache: "no-store" }),
        fetch("/api/devices", { cache: "no-store" }),
      ]);
      const [woJson, citJson, devJson] = await Promise.all([
        woRes.json(),
        citRes.json(),
        devRes.json(),
      ]);
      if (woJson.ok) {
        setWorkOrders(woJson.data.workOrders);
      }
      if (citJson.ok) {
        setReports(citJson.data.reports);
      }
      if (devJson.ok) {
        setDevicesList(devJson.data.devices);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("tab") === "aduan") {
      setActiveTab("ULAS");
    }
    const highlight = sp.get("highlight");
    const devParam = sp.get("device");
    if (highlight) {
      setSelectedWoId(highlight);
    } else if (devParam) {
      setSearchQuery(devParam);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, demoResetTick]);

  const filteredWorkOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workOrders;
    return workOrders.filter((w) => {
      const hay = `${w.id} ${w.device_id} ${w.pole_label} ${w.title} ${w.corridor_name} ${w.kabupaten} ${w.assigned_team}`.toLowerCase();
      return hay.includes(q);
    });
  }, [workOrders, searchQuery]);

  const activeWo =
    filteredWorkOrders.find((w) => w.id === selectedWoId) ?? filteredWorkOrders[0] ?? null;

  const handleWoAction = async (
    wo: EnrichedWorkOrder,
    action: "ASSIGN" | "CHECKIN" | "VERIFY" | "CLOSE" | "UPDATE_NOTES"
  ) => {
    setBusyWoId(wo.id);
    setWoFeedback(null);
    try {
      const payload: Record<string, unknown> = {
        action,
        technician_notes: notesDraft[wo.id] ?? wo.technician_notes,
      };
      if (action === "CHECKIN") {
        payload.checkin_lat = wo.lat;
        payload.checkin_lng = wo.lng;
      }
      const res = await fetch(`/api/work-orders/${encodeURIComponent(wo.id)}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setWoFeedback({ woId: wo.id, ok: false, message: json.error || "Aksi gagal." });
      } else {
        setWoFeedback({
          woId: wo.id,
          ok: true,
          message:
            action === "CHECKIN"
              ? `Check-in demo tercatat pada koordinat tiang (${wo.lat.toFixed(4)}, ${wo.lng.toFixed(4)}). Mode servis demo aktif 90 menit.`
              : action === "VERIFY"
              ? `Telemetri simulasi ${wo.device_id} memenuhi kriteria demo. Tiket ${wo.id} berstatus VERIFIED.`
              : `Status ${wo.id} diperbarui menjadi ${json.data.workOrder.status}.`,
        });
        await loadAll();
      }
    } finally {
      setBusyWoId(null);
    }
  };

  const simulateDeviceRecovery = async (wo: EnrichedWorkOrder) => {
    setBusyWoId(wo.id);
    setWoFeedback(null);
    try {
      const res = await fetch("/api/simulator/inject", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ device_id: wo.device_id, scenario: "NORMAL_CLEAR_DAY" }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setWoFeedback({
          woId: wo.id,
          ok: true,
          message: `Telemetri pemulihan NORMAL diterima dari ${wo.device_id}. Klik "Verifikasi Pemulihan Telemetri" untuk menyelesaikan siklus.`,
        });
        await loadAll();
      } else {
        setWoFeedback({ woId: wo.id, ok: false, message: json.error || "Gagal simulasi." });
      }
    } finally {
      setBusyWoId(null);
    }
  };

  const handleCreateManualWo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        device_id: newWoDevice,
        priority: newWoPriority,
        title: newWoTitle,
        diagnosis_summary: newWoSummary,
        parts: [],
      }),
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      setShowCreateWo(false);
      setNewWoTitle("");
      setNewWoSummary("");
      setSelectedWoId(json.data.workOrder.id);
      setWoFeedback({
        woId: json.data.workOrder.id,
        ok: true,
        message: `Work Order ${json.data.workOrder.id} berhasil diterbitkan untuk ${newWoDevice}.`,
      });
      await loadAll();
    }
  };

  const handleCitizenSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (trackId.trim()) qs.set("id", trackId.trim());
    if (trackPhoneLast4.trim()) qs.set("phone_last4", trackPhoneLast4.trim());
    const res = await fetch(`/api/citizen-reports?${qs.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (json.ok) {
      setReports(json.data.reports);
    }
  };

  const handleSubmitCitizen = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyCit(true);
    setCitSubmitResult(null);
    const coord = CORRIDOR_COORDS[citCorridorIdx];
    try {
      const res = await fetch("/api/citizen-reports", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          channel: citChannel,
          reporter_alias: citAlias,
          phone_last4: citPhone4,
          corridor_name: coord.label,
          description: citDesc,
          lat: coord.lat,
          lng: coord.lng,
          follow_up_of: citFollowUp.trim() ? citFollowUp.trim() : null,
          auto_create_work_order: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setCitSubmitResult(`Gagal: ${json.error || "Periksa masukan Anda."}`);
      } else {
        const r = json.data;
        setCitSubmitResult(
          `Aduan demo tercatat (${r.report.id}). Pencocokan spasial Haversine mengaitkan ke tiang ${
            r.nearestDevice?.id ?? "—"
          } (${r.distanceMeters ?? "—"} m) & Work Order ${r.linkedWorkOrderId ?? "—"}.`
        );
        await loadAll();
      }
    } finally {
      setBusyCit(false);
    }
  };

  if (loading && workOrders.length === 0 && reports.length === 0) {
    return <PageSkeleton rows={6} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tugas Teknisi dengan Lokasi & Daftar Suku Cadang"
        subtitle="Siapkan lokasi tiang, dugaan penyebab, dan daftar suku cadang sebelum regu berangkat, lalu cek ulang hasil perbaikan bersama aduan warga."
        actions={
          <div className="inline-flex items-center rounded-md border border-[#DCE3EC] bg-[#FFFFFF] p-0.5 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("WO")}
              className={`px-3 py-1.5 rounded cursor-pointer transition-colors ${
                activeTab === "WO"
                  ? "bg-[#062D5B] text-white"
                  : "text-[#5B6B7F] hover:text-[#0B192C]"
              }`}
            >
              Tugas Teknisi ({workOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ULAS")}
              className={`px-3 py-1.5 rounded cursor-pointer transition-colors ${
                activeTab === "ULAS"
                  ? "bg-[#062D5B] text-white"
                  : "text-[#5B6B7F] hover:text-[#0B192C]"
              }`}
            >
              Aduan Warga · Simulasi ULAS ({reports.length})
            </button>
          </div>
        }
      />

      {activeTab === "WO" ? (
        <div className="space-y-4">
          {/* Toolbar Filter & Pencarian Gaya Linear */}
          <div className="ops-card p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {WO_STATUS_TABS.map((tab) => (
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
              <button
                type="button"
                onClick={() => setShowCreateWo((v) => !v)}
                className="ops-btn-primary px-3 py-1.5 text-[12px] cursor-pointer"
              >
                {showCreateWo ? "Tutup Form" : "+ Buat Work Order"}
              </button>
            </div>

            <div className="relative max-w-md">
              <SearchIcon className="w-4 h-4 text-[#5B6B7F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor WO, ID tiang, jalan, atau regu..."
                className="ops-input w-full pl-9 pr-3 py-1.5 text-[12px]"
              />
            </div>
          </div>

          {showCreateWo && (
            <form onSubmit={handleCreateManualWo} className="ops-card p-4 space-y-3">
              <div className="text-[14px] font-semibold text-[#0B192C]">
                Terbitkan Work Order Pemeliharaan Preventif / Inspeksi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                <div>
                  <label className="block text-[#5B6B7F] mb-1">Target Tiang</label>
                  <select
                    value={newWoDevice}
                    onChange={(e) => setNewWoDevice(e.target.value)}
                    className="ops-input w-full px-2.5 py-1.5 font-mono"
                  >
                    {devicesList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} — {d.pole_label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#5B6B7F] mb-1">Prioritas</label>
                  <select
                    value={newWoPriority}
                    onChange={(e) => setNewWoPriority(e.target.value as typeof newWoPriority)}
                    className="ops-input w-full px-2.5 py-1.5 font-mono"
                  >
                    <option value="RENDAH">RENDAH</option>
                    <option value="SEDANG">SEDANG</option>
                    <option value="TINGGI">TINGGI</option>
                    <option value="DARURAT">DARURAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5B6B7F] mb-1">Judul Pekerjaan</label>
                  <input
                    required
                    minLength={3}
                    value={newWoTitle}
                    onChange={(e) => setNewWoTitle(e.target.value)}
                    placeholder="Contoh: Inspeksi Konektor PV Rutin"
                    className="ops-input w-full px-2.5 py-1.5"
                  />
                </div>
              </div>
              <div className="text-[12px]">
                <label className="block text-[#5B6B7F] mb-1">Ringkasan Tugas &amp; Instruksi</label>
                <textarea
                  required
                  minLength={5}
                  rows={2}
                  value={newWoSummary}
                  onChange={(e) => setNewWoSummary(e.target.value)}
                  placeholder="Jelaskan komponen yang harus diperiksa..."
                  className="ops-input w-full px-2.5 py-1.5"
                />
              </div>
              <button type="submit" className="ops-btn-primary px-4 py-1.5 text-[12px] cursor-pointer">
                Simpan Work Order
              </button>
            </form>
          )}

          {/* Split Panel Linear Style: Tabel Daftar Padat + Detail Eksekusi Teknisi */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start min-w-0">
            <div className="xl:col-span-7 min-w-0 ops-card overflow-hidden">
              {filteredWorkOrders.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="Tidak ada Work Order pada filter ini"
                    description="Ubah filter status atau pencarian di atas untuk melihat tiket lain."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[12px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                        <th className="py-2.5 px-3">Tiket &amp; Tiang</th>
                        <th className="py-2.5 px-3">Tugas Pemeliharaan</th>
                        <th className="py-2.5 px-3">Prioritas</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Batas SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC]">
                      {filteredWorkOrders.map((wo) => {
                        const isSelected = activeWo?.id === wo.id;
                        return (
                          <tr
                            key={wo.id}
                            onClick={() => setSelectedWoId(wo.id)}
                            className={`cursor-pointer transition-colors hover:bg-[#F8FAFC] ${
                              isSelected ? "bg-[#EBF1F8]/80" : "bg-[#FFFFFF]"
                            }`}
                          >
                            <td className="py-2.5 px-3 align-top whitespace-nowrap">
                              <div className="font-mono font-semibold text-[#0B192C]">{wo.id}</div>
                              <div className="font-mono text-[11px] text-[#062D5B]">
                                {wo.device_id}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <div className="font-semibold text-[#0B192C]">{wo.title}</div>
                              <div className="text-[11px] text-[#5B6B7F]">
                                {wo.pole_label} · {wo.truck_unit}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <PriorityBadge priority={wo.priority} />
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <WorkOrderStatusBadge status={wo.status} />
                            </td>
                            <td className="py-2.5 px-3 align-top font-mono text-[11px] text-[#5B6B7F] whitespace-nowrap tabular-nums">
                              {formatWibTime(wo.sla_deadline)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Detail Panel Work Order Aktif */}
            <aside className="xl:col-span-5 min-w-0 ops-card p-4 space-y-4 xl:sticky xl:top-20">
              {activeWo ? (
                (() => {
                  const parts = JSON.parse(
                    activeWo.parts_checklist_json
                  ) as SparePartRecommendation[];
                  const totalPartsIdr = parts.reduce(
                    (acc, p) => acc + p.estimatedIdr * p.quantity,
                    0
                  );
                  const isBusy = busyWoId === activeWo.id;
                  const notesVal = notesDraft[activeWo.id] ?? activeWo.technician_notes;
                  const maintActive =
                    Boolean(activeWo.maintenance_until) &&
                    new Date(activeWo.maintenance_until!).getTime() > Date.now();

                  return (
                    <>
                      <div className="border-b border-[#DCE3EC] pb-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-mono text-[12px]">
                            <span className="font-bold text-[#0B192C]">{activeWo.id}</span>
                            <PriorityBadge priority={activeWo.priority} />
                          </div>
                          <WorkOrderStatusBadge status={activeWo.status} />
                        </div>

                        <h2 className="text-[16px] font-semibold text-[#0B192C]">
                          {activeWo.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#334155]">
                          <Link
                            href={`/devices/${activeWo.device_id}`}
                            className="font-mono font-semibold text-[#062D5B] hover:underline"
                          >
                            Tiang {activeWo.device_id}
                          </Link>
                          <span>· {activeWo.pole_label}</span>
                          <DeviceStatusBadge status={activeWo.device_status} />
                        </div>

                        <div className="text-[11px] font-mono text-[#5B6B7F] space-y-0.5">
                          <div>
                            Regu: {activeWo.assigned_team} ({activeWo.truck_unit})
                          </div>
                          <div>SLA: {formatWibTime(activeWo.sla_deadline)}</div>
                          {activeWo.citizen_report_id && (
                            <div className="text-[#B45309] font-semibold">
                              Terkait Aduan Warga: {activeWo.citizen_report_id}
                            </div>
                          )}
                          {maintActive && (
                            <div className="text-[#15803D] font-semibold">
                              Otorisasi Buka Panel aktif s/d{" "}
                              {formatWibTime(activeWo.maintenance_until)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[12px]">
                        <div className="text-[12px] font-semibold text-[#5B6B7F]">
                          Dugaan Penyebab &amp; Rincian Penanganan
                        </div>
                        <p className="text-[#0B192C] leading-relaxed">
                          {activeWo.diagnosis_summary}
                        </p>
                      </div>

                      {/* Daftar Suku Cadang yang Disiapkan */}
                      <div className="ops-inset p-3 space-y-2">
                        <div className="flex items-center justify-between text-[12px] font-semibold text-[#5B6B7F]">
                          <span>Daftar Suku Cadang yang Disiapkan</span>
                          <span className="font-mono text-[#062D5B] tabular-nums">
                            {formatIdr(totalPartsIdr)}
                          </span>
                        </div>
                        {parts.length === 0 ? (
                          <div className="text-[12px] text-[#5B6B7F]">
                            Hanya inspeksi &amp; pembersihan tanpa komponen elektris berat.
                          </div>
                        ) : (
                          <ul className="space-y-1.5 text-[12px]">
                            {parts.map((part) => (
                              <li
                                key={part.sku}
                                className="bg-[#FFFFFF] px-2.5 py-2 rounded border border-[#DCE3EC] flex items-start justify-between gap-2"
                              >
                                <div>
                                  <span className="font-mono font-semibold text-[#062D5B] mr-1.5">
                                    {part.sku}
                                  </span>
                                  <span className="font-medium text-[#0B192C]">{part.name}</span>
                                  <div className="text-[11px] text-[#5B6B7F]">{part.notes}</div>
                                </div>
                                <span className="font-mono text-[#0B192C] whitespace-nowrap tabular-nums">
                                  {part.quantity} {part.unit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Catatan Teknisi & Aktivitas Check-In */}
                      <div className="space-y-2 text-[12px]">
                        <label
                          htmlFor="wo-notes-input"
                          className="block text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]"
                        >
                          Catatan Teknisi &amp; Riwayat Aktivitas
                        </label>
                        <textarea
                          id="wo-notes-input"
                          rows={2}
                          value={notesVal}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({ ...prev, [activeWo.id]: e.target.value }))
                          }
                          placeholder="Tulis temuan lapangan, nomor seri suku cadang pengganti, atau hasil ukur..."
                          className="ops-input w-full px-2.5 py-1.5"
                        />
                        {activeWo.checkin_at && (
                          <div className="text-[11px] font-mono text-[#15803D]">
                            Check-in demo: {formatWibTime(activeWo.checkin_at)} (
                            {activeWo.checkin_lat?.toFixed(4)}, {activeWo.checkin_lng?.toFixed(4)})
                          </div>
                        )}
                      </div>

                      {/* Tombol Aksi Kontekstual */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#DCE3EC]">
                        {activeWo.status === "OPEN" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(activeWo, "ASSIGN")}
                            className="ops-btn-primary px-3 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
                          >
                            Tugaskan Regu
                          </button>
                        )}

                        {(activeWo.status === "OPEN" || activeWo.status === "ASSIGNED") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(activeWo, "CHECKIN")}
                            className="px-3 py-1.5 text-[12px] font-semibold rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] hover:bg-[#FDE68A] cursor-pointer disabled:opacity-50"
                          >
                            Simulasikan Check-in (Servis 90 menit)
                          </button>
                        )}

                        {activeWo.device_status !== "NORMAL" &&
                          activeWo.status !== "VERIFIED" &&
                          activeWo.status !== "CLOSED" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => simulateDeviceRecovery(activeWo)}
                              className="px-3 py-1.5 text-[12px] font-medium rounded-md border border-[#15803D]/40 bg-[#ECFDF5] text-[#065F46] hover:bg-[#D1FAE5] cursor-pointer disabled:opacity-50"
                            >
                              Simulasikan Pemulihan Telemetri Normal
                            </button>
                          )}

                        {(activeWo.status === "ASSIGNED" || activeWo.status === "IN_PROGRESS") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(activeWo, "VERIFY")}
                            className="ops-btn-primary px-3 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
                          >
                            Verifikasi Pemulihan Telemetri
                          </button>
                        )}

                        {activeWo.status === "VERIFIED" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(activeWo, "CLOSE")}
                            className="px-3 py-1.5 text-[12px] font-semibold rounded-md bg-[#0B192C] text-white hover:bg-[#334155] cursor-pointer disabled:opacity-50"
                          >
                            Tutup Tiket (CLOSED)
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleWoAction(activeWo, "UPDATE_NOTES")}
                          className="ops-btn-secondary px-3 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
                        >
                          Simpan Catatan
                        </button>
                      </div>

                      {woFeedback && woFeedback.woId === activeWo.id && (
                        <div
                          className={`p-2.5 rounded-md border text-[12px] font-mono ${
                            woFeedback.ok
                              ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
                              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
                          }`}
                        >
                          {woFeedback.message}
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <div className="text-xs text-[#5B6B7F]">
                  Pilih satu Work Order di tabel sebelah kiri untuk memeriksa detail dan melakukan tindakan.
                </div>
              )}
            </aside>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="ops-card p-3.5 border-[#FCD34D] bg-[#FFFBEB] text-[12px] text-[#78350F]">
            <span className="font-mono font-bold mr-2">DISKLAMER SIMULASI INTERNAL:</span>
            Modul ini mengadaptasi alur pelaporan publik{" "}
            <span className="font-mono">ULAS Surakarta</span> (penomoran 10 digit{" "}
            <span className="font-mono">ID. 2026XXXXXX</span>, status{" "}
            <span className="font-mono">Open → Responded → Process → Resolved</span>, serta tautan
            tindak lanjut <span className="font-mono">FOLLOW UP ADUAN</span>) untuk demonstrasi
            operator REKASURYA. <strong>Bukan integrasi resmi dengan sistem Pemerintah Kota Surakarta</strong>.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
            <form onSubmit={handleSubmitCitizen} className="lg:col-span-5 min-w-0 ops-card p-4 space-y-3">
              <h2 className="text-[14px] font-semibold text-[#0B192C]">
                Simulasi Kirim Aduan Warga PJU
              </h2>
              <p className="text-[12px] text-[#5B6B7F]">
                Koordinat laporan dicocokkan otomatis via jarak Haversine ke tiang terdekat untuk menautkan telemetri dan Work Order teknis.
              </p>

              <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                <div>
                  <label className="block text-[#5B6B7F] mb-1">Kanal Simulasi</label>
                  <select
                    value={citChannel}
                    onChange={(e) => setCitChannel(e.target.value as typeof citChannel)}
                    className="ops-input w-full px-2.5 py-1.5"
                  >
                    <option value="Web ULAS">Web ULAS</option>
                    <option value="Lapor Mas Wali (WA)">Lapor Mas Wali (WA)</option>
                    <option value="Solo Destination">Solo Destination</option>
                    <option value="SP4N LAPOR!">SP4N LAPOR!</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5B6B7F] mb-1">4 Digit Akhir HP</label>
                  <input
                    required
                    pattern="\d{4}"
                    maxLength={4}
                    value={citPhone4}
                    onChange={(e) => setCitPhone4(e.target.value)}
                    className="ops-input w-full px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="text-[12px]">
                <label className="block text-[#5B6B7F] mb-1">Nama Alias Pelapor (Demo)</label>
                <input
                  required
                  value={citAlias}
                  onChange={(e) => setCitAlias(e.target.value)}
                  className="ops-input w-full px-2.5 py-1.5"
                />
              </div>

              <div className="text-[12px]">
                <label className="block text-[#5B6B7F] mb-1">Lokasi Ruas Jalan (Titik GPS)</label>
                <select
                  value={citCorridorIdx}
                  onChange={(e) => setCitCorridorIdx(Number(e.target.value))}
                  className="ops-input w-full px-2.5 py-1.5"
                >
                  {CORRIDOR_COORDS.map((c, idx) => (
                    <option key={c.label} value={idx}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[12px]">
                <label className="block text-[#5B6B7F] mb-1">
                  Tindak Lanjut Dari ID Sebelumnya (Opsional)
                </label>
                <input
                  value={citFollowUp}
                  onChange={(e) => setCitFollowUp(e.target.value)}
                  placeholder="Contoh: ID. 2026004685"
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div className="text-[12px]">
                <label className="block text-[#5B6B7F] mb-1">Uraian Keluhan PJU</label>
                <textarea
                  required
                  minLength={8}
                  rows={3}
                  value={citDesc}
                  onChange={(e) => setCitDesc(e.target.value)}
                  className="ops-input w-full px-2.5 py-1.5"
                />
              </div>

              <button
                type="submit"
                disabled={busyCit}
                className="ops-btn-primary w-full py-2 text-[12px] cursor-pointer disabled:opacity-50"
              >
                {busyCit ? "Mencatat & Mencocokkan Tiang..." : "Kirim Aduan Demo & Tautkan Telemetri"}
              </button>

              {citSubmitResult && (
                <div className="p-2.5 rounded-md border border-[#A7F3D0] bg-[#ECFDF5] text-[12px] font-mono text-[#065F46]">
                  {citSubmitResult}
                </div>
              )}
            </form>

            <div className="lg:col-span-7 min-w-0 space-y-3">
              <form
                onSubmit={handleCitizenSearch}
                className="ops-card p-3 flex flex-wrap items-end gap-2 text-[12px]"
              >
                <div className="flex-1 min-w-[170px]">
                  <label className="block text-[11px] font-mono text-[#5B6B7F] mb-1">
                    Lacak Nomor Aduan
                  </label>
                  <input
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    placeholder="ID. 2026007610"
                    className="ops-input w-full px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[11px] font-mono text-[#5B6B7F] mb-1">
                    4 Digit HP
                  </label>
                  <input
                    value={trackPhoneLast4}
                    onChange={(e) => setTrackPhoneLast4(e.target.value)}
                    placeholder="4821"
                    className="ops-input w-full px-2.5 py-1.5 font-mono"
                  />
                </div>
                <button type="submit" className="ops-btn-secondary px-3 py-1.5 cursor-pointer">
                  Cari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackId("");
                    setTrackPhoneLast4("");
                    loadAll();
                  }}
                  className="ops-btn-secondary px-3 py-1.5 text-[#5B6B7F] cursor-pointer"
                >
                  Semua
                </button>
              </form>

              {reports.map((rep) => (
                <div key={rep.id} className="ops-card p-4 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#DCE3EC] pb-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
                        <span className="font-bold text-[#062D5B]">{rep.id}</span>
                        <CitizenStatusBadge status={rep.status} />
                        <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155] border border-[#DCE3EC] text-[10px]">
                          {rep.channel}
                        </span>
                        {rep.follow_up_of && (
                          <span className="text-[#B45309] text-[10px]">
                            Follow Up: {rep.follow_up_of}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-[#334155] mt-1">
                        {rep.corridor_name} · Pelapor: {rep.reporter_alias} (HP ...{rep.phone_last4})
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      {rep.matched_device_id && (
                        <Link
                          href={`/devices/${rep.matched_device_id}`}
                          className="text-[#062D5B] hover:underline block font-semibold"
                        >
                          Tiang: {rep.matched_device_id}
                        </Link>
                      )}
                      {rep.linked_work_order_id && (
                        <span className="text-[#B45309] block">
                          WO: {rep.linked_work_order_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] text-[#0B192C] leading-relaxed">{rep.description}</p>

                  <div className="ops-inset p-3 space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase text-[#5B6B7F]">
                      Riwayat Tindak Lanjut
                    </div>
                    {rep.timeline.map((step, i) => (
                      <div key={`${rep.id}-${i}`} className="flex items-start gap-2 text-[11px]">
                        <span className="font-mono text-[#5B6B7F] shrink-0 w-28">
                          {formatWibTime(step.timestamp)}
                        </span>
                        <CitizenStatusBadge status={step.status} />
                        <span className="text-[#334155]">
                          <strong className="text-[#0B192C]">{step.actor}:</strong> {step.note}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
