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
  plainTitle: string;
  sensorTrigger: string;
  recommendedSkus: string;
  sla: string;
}> = [
  {
    family: "F1",
    subExample: "F1_01 / F1_02",
    plainTitle: "Panel tertutup pohon atau kotor",
    sensorTrigger:
      "Daya panel turun di bawah tiang sekitar saat cuaca cerah (residu EWMA lokal Zₜ < LCL) atau kabel panel terputus.",
    recommendedSkus: "Pembersih panel (MNT-PV-CLN) · Konektor MC4 · Kabel PV 4 mm",
    sla: "12–24 jam",
  },
  {
    family: "F2",
    subExample: "F2_01 / F2_02",
    plainTitle: "Baterai melemah atau rusak",
    sensorTrigger:
      "Kesehatan baterai (SoH) menurun cepat, tegangan turun di bawah batas 22 V, atau terminal baterai terlepas.",
    recommendedSkus: "Baterai LiFePO4 25,6 V 40 Ah (BAT-LFP-256-40) · BMS 8S 30A",
    sla: "4–12 jam",
  },
  {
    family: "F3",
    subExample: "F3_01 / F3_02",
    plainTitle: "Pengisi surya (SCC) bermasalah",
    sensorTrigger:
      "Tegangan panel surya normal tetapi arus pengisian ke baterai nol atau jalur beban terputus.",
    recommendedSkus: "Modul pengisi surya MPPT 24V (SCC-MPPT-24V)",
    sla: "12–24 jam",
  },
  {
    family: "F4",
    subExample: "F4_01 / F4_03",
    plainTitle: "Lampu atau driver LED putus",
    sensorTrigger:
      "Perintah nyala malam aktif tetapi arus lampu 0 A, terjadi korsleting, atau lampu menyala di siang hari.",
    recommendedSkus: "Driver LED 40 W (DRV-CCCV-300W) · Lampu LED DC 40 W",
    sla: "4–24 jam",
  },
  {
    family: "F5",
    subExample: "F5_01 / F5_02",
    plainTitle: "Suhu kotak baterai atau driver berlebih",
    sensorTrigger:
      "Suhu sel baterai ≥ 50 °C atau driver terlalu panas sehingga daya lampu otomatis diturunkan untuk pengamanan.",
    recommendedSkus: "Ventilasi boks IP65 (ENCL-VENT-IP65) · Bantalan termal",
    sla: "4–12 jam",
  },
  {
    family: "F6",
    subExample: "F6_01..F6_03",
    plainTitle: "Kotak baterai dibuka paksa atau dipindah",
    sensorTrigger:
      "Pintu boks terbuka atau sensor getar aktif di luar jadwal check-in teknisi (radius 90 m), didukung sel cadangan 18650.",
    recommendedSkus: "Kunci pengaman boks (SEC-LOCK-DIN) · Klem anti-congkel",
    sla: "Darurat ≤ 4 jam",
  },
];

