"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DeviceStatusBadge, FaultFamilyBadge } from "@/components/StatusBadges";
import { FAULT_FAMILY_PLAIN_LABEL, formatNum } from "@/lib/format";
import type { DeviceRecord } from "@/lib/types";

interface HeroAndConvergenceProps {
  stats: {
    totalDevices: number;
    normalDevices: number;
    activeFaults: number;
    tamperCritical: number;
    openWorkOrders: number;
    openCitizenReports: number;
    avgUptime30dPct: number;
  };
  sampleDevices: DeviceRecord[];
  corridorCount: number;
  auditValid: boolean;
  aiContractVersion: string;
}

type WorkflowStepKey = "pantau" | "kenali" | "siapkan" | "cek";

const WORKFLOW_STEPS: Array<{
  key: WorkflowStepKey;
  num: string;
  title: string;
  shortDesc: string;
  detailHeading: string;
  detailText: string;
  highlightZone: string;
  operatorGain: string;
}> = [
  {
    key: "pantau",
    num: "1",
    title: "Pantau",
    shortDesc: "Kondisi panel, baterai, dan lampu terpantau terpusat.",
    detailHeading: "Memantau kondisi tiang dan aduan warga dari satu tempat",
    detailText:
      "Setiap tiang melaporkan daya pengisian panel surya, sisa tegangan baterai, nyala lampu LED, serta kondisi pintu kotak baterai. Aduan warga juga langsung dicocokkan ke tiang terdekat.",
    highlightZone: "Data sensor tiang & laporan masuk",
    operatorGain: "Petugas tidak lagi menunggu laporan padam berhari-hari lewat patroli keliling.",
  },
  {
    key: "kenali",
    num: "2",
    title: "Kenali Gangguan",
    shortDesc: "Bedakan cuaca mendung dari kerusakan pada satu tiang.",
    detailHeading: "Membandingkan tiang sekitar agar dugaan penyebab lebih akurat",
    detailText:
      "Sistem membandingkan daya panel dengan tiang sekitar untuk membedakan pengaruh cuaca dari gangguan pada satu tiang. Jika hanya satu tiang yang turun, sistem memberi dugaan awal seperti Panel tertutup pohon atau kotor (F1), Baterai melemah (F2), atau Lampu putus (F4).",
    highlightZone: "Perbandingan tiang sekitar & dugaan gangguan",
    operatorGain: "Menghindari salah tebak antara kerusakan lampu LED, panel kotor, atau baterai lemah.",
  },
  {
    key: "siapkan",
    num: "3",
    title: "Siapkan Teknisi",
    shortDesc: "Lokasi tiang dan daftar suku cadang siap sebelum berangkat.",
    detailHeading: "Tugas teknisi lengkap dengan lokasi dan daftar suku cadang",
    detailText:
      "Dugaan gangguan diteruskan menjadi tugas teknisi yang mencantumkan titik koordinat tiang, dugaan penyebab, serta komponen yang perlu dibawa (misalnya pembersih panel atau baterai pengganti LFP) sebelum regu berangkat.",
    highlightZone: "Lokasi tiang & daftar suku cadang",
    operatorGain: "Sasaran operasional: pemeriksaan dan penanganan ditargetkan tuntas dalam satu kunjungan terarah.",
  },
  {
    key: "cek",
    num: "4",
    title: "Cek Hasil Perbaikan",
    shortDesc: "Pastikan lampu dan pengisian kembali normal sebelum tugas ditutup.",
    detailHeading: "Pemeriksaan ulang pembacaan sensor setelah perbaikan",
    detailText:
      "Setelah teknisi selesai membersihkan panel atau mengganti komponen di lokasi, sistem memeriksa kembali tegangan baterai dan pengisian panel sebelum tugas ditutup dan dicatat di log pemeriksaan.",
    highlightZone: "Verifikasi pembacaan sensor & catatan audit",
    operatorGain: "Memastikan tiang benar-benar pulih sebelum teknisi meninggalkan lokasi.",
  },
];

