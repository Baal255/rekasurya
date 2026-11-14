import React from "react";
import Link from "next/link";
import { RekasuryaLogo } from "@/components/RekasuryaLogo";

interface PrinciplesAndClosingProps {
  totalDevices: number;
  activeFaults: number;
  openWorkOrders: number;
  aiAdapterMode: string;
  aiContractVersion: string;
  auditValid: boolean;
  auditRowCount: number;
}

const ENGINEERING_PRINCIPLES = [
  {
    code: "PR-01",
    title: "Fail-Safe Hardware Didahulukan",
    desc: "Sakelar MOSFET dan logika dasar beban lampu tetap beroperasi menjaga penerangan jalan meskipun mikrokontroler IoT atau tautan seluler terputus.",
  },
  {
    code: "PR-02",
    title: "Isolasi Galvanis Tiga Kanal",
    desc: "Isolator digital ADuM1250 dan konverter B0505S memisahkan bus komunikasi dari transien tegangan tinggi panel surya serta driver LED.",
  },
  {
    code: "PR-03",
    title: "Korelasi Tetangga Menekan Alarm Palsu",
    desc: "Penurunan daya pada sore mendung dikenali lewat perbandingan EWMA terhadap median tiang tetangga sekoridor sebelum menjadi Work Order.",
  },
  {
    code: "PR-04",
    title: "Otorisasi Geofence 90 m Regu Lapangan",
    desc: "Teknisi yang check-in di lokasi mengaktifkan izin pemeliharaan sementara agar pembukaan boks tidak memicu sirine pencurian F6 palsu.",
  },
  {
    code: "PR-05",
    title: "Kontrak AI v1.0.0 dengan Fallback Deterministik",
    desc: "Skema masukan/keluaran divalidasi Zod secara ketat; saat layanan inferensi eksternal tidak tersedia, sistem otomatis memakai baseline EWMA lokal.",
  },
];

const MODULE_DOORS = [
  {
    href: "/console",
    tag: "RUANG KENDALI",
    title: "Konsol Armada Live",
    desc: "Pantau seluruh tiang pada 5 kabupaten/kota Solo Raya, klik peta koridor, dan tinjau Work Order serta status audit dalam satu layar.",
    cta: "Masuk /console",
    accent: "navy" as const,
  },
  {
    href: "/simulator",
    tag: "UJI SISTEM",
    title: "Simulator Gangguan F1–F6",
    desc: "Suntikkan skenario shading, baterai putus, pencurian sel 18650, hingga pemulihan atau reset data demo secara terkendali.",
    cta: "Buka Simulator",
    accent: "amber" as const,
  },
  {
    href: "/work-orders",
    tag: "EKSEKUSI & ADUAN",
    title: "Work Order & Triase Warga",
    desc: "Simulasikan alur check-in GPS 90 m regu sky-lift serta tautan aduan gaya ULAS Surakarta ke perangkat terkait.",
    cta: "Buka Triase",
    accent: "light" as const,
  },
  {
    href: "/energy",
    tag: "PERENCANAAN APBD",
    title: "Kalkulator Energi & PBJT-TL",
    desc: "Hitung penghematan kWh PLN, penghindaran Capex vs PJUTS baru, dan payback O&M armada retrofit sesuai profil koridor daerah.",
    cta: "Hitung Dampak",
    accent: "light" as const,
  },
];

