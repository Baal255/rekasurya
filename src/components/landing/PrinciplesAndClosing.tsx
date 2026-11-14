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
    title: "Lampu tetap menyala saat modul IoT bermasalah",
    desc: "Kontrol dasar beban lampu berjalan mandiri di perangkat keras sehingga kerusakan modul komunikasi tidak membuat jalan menjadi gelap.",
  },
  {
    title: "Jalur sensor panel, baterai, dan lampu terpisah",
    desc: "Isolasi galvanis (ADuM1250 dan B0505S) melindungi papan mikrokontroler dari lonjakan tegangan panel surya dan driver LED.",
  },
  {
    title: "Cuaca mendung tidak memicu panggilan teknisi",
    desc: "Daya panel tiap tiang dibandingkan dengan tiang sekitar sekoridor (EWMA) sebelum menerbitkan dugaan gangguan.",
  },
  {
    title: "Izin buka kotak saat teknisi check-in",
    desc: "Teknisi yang melakukan check-in di radius 90 meter dari tiang mendapat izin sementara sehingga pemeriksaan resmi tidak dianggap pembobolan.",
  },
  {
    title: "Penentuan gangguan tetap berjalan tanpa AI eksternal",
    desc: "Jika layanan AI eksternal tidak dihubungkan, sistem otomatis memakai aturan pembandingan sensor lokal berbasis kontrak data yang divalidasi.",
  },
];

