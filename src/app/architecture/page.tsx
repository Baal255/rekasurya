"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useOperationalRole } from "@/components/AppShell";
import { formatWibTime } from "@/lib/format";
import type { AiInvocationRecord, AuditLogRecord } from "@/lib/types";

interface ContractPayload {
  contractVersion: string;
  adapterMode: string;
  isSimulatedPoc: boolean;
  honestyNotice: string;
  sampleRequest: Record<string, unknown>;
  recentInvocations: AiInvocationRecord[];
}

interface AuditPayload {
  integrity: { valid: boolean; totalEntries: number; brokenAtSeq: number | null; headHash: string };
  entries: AuditLogRecord[];
}

const HARDWARE_DELTAS = [
  {
    subsystem: "Sensor Arus & Tegangan",
    legacy: "3x INA219 (batas 26 V max)",
    rekasurya: "PV: INA228 (85 V); BATT & LOAD: INA226 (36 V) + Shunt 2–5 mΩ ≥3W",
    rationale: "Voc panel 300 Wp dingin mencapai 46–48 V sehingga INA219 rusak/saturasi.",
  },
  {
    subsystem: "Isolasi Pengukuran & PWM",
    legacy: "Tanpa isolasi galvanik; beban lewat jalur rentan ground loop",
    rekasurya: "B0303S-1W + ADuM1250 pada I2C PV/BATT; PC817 optocoupler PWM (200–500 Hz)",
    rationale: "Mencegah ground loop di SCC common-negative/positive & melindungi ESP32.",
  },
  {
    subsystem: "Jalur Daya LED Utama 40 W",
    legacy: "Asumsi awal sebagian beban melewati board",
    rekasurya: "SCC LOAD → Shunt LOAD → Buck CC-CV 6–40V 2A eksternal → LED; PCB kontrol 1–2 W",
    rationale: "Panas dan arus lampu tidak membebani PCB kontrol maupun merusak jejak tembaga.",
  },
  {
    subsystem: "Komunikasi & Sinkronisasi",
    legacy: "LoRa E220/E32 relay+sink, penyimpanan SPIFFS",
    rekasurya: "LTE Cat-1 + GNSS per tiang + RTC DS3231MZ + SPI Flash W25Q (ring buffer offline)",
    rationale: "Kemandirian per tiang untuk 25.843+ PJU Solo Raya & integritas timestamp offline.",
  },
  {
    subsystem: "Keamanan & Cadangan Daya",
    legacy: "Tanpa baterai cadangan anti-pencurian",
    rekasurya: "Sel 18650 power-path + LIS3DH 3-axis + sakelar pintu + buzzer + UVLO 22 V",
    rationale: "Board tetap mengirim alert sabotase & GNSS walau baterai LiFePO4 utama dicabut.",
  },
];

const SPEC_CONFLICTS = [
  {
    item: "Kapasitas Pack Baterai",
    docs: "Proposal: 25,6 V 40 Ah vs Board Diagram: 25,6 V 50 Ah vs AURORA: 12,8 V 12 Ah",
    resolution: "Dikelola lewat enum profil perangkat (25.6V_40Ah default; 25.6V_50Ah & 12.8V tersedia).",
  },
  {
    item: "Jumlah Kanal Suhu NTC",
    docs: "Proposal/Board PCB: 5x NTC (ADS1115) vs FiturPemenang: 4x NTC",
    resolution: "Konfigurasi firmware & UI mendukung 5 kanal termal (Panel, Batt, SCC, Driver, LM75B).",
  },
  {
    item: "Taksonomi Kode Gangguan",
    docs: "Proposal: 6 keluarga (F1–F6) vs Draf Opus: 14 sub-kode rinci",
    resolution: "Hierarki 6 keluarga utama F1–F6 + 16 sub-kode teknis terpetakan SKU suku cadang.",
  },
  {
    item: "Dokumen Lanjutan Claude Opus",
    docs: "REKASURYA_Extended_Proposal_FINAL.pdf / AI Spec belum berada di folder kerja",
    resolution: "Diadaptasi jujur via kontrak AI JSON v1.0.0; menunggu endpoint PoC GPT Astra.",
  },
];