export function PrinciplesAndClosing({
  totalDevices,
  activeFaults,
  openWorkOrders,
  aiAdapterMode,
  aiContractVersion,
  auditValid,
  auditRowCount,
}: PrinciplesAndClosingProps) {
  return (
    <>
      {/* ================================================================
          LAPIS 4 — PRINSIP REKAYASA & KEJURAN BATASAN SISTEM (NAVY SLAB)
          ================================================================ */}
      <section id="prinsip" data-nav="dark" className="py-6 sm:py-10 bg-[#F4F6F9]">
        <div className="max-w-[1360px] mx-auto px-2 sm:px-4">
          <div className="rounded-[28px] sm:rounded-[38px] bg-[#062D5B] text-white slab-shadow grain-subtle px-5 sm:px-10 py-12 sm:py-16 space-y-10">
            <div className="max-w-3xl space-y-2.5">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#FFD585]">
                04 · PRINSIP REKAYASA &amp; BATASAN NYATA SISTEM
              </div>
              <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight leading-tight">
                Dirancang dengan batasan eksplisit antara implementasi siap pakai dan mode
                simulasi.
              </h2>
              <p className="text-[14px] text-white/80 leading-relaxed">
                Sebagai perangkat evaluasi teknik dan demonstrasi Dishub, REKASURYA memisahkan
                dengan tegas mana logika yang telah berjalan nyata pada basis data lokal dan mana
                integrasi eksternal yang sengaja disimulasikan.
              </p>
            </div>

            {/* 5 Prinsip Rekayasa Keras */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {ENGINEERING_PRINCIPLES.map((p) => (
                <div
                  key={p.code}
                  className="rounded-xl bg-[#041E3E] border border-white/15 p-4 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-2">
                    <span className="inline-block px-2 py-0.5 rounded bg-[#FEB124] text-[#041E3E] font-mono text-[10.5px] font-bold">
                      {p.code}
                    </span>
                    <h3 className="text-[14px] font-semibold text-white leading-snug">
                      {p.title}
                    </h3>
                  </div>
                  <p className="text-[12px] text-white/75 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            {/* Panel Kejujuran Batasan & Status Subsistem Langsung */}
            <div className="rounded-2xl bg-[#041E3E] border border-white/15 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15.5px] font-semibold text-[#FFD585]">
                    Deklarasi Transparansi Teknis Saat Ini
                  </h3>
                  <p className="text-[12.5px] text-white/75">
                    Status langsung berasal dari runtime SQLite dan pemeriksaan adaptor server.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 font-mono text-[11px] text-[#FFD585]">
                  MODE SIMULASI DEMO AKTIF
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
                <div className="rounded-lg bg-white/5 border border-white/10 p-3.5 space-y-1">
                  <div className="font-mono text-[#FFD585] font-semibold">
                    Telemetri &amp; Database SQLite
                  </div>
                  <p className="text-white/80">
                    Berjalan penuh secara lokal ({totalDevices} tiang, {activeFaults} gangguan
                    aktif, {openWorkOrders} Work Order, rantai audit {auditRowCount} baris{" "}
                    {auditValid ? "terverifikasi" : "tidak konsisten"}). Telemetri demo berasal dari
                    data sintetis. Skenario dapat dijalankan kembali lewat Simulator.
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3.5 space-y-1">
                  <div className="font-mono text-[#FFD585] font-semibold">
                    Inferensi AI (`{aiAdapterMode}`)
                  </div>
                  <p className="text-white/80">
                    Memakai kontrak JSON tervalidasi Zod v{aiContractVersion}. Bila variabel{" "}
                    <code className="font-mono text-white">REKASURYA_AI_SERVICE_URL</code> belum
                    disetel ke layanan PoC eksternal, klasifikasi berjalan lewat EWMA deterministik
                    di server.
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3.5 space-y-1">
                  <div className="font-mono text-[#FFD585] font-semibold">
                    Pengaduan Gaya ULAS Surakarta
                  </div>
                  <p className="text-white/80">
                    Alur pencocokan tiket warga dan linimasa disusun menyerupai pola layanan aduan
                    publik untuk uji kasus Dishub, dan <strong className="text-white">bukan</strong>{" "}
                    situs atau sistem resmi Pemerintah Kota Surakarta / ULAS.
                  </p>
                </div>
              </div>

              <details className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[12px]">
                <summary className="cursor-pointer font-semibold text-white flex items-center justify-between">
                  <span>Lihat rincian kesiapan subsistem hardware vs software platform</span>
                  <span className="font-mono text-[11px] text-[#FFD585]">buka rincian ↓</span>
                </summary>
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-white/80">
                  <div>
                    <strong className="text-white">Sudah diimplementasikan di repo:</strong> Skema
                    SQLite penuh, antarmuka konsol 9 rute fungsional, simulator injeksi telemetri &amp;
                    reset seed, kalkulator energi dual-stream PP 4/2023, pencocokan geofence GPS 90 m,
                    rantai hash audit SHA-256, serta kode firmware ESP32-S3 (`firmware/`).
                  </div>
                  <div>
                    <strong className="text-white">Menunggu integrasi lingkungan produksi:</strong>{" "}
                    Broker MQTT seluler lapangan, endpoint layanan AI eksternal berbayar/terdedikasi
                    (`REKASURYA_AI_SERVICE_URL`), dan webhook resmi portal pengaduan pemerintah
                    daerah.
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          LAPIS 5 — GERBANG MODUL OPERASIONAL (4 PINTU BENTO)
          ================================================================ */}
      <section data-nav="light" className="pt-12 pb-16 bg-[#F4F6F9]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#B45309]">
                05 · MULAI EKSPLORASI PLATFORM
              </div>
              <h2 className="text-[24px] sm:text-[30px] font-semibold tracking-tight text-[#062D5B]">
                Pilih pintu masuk sesuai peran Anda di operasi PJU.
              </h2>
            </div>
            <Link href="/console" className="ops-btn-amber px-4 py-2 text-[12.5px] self-start sm:self-auto">
              Langsung ke Konsol Utama →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULE_DOORS.map((door) => {
              const isNavy = door.accent === "navy";
              const isAmber = door.accent === "amber";
              return (
                <Link
                  key={door.href}
                  href={door.href}
                  className={`lift-tile rounded-2xl p-5 flex flex-col justify-between gap-5 border ${
                    isNavy
                      ? "bg-[#062D5B] text-white border-[#062D5B]"
                      : isAmber
                      ? "bg-[#FFF8E7] text-[#0B192C] border-[#FEB124]"
                      : "bg-white text-[#0B192C] border-[#DCE3EC]"
                  }`}
                >
                  <div className="space-y-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-mono text-[10.5px] font-semibold ${
                        isNavy
                          ? "bg-white/15 text-[#FFD585]"
                          : isAmber
                          ? "bg-[#FEB124] text-[#041E3E]"
                          : "bg-[#EDF1F6] text-[#062D5B]"
                      }`}
                    >
                      {door.tag}
                    </span>
                    <h3
                      className={`text-[17px] font-semibold ${
                        isNavy ? "text-white" : "text-[#062D5B]"
                      }`}
                    >
                      {door.title}
                    </h3>
                    <p
                      className={`text-[12.5px] leading-relaxed ${
                        isNavy ? "text-white/80" : "text-[#334155]"
                      }`}
                    >
                      {door.desc}
                    </p>
                  </div>
                  <div
                    className={`text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${
                      isNavy ? "text-[#FFD585]" : "text-[#062D5B]"
                    }`}
                  >
                    <span>{door.cta}</span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          FOOTER BERSIH & FUNGSIONAL (TAUTAN RUTE NYATA SAJA)
          ================================================================ */}
      <footer className="bg-white border-t border-[#DCE3EC] text-[#0B192C]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-3">
            <RekasuryaLogo variant="on-light" height={34} />
            <p className="text-[12.5px] text-[#334155] leading-relaxed max-w-md">
              Platform Rekayasa Retrofit &amp; Kit Konversi PJU Tenaga Surya untuk diagnosis
              gangguan F1–F6, pengendalian pemeliharaan sky-lift, serta audit penghematan energi
              daerah Solo Raya.
            </p>
            <div className="text-[11px] font-mono text-[#5B6B7F]">
              STATUS DEMO: Simulasi SQLite Lokal + Kontrak AI v{aiContractVersion} • Bukan portal
              resmi Pemerintah Kota Surakarta / ULAS.
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
              Operasional Armada
            </div>
            <ul className="space-y-1.5 text-[12.5px]">
              <li>
                <Link href="/console" className="text-[#062D5B] hover:underline">
                  Konsol Armada (/console)
                </Link>
              </li>
              <li>
                <Link href="/devices" className="text-[#062D5B] hover:underline">
                  Inventori Tiang (/devices)
                </Link>
              </li>
              <li>
                <Link href="/alerts" className="text-[#062D5B] hover:underline">
                  Alarm &amp; Diagnosis (/alerts)
                </Link>
              </li>
              <li>
                <Link href="/work-orders" className="text-[#062D5B] hover:underline">
                  Work Order &amp; ULAS (/work-orders)
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
              Analitik, Simulasi &amp; Teknis
            </div>
            <ul className="space-y-1.5 text-[12.5px]">
              <li>
                <Link href="/map" className="text-[#062D5B] hover:underline">
                  Peta Geospasial 5 Koridor (/map)
                </Link>
              </li>
              <li>
                <Link href="/energy" className="text-[#062D5B] hover:underline">
                  Kalkulator Energi &amp; PBJT-TL (/energy)
                </Link>
              </li>
              <li>
                <Link href="/simulator" className="text-[#062D5B] hover:underline">
                  Simulator Injeksi Skenario (/simulator)
                </Link>
              </li>
              <li>
                <Link href="/architecture" className="text-[#062D5B] hover:underline">
                  Arsitektur Hardware 3-Kanal (/architecture)
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
