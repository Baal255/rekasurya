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
    hint: "Pantau armada 5 kab/kota, triase gangguan, tugaskan Work Order, dan audit.",
  },
  TEKNISI_SKYLIFT: {
    label: "Teknisi Sky-Lift",
    actorName: "Ketua Regu Teknisi Sky-Lift Lapangan",
    hint: "Bawa suku cadang sesuai kode F1–F6, check-in GPS (otorisasi panel), & verifikasi pemulihan.",
  },
  AUDITOR_PJU: {
    label: "Auditor PJU & Pemda",
    actorName: "Auditor Energi & Kepatuhan Pemda Solo Raya",
    hint: "Verifikasi penghematan 2-aliran, PP 4/2023 PBJT-TL, SNI 7391, & rantai hash log.",
  },
};

export const FAULT_FAMILY_LABEL: Record<string, string> = {
  NONE: "Normal",
  F1: "F1 · Panel / Shading",
  F2: "F2 · Baterai SoH/UVLO",
  F3: "F3 · SCC MPPT",
  F4: "F4 · Driver & LED",
  F5: "F5 · Suhu Berlebih",
  F6: "F6 · Sabotase & Pencurian",
};
