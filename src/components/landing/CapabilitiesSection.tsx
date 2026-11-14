import React from "react";
import Link from "next/link";
import { FaultFamilyBadge } from "@/components/StatusBadges";
import { formatIdr, formatNum } from "@/lib/format";
import type { EnergyCalcResult } from "@/lib/energy/calculator";
import type { FaultFamily } from "@/lib/types";

interface CapabilitiesSectionProps {
  energySummary: EnergyCalcResult;
}

const FAULT_MATRIX: Array<{
  family: Exclude<FaultFamily, "NONE">;
  subExample: string;
  domainLabel: string;
  sensorTrigger: string;
  recommendedSkus: string;
  sla: string;
}> = [
  {
    family: "F1",
    subExample: "F1_01 / F1_02",
    domainLabel: "Panel Surya & Penyerapan (PV)",
    sensorTrigger: "Residu EWMA Zₜ < LCL lokal saat median tetangga normal; atau PV V/I terputus.",
    recommendedSkus: "MNT-PV-CLN · CON-MC4-PR · CBL-PV-4MM · PV-MONO-300",
    sla: "12–24 jam",
  },
  {
    family: "F2",
    subExample: "F2_01 / F2_02",
    domainLabel: "Baterai LiFePO4 & BMS",
    sensorTrigger: "Degradasi SoH dini, penguncian UVLO <= 22 V, atau terminal baterai terputus.",
    recommendedSkus: "BAT-LFP-256-40 · BMS-8S-30A",
    sla: "4–12 jam",
  },
  {
    family: "F3",
    subExample: "F3_01 / F3_02",
    domainLabel: "Solar Charge Controller MPPT",
    sensorTrigger: "Tegangan PV normal tetapi arus pengisian ke baterai nol / LVD beban memutus.",
    recommendedSkus: "SCC-MPPT-24V",
    sla: "12–24 jam",
  },
  {
    family: "F4",
    subExample: "F4_01 / F4_03",
    domainLabel: "Driver Buck CC-CV & Luminer LED",
    sensorTrigger: "Arus beban 0 A saat malam (PWM > 0), hubung singkat, atau menyala siang hari.",
    recommendedSkus: "DRV-CCCV-300W · LED-DC-40W · PCB-REKA-V2",
    sla: "4–24 jam",
  },
  {
    family: "F5",
    subExample: "F5_01 / F5_02",
    domainLabel: "Keamanan Termal Kotak & Sel",
    sensorTrigger: "Suhu pack LiFePO4 >= 50 °C atau overheat driver/controller memicu derating PWM.",
    recommendedSkus: "ENCL-VENT-IP65 · HSK-PAD-THRM",
    sla: "4–12 jam",
  },
  {
    family: "F6",
    subExample: "F6_01..F6_03",
    domainLabel: "Keamanan Fisik & Anti-Pencurian",
    sensorTrigger: "Sakelar pintu terbuka paksa tanpa check-in 90 m, LIS3DH, sel 18650, atau geofence.",
    recommendedSkus: "SEC-LOCK-DIN · BAT-LFP-256-40 · BRK-CLAMP-ANTI",
    sla: "DARURAT ≤ 4 jam",
  },
];