export default function ArchitectureAndContractPage() {
  const { demoResetTick } = useOperationalRole();
  const [contract, setContract] = useState<ContractPayload | null>(null);
  const [audit, setAudit] = useState<AuditPayload | null>(null);
  const [jsonEditor, setJsonEditor] = useState("");
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testErr, setTestErr] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const loadAll = useCallback(async () => {
    const [cRes, aRes] = await Promise.all([
      fetch("/api/ai/contract", { cache: "no-store" }),
      fetch("/api/audit?limit=25", { cache: "no-store" }),
    ]);
    const [cJson, aJson] = await Promise.all([cRes.json(), aRes.json()]);
    if (cJson.ok) {
      setContract(cJson.data);
      setJsonEditor((prev) => prev || JSON.stringify(cJson.data.sampleRequest, null, 2));
    }
    if (aJson.ok) {
      setAudit(aJson.data);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll, demoResetTick]);

  const runContractTest = async () => {
    setTesting(true);
    setTestErr(null);
    setTestOutput(null);
    try {
      const parsed = JSON.parse(jsonEditor);
      const res = await fetch("/api/ai/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setTestErr(JSON.stringify(json, null, 2));
      } else {
        setTestOutput(JSON.stringify(json.data, null, 2));
      }
    } catch (err) {
      setTestErr(err instanceof Error ? err.message : "JSON tidak valid.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="scada-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100">
            Arsitektur Board Hardware, Kontrak Integrasi AI v1.0.0 &amp; Audit Hash SHA-256
          </h1>
          <p className="text-xs text-slate-400">
            Dokumentasi rekayasa terbuka, penguji langsung skema AI untuk layanan PoC GPT Astra, serta verifikasi keutuhan log operasional.
          </p>
        </div>
        <a
          href="https://claude.ai/artifact/PnB6S7gqskthgGa2LWEZ8d"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs font-mono rounded border border-[#0EA5E9]/60 bg-[#0EA5E9]/15 text-sky-200 hover:bg-[#0EA5E9]/25"
        >
          Buka Referensi 3D Kit (Claude Artifact) ↗
        </a>
      </div>

      {/* Kontrak AI Tester */}
      <div className="scada-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Penguji Kontrak AI `POST /api/ai/infer` (`AI-CONTRACT-v{contract?.contractVersion ?? "1.0.0"}`)
            </h2>
            <p className="text-xs text-amber-200/90 mt-0.5">
              {contract?.honestyNotice ?? "Adaptor menjalankan simulasi EWMA lokal sampai endpoint eksternal diatur pada REKASURYA_AI_SERVICE_URL."}
            </p>
          </div>
          <button
            type="button"
            disabled={testing}
            onClick={runContractTest}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-[#0EA5E9] text-slate-950 hover:bg-sky-400 disabled:opacity-50 cursor-pointer"
          >
            {testing ? "Menguji..." : "Validasi Zod & Jalankan Inferensi"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Payload Request JSON (Ketat Schema v1.0.0)
            </label>
            <textarea
              rows={13}
              value={jsonEditor}
              onChange={(e) => setJsonEditor(e.target.value)}
              className="w-full bg-[#0B0F17] border border-[#334155] rounded p-2.5 text-[11px] font-mono text-slate-100 focus:outline-none focus:border-[#0EA5E9]"
            />
          </div>
          <div>
            <div className="text-[11px] font-mono text-slate-400 mb-1">
              Keluaran Tervalidasi (atau Error Validasi)
            </div>
            <pre
              className={`h-[268px] overflow-auto p-2.5 rounded border text-[11px] font-mono ${
                testErr
                  ? "bg-red-950/40 border-red-700 text-red-200"
                  : "bg-[#0B0F17] border-[#1E293B] text-emerald-200"
              }`}
            >
              {testErr || testOutput || 'Klik "Validasi Zod & Jalankan Inferensi" untuk melihat keluaran kontrak AI...'}
            </pre>
          </div>
        </div>
      </div>

      {/* Evolusi Hardware AURORA -> REKASURYA & Resolusi Konflik */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 scada-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Delta Arsitektur Hardware: AURORA → Board Kendali REKASURYA
          </h2>
          <div className="overflow-x-auto border border-[#1E293B] rounded">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0F1623] border-b border-[#1E293B] text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-2 px-3">Subsistem</th>
                  <th className="py-2 px-3">AURORA / Awal</th>
                  <th className="py-2 px-3">REKASURYA Final</th>
                  <th className="py-2 px-3">Alasan Rekayasa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {HARDWARE_DELTAS.map((row) => (
                  <tr key={row.subsystem}>
                    <td className="py-2 px-3 font-semibold text-slate-100">{row.subsystem}</td>
                    <td className="py-2 px-3 text-slate-400">{row.legacy}</td>
                    <td className="py-2 px-3 font-mono text-sky-200">{row.rekasurya}</td>
                    <td className="py-2 px-3 text-slate-300">{row.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 scada-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Resolusi Konflik Spesifikasi &amp; Keterbatasan Dokumen
          </h2>
          <div className="space-y-2.5 text-xs">
            {SPEC_CONFLICTS.map((c) => (
              <div key={c.item} className="scada-inset p-3 space-y-1">
                <div className="font-semibold text-amber-300">{c.item}</div>
                <div className="text-[11px] font-mono text-slate-400">{c.docs}</div>
                <div className="text-slate-200">{c.resolution}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log Invokasi AI + Audit Trail SHA-256 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 scada-panel p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Riwayat Invokasi Adaptor AI Terbaru ({contract?.recentInvocations.length ?? 0})
          </h2>
          <div className="overflow-x-auto border border-[#1E293B] rounded max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="bg-[#0F1623] border-b border-[#1E293B] text-slate-400">
                  <th className="py-2 px-2.5">ID / Tiang</th>
                  <th className="py-2 px-2.5">Adaptor</th>
                  <th className="py-2 px-2.5">Sub-Kode</th>
                  <th className="py-2 px-2.5">EWMA Z</th>
                  <th className="py-2 px-2.5">Latensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {contract?.recentInvocations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-1.5 px-2.5">
                      <span className="text-slate-100 font-bold">{inv.device_id}</span>
                      <div className="text-[10px] text-slate-500">{inv.id}</div>
                    </td>
                    <td className="py-1.5 px-2.5 text-sky-300">{inv.adapter_mode}</td>
                    <td className="py-1.5 px-2.5">{inv.sub_code}</td>
                    <td className="py-1.5 px-2.5">{inv.ewma_z} W</td>
                    <td className="py-1.5 px-2.5">{inv.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 scada-panel p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Jejak Audit Terkait Hash SHA-256 (`audit_log`)
              </h2>
              {audit && (
                <div className="text-[11px] font-mono text-slate-400">
                  Status Rantai:{" "}
                  <span className={audit.integrity.valid ? "text-emerald-300 font-bold" : "text-red-400"}>
                    {audit.integrity.valid ? "UTUH & TERVERIFIKASI" : "TERPUTUS"}
                  </span>{" "}
                  · {audit.integrity.totalEntries} entri · Head:{" "}
                  {audit.integrity.headHash.slice(0, 12)}...
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={loadAll}
              className="px-2.5 py-1 text-xs font-mono rounded border border-[#334155] bg-[#161F30] text-slate-200 hover:border-[#0EA5E9] cursor-pointer"
            >
              Verifikasi Ulang
            </button>
          </div>

          <div className="overflow-x-auto border border-[#1E293B] rounded max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="bg-[#0F1623] border-b border-[#1E293B] text-slate-400">
                  <th className="py-2 px-2.5">#Seq</th>
                  <th className="py-2 px-2.5">Peran &amp; Aksi</th>
                  <th className="py-2 px-2.5">Entitas</th>
                  <th className="py-2 px-2.5">Hash</th>
                  <th className="py-2 px-2.5">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {audit?.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1.5 px-2.5 text-slate-400">#{e.seq}</td>
                    <td className="py-1.5 px-2.5">
                      <span className="text-sky-300">{e.action}</span>
                      <div className="text-[10px] text-slate-500">{e.actor_role}</div>
                    </td>
                    <td className="py-1.5 px-2.5">{e.entity_id}</td>
                    <td className="py-1.5 px-2.5 text-emerald-300">
                      {e.entry_hash.slice(0, 10)}...
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-400">
                      {formatWibTime(e.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
