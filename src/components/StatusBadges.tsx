import React from "react";
import type {
  CitizenReportStatus,
  DeviceStatus,
  FaultFamily,
  WorkOrderStatus,
} from "@/lib/types";

export function DeviceStatusBadge({ status }: { status: DeviceStatus | string }) {
  const styles: Record<string, string> = {
    NORMAL: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
    WARNING_EWMA: "bg-amber-950/80 text-amber-300 border-amber-600/70",
    FAULT: "bg-red-950/80 text-red-300 border-red-700/70",
    TAMPER_CRITICAL: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-600/80",
    OFFLINE: "bg-slate-900 text-slate-300 border-slate-700",
  };
  const labels: Record<string, string> = {
    NORMAL: "NORMAL",
    WARNING_EWMA: "PERINGATAN EWMA",
    FAULT: "GANGGUAN AKTIF",
    TAMPER_CRITICAL: "SABOTASE KRITIS",
    OFFLINE: "OFFLINE",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-semibold rounded border tracking-wide ${
        styles[status] ?? styles.OFFLINE
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "NORMAL"
            ? "bg-emerald-400"
            : status === "WARNING_EWMA"
            ? "bg-amber-400"
            : status === "FAULT"
            ? "bg-red-400"
            : status === "TAMPER_CRITICAL"
            ? "bg-fuchsia-400"
            : "bg-slate-400"
        }`}
      />
      {labels[status] ?? status}
    </span>
  );
}

export function FaultFamilyBadge({
  family,
  subCode,
}: {
  family: FaultFamily | string;
  subCode?: string;
}) {
  if (family === "NONE" || !family) {
    return (
      <span className="inline-flex px-2 py-0.5 text-[11px] font-mono rounded border bg-slate-900/70 text-slate-400 border-slate-800">
        OK · Tidak Ada Gangguan
      </span>
    );
  }
  const styles: Record<string, string> = {
    F1: "bg-amber-950/70 text-amber-200 border-amber-700/60",
    F2: "bg-orange-950/70 text-orange-200 border-orange-700/60",
    F3: "bg-red-950/70 text-red-200 border-red-700/60",
    F4: "bg-rose-950/70 text-rose-200 border-rose-700/60",
    F5: "bg-red-950/90 text-red-100 border-red-500/70",
    F6: "bg-fuchsia-950/80 text-fuchsia-200 border-fuchsia-600/80",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium rounded border ${
        styles[family] ?? "bg-slate-900 text-slate-300 border-slate-700"
      }`}
      title={subCode}
    >
      {subCode && subCode !== "OK" ? subCode : family}
    </span>
  );
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus | string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-red-950/70 text-red-200 border-red-700/60",
    ASSIGNED: "bg-sky-950/70 text-sky-200 border-sky-700/60",
    IN_PROGRESS: "bg-amber-950/70 text-amber-200 border-amber-600/70",
    VERIFIED: "bg-emerald-950/70 text-emerald-200 border-emerald-700/60",
    CLOSED: "bg-slate-900 text-slate-400 border-slate-700",
  };
  const labels: Record<string, string> = {
    OPEN: "OPEN · Menunggu Regu",
    ASSIGNED: "ASSIGNED · Regu Siap",
    IN_PROGRESS: "IN_PROGRESS · Check-In",
    VERIFIED: "VERIFIED · Lolos Telemetri",
    CLOSED: "CLOSED · Selesai",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[11px] font-mono font-medium rounded border ${
        styles[status] ?? styles.OPEN
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    DARURAT: "bg-fuchsia-950 text-fuchsia-200 border-fuchsia-500/80",
    TINGGI: "bg-red-950 text-red-200 border-red-600/70",
    SEDANG: "bg-amber-950 text-amber-200 border-amber-600/70",
    RENDAH: "bg-slate-900 text-slate-300 border-slate-700",
  };
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded border tracking-wider ${
        styles[priority] ?? styles.SEDANG
      }`}
    >
      {priority}
    </span>
  );
}

export function SpatialVerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    NORMAL: "bg-slate-900 text-slate-300 border-slate-700",
    CUACA_SERUAS: "bg-sky-950/80 text-sky-200 border-sky-600/70",
    ANOMALI_LOKAL: "bg-amber-950/80 text-amber-200 border-amber-600/70",
  };
  const labels: Record<string, string> = {
    NORMAL: "Korelasi Normal",
    CUACA_SERUAS: "Cuaca Seruas (Bukan Fault)",
    ANOMALI_LOKAL: "Anomali Lokal 1 Tiang",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[11px] font-mono rounded border ${
        styles[verdict] ?? styles.NORMAL
      }`}
    >
      {labels[verdict] ?? verdict}
    </span>
  );
}

export function CitizenStatusBadge({ status }: { status: CitizenReportStatus | string }) {
  const styles: Record<string, string> = {
    Open: "bg-red-950/70 text-red-200 border-red-700/60",
    Responded: "bg-sky-950/70 text-sky-200 border-sky-700/60",
    Process: "bg-amber-950/70 text-amber-200 border-amber-600/70",
    Resolved: "bg-emerald-950/70 text-emerald-200 border-emerald-700/60",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-[11px] font-mono font-medium rounded border ${
        styles[status] ?? styles.Open
      }`}
    >
      {status}
    </span>
  );
}
