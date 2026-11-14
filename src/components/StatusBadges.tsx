import React from "react";
import { FAULT_FAMILY_PLAIN_LABEL } from "@/lib/format";
import type {
  CitizenReportStatus,
  DeviceStatus,
  FaultFamily,
  WorkOrderStatus,
} from "@/lib/types";

export function DeviceStatusBadge({ status }: { status: DeviceStatus | string }) {
  const styles: Record<string, string> = {
    NORMAL: "bg-[#ECFDF5] text-[#14532D] border-[#A7F3D0]",
    WARNING_EWMA: "bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]",
    FAULT: "bg-[#FEF2F2] text-[#991B1B] border-[#FCA5A5]",
    TAMPER_CRITICAL: "bg-[#FDF2F8] text-[#9D174D] border-[#FBCFE8]",
    OFFLINE: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
  };
  const dots: Record<string, string> = {
    NORMAL: "bg-[#15803D]",
    WARNING_EWMA: "bg-[#B45309]",
    FAULT: "bg-[#B91C1C]",
    TAMPER_CRITICAL: "bg-[#9D174D]",
    OFFLINE: "bg-[#64748B]",
  };
  const labels: Record<string, string> = {
    NORMAL: "Normal",
    WARNING_EWMA: "Perlu diperiksa",
    FAULT: "Perlu diperiksa",
    TAMPER_CRITICAL: "Darurat",
    OFFLINE: "Tidak terhubung",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${
        styles[status] ?? styles.OFFLINE
      }`}
      title={status}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dots[status] ?? dots.OFFLINE}`} />
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
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border bg-[#F4F6F9] text-[#5B6B7F] border-[#DCE3EC] whitespace-nowrap">
        Normal
      </span>
    );
  }
  const styles: Record<string, string> = {
    F1: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    F2: "bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]",
    F3: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    F4: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    F5: "bg-[#FEE2E2] text-[#7F1D1D] border-[#FCA5A5]",
    F6: "bg-[#FDF2F8] text-[#9D174D] border-[#FBCFE8]",
  };
  const plain = FAULT_FAMILY_PLAIN_LABEL[family] ?? family;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${
        styles[family] ?? "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]"
      }`}
      title={subCode && subCode !== "OK" ? `${plain} (${subCode})` : plain}
    >
      <span>{plain}</span>
      <span className="font-mono text-[10px] opacity-75">{family}</span>
    </span>
  );
}

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus | string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    ASSIGNED: "bg-[#EBF1F8] text-[#062D5B] border-[#C4D0DE]",
    IN_PROGRESS: "bg-[#FFF8E7] text-[#92400E] border-[#FEB124]",
    VERIFIED: "bg-[#ECFDF5] text-[#14532D] border-[#A7F3D0]",
    CLOSED: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
  };
  const labels: Record<string, string> = {
    OPEN: "Belum Ditangani",
    ASSIGNED: "Teknisi Ditugaskan",
    IN_PROGRESS: "Sedang Dikerjakan",
    VERIFIED: "Terverifikasi Sensor",
    CLOSED: "Selesai",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${
        styles[status] ?? styles.OPEN
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    DARURAT: "bg-[#9D174D] text-white border-[#9D174D]",
    CRITICAL: "bg-[#B91C1C] text-white border-[#B91C1C]",
    TINGGI: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
    HIGH: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
    SEDANG: "bg-[#FFF8E7] text-[#92400E] border-[#FCD34D]",
    MEDIUM: "bg-[#FFF8E7] text-[#92400E] border-[#FCD34D]",
    RENDAH: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
    LOW: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
  };
  const labels: Record<string, string> = {
    DARURAT: "Darurat",
    CRITICAL: "Darurat",
    TINGGI: "Tinggi",
    HIGH: "Tinggi",
    SEDANG: "Sedang",
    MEDIUM: "Sedang",
    RENDAH: "Rendah",
    LOW: "Rendah",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md border whitespace-nowrap ${
        styles[priority] ?? styles.SEDANG
      }`}
    >
      {labels[priority] ?? priority}
    </span>
  );
}

export function SpatialVerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    NORMAL: "bg-[#F8FAFC] text-[#475569] border-[#DCE3EC]",
    CUACA_SERUAS: "bg-[#EBF1F8] text-[#062D5B] border-[#C4D0DE]",
    ANOMALI_LOKAL: "bg-[#FFF8E7] text-[#92400E] border-[#FEB124]",
  };
  const labels: Record<string, string> = {
    NORMAL: "Tiang sekitar normal",
    CUACA_SERUAS: "Mendung sekoridor (Bukan gangguan tiang)",
    ANOMALI_LOKAL: "Gangguan khusus 1 tiang",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${
        styles[verdict] ?? styles.NORMAL
      }`}
    >
      {labels[verdict] ?? verdict}
    </span>
  );
}

export function CitizenStatusBadge({ status }: { status: CitizenReportStatus | string }) {
  const styles: Record<string, string> = {
    Open: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
    Responded: "bg-[#EBF1F8] text-[#062D5B] border-[#C4D0DE]",
    Process: "bg-[#FFF8E7] text-[#92400E] border-[#FEB124]",
    Resolved: "bg-[#ECFDF5] text-[#14532D] border-[#A7F3D0]",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md border whitespace-nowrap ${
        styles[status] ?? styles.Open
      }`}
    >
      {status}
    </span>
  );
}
