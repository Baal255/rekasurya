"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DeviceStatusBadge, FaultFamilyBadge } from "@/components/StatusBadges";
import { formatNum } from "@/lib/format";
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

export function HeroAndConvergence({
  stats,
  sampleDevices,
  corridorCount,
  auditValid,
  aiContractVersion,
}: HeroAndConvergenceProps) {
  const [selectedId, setSelectedId] = useState<string>(sampleDevices[0]?.id ?? "");
  const activeDevice =
    sampleDevices.find((d) => d.id === selectedId) ?? sampleDevices[0] ?? null;

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
        {/* Latar garis teknik halus (tanpa blob atau glow dekoratif) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #FFFFFF 1px, transparent 1px), linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Kolom Kiri — Narasi Operasional Inti */}
            <div className="lg:col-span-7 space-y-6 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#041E3E] border border-[#FEB124]/45 text-[#FFD585] text-[11px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FEB124]" />
                  <span>KIT KONVERSI &amp; RETROFIT PJUTS • SOLO RAYA</span>
                </span>
              </div>

              <h1 className="text-[30px] sm:text-[42px] lg:text-[46px] font-semibold tracking-[-0.025em] leading-[1.12] text-white">
                Satu trip sky-lift yang tepat,{" "}
                <span className="text-[#FFD585]">dari deteksi hingga verifikasi.</span>
              </h1>

              <p className="text-[14.5px] sm:text-[16px] text-white/80 leading-relaxed max-w-2xl">
                Platform pemantauan, diagnosis gangguan F1–F6 berbasis residu EWMA sekoridor, dan
                eksekusi pemeliharaan Penerangan Jalan Umum Tenaga Surya di{" "}
                {corridorCount} koridor Solo Raya. Dirancang untuk memangkas patroli buta, salah
                ganti suku cadang, dan keterlambatan deteksi pencurian baterai.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/console"
                  className="ops-btn-amber px-5 py-2.5 text-[13.5px] inline-flex items-center gap-2 shadow-sm"
                >
                  <span>Buka Konsol Operasional</span>
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
                </Link>

                <Link
                  href="/simulator"
                  className="px-4 py-2.5 rounded-[7px] border border-white/25 bg-[#041E3E]/60 hover:bg-[#093B75] text-white text-[13px] font-medium transition-colors"
                >
                  Uji Simulasi Gangguan F1–F6
                </Link>

                <a
                  href="#konvergensi"
                  className="px-2 py-2 text-[12.5px] font-medium text-[#FFD585] hover:text-white transition-colors"
                >
                  Lihat Cara Kerja ↓
                </a>
              </div>

              {/* Strip Fakta Basis Data Langsung */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/15">
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-white/60 font-medium">
                    Armada Terpantau
                  </div>
                  <div className="text-[19px] font-semibold font-mono tabular-nums text-white mt-0.5">
                    {stats.totalDevices}{" "}
                    <span className="text-[12px] font-normal text-white/65">Tiang</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-white/60 font-medium">
                    Gangguan Aktif
                  </div>
                  <div className="text-[19px] font-semibold font-mono tabular-nums text-[#FFD585] mt-0.5">
                    {stats.activeFaults}{" "}
                    <span className="text-[12px] font-normal text-white/65">Titik</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-white/60 font-medium">
                    Work Order Terbuka
                  </div>
                  <div className="text-[19px] font-semibold font-mono tabular-nums text-white mt-0.5">
                    {stats.openWorkOrders}{" "}
                    <span className="text-[12px] font-normal text-white/65">Tugas</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[#041E3E]/70 border border-white/12 px-3.5 py-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-white/60 font-medium">
                    Integritas Audit
                  </div>
                  <div className="text-[14px] font-semibold font-mono text-[#FFD585] mt-1">
                    {auditValid ? "SHA-256 Utuh" : "Perlu Tinjau"}
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan — Kartu Telemetri 3-Kanal Langsung dari SQLite */}
            <div className="lg:col-span-5 min-w-0">
              <div className="rounded-2xl bg-[#041E3E] border border-white/15 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/12 pb-3">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#FFD585]">
                      INSPEKTOR NODE LANGSUNG (SQLITE)
                    </div>
                    <div className="text-[13px] font-semibold text-white">
                      Pilih tiang untuk membandingkan residu Zₜ sekoridor
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10.5px] font-mono bg-white/10 text-white/80 border border-white/15">
                    AI v{aiContractVersion}
                  </span>
                </div>

                {/* Pemilih Tiang Langsung */}
                <div className="flex flex-wrap gap-1.5">
                  {sampleDevices.map((dev) => {
                    const isSelected = activeDevice?.id === dev.id;
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => setSelectedId(dev.id)}
                        className={`px-2.5 py-1.5 rounded-md text-[11.5px] font-mono transition-colors cursor-pointer border ${
                          isSelected
                            ? "bg-[#FEB124] text-[#041E3E] border-[#E59A10] font-semibold"
                            : "bg-white/5 text-white/80 border-white/15 hover:bg-white/10"
                        }`}
                      >
                        {dev.id}
                      </button>
                    );
                  })}
                </div>

                {activeDevice && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white text-[#0B192C] p-3.5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[14px] text-[#062D5B]">
                              {activeDevice.id}
                            </span>
                            <FaultFamilyBadge
                              family={activeDevice.fault_family}
                              subCode={activeDevice.fault_sub_code}
                            />
                          </div>
                          <div className="text-[12px] text-[#334155] mt-0.5">
                            {activeDevice.pole_label} · {activeDevice.corridor_name}
                          </div>
                        </div>
                        <DeviceStatusBadge status={activeDevice.status} />
                      </div>

                      {/* 3 Kanal Terisolasi */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#DCE3EC] text-[11.5px]">
                        <div className="rounded-lg bg-[#F4F6F9] p-2">
                          <div className="text-[10px] font-semibold text-[#5B6B7F] uppercase">
                            Kanal A • PV
                          </div>
                          <div className="font-mono font-semibold text-[#062D5B] tabular-nums mt-0.5">
                            {formatNum(activeDevice.pv_p, 0)} W
                          </div>
                          <div className="text-[10px] font-mono text-[#5B6B7F]">
                            {formatNum(activeDevice.pv_v, 1)}V / {formatNum(activeDevice.pv_i, 1)}A
                          </div>
                        </div>
                        <div className="rounded-lg bg-[#F4F6F9] p-2">
                          <div className="text-[10px] font-semibold text-[#5B6B7F] uppercase">
                            Kanal B • LFP
                          </div>
                          <div className="font-mono font-semibold text-[#062D5B] tabular-nums mt-0.5">
                            SoC {formatNum(activeDevice.soc_pct, 0)}%
                          </div>
                          <div className="text-[10px] font-mono text-[#5B6B7F]">
                            {formatNum(activeDevice.batt_v, 1)}V • {formatNum(activeDevice.temp_batt_c, 0)}°C
                          </div>
                        </div>
                        <div className="rounded-lg bg-[#F4F6F9] p-2">
                          <div className="text-[10px] font-semibold text-[#5B6B7F] uppercase">
                            Kanal C • LED
                          </div>
                          <div className="font-mono font-semibold text-[#062D5B] tabular-nums mt-0.5">
                            {formatNum(activeDevice.load_p, 0)} W
                          </div>
                          <div className="text-[10px] font-mono text-[#5B6B7F]">
                            PWM {activeDevice.pwm_duty}% · {formatNum(activeDevice.lux, 0)} lux
                          </div>
                        </div>
                      </div>

                      {/* Kesimpulan Spasial EWMA */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F3F6FA] border border-[#DCE3EC] px-3 py-2 text-[11.5px]">
                        <div>
                          <span className="text-[#5B6B7F]">Residu EWMA Zₜ: </span>
                          <span
                            className={`font-mono font-semibold tabular-nums ${
                              activeDevice.ewma_z < activeDevice.ewma_lcl
                                ? "text-[#B91C1C]"
                                : "text-[#062D5B]"
                            }`}
                          >
                            {formatNum(activeDevice.ewma_z, 1)} W
                          </span>
                          <span className="text-[#5B6B7F] font-mono">
                            {" "}
                            (Tetangga {formatNum(activeDevice.neighbor_z_median, 1)} W)
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-[#062D5B]">
                          {activeDevice.spatial_verdict}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-white/75 px-1">
                      <span>Isolasi galvanis: ADuM1250 + B0505S</span>
                      <Link
                        href={`/devices/${activeDevice.id}`}
                        className="font-semibold text-[#FFD585] hover:underline shrink-0"
                      >
                        Buka Detail {activeDevice.id} →
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
          LAPIS 2 — MASALAH NYATA & KONVERGENSI 3 SUMBER KE 1 WORK ORDER
          ================================================================ */}
      <section id="konvergensi" data-nav="light" className="py-14 sm:py-20 bg-[#F4F6F9]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-3xl space-y-2.5">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#B45309]">
              01 · AKAR MASALAH &amp; KONVERGENSI SINYAL
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-[#062D5B] leading-tight">
              Mengakhiri siklus patroli buta, salah bawa komponen, dan baterai hilang tanpa alarm.
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#334155] leading-relaxed">
              Pada armada PJUTS warisan di lapangan, lampu padam diperlakukan sama oleh operator
              maupun warga. Kru sky-lift datang membawa driver LED baru, padahal penyebabnya panel
              tertutup tajuk pohon atau baterai mengalami degradasi SoH. REKASURYA memadukan tiga
              sinyal independen sebelum regu diberangkatkan.
            </p>
          </div>

          {/* Diagram Konvergensi: 3 Sinyal -> Mesin Klasifikasi -> 1 Work Order Presisi */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* 3 Sinyal Masukan */}
            <div className="lg:col-span-5 space-y-3">
              <div className="ops-card p-4 border-l-4 border-l-[#062D5B]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-semibold text-[#062D5B]">
                    SUMBER 1 · TELEMETRI 3-KANAL &amp; TETANGGA
                  </span>
                  <span className="text-[10.5px] font-mono text-[#5B6B7F]">INA228 + NTC</span>
                </div>
                <p className="text-[13px] font-medium text-[#0B192C] mt-1">
                  Membandingkan residu EWMA Zₜ tiap tiang terhadap median tetangga sekoridor.
                </p>
                <p className="text-[12px] text-[#5B6B7F] mt-1">
                  Mendung serentak (Zₜ turun bersama) tidak memicu alarm palsu; bayangan lokal atau
                  panel terputus langsung terisolasi pada 1 tiang.
                </p>
              </div>

              <div className="ops-card p-4 border-l-4 border-l-[#FEB124]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-semibold text-[#B45309]">
                    SUMBER 2 · PROTEKSI ANTI-TAMPER &amp; BACKUP 18650
                  </span>
                  <span className="text-[10.5px] font-mono text-[#5B6B7F]">LIS3DH + GNSS</span>
                </div>
                <p className="text-[13px] font-medium text-[#0B192C] mt-1">
                  Sakelar pintu boks, getaran akselerometer, dan koordinat geofence tetap aktif
                  meski baterai utama dicuri atau kabel diputus.
                </p>
                <p className="text-[12px] text-[#5B6B7F] mt-1">
                  Menekan alarm palsu ketika teknisi melakukan check-in GPS dalam radius 90 meter
                  saat membuka boks pemeliharaan.
                </p>
              </div>

              <div className="ops-card p-4 border-l-4 border-l-[#15803D]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-semibold text-[#15803D]">
                    SUMBER 3 · TRIASE PENGADUAN WARGA
                  </span>
                  <span className="text-[10.5px] font-mono text-[#5B6B7F]">Alur Gaya ULAS</span>
                </div>
                <p className="text-[13px] font-medium text-[#0B192C] mt-1">
                  Laporan warga dipetakan otomatis ke koordinat tiang terdekat (≤150 meter) dan
                  ditautkan ke status sensor terkini.
                </p>
                <p className="text-[12px] text-[#5B6B7F] mt-1">
                  Pelapor menerima linimasa Open → Responded → Process → Resolved berbasis bukti
                  telemetri, bukan sekadar catatan manual.
                </p>
              </div>
            </div>

            {/* Panah & Jantung Keputusan di Tengah */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <div className="rounded-2xl bg-[#062D5B] text-white p-5 space-y-3 shadow-[var(--sh-2)]">
                <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#FFD585]">
                  MESIN KONVERGENSI • KONTRAK v{aiContractVersion}
                </div>
                <h3 className="text-[17px] font-semibold leading-snug">
                  Klasifikasi Deterministik + Fallback Aman
                </h3>
                <ul className="space-y-2 text-[12px] text-white/85">
                  <li className="flex items-start gap-2">
                    <span className="text-[#FEB124] font-mono">01</span>
                    <span>Validasi ketat skema Zod sensor &amp; batas fisik</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FEB124] font-mono">02</span>
                    <span>Uji korelasi spasial sekoridor sebelum naik eskalasi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FEB124] font-mono">03</span>
                    <span>Pemetaan sub-kode gangguan ke daftar SKU suku cadang</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FEB124] font-mono">04</span>
                    <span>Catat keputusan ke rantai hash SHA-256 audit log</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Keluaran Tunggal: Work Order Siap Berangkat */}
            <div className="lg:col-span-4 flex flex-col justify-between ops-card p-5 bg-white">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-[#FFF8E7] border border-[#FEB124]/60 text-[11px] font-mono font-semibold text-[#062D5B]">
                    KELUARAN EKSEKUSI
                  </span>
                  <span className="text-[11px] font-mono text-[#5B6B7F]">1 Kunjungan Tuntas</span>
                </div>

                <h3 className="text-[18px] font-semibold text-[#062D5B]">
                  Work Order Presisi Regu Sky-Lift
                </h3>
                <p className="text-[13px] text-[#334155]">
                  Setiap gangguan terverifikasi melahirkan Work Order terstruktur yang langsung
                  menyebut tiang, dugaan akar masalah, unit kendaraan, SLA, dan komponen yang wajib
                  dibawa ke kabin sky-lift.
                </p>

                <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between text-[#5B6B7F]">
                    <span>Sebelum REKASURYA</span>
                    <span className="font-mono text-[#B91C1C]">Patroli buta &amp; 2–3× kunjungan</span>
                  </div>
                  <div className="border-t border-[#DCE3EC] pt-2 flex items-center justify-between text-[#062D5B] font-semibold">
                    <span>Dengan REKASURYA</span>
                    <span className="font-mono text-[#15803D]">SKU tepat + verifikasi 90 m</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#DCE3EC] flex items-center justify-between">
                <span className="text-[11.5px] text-[#5B6B7F]">
                  {stats.openCitizenReports} aduan warga terbuka dalam basis data demo
                </span>
                <Link
                  href="/work-orders"
                  className="text-[12.5px] font-semibold text-[#062D5B] hover:underline"
                >
                  Lihat Triase →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