const MODULE_DOORS = [
  {
    href: "/console",
    title: "Konsol Utama",
    desc: "Pantau seluruh 18 tiang simulasi di 5 wilayah Solo Raya, lihat gangguan paling mendesak, dan periksa status perbaikan.",
    cta: "Buka Konsol",
    accent: "navy" as const,
  },
  {
    href: "/simulator",
    title: "Simulator Gangguan",
    desc: "Coba berbagai skenario seperti panel tertutup pohon, baterai melemah, pencurian baterai, hingga pemulihan kondisi normal.",
    cta: "Coba Skenario Gangguan",
    accent: "amber" as const,
  },
  {
    href: "/work-orders",
    title: "Tugas Teknisi & Aduan",
    desc: "Lihat daftar tugas lengkap dengan lokasi tiang, daftar suku cadang, check-in lokasi, dan tindak lanjut aduan warga.",
    cta: "Buka Tugas Teknisi",
    accent: "light" as const,
  },
  {
    href: "/energy",
    title: "Kalkulator Penghematan",
    desc: "Hitung estimasi penghematan listrik PLN dan biaya perawatan sesuai jumlah tiang, tarif listrik, dan biaya kunjungan.",
    cta: "Hitung Penghematan",
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
          LAPIS 4 — KEANDALAN SISTEM & BATASAN TRANSPARAN (NAVY SLAB)
          ================================================================ */}
      <section id="prinsip" data-nav="dark" className="py-6 sm:py-10 bg-[#F4F6F9]">
        <div className="max-w-[1360px] mx-auto px-2 sm:px-4">
          <div className="rounded-[28px] sm:rounded-[38px] bg-[#062D5B] text-white slab-shadow grain-subtle px-5 sm:px-10 py-12 sm:py-16 space-y-10">
            <div className="max-w-3xl space-y-2.5">
              <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight leading-tight">
                Keandalan sistem &amp; pembedaan jelas antara uji repositori dan simulasi
              </h2>
              <p className="text-[14.5px] text-white/80 leading-relaxed">
                Agar juri dan pengelola lampu jalan mudah mengevaluasi kesiapan REKASURYA, kami
                memisahkan mana kemampuan perangkat lunak yang sudah diuji di repositori, mana data
                simulasi, dan mana bagian yang disiapkan untuk pemasangan lapangan.
              </p>
            </div>

            {/* 5 Prinsip Keandalan */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {ENGINEERING_PRINCIPLES.map((p, idx) => (
                <div
                  key={p.title}
                  className="rounded-xl bg-[#041E3E] border border-white/15 p-4 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="text-[12px] font-semibold text-[#FFD585]">
                      Prinsip {idx + 1}
                    </div>
                    <h3 className="text-[14px] font-semibold text-white leading-snug">
                      {p.title}
                    </h3>
                  </div>
                  <p className="text-[12.5px] text-white/75 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            {/* Panel Transparansi Teknis */}
            <div className="rounded-2xl bg-[#041E3E] border border-white/15 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-[#FFD585]">
                    Status sistem saat ini: memakai data simulasi lokal
                  </h3>
                  <p className="text-[13px] text-white/75">
                    Semua interaksi di halaman ini dan Konsol membaca basis data contoh di server
                    (SQLite).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12.5px]">
                <div className="rounded-lg bg-white/5 border border-white/10 p-3.5 space-y-1">
                  <div className="text-[#FFD585] font-semibold">
                    Data simulasi 18 tiang (SQLite)
                  </div>
                  <p className="text-white/80">
                    Saat ini memuat {totalDevices} tiang contoh ({activeFaults} perlu dicek,{" "}
                    {openWorkOrders} tugas teknisi terbuka, dan {auditRowCount} baris log audit{" "}
                    {auditValid ? "terverifikasi SHA-256" : "perlu tinjau"}). Angka contoh dapat
                    dicoba ulang di Simulator.
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3.5 space-y-1">
                  <div className="text-[#FFD585] font-semibold">
                    Aturan diagnosis &amp; AI ({aiAdapterMode})
                  </div>
                  <p className="text-white/80">
                    Menggunakan kontrak JSON tervalidasi v{aiContractVersion}. Jika layanan AI
                    eksternal tidak disetel, diagnosis berjalan deterministik dari pembandingan
                    tiang sekitar (EWMA).
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 border border-white/10 p-3.5 space-y-1">
                  <div className="text-[#FFD585] font-semibold">
                    Alur aduan warga (adaptasi ULAS)
                  </div>
                  <p className="text-white/80">
                    Alur tindak lanjut aduan warga dan pencocokan jarak tiang dirancang mengikuti pola
                    pelayanan aduan Solo, dan <strong className="text-white">bukan</strong> situs
                    resmi Pemerintah Kota Surakarta / ULAS.
                  </p>
                </div>
              </div>

              <details className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[12.5px]">
                <summary className="cursor-pointer font-semibold text-white flex items-center justify-between">
                  <span>Untuk pembaca teknis: rincian kemampuan yang diuji vs tahap integrasi</span>
                  <span className="text-[12px] text-[#FFD585]">Lihat rincian ↓</span>
                </summary>
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-white/80">
                  <div>
                    <strong className="text-white">Sudah diuji di repositori:</strong> Skema SQLite,
                    pembandingan cuaca vs gangguan lokal (EWMA), klasifikasi F1–F6 dan daftar suku
                    cadang, batas keselamatan perintah PWM, verifikasi check-in 90 m, rantai hash
                    SHA-256, model kalkulator penghematan, serta rancangan firmware ESP32-S3.
                  </div>
                  <div>
                    <strong className="text-white">Masih simulasi / tahap integrasi lapangan:</strong>{" "}
                    Telemetri 18 tiang contoh, perhitungan penghematan berbasis asumsi tarif listrik,
                    sasaran penyelesaian dalam satu kunjungan, koneksi broker MQTT seluler di
                    lapangan, dan integrasi portal aduan Pemda.
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          LAPIS 5 — PILIHAN MODUL OPERASIONAL
          ================================================================ */}
      <section data-nav="light" className="pt-12 pb-16 bg-[#F4F6F9]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-[24px] sm:text-[30px] font-semibold tracking-tight text-[#062D5B]">
                Telusuri sistem REKASURYA lebih lanjut
              </h2>
              <p className="text-[14px] text-[#334155]">
                Pilih bagian aplikasi yang sesuai untuk memeriksa kondisi tiang, skenario gangguan,
                tugas teknisi, atau estimasi penghematan.
              </p>
            </div>
            <Link href="/console" className="ops-btn-amber px-4 py-2 text-[13px] self-start sm:self-auto">
              Buka Konsol Utama →
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
                    <h3
                      className={`text-[17px] font-semibold ${
                        isNavy ? "text-white" : "text-[#062D5B]"
                      }`}
                    >
                      {door.title}
                    </h3>
                    <p
                      className={`text-[13px] leading-relaxed ${
                        isNavy ? "text-white/80" : "text-[#334155]"
                      }`}
                    >
                      {door.desc}
                    </p>
                  </div>
                  <div
                    className={`text-[13px] font-semibold inline-flex items-center gap-1.5 ${
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
          FOOTER
          ================================================================ */}
      <footer className="bg-white border-t border-[#DCE3EC] text-[#0B192C]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-3">
            <RekasuryaLogo variant="on-light" height={34} />
            <p className="text-[13px] text-[#334155] leading-relaxed max-w-md">
              Sistem konversi lampu jalan PLN menjadi tenaga surya dan pemantauan kondisi tiang
              sebelum teknisi berangkat.
            </p>
            <div className="text-[12px] text-[#5B6B7F]">
              Memakai data simulasi SQLite lokal · Bukan situs resmi Pemerintah Kota Surakarta /
              ULAS.
            </div>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-[12px] font-semibold text-[#5B6B7F]">
              Operasional Lapangan
            </div>
            <ul className="space-y-1.5 text-[13px]">
              <li>
                <Link href="/console" className="text-[#062D5B] hover:underline">
                  Konsol Utama (/console)
                </Link>
              </li>
              <li>
                <Link href="/devices" className="text-[#062D5B] hover:underline">
                  Daftar Tiang (/devices)
                </Link>
              </li>
              <li>
                <Link href="/alerts" className="text-[#062D5B] hover:underline">
                  Gangguan &amp; Peringatan (/alerts)
                </Link>
              </li>
              <li>
                <Link href="/work-orders" className="text-[#062D5B] hover:underline">
                  Tugas Teknisi &amp; Aduan (/work-orders)
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2">
            <div className="text-[12px] font-semibold text-[#5B6B7F]">
              Simulasi, Penghematan &amp; Rincian Teknis
            </div>
            <ul className="space-y-1.5 text-[13px]">
              <li>
                <Link href="/map" className="text-[#062D5B] hover:underline">
                  Peta Lokasi 5 Koridor (/map)
                </Link>
              </li>
              <li>
                <Link href="/energy" className="text-[#062D5B] hover:underline">
                  Kalkulator Penghematan (/energy)
                </Link>
              </li>
              <li>
                <Link href="/simulator" className="text-[#062D5B] hover:underline">
                  Simulator Gangguan (/simulator)
                </Link>
              </li>
              <li>
                <Link href="/architecture" className="text-[#062D5B] hover:underline">
                  Rincian Teknis &amp; Sensor (/architecture)
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