export function CapabilitiesSection({ energySummary }: CapabilitiesSectionProps) {
  const { stream1Conversion, stream2FleetOAndM, combined, assumptions } = energySummary;

  return (
    <section id="diagnosis" data-nav="light" className="py-14 sm:py-20 bg-[#F4F6F9]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-12">
        {/* Heading Bagian Jenis Gangguan & Penghematan */}
        <div className="max-w-3xl space-y-2.5">
          <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-[#062D5B] leading-tight">
            Dugaan gangguan yang jelas, estimasi penghematan terbuka, dan perlindungan kotak baterai
          </h2>
          <p className="text-[14.5px] text-[#334155] leading-relaxed">
            Petugas lapangan melihat dugaan penyebab dalam bahasa sehari-hari, sementara pengelola
            teknis dan auditor tetap dapat memeriksa kode gangguan F1–F6, perbandingan tiang
            sekoridor, serta asumsi perhitungan penghematan.
          </p>
        </div>

        {/* Sub-Bagian A: Daftar Jenis Gangguan & Suku Cadang */}
        <div className="ops-card overflow-hidden">
          <div className="px-5 py-4 bg-white border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-semibold text-[#062D5B]">
                Daftar dugaan gangguan &amp; suku cadang yang disiapkan
              </h3>
              <p className="text-[12.5px] text-[#5B6B7F]">
                Sasaran operasional: membantu teknisi membawa komponen yang sesuai sebelum
                berangkat ke tiang (kode F1–F6 tersedia untuk rincian teknis).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/alerts" className="ops-btn-secondary px-3 py-1.5 text-[12.5px]">
                Lihat Daftar Gangguan
              </Link>
              <Link href="/simulator" className="ops-btn-primary px-3 py-1.5 text-[12.5px]">
                Coba skenario gangguan
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[12px] font-semibold text-[#5B6B7F]">
                  <th className="py-2.5 px-4">Dugaan gangguan</th>
                  <th className="py-2.5 px-4">Tanda dari sensor &amp; tiang sekitar</th>
                  <th className="py-2.5 px-4">Suku cadang yang perlu dicek/dibawa</th>
                  <th className="py-2.5 px-4 text-right">Target penanganan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC] text-[12.5px] bg-white">
                {FAULT_MATRIX.map((row) => (
                  <tr key={row.family} className="hover:bg-[#F3F6FA]/70 transition-colors">
                    <td className="py-3 px-4 align-top space-y-1">
                      <div className="font-semibold text-[#062D5B]">{row.plainTitle}</div>
                      <FaultFamilyBadge family={row.family} subCode={row.subExample} />
                    </td>
                    <td className="py-3 px-4 align-top text-[#334155] leading-relaxed">
                      {row.sensorTrigger}
                    </td>
                    <td className="py-3 px-4 align-top text-[12px] text-[#062D5B]">
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

        {/* Sub-Bagian B & C: Penghematan Listrik & Biaya Perawatan vs Ketahanan Perangkat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Penghematan Listrik & Biaya Perawatan (7 kolom) */}
          <div className="lg:col-span-7 min-w-0 ops-card p-5 sm:p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#5B6B7F]">
                <span className="font-medium text-[#B45309]">
                  Estimasi penghematan listrik dan biaya perawatan
                </span>
                <span>Tarif asumsi P-3 Rp {formatNum(assumptions.plnTariffIdrPerKwh, 2)}/kWh</span>
              </div>
              <h3 className="text-[18px] font-semibold text-[#062D5B]">
                Penghematan listrik dan biaya perawatan dari konversi &amp; pemeliharaan terarah
              </h3>
              <p className="text-[13px] text-[#334155]">
                Angka di bawah ini adalah <strong>estimasi penghematan</strong> berdasarkan model
                kalkulator dengan asumsi terbuka yang dapat Anda ubah (jumlah tiang, jenis lampu
                lama, tarif listrik, dan biaya kunjungan teknisi).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F4F6F9] border border-[#DCE3EC] p-4 space-y-1.5">
                <div className="text-[12px] font-semibold text-[#062D5B]">
                  1. Penghematan listrik (konversi {assumptions.conversionCount} tiang SON-T 250 W)
                </div>
                <div className="text-[20px] font-semibold font-mono tabular-nums text-[#062D5B]">
                  {formatIdr(stream1Conversion.totalAnnualNetIdr)}
                  <span className="text-[11.5px] font-sans font-normal text-[#5B6B7F]"> /tahun (estimasi)</span>
                </div>
                <div className="text-[12px] text-[#334155]">
                  Estimasi mengurangi{" "}
                  <span className="font-mono font-semibold">
                    {formatNum(stream1Conversion.totalAnnualKwhAvoided, 0)} kWh
                  </span>{" "}
                  listrik PLN (~{formatNum(stream1Conversion.totalCo2AvoidedTonPerYear, 1)} ton
                  CO₂/tahun) serta memanfaatkan tiang yang sudah ada dengan selisih belanja{" "}
                  <span className="font-mono font-semibold text-[#15803D]">
                    {formatIdr(stream1Conversion.capexVsNewPjutsSavingsIdr)}
                  </span>
                  .
                </div>
              </div>

              <div className="rounded-xl bg-[#F4F6F9] border border-[#DCE3EC] p-4 space-y-1.5">
                <div className="text-[12px] font-semibold text-[#B45309]">
                  2. Penghematan biaya perawatan ({assumptions.retrofitOnlyCount} tiang tenaga surya)
                </div>
                <div className="text-[20px] font-semibold font-mono tabular-nums text-[#062D5B]">
                  {formatIdr(stream2FleetOAndM.totalAnnualOAndMSavingsIdr)}
                  <span className="text-[11.5px] font-sans font-normal text-[#5B6B7F]"> /tahun (estimasi)</span>
                </div>
                <div className="text-[12px] text-[#334155]">
                  Sasaran pengurangan{" "}
                  <span className="font-mono font-semibold">
                    {formatNum(stream2FleetOAndM.annualAvoidedSkyLiftTrips, 0)} kunjungan ulang/tahun
                  </span>{" "}
                  dan perlindungan umur baterai lewat deteksi gangguan dini (perkiraan balik modal{" "}
                  <span className="font-mono font-semibold">
                    {formatNum(stream2FleetOAndM.oAndMPaybackYears, 1)} tahun
                  </span>
                  ).
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#062D5B] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11.5px] text-[#FFD585]">
                  Total estimasi penghematan tahunan (skenario dasar)
                </div>
                <div className="text-[18px] sm:text-[20px] font-mono font-bold tabular-nums">
                  {formatIdr(combined.totalAnnualBenefitIdr)} / tahun
                </div>
              </div>
              <Link
                href="/energy"
                className="ops-btn-amber px-3.5 py-2 text-[12.5px] whitespace-nowrap"
              >
                Ubah Asumsi di Kalkulator →
              </Link>
            </div>
          </div>

          {/* Ketahanan Kotak Baterai & Catatan Pemeriksaan (5 kolom) */}
          <div className="lg:col-span-5 min-w-0 ops-card p-5 sm:p-6 flex flex-col justify-between space-y-5 bg-white">
            <div className="space-y-2">
              <div className="text-[12px] font-medium text-[#9D174D]">
                Perlindungan kotak baterai &amp; riwayat pemeriksaan
              </div>
              <h3 className="text-[18px] font-semibold text-[#062D5B]">
                Tetap mengirim peringatan saat kabel utama diputus
              </h3>
              <p className="text-[13px] text-[#334155]">
                Ketika kotak baterai dibuka paksa atau kabel utama dicabut di malam hari, perangkat
                konvensional langsung padam tanpa kabar. Rancangan REKASURYA memisahkan catu daya
                darurat untuk tetap mengirim peringatan.
              </p>
            </div>

            <div className="space-y-2.5 text-[12.5px]">
              <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3">
                <div className="font-semibold text-[#062D5B]">
                  1. Sensor pintu kotak &amp; getaran (LIS3DH)
                </div>
                <div className="text-[#5B6B7F] mt-0.5">
                  Memicu status Darurat apabila kotak dibuka tanpa check-in petugas resmi di radius
                  90 meter.
                </div>
              </div>
              <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3">
                <div className="font-semibold text-[#062D5B]">
                  2. Baterai cadangan 18650 &amp; penanda lokasi GNSS
                </div>
                <div className="text-[#5B6B7F] mt-0.5">
                  Tetap mengirim peringatan Darurat (F6) dan posisi tiang meski baterai utama 25,6 V
                  dilepas.
                </div>
              </div>
              <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3">
                <div className="font-semibold text-[#062D5B]">
                  3. Catatan pemeriksaan berantai SHA-256 (diuji di SQLite)
                </div>
                <div className="text-[#5B6B7F] mt-0.5">
                  Setiap alarm, check-in teknisi, dan penutupan tugas tercatat berantai sehingga
                  perubahan data tidak mudah dimanipulasi diam-diam.
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#DCE3EC] flex items-center justify-between text-[12px]">
              <span className="text-[#5B6B7F]">
                Detail rangkaian &amp; daftar komponen untuk tim teknis
              </span>
              <Link
                href="/architecture"
                className="font-semibold text-[#062D5B] hover:underline shrink-0"
              >
                Rincian Teknis →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
