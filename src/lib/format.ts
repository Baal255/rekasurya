import type { OperationalRole } from "./types";

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNum(val: number, digits = 1): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(val);
}

export function formatWibTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d) + " WIB"
  );
}

export function formatShortHourWib(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export const ROLE_META: Record<
  OperationalRole,
  { label: string; actorName: string; hint: string }
> = {
  OPERATOR_DISHUB: {
    label: "Operator Dishub",
    actorName: "Operator Ruang Kendali Dishub Solo Raya",
    hint: "Pantau seluruh tiang di 5 kab/kota, pilih gangguan paling mendesak, dan tugaskan teknisi.",
  },
  TEKNISI_SKYLIFT: {
    label: "Teknisi Lapangan",
    actorName: "Ketua Regu Teknisi Lapangan",
    hint: "Bawa suku cadang sesuai dugaan gangguan, check-in di lokasi tiang, dan cek hasil perbaikan.",
  },
  AUDITOR_PJU: {
    label: "Auditor PJU & Pemda",
    actorName: "Auditor Energi & Kepatuhan Pemda Solo Raya",
    hint: "Periksa estimasi penghematan listrik & perawatan serta rantai log pemeriksaan.",
  },
};

export const FAULT_FAMILY_PLAIN_LABEL: Record<string, string> = {
  NONE: "Normal",
  F1: "Panel tertutup atau kotor",
  F2: "Baterai melemah",
  F3: "Pengisi surya (SCC) bermasalah",
  F4: "Lampu atau driver LED putus",
  F5: "Suhu berlebih",
  F6: "Kotak baterai dibuka paksa",
};

export const FAULT_FAMILY_LABEL: Record<string, string> = {
  NONE: "Normal",
  F1: "Panel tertutup atau kotor (F1)",
  F2: "Baterai melemah (F2)",
  F3: "Pengisi surya / SCC (F3)",
  F4: "Lampu atau driver LED (F4)",
  F5: "Suhu berlebih (F5)",
  F6: "Kotak dibuka paksa (F6)",
};
