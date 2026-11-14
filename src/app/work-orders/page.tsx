"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useOperationalRole } from "@/components/AppShell";
import {
  CitizenStatusBadge,
  DeviceStatusBadge,
  PriorityBadge,
  WorkOrderStatusBadge,
} from "@/components/StatusBadges";
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

export default function WorkOrdersAndCitizenPage() {
  const { getHeaders, demoResetTick } = useOperationalRole();
  const [activeTab, setActiveTab] = useState<"WO" | "ULAS">("WO");

  // State Work Order
  const [workOrders, setWorkOrders] = useState<EnrichedWorkOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
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
  const [newWoPriority, setNewWoPriority] = useState<"DARURAT" | "TINGGI" | "SEDANG" | "RENDAH">("SEDANG");

  // State Citizen Reports (Simulasi ULAS)
  const [reports, setReports] = useState<EnrichedCitizenReport[]>([]);
  const [trackId, setTrackId] = useState("");
  const [trackPhoneLast4, setTrackPhoneLast4] = useState("");
  const [citChannel, setCitChannel] = useState<"Web ULAS" | "Lapor Mas Wali (WA)" | "Solo Destination" | "SP4N LAPOR!">("Web ULAS");
  const [citAlias, setCitAlias] = useState("Warga Simulasi Solo Raya");
  const [citPhone4, setCitPhone4] = useState("5512");
  const [citCorridorIdx, setCitCorridorIdx] = useState(1);
  const [citDesc, setCitDesc] = useState("Lampu tiang PJU di tepi jalan padam dan berkedip sejak pukul 19.30 WIB.");
  const [citFollowUp, setCitFollowUp] = useState("");
  const [citSubmitResult, setCitSubmitResult] = useState<string | null>(null);
  const [busyCit, setBusyCit] = useState(false);

  const loadAll = useCallback(async () => {
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
  }, [statusFilter]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("tab") === "aduan") {
      setActiveTab("ULAS");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, demoResetTick]);

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
              ? `Check-in GPS tercatat (${wo.lat.toFixed(4)}, ${wo.lng.toFixed(4)}). Mode pemeliharaan buka panel aktif 90 menit.`
              : action === "VERIFY"
              ? `Pemulihan telemetri ${wo.device_id} terverifikasi NORMAL. Tiket ${wo.id} berstatus VERIFIED.`
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
          message: `Telemetri pemulihan NORMAL diterima dari ${wo.device_id}. Sekarang klik "Verifikasi Pemulihan Telemetri" untuk menutup siklus.`,
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
      setWoFeedback({
        woId: json.data.workOrder.id,
        ok: true,
        message: `Work Order ${json.data.workOrder.id} berhasil dibuat untuk ${newWoDevice}.`,
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
          `Aduan demo tercatat dengan nomor ${r.report.id}. Pencocokan spasial Haversine mengaitkan ke tiang ${
            r.nearestDevice?.id ?? "Belum ditemukan"
          } (${r.distanceMeters ?? "—"} m) & Work Order ${r.linkedWorkOrderId ?? "—"}.`
        );
        await loadAll();
      }
    } finally {
      setBusyCit(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Switcher Tab */}
      <div className="scada-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100">
            Manajemen Work Order, Suku Cadang &amp; Kanal Aduan Warga
          </h1>
          <p className="text-xs text-slate-400">
            Menjembatani hasil diagnosis F1–F6 serta laporan warga ke tindakan teknisi sky-lift yang terverifikasi telemetri.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0B0F17] p-1 rounded border border-[#1E293B]">
          <button
            type="button"
            onClick={() => setActiveTab("WO")}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
              activeTab === "WO"
                ? "bg-[#0EA5E9] text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Antrean Work Order ({workOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ULAS")}
            className={`px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
              activeTab === "ULAS"
                ? "bg-[#0EA5E9] text-slate-950"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Kanal Aduan Warga · Alur ULAS ({reports.length})
          </button>
        </div>
      </div>

      {activeTab === "WO" ? (
        <div className="space-y-4">
          {/* Bar Kontrol Work Order */}
          <div className="scada-panel p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {["ALL", "OPEN", "ASSIGNED", "IN_PROGRESS", "VERIFIED", "CLOSED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded border cursor-pointer ${
                    statusFilter === st
                      ? "bg-[#0EA5E9]/20 border-[#0EA5E9] text-sky-200"
                      : "bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st === "ALL" ? "Semua Status" : st}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowCreateWo((v) => !v)}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-[#334155] bg-[#161F30] text-slate-100 hover:border-[#0EA5E9] cursor-pointer"
            >
              {showCreateWo ? "Tutup Form" : "+ Buat Work Order Manual"}
            </button>
          </div>

          {showCreateWo && (
            <form onSubmit={handleCreateManualWo} className="scada-panel p-4 space-y-3">
              <div className="text-sm font-semibold text-slate-100">
                Terbitkan Work Order Pemeliharaan Preventif / Inspeksi
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Target Tiang</label>
                  <select
                    value={newWoDevice}
                    onChange={(e) => setNewWoDevice(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
                  >
                    {devicesList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} — {d.pole_label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Prioritas</label>
                  <select
                    value={newWoPriority}
                    onChange={(e) => setNewWoPriority(e.target.value as typeof newWoPriority)}
                    className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
                  >
                    <option value="RENDAH">RENDAH</option>
                    <option value="SEDANG">SEDANG</option>
                    <option value="TINGGI">TINGGI</option>
                    <option value="DARURAT">DARURAT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Judul Pekerjaan</label>
                  <input
                    required
                    minLength={3}
                    value={newWoTitle}
                    onChange={(e) => setNewWoTitle(e.target.value)}
                    placeholder="Contoh: Inspeksi Konektor PV Rutin"
                    className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>
              <div className="text-xs">
                <label className="block text-slate-400 mb-1">Ringkasan Tugas &amp; Instruksi</label>
                <textarea
                  required
                  minLength={5}
                  rows={2}
                  value={newWoSummary}
                  onChange={(e) => setNewWoSummary(e.target.value)}
                  placeholder="Jelaskan komponen yang harus diperiksa..."
                  className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0EA5E9] text-slate-950 hover:bg-sky-400 cursor-pointer"
              >
                Simpan Work Order
              </button>
            </form>
          )}

          {/* Daftar Kartu Work Order */}
          <div className="space-y-3">
            {workOrders.map((wo) => {
              const parts = JSON.parse(wo.parts_checklist_json) as SparePartRecommendation[];
              const totalPartsIdr = parts.reduce((acc, p) => acc + p.estimatedIdr * p.quantity, 0);
              const isBusy = busyWoId === wo.id;
              const notesVal = notesDraft[wo.id] ?? wo.technician_notes;
              const maintActive =
                Boolean(wo.maintenance_until) &&
                new Date(wo.maintenance_until!).getTime() > Date.now();

              return (
                <div key={wo.id} className="scada-panel p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1E293B] pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <PriorityBadge priority={wo.priority} />
                        <span className="text-sm font-bold text-slate-100">{wo.id}</span>
                        <Link
                          href={`/devices/${wo.device_id}`}
                          className="text-sky-300 hover:underline font-semibold"
                        >
                          Tiang {wo.device_id} ({wo.pole_label})
                        </Link>
                        <DeviceStatusBadge status={wo.device_status} />
                      </div>
                      <h2 className="text-base font-semibold text-slate-100">{wo.title}</h2>
                      <div className="text-xs text-slate-400">
                        {wo.corridor_name} · {wo.kabupaten} · Regu:{" "}
                        <span className="text-slate-200">{wo.assigned_team}</span> ({wo.truck_unit})
                        {wo.citizen_report_id && (
                          <span className="ml-2 font-mono text-amber-300">
                            · Aduan Terkait: {wo.citizen_report_id}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <WorkOrderStatusBadge status={wo.status} />
                      <div className="text-[11px] font-mono text-slate-400">
                        SLA: {formatWibTime(wo.sla_deadline)}
                      </div>
                      {maintActive && (
                        <div className="text-[11px] font-mono text-emerald-300">
                          Otorisasi Buka Panel aktif s/d {formatWibTime(wo.maintenance_until)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 space-y-2.5">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {wo.diagnosis_summary}
                      </p>

                      {/* Daftar Periksa Suku Cadang */}
                      <div className="scada-inset p-3">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                          <span>DAFTAR PERIKSA SUKU CADANG (ESTIMASI SEBELUM BERANGKAT)</span>
                          <span className="text-sky-300 font-semibold">
                            Total Estimasi: {formatIdr(totalPartsIdr)}
                          </span>
                        </div>
                        {parts.length === 0 ? (
                          <div className="text-xs text-slate-400">
                            Hanya inspeksi &amp; pembersihan (tanpa penggantian komponen berat).
                          </div>
                        ) : (
                          <ul className="space-y-1.5 text-xs">
                            {parts.map((part) => (
                              <li
                                key={part.sku}
                                className="flex flex-wrap items-center justify-between gap-2 bg-[#0B0F17] px-2.5 py-1.5 rounded border border-[#1E293B]"
                              >
                                <div>
                                  <span className="font-mono text-sky-300 mr-2">{part.sku}</span>
                                  <span className="text-slate-100 font-medium">{part.name}</span>
                                  <span className="text-slate-400 ml-2">({part.notes})</span>
                                </div>
                                <span className="font-mono text-slate-200">
                                  {part.quantity} {part.unit} · {formatIdr(part.estimatedIdr)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Panel Aksi Teknisi & Verifikasi Telemetri */}
                    <div className="lg:col-span-5 scada-inset p-3 flex flex-col justify-between gap-2.5">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-mono text-slate-400">
                          CATATAN TEKNISI / BUKTI LAPANGAN
                        </label>
                        <textarea
                          rows={2}
                          value={notesVal}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({ ...prev, [wo.id]: e.target.value }))
                          }
                          className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#0EA5E9]"
                        />
                        {wo.checkin_at && (
                          <div className="text-[11px] font-mono text-emerald-300">
                            Check-in GPS: {formatWibTime(wo.checkin_at)} ({wo.checkin_lat?.toFixed(4)},{" "}
                            {wo.checkin_lng?.toFixed(4)})
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {wo.status === "OPEN" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(wo, "ASSIGN")}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50 cursor-pointer"
                          >
                            Tugaskan Regu
                          </button>
                        )}

                        {(wo.status === "OPEN" || wo.status === "ASSIGNED") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(wo, "CHECKIN")}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                          >
                            Check-In Teknisi GPS (Otorisasi Panel 90m)
                          </button>
                        )}

                        {wo.device_status !== "NORMAL" &&
                          wo.status !== "VERIFIED" &&
                          wo.status !== "CLOSED" && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => simulateDeviceRecovery(wo)}
                              className="px-3 py-1.5 text-xs font-medium rounded border border-emerald-600/70 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900/60 disabled:opacity-50 cursor-pointer"
                            >
                              Simulasikan Pemulihan Telemetri Normal
                            </button>
                          )}

                        {(wo.status === "ASSIGNED" || wo.status === "IN_PROGRESS") && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(wo, "VERIFY")}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                          >
                            Verifikasi Pemulihan Telemetri
                          </button>
                        )}

                        {wo.status === "VERIFIED" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleWoAction(wo, "CLOSE")}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-200 text-slate-950 hover:bg-white disabled:opacity-50 cursor-pointer"
                          >
                            Tutup Tiket (CLOSED)
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleWoAction(wo, "UPDATE_NOTES")}
                          className="px-2.5 py-1.5 text-xs font-medium rounded border border-[#334155] bg-[#0B0F17] text-slate-300 hover:text-white cursor-pointer"
                        >
                          Simpan Catatan
                        </button>
                      </div>
                    </div>
                  </div>

                  {woFeedback && woFeedback.woId === wo.id && (
                    <div
                      className={`p-2.5 rounded border text-xs font-mono ${
                        woFeedback.ok
                          ? "bg-emerald-950/70 border-emerald-700/70 text-emerald-200"
                          : "bg-red-950/70 border-red-700/70 text-red-200"
                      }`}
                    >
                      {woFeedback.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Disklamer Wajib Simulasi Aduan Warga */}
          <div className="scada-panel p-3.5 border-amber-700/70 bg-amber-950/25 text-xs text-amber-100">
            <span className="font-mono font-bold text-amber-300 mr-2">
              DISKLAMER SIMULASI INTERNAL:
            </span>
            Modul ini mengadaptasi alur pelaporan publik{" "}
            <span className="font-mono">ULAS Surakarta</span> (penomoran 10 digit{" "}
            <span className="font-mono">ID. 2026XXXXXX</span>, status{" "}
            <span className="font-mono">Open → Responded → Process → Resolved</span>, serta tautan
            tindak lanjut <span className="font-mono">FOLLOW UP ADUAN</span>) untuk keperluan
            demonstrasi operator REKASURYA. <strong>Bukan integrasi resmi dengan sistem Pemerintah Kota Surakarta</strong> dan hanya memakai identitas warga simulasi.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Formulir Kirim Aduan Warga Demo */}
            <form onSubmit={handleSubmitCitizen} className="lg:col-span-5 scada-panel p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">
                Simulasi Pengiriman Aduan Warga PJU
              </h2>
              <p className="text-xs text-slate-400">
                Koordinat laporan dicocokkan otomatis ke tiang REKASURYA terdekat (jarak Haversine) untuk menghubungkan laporan warga dengan telemetri dan Work Order teknis.
              </p>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Kanal Simulasi</label>
                  <select
                    value={citChannel}
                    onChange={(e) => setCitChannel(e.target.value as typeof citChannel)}
                    className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-slate-100"
                  >
                    <option value="Web ULAS">Web ULAS</option>
                    <option value="Lapor Mas Wali (WA)">Lapor Mas Wali (WA)</option>
                    <option value="Solo Destination">Solo Destination</option>
                    <option value="SP4N LAPOR!">SP4N LAPOR!</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">4 Digit Akhir HP</label>
                  <input
                    required
                    pattern="\d{4}"
                    maxLength={4}
                    value={citPhone4}
                    onChange={(e) => setCitPhone4(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 mb-1">Nama Alias Pelapor (Demo)</label>
                <input
                  required
                  value={citAlias}
                  onChange={(e) => setCitAlias(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 mb-1">Lokasi Ruas Jalan (Titik GPS)</label>
                <select
                  value={citCorridorIdx}
                  onChange={(e) => setCitCorridorIdx(Number(e.target.value))}
                  className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-slate-100"
                >
                  {CORRIDOR_COORDS.map((c, idx) => (
                    <option key={c.label} value={idx}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 mb-1">
                  Tindak Lanjut Dari ID Sebelumnya (Opsional)
                </label>
                <input
                  value={citFollowUp}
                  onChange={(e) => setCitFollowUp(e.target.value)}
                  placeholder="Contoh: ID. 2026004685"
                  className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
                />
              </div>

              <div className="text-xs">
                <label className="block text-slate-400 mb-1">Uraian Keluhan PJU</label>
                <textarea
                  required
                  minLength={8}
                  rows={3}
                  value={citDesc}
                  onChange={(e) => setCitDesc(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={busyCit}
                className="w-full py-2 text-xs font-semibold rounded bg-[#0EA5E9] text-slate-950 hover:bg-sky-400 disabled:opacity-50 cursor-pointer"
              >
                {busyCit ? "Mencatat & Mencocokkan Tiang..." : "Kirim Aduan Demo & Tautkan Telemetri"}
              </button>

              {citSubmitResult && (
                <div className="p-2.5 rounded border border-emerald-700/70 bg-emerald-950/60 text-xs font-mono text-emerald-200">
                  {citSubmitResult}
                </div>
              )}
            </form>

            {/* Pelacak Tiket & Lini Masa */}
            <div className="lg:col-span-7 space-y-3">
              <form onSubmit={handleCitizenSearch} className="scada-panel p-3.5 flex flex-wrap items-end gap-2 text-xs">
                <div className="flex-1 min-w-[170px]">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Lacak Nomor Aduan
                  </label>
                  <input
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    placeholder="ID. 2026007610"
                    className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    4 Digit HP
                  </label>
                  <input
                    value={trackPhoneLast4}
                    onChange={(e) => setTrackPhoneLast4(e.target.value)}
                    placeholder="4821"
                    className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-[#161F30] border border-[#334155] text-slate-100 hover:border-[#0EA5E9] cursor-pointer"
                >
                  Cari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrackId("");
                    setTrackPhoneLast4("");
                    loadAll();
                  }}
                  className="px-3 py-1.5 text-xs rounded border border-[#1E293B] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Semua
                </button>
              </form>

              {reports.map((rep) => (
                <div key={rep.id} className="scada-panel p-4 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#1E293B] pb-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-sky-300">{rep.id}</span>
                        <CitizenStatusBadge status={rep.status} />
                        <span className="px-1.5 py-0.5 rounded bg-[#161F30] text-slate-300 border border-[#1E293B] text-[10px]">
                          {rep.channel}
                        </span>
                        {rep.follow_up_of && (
                          <span className="text-amber-300 text-[10px]">
                            Follow Up: {rep.follow_up_of}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        {rep.corridor_name} · Pelapor: {rep.reporter_alias} (HP ...{rep.phone_last4})
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      {rep.matched_device_id && (
                        <Link
                          href={`/devices/${rep.matched_device_id}`}
                          className="text-sky-400 hover:underline block"
                        >
                          Tiang: {rep.matched_device_id}
                        </Link>
                      )}
                      {rep.linked_work_order_id && (
                        <span className="text-amber-300 block">
                          WO: {rep.linked_work_order_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{rep.description}</p>

                  {/* Lini Masa Progres */}
                  <div className="scada-inset p-2.5 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      Riwayat Tindak Lanjut
                    </div>
                    {rep.timeline.map((step, i) => (
                      <div key={`${rep.id}-${i}`} className="flex items-start gap-2 text-[11px]">
                        <span className="font-mono text-slate-500 shrink-0 w-28">
                          {formatWibTime(step.timestamp)}
                        </span>
                        <CitizenStatusBadge status={step.status} />
                        <span className="text-slate-300">
                          <strong className="text-slate-100">{step.actor}:</strong> {step.note}
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