function getPlainComparisonCopy(device: DeviceRecord): string {
  if (device.spatial_verdict === "CUACA_SERUAS") {
    return "Daya panel turun bersamaan dengan tiang sekitar (pengaruh cuaca mendung, bukan gangguan satu tiang).";
  }
  if (device.spatial_verdict === "ANOMALI_LOKAL") {
    return "Tiang sekitar tetap normal — sistem membandingkan daya panel dengan tiang sekitar dan menandai gangguan khusus pada tiang ini.";
  }
  return "Daya panel sejalan dengan tiang sekitar di koridor yang sama.";
}

function getSuggestedCheckCopy(family: string): string {
  switch (family) {
    case "F1":
      return "Siapkan pembersih panel atau cek dahan pohon yang menghalangi cahaya matahari.";
    case "F2":
      return "Siapkan baterai LiFePO4 25,6 V pengganti dan cek konektor perlindungan baterai.";
    case "F3":
      return "Siapkan pengontrol pengisian surya (SCC MPPT) dan cek sekring jalur panel.";
    case "F4":
      return "Siapkan unit driver lampu LED 40 W dan cek sambungan kabel di lengan tiang.";
    case "F5":
      return "Cek ventilasi kotak baterai dan suhu kerja pengisi surya di dalam boks.";
    case "F6":
      return "Segera cek keamanan tiang di lokasi; baterai cadangan masih aktif mengirim lokasi.";
    default:
      return "Kondisi normal. Tidak perlu penggantian suku cadang saat ini.";
  }
}

