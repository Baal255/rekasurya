"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useOperationalRole } from "@/components/AppShell";
import { PageHeader } from "@/components/UiPrimitives";
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
    legacy: "Tanpa isolasi galvanik; rentan ground loop",
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
    docs: "Board dan Opus menyebut 5 NTC + LM75B. Alokasi kanal ADS1115 perlu konfirmasi netlist.",
    resolution: "Demo menampilkan empat NTC dan suhu PCB dari LM75B.",
  },
  {
    item: "Taksonomi Kode Gangguan",
    docs: "Demo memakai F1–F6. Opus mendefinisikan F0–F7, subkode huruf, dan UNKNOWN.",
    resolution: "Pemetaan kode, kelas keyakinan, dan aturan pembuatan tiket menunggu sinkronisasi pilot.",
  },
  {
    item: "Dokumen Lanjutan Claude Opus",
    docs: "Paket Opus v1 tersedia. Baseline mencakup AI-ARCH-v1.0, FW-ARCH-v1.0, dan CONTRACT-v1.0.",
    resolution: "Demo memakai kontrak HTTP AI-CONTRACT-v1.0.0. PoC Python GPT Astra menunggu hasil.",
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
      <PageHeader
        title="Arsitektur Hardware, Kontrak AI v1.0.0 & Audit Hash SHA-256"
        subtitle="Dokumentasi teknis perubahan desain AURORA → REKASURYA, penguji validasi Zod kontrak AI v1.0.0, serta verifikasi keutuhan rantai log operasional."
        actions={
          <a
            href="https://claude.ai/artifact/PnB6S7gqskthgGa2LWEZ8d"
            target="_blank"
            rel="noopener noreferrer"
            className="ops-btn-secondary px-3 py-1.5 text-[12px] font-mono"
          >
            Referensi 3D Kit (Claude Artifact) ↗
          </a>
        }
      />

      {/* Penguji Kontrak AI */}
      <section className="ops-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE3EC] pb-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[#0B192C]">
              Penguji Kontrak AI <code className="font-mono text-[#062D5B]">POST /api/ai/infer</code>{" "}
              (AI-CONTRACT-v{contract?.contractVersion ?? "1.0.0"})
            </h2>
            <p className="text-[12px] text-[#92400E] mt-0.5">
              Penguji ini memeriksa kontrak HTTP demo dengan data sintetis. Kontrak MQTT dan keluaran harian Opus memiliki skema tersendiri.
            </p>
          </div>
          <button
            type="button"
            disabled={testing}
            onClick={runContractTest}
            className="ops-btn-primary px-4 py-1.5 text-[12px] cursor-pointer disabled:opacity-50"
          >
            {testing ? "Menguji..." : "Validasi Zod & Jalankan Inferensi"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#5B6B7F] mb-1">
              Payload Request JSON (Ketat Schema v1.0.0)
            </label>
            <textarea
              rows={13}
              value={jsonEditor}
              onChange={(e) => setJsonEditor(e.target.value)}
              className="ops-input w-full p-2.5 text-[11px] font-mono"
            />
          </div>
          <div>
            <div className="text-[11px] font-mono font-semibold text-[#5B6B7F] mb-1">
              Keluaran Uji Skema HTTP
            </div>
            <pre
              className={`h-[268px] overflow-auto p-2.5 rounded-md border text-[11px] font-mono ${
                testErr
                  ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
                  : "bg-[#F8FAFC] border-[#DCE3EC] text-[#065F46]"
              }`}
            >
              {testErr ||
                testOutput ||
                'Klik "Validasi Zod & Jalankan Inferensi" untuk melihat keluaran kontrak AI...'}
            </pre>
          </div>
        </div>
      </section>

      {/* Evolusi Hardware & Resolusi Konflik */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-7 ops-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE3EC]">
            <h2 className="text-[14px] font-semibold text-[#0B192C]">
              Delta Arsitektur Hardware: AURORA → Board Kendali REKASURYA
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase text-[#5B6B7F]">
                  <th className="py-2.5 px-3">Subsistem</th>
                  <th className="py-2.5 px-3">AURORA / Awal</th>
                  <th className="py-2.5 px-3">REKASURYA Final</th>
                  <th className="py-2.5 px-3">Alasan Rekayasa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {HARDWARE_DELTAS.map((row) => (
                  <tr key={row.subsystem}>
                    <td className="py-2.5 px-3 font-semibold text-[#0B192C]">{row.subsystem}</td>
                    <td className="py-2.5 px-3 text-[#5B6B7F]">{row.legacy}</td>
                    <td className="py-2.5 px-3 font-mono text-[#062D5B]">{row.rekasurya}</td>
                    <td className="py-2.5 px-3 text-[#334155]">{row.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-5 ops-card p-4 space-y-3">
          <h2 className="text-[14px] font-semibold text-[#0B192C]">
            Resolusi Konflik Spesifikasi &amp; Keterbatasan Dokumen
          </h2>
          <div className="space-y-2.5 text-[12px]">
            {SPEC_CONFLICTS.map((c) => (
              <div key={c.item} className="ops-inset p-3 space-y-1">
                <div className="font-semibold text-[#B45309]">{c.item}</div>
                <div className="text-[11px] font-mono text-[#5B6B7F]">{c.docs}</div>
                <div className="text-[#0B192C]">{c.resolution}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Log Invokasi & Audit Hash SHA-256 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <section className="lg:col-span-6 ops-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE3EC]">
            <h2 className="text-[14px] font-semibold text-[#0B192C]">
              Riwayat Invokasi Adaptor ({contract?.recentInvocations.length ?? 0})
            </h2>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[#5B6B7F]">
                  <th className="py-2 px-3">ID / Tiang</th>
                  <th className="py-2 px-3">Mode</th>
                  <th className="py-2 px-3">Sub-Kode</th>
                  <th className="py-2 px-3">EWMA Z</th>
                  <th className="py-2 px-3">Latensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {contract?.recentInvocations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2 px-3">
                      <span className="text-[#0B192C] font-bold">{inv.device_id}</span>
                      <div className="text-[10px] text-[#5B6B7F]">{inv.id}</div>
                    </td>
                    <td className="py-2 px-3 text-[#062D5B]">{inv.adapter_mode}</td>
                    <td className="py-2 px-3">{inv.sub_code}</td>
                    <td className="py-2 px-3 tabular-nums">{inv.ewma_z} W</td>
                    <td className="py-2 px-3 tabular-nums">{inv.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="lg:col-span-6 ops-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[#0B192C]">
                Jejak Audit Terkait Hash SHA-256 (audit_log)
              </h2>
              {audit && (
                <div className="text-[11px] font-mono text-[#5B6B7F]">
                  Rantai:{" "}
                  <span
                    className={
                      audit.integrity.valid
                        ? "text-[#15803D] font-bold"
                        : "text-[#B91C1C] font-bold"
                    }
                  >
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
              className="ops-btn-secondary px-2.5 py-1 text-[11px] font-mono cursor-pointer"
            >
              Verifikasi Ulang
            </button>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[#5B6B7F]">
                  <th className="py-2 px-3">#Seq</th>
                  <th className="py-2 px-3">Peran &amp; Aksi</th>
                  <th className="py-2 px-3">Entitas</th>
                  <th className="py-2 px-3">Hash</th>
                  <th className="py-2 px-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {audit?.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 px-3 text-[#5B6B7F]">#{e.seq}</td>
                    <td className="py-2 px-3">
                      <span className="text-[#062D5B] font-semibold">{e.action}</span>
                      <div className="text-[10px] text-[#5B6B7F]">{e.actor_role}</div>
                    </td>
                    <td className="py-2 px-3">{e.entity_id}</td>
                    <td className="py-2 px-3 text-[#15803D]">{e.entry_hash.slice(0, 10)}...</td>
                    <td className="py-2 px-3 text-[#5B6B7F] whitespace-nowrap">
                      {formatWibTime(e.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