export function CapabilitiesSection({ energySummary }: CapabilitiesSectionProps) {
  const { stream1Conversion, stream2FleetOAndM, combined, assumptions } = energySummary;

  return (
    <section id="diagnosis" data-nav="light" className="py-14 sm:py-20 bg-[#F4F6F9]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-12">
        {/* Heading Bagian Kemampuan Teknis */}
        <div className="max-w-3xl space-y-2.5">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#B45309]">
            03 · KEMAMPUAN INTI PLATFORM
          </div>
          <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-[#062D5B] leading-tight">
            Tiga lapisan nilai operasional: diagnosis F1–F6, keekonomian dual-stream, dan proteksi
            aset fisik.
          </h2>
        </div>

        {/* Sub-Bagian A: Matriks F1-F6 ke SKU */}
        <div className="ops-card overflow-hidden">
          <div className="px-5 py-4 bg-white border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold text-[#062D5B]">
                Matriks Diagnosis Gangguan F1–F6 ke SKU Suku Cadang Nyata
              </h3>
              <p className="text-[12.5px] text-[#5B6B7F]">
                Setiap sub-kode gangguan dipetakan langsung ke daftar suku cadang di kabin regu
                sky-lift sebelum kendaraan berangkat.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/alerts" className="ops-btn-secondary px-3 py-1.5 text-[12px]">
                Lihat Antrean Alarm
              </Link>
              <Link href="/simulator" className="ops-btn-primary px-3 py-1.5 text-[12px]">
                Uji Injeksi F1–F6
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                  <th className="py-2.5 px-4">Kode</th>
                  <th className="py-2.5 px-4">Kelompok &amp; Domain</th>
                  <th className="py-2.5 px-4">Pemicu Telemetri Sekoridor</th>
                  <th className="py-2.5 px-4">Rekomendasi SKU Kabin</th>
                  <th className="py-2.5 px-4 text-right">Target SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC] text-[12.5px] bg-white">
                {FAULT_MATRIX.map((row) => (
                  <tr key={row.family} className="hover:bg-[#F3F6FA]/70 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <FaultFamilyBadge family={row.family} subCode={row.subExample} />
                    </td>
                    <td className="py-3 px-4 align-top font-semibold text-[#062D5B]">
                      {row.domainLabel}
                    </td>
                    <td className="py-3 px-4 align-top text-[#334155] leading-relaxed">
                      {row.sensorTrigger}
                    </td>
                    <td className="py-3 px-4 align-top font-mono text-[11.5px] text-[#062D5B]">
                      {row.recommendedSkus}
                    </td>
                    <td className="py-3 px-4 align-top text-right font-mono font-semibold text-[#0B192C] whitespace-nowrap">
                      {row.sla}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sub-Bagian B & C: Dua Kolom Berbeda Karakter (Ekonomi Dual-Stream vs Ketahanan Anti-Tamper) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Ekonomi Dual-Stream (7 kolom) */}
          <div className="lg:col-span-7 min-w-0 ops-card p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#B45309]">
                  EKONOMI DUAL-STREAM • ASUMSI PP 4/2023 PBJT-TL
                </span>
                <span className="px-2 py-0.5 rounded bg-[#EDF1F6] text-[11px] font-mono text-[#062D5B]">
                  Tarif P-3 Rp {formatNum(assumptions.plnTariffIdrPerKwh, 2)}/kWh
                </span>
              </div>
              <h3 className="text-[18px] font-semibold text-[#062D5B]">
                Dua arus manfaat terukur: Konversi PJU PLN + Retrofit Diagnosis PJUTS Warisan
              </h3>
              <p className="text-[13px] text-[#334155]">
                Seluruh angka berasal langsung dari modul kalkulator energi pada konsol dengan
                asumsi terbuka yang dapat diubah pengguna (jumlah titik, jenis lampu lama, dan
                biaya trip sky-lift).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F4F6F9] border border-[#DCE3EC] p-4 space-y-1.5">
                <div className="text-[11px] font-mono font-semibold text-[#062D5B]">
                  ARUS 1 · KONVERSI {assumptions.conversionCount} PJU SON-T 250 W
                </div>
                <div className="text-[20px] font-semibold font-mono tabular-nums text-[#062D5B]">
                  {formatIdr(stream1Conversion.totalAnnualNetIdr)}
                  <span className="text-[11.5px] font-normal text-[#5B6B7F]"> /thn neto</span>
                </div>
                <div className="text-[12px] text-[#334155]">
                  Menghindari{" "}
                  <span className="font-mono font-semibold">
                    {formatNum(stream1Conversion.totalAnnualKwhAvoided, 0)} kWh
                  </span>{" "}
                  listrik PLN (~{formatNum(stream1Conversion.totalCo2AvoidedTonPerYear, 1)} ton
                  CO₂/thn) dan menghemat Capex{" "}
                  <span className="font-mono font-semibold text-[#15803D]">
                    {formatIdr(stream1Conversion.capexVsNewPjutsSavingsIdr)}
                  </span>{" "}
                  dibanding pengadaan PJUTS baru ESDM.
                </div>
              </div>

              <div className="rounded-xl bg-[#F4F6F9] border border-[#DCE3EC] p-4 space-y-1.5">
                <div className="text-[11px] font-mono font-semibold text-[#B45309]">
                  ARUS 2 · RETROFIT {assumptions.retrofitOnlyCount} PJUTS SUKOHARJO
                </div>
                <div className="text-[20px] font-semibold font-mono tabular-nums text-[#062D5B]">
                  {formatIdr(stream2FleetOAndM.totalAnnualOAndMSavingsIdr)}
                  <span className="text-[11.5px] font-normal text-[#5B6B7F]"> /thn O&amp;M</span>
                </div>
                <div className="text-[12px] text-[#334155]">
                  Menekan{" "}
                  <span className="font-mono font-semibold">
                    {formatNum(stream2FleetOAndM.annualAvoidedSkyLiftTrips, 0)} trip sky-lift
                  </span>{" "}
                  berulang/thn plus menjaga umur baterai lewat deteksi shading &amp; degradasi dini
                  (estimasi balik modal{" "}
                  <span className="font-mono font-semibold">
                    {formatNum(stream2FleetOAndM.oAndMPaybackYears, 1)} thn
                  </span>
                  ).
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#062D5B] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-[#FFD585] font-mono">
                  TOTAL MANFAAT TAHUNAN GABUNGAN (BASELINE)
                </div>
                <div className="text-[18px] sm:text-[20px] font-mono font-bold tabular-nums">
                  {formatIdr(combined.totalAnnualBenefitIdr)} / tahun
                </div>
              </div>
              <Link
                href="/energy"
                className="ops-btn-amber px-3.5 py-2 text-[12px] whitespace-nowrap"
              >
                Simulasikan Parameter APBD →
              </Link>
            </div>
          </div>

          {/* Ketahanan Anti-Pencurian 3 Lapis & Audit SHA-256 (5 kolom) */}
          <div className="lg:col-span-5 min-w-0 ops-card p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-white">
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#9D174D]">
                KETAHANAN ASET FISIK &amp; AUDIT
              </div>
              <h3 className="text-[18px] font-semibold text-[#062D5B]">
                Tetap melapor saat baterai dicuri &amp; tahan rekayasa log
              </h3>
              <p className="text-[13px] text-[#334155]">
                Ketika kotak baterai dirusak atau kabel utama diputus di malam hari, node konvensional
                langsung mati total. REKASURYA memisahkan daya pengirim darurat menggunakan sel
                cadangan internal.
              </p>
            </div>

            <div className="space-y-2.5 text-[12.5px]">
              <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3">
                <div className="font-semibold text-[#062D5B]">
                  1. Sakelar Pintu + Akselerometer LIS3DH
                </div>
                <div className="text-[#5B6B7F] mt-0.5">
                  Mendeteksi pembukaan penutup IP65 atau guncangan pemotongan baut tanpa jendela
                  maintenance aktif.
                </div>
              </div>
              <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3">
                <div className="font-semibold text-[#062D5B]">
                  2. Sel Cadangan 18650 LiFePO4 + GNSS Geofence 90 m
                </div>
                <div className="text-[#5B6B7F] mt-0.5">
                  Mengirim paket F6 Darurat beserta koordinat pergeseran walau baterai utama 25,6 V
                  lepas ke 0 V.
                </div>
              </div>
              <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3">
                <div className="font-semibold text-[#062D5B]">
                  3. Rantai Hash SHA-256 Berantai (audit_logs)
                </div>
                <div className="text-[#5B6B7F] mt-0.5">
                  Setiap alarm, check-in teknisi, dan verifikasi Work Order diikat berantai agar
                  siap diaudit Inspektorat/BPK.
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#DCE3EC] flex items-center justify-between">
              <span className="text-[11.5px] text-[#5B6B7F]">
                Lihat skematik isolasi ADuM1250 &amp; BOM lengkap
              </span>
              <Link
                href="/architecture"
                className="text-[12.5px] font-semibold text-[#062D5B] hover:underline"
              >
                Arsitektur Hardware →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