export function HeroAndConvergence({
  stats,
  sampleDevices,
  corridorCount,
  auditValid,
}: HeroAndConvergenceProps) {
  const [selectedId, setSelectedId] = useState<string>(sampleDevices[0]?.id ?? "");
  const [activeStepKey, setActiveStepKey] = useState<WorkflowStepKey>("pantau");

  const activeDevice =
    sampleDevices.find((d) => d.id === selectedId) ?? sampleDevices[0] ?? null;
  const activeStep =
    WORKFLOW_STEPS.find((s) => s.key === activeStepKey) ?? WORKFLOW_STEPS[0];

  return (
    <>
      {/* ================================================================
          LAPIS 1 — HERO SLAB NAVY (#062D5B)
          ================================================================ */}
      <section
        id="hero"
        data-nav="dark"
        className="relative bg-[#062D5B] text-white rounded-b-[28px] sm:rounded-b-[40px] slab-shadow grain-subtle overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Kolom Kiri — Narasi Jelas untuk Pengelola & Juri */}
            <div className="lg:col-span-7 space-y-5 min-w-0">
              <p className="text-[13px] font-medium text-[#FFD585]">
                Sistem retrofit lampu jalan tenaga surya &amp; pemantauan gangguan · {corridorCount} koridor contoh Solo Raya
              </p>

              <h1 className="text-[30px] sm:text-[42px] lg:text-[46px] font-semibold tracking-[-0.025em] leading-[1.12] text-white">
                Lampu jalan padam? Cek dugaan penyebabnya sebelum teknisi berangkat.
              </h1>

              <p className="text-[15px] sm:text-[16.5px] text-white/85 leading-relaxed max-w-2xl">
                REKASURYA mengubah lampu jalan yang memakai listrik PLN menjadi lampu tenaga surya
                dengan memanfaatkan tiang yang sudah ada. Sistem ini juga membantu petugas memantau
                lampu jalan tenaga surya yang sudah terpasang, melihat dugaan penyebab gangguan, dan
                menyiapkan suku cadang sebelum berangkat.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <a
                  href="#pratinjau"
                  className="ops-btn-amber px-5 py-3 text-[14px] inline-flex items-center gap-2 shadow-sm"
                >
                  <span>Coba Simulasi Gangguan</span>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>

                <a
                  href="#cara-kerja"
                  className="px-3 py-2.5 text-[14px] font-medium text-[#FFD585] hover:text-white underline underline-offset-4 transition-colors"
                >
                  Lihat Cara Kerja
                </a>
              </div>

              <p className="text-[13.5px] text-white/75 leading-relaxed max-w-2xl bg-[#041E3E]/65 border border-white/12 rounded-xl px-4 py-3">
                Contoh nyata di lapangan: saat lampu padam, teknisi bisa terlanjur membawa pengganti
                lampu LED padahal masalah sebenarnya adalah panel surya tertutup rimbun pohon atau
                baterai yang mulai melemah.
              </p>

              {/* Ringkasan Angka Simulasi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/15">
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[11.5px] text-white/70 font-medium">
                    Tiang simulasi
                  </div>
                  <div className="text-[19px] font-semibold font-mono tabular-nums text-white mt-0.5">
                    {stats.totalDevices}{" "}
                    <span className="text-[12px] font-sans font-normal text-white/70">tiang</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[11.5px] text-white/70 font-medium">
                    Perlu diperiksa
                  </div>
                  <div className="text-[19px] font-semibold font-mono tabular-nums text-[#FFD585] mt-0.5">
                    {stats.activeFaults}{" "}
                    <span className="text-[12px] font-sans font-normal text-white/70">titik</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[11.5px] text-white/70 font-medium">
                    Tugas teknisi terbuka
                  </div>
                  <div className="text-[19px] font-semibold font-mono tabular-nums text-white mt-0.5">
                    {stats.openWorkOrders}{" "}
                    <span className="text-[12px] font-sans font-normal text-white/70">tugas</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[11.5px] text-white/70 font-medium">
                    Catatan pemeriksaan
                  </div>
                  <div className="text-[13.5px] font-semibold text-[#FFD585] mt-1">
                    {auditValid ? "Terverifikasi" : "Perlu tinjau"}
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan — Contoh Inspeksi Kondisi Tiang (Bahasa Petugas) */}
            <div className="lg:col-span-5 min-w-0">
              <div className="rounded-2xl bg-[#041E3E] border border-white/15 p-4 sm:p-5 space-y-4">
                <div className="border-b border-white/12 pb-3">
                  <div className="text-[14px] font-semibold text-white">
                    Contoh Kondisi Tiang Sebelum Teknisi Berangkat
                  </div>
                  <div className="text-[12px] text-white/70 mt-0.5">
                    Data simulasi · Pilih kode tiang untuk melihat dugaan gangguan &amp; suku cadang
                  </div>
                </div>

                {/* Pemilih Tiang */}
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilih contoh tiang">
                  {sampleDevices.map((dev) => {
                    const isSelected = activeDevice?.id === dev.id;
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(dev.id)}
                        className={`px-2.5 py-1.5 rounded-md text-[12px] font-mono transition-colors cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FEB124] ${
                          isSelected
                            ? "bg-[#FEB124] text-[#041E3E] border-[#E59A10] font-semibold"
                            : "bg-white/5 text-white/85 border-white/15 hover:bg-white/10"
                        }`}
                      >
                        {dev.id}
                      </button>
                    );
                  })}
                </div>

                {activeDevice && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white text-[#0B192C] p-3.5 sm:p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-[14px] text-[#062D5B]">
                              {activeDevice.id}
                            </span>
                            <DeviceStatusBadge status={activeDevice.status} />
                          </div>
                          <div className="text-[12px] text-[#334155] mt-1">
                            {activeDevice.pole_label} · {activeDevice.corridor_name}
                          </div>
                        </div>
                      </div>

                      {/* Dugaan Penyebab Utama (Bahasa Jelas Terlebih Dulu) */}
                      <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-[#5B6B7F]">
                            Dugaan kondisi tiang
                          </span>
                          <FaultFamilyBadge
                            family={activeDevice.fault_family}
                            subCode={activeDevice.fault_sub_code}
                          />
                        </div>
                        <div className="text-[13.5px] font-semibold text-[#062D5B]">
                          {FAULT_FAMILY_PLAIN_LABEL[activeDevice.fault_family] ?? activeDevice.fault_family}
                        </div>
                        <p className="text-[12px] text-[#334155]">
                          {getSuggestedCheckCopy(activeDevice.fault_family)}
                        </p>
                      </div>

                      {/* Pengukuran Utama 3 Bagian */}
                      <div className="grid grid-cols-3 gap-2 text-[11.5px]">
                        <div className="rounded-lg bg-[#F4F6F9] p-2">
                          <div className="text-[11px] font-medium text-[#5B6B7F]">
                            Panel surya
                          </div>
                          <div className="font-mono font-semibold text-[#062D5B] tabular-nums mt-0.5">
                            {formatNum(activeDevice.pv_p, 0)} W
                          </div>
                          <div className="text-[10.5px] font-mono text-[#5B6B7F]">
                            {formatNum(activeDevice.pv_v, 1)} V
                          </div>
                        </div>
                        <div className="rounded-lg bg-[#F4F6F9] p-2">
                          <div className="text-[11px] font-medium text-[#5B6B7F]">
                            Baterai
                          </div>
                          <div className="font-mono font-semibold text-[#062D5B] tabular-nums mt-0.5">
                            Sisa {formatNum(activeDevice.soc_pct, 0)}%
                          </div>
                          <div className="text-[10.5px] font-mono text-[#5B6B7F]">
                            {formatNum(activeDevice.batt_v, 1)} V · {formatNum(activeDevice.temp_batt_c, 0)}°C
                          </div>
                        </div>
                        <div className="rounded-lg bg-[#F4F6F9] p-2">
                          <div className="text-[11px] font-medium text-[#5B6B7F]">
                            Lampu LED
                          </div>
                          <div className="font-mono font-semibold text-[#062D5B] tabular-nums mt-0.5">
                            {formatNum(activeDevice.load_p, 0)} W
                          </div>
                          <div className="text-[10.5px] font-mono text-[#5B6B7F]">
                            Redup {activeDevice.pwm_duty}%
                          </div>
                        </div>
                      </div>

                      {/* Perbandingan dengan Tiang Sekitar */}
                      <div className="rounded-lg bg-[#F3F6FA] border border-[#DCE3EC] px-3 py-2 text-[11.5px] text-[#334155]">
                        {getPlainComparisonCopy(activeDevice)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/75 px-1">
                      <span>Detail teknis tersedia di halaman perangkat</span>
                      <Link
                        href={`/devices/${activeDevice.id}`}
                        className="font-semibold text-[#FFD585] hover:underline shrink-0"
                      >
                        Lihat detail {activeDevice.id} →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          LAPIS 2 — CARA KERJA INTERAKTIF 4 LANGKAH
          ================================================================ */}
      <section id="cara-kerja" data-nav="light" className="py-14 sm:py-20 bg-[#F4F6F9]">
        <span id="konvergensi" className="sr-only" aria-hidden="true" />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="max-w-3xl space-y-2.5">
            <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-[#062D5B] leading-tight">
              Cara Kerja: dari laporan atau sensor hingga pemeriksaan tuntas
            </h2>
            <p className="text-[14.5px] sm:text-[15.5px] text-[#334155] leading-relaxed">
              Ketika lampu jalan padam, regu sering datang membawa lampu LED pengganti padahal
              masalahnya ada di panel yang tertutup pohon atau baterai yang lemah. Pilih salah satu
              tahapan di bawah untuk melihat bagaimana REKASURYA membantu petugas menyiapkan
              penanganan sebelum berangkat.
            </p>
          </div>

          {/* 4 Langkah Interaktif (Vertikal di Mobile, 4 Kolom di Desktop) */}
          <div
            className="flex flex-col md:grid md:grid-cols-4 gap-3"
            role="group"
            aria-label="Tahapan Cara Kerja REKASURYA"
          >
            {WORKFLOW_STEPS.map((step, idx) => {
              const isSelected = step.key === activeStep.key;
              return (
                <button
                  key={step.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActiveStepKey(step.key)}
                  className={`text-left rounded-xl p-4 border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FEB124] ${
                    isSelected
                      ? "bg-[#062D5B] text-white border-[#062D5B] shadow-[var(--sh-2)]"
                      : "bg-white text-[#0B192C] border-[#DCE3EC] hover:border-[#062D5B]/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[12px] font-semibold ${
                        isSelected ? "text-[#FFD585]" : "text-[#5B6B7F]"
                      }`}
                    >
                      Langkah {step.num}
                    </span>
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`hidden md:inline text-[13px] ${
                          isSelected ? "text-[#FEB124]" : "text-[#94A3B8]"
                        }`}
                      >
                        →
                      </span>
                    )}
                  </div>
                  <div className="text-[16px] font-semibold mt-1">{step.title}</div>
                  <p
                    className={`text-[12.5px] mt-1 leading-relaxed ${
                      isSelected ? "text-white/85" : "text-[#334155]"
                    }`}
                  >
                    {step.shortDesc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Panel Penjelasan & Sorotan Contoh Dashboard (Tinggi stabil agar tidak melompat) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 ops-card p-5 sm:p-6 bg-white flex flex-col justify-between min-h-[260px]">
              <div key={activeStep.key} className="space-y-3 animate-motion-in">
                <div className="text-[12px] font-semibold text-[#B45309]">
                  Tahap terpilih: {activeStep.num}. {activeStep.title}
                </div>
                <h3 className="text-[19px] font-semibold text-[#062D5B] leading-snug">
                  {activeStep.detailHeading}
                </h3>
                <p className="text-[13.5px] text-[#334155] leading-relaxed">
                  {activeStep.detailText}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#DCE3EC] text-[12.5px] text-[#062D5B] font-medium">
                {activeStep.operatorGain}
              </div>
            </div>

            {/* Ilustrasi Contoh Dashboard dengan Area Sorotan Dinamis */}
            <div className="lg:col-span-7 ops-card p-5 sm:p-6 bg-white min-h-[260px] flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DCE3EC]">
                <div>
                  <div className="text-[13px] font-semibold text-[#062D5B]">
                    Bagian yang disorot pada contoh kasus tiang SKH-107
                  </div>
                  <div className="text-[11.5px] text-[#5B6B7F]">
                    Menampilkan: {activeStep.highlightZone}
                  </div>
                </div>
                <span className="text-[11.5px] text-[#5B6B7F]">
                  Data simulasi contoh
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
                <div
                  className={`rounded-lg border p-3 transition-all duration-300 ${
                    activeStep.key === "pantau"
                      ? "bg-[#FFF8E7] border-[#FEB124] ring-2 ring-[#FEB124]/50 shadow-sm"
                      : "bg-[#F8FAFC] border-[#DCE3EC] opacity-75"
                  }`}
                >
                  <div className="text-[11.5px] font-semibold text-[#062D5B]">
                    1. Pembacaan Sensor &amp; Aduan
                  </div>
                  <div className="text-[12.5px] text-[#334155] mt-1">
                    Tegangan baterai turun menjadi 21,9 V · Laporan warga masuk 45 m dari tiang.
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-3 transition-all duration-300 ${
                    activeStep.key === "kenali"
                      ? "bg-[#FFF8E7] border-[#FEB124] ring-2 ring-[#FEB124]/50 shadow-sm"
                      : "bg-[#F8FAFC] border-[#DCE3EC] opacity-75"
                  }`}
                >
                  <div className="text-[11.5px] font-semibold text-[#062D5B]">
                    2. Perbandingan &amp; Dugaan Gangguan
                  </div>
                  <div className="text-[12.5px] text-[#334155] mt-1">
                    Tiang sekitar normal; dugaan gangguan: <strong>Baterai melemah</strong> (F2).
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-3 transition-all duration-300 ${
                    activeStep.key === "siapkan"
                      ? "bg-[#FFF8E7] border-[#FEB124] ring-2 ring-[#FEB124]/50 shadow-sm"
                      : "bg-[#F8FAFC] border-[#DCE3EC] opacity-75"
                  }`}
                >
                  <div className="text-[11.5px] font-semibold text-[#062D5B]">
                    3. Lokasi &amp; Daftar Suku Cadang
                  </div>
                  <div className="text-[12.5px] text-[#334155] mt-1">
                    Jl. Slamet Riyadi Sukoharjo · Bawa baterai LFP 25,6 V 40 Ah dan konektor BMS.
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-3 transition-all duration-300 ${
                    activeStep.key === "cek"
                      ? "bg-[#FFF8E7] border-[#FEB124] ring-2 ring-[#FEB124]/50 shadow-sm"
                      : "bg-[#F8FAFC] border-[#DCE3EC] opacity-75"
                  }`}
                >
                  <div className="text-[11.5px] font-semibold text-[#062D5B]">
                    4. Cek Sensor Setelah Selesai
                  </div>
                  <div className="text-[12.5px] text-[#334155] mt-1">
                    Status tiang kembali Normal (26,4 V) sebelum tugas teknisi dan aduan ditutup.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#5B6B7F] pt-2 border-t border-[#DCE3EC]">
                <span>
                  {stats.openCitizenReports} aduan warga terbuka di basis data contoh
                </span>
                <Link
                  href="/work-orders"
                  className="font-semibold text-[#062D5B] hover:underline"
                >
                  Lihat tugas teknisi &amp; daftar suku cadang →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
