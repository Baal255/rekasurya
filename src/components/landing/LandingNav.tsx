"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { RekasuryaLogo } from "@/components/RekasuryaLogo";

interface LandingNavProps {
  totalDevices: number;
  activeFaults: number;
  isDemoSimulation: boolean;
}

const ANCHOR_LINKS = [
  { href: "#konvergensi", label: "Konvergensi" },
  { href: "#pratinjau", label: "Pratinjau Konsol" },
  { href: "#diagnosis", label: "Diagnosis F1–F6" },
  { href: "#prinsip", label: "Prinsip & Batasan" },
];

const MODULE_LINKS = [
  { href: "/console", label: "Konsol Armada", desc: "Ringkasan KPI, peta & triase langsung" },
  { href: "/devices", label: "Inventori Tiang", desc: "Daftar & detail telemetri perangkat" },
  { href: "/alerts", label: "Alarm & Gangguan", desc: "Klasifikasi F1–F6 & rekomendasi SKU" },
  { href: "/work-orders", label: "Work Order & ULAS", desc: "Penugasan Sky-Lift & laporan warga" },
  { href: "/map", label: "Peta Geospasial", desc: "Sebaran 5 koridor Solo Raya" },
  { href: "/energy", label: "Kalkulator Energi", desc: "Proyeksi penghematan dual-stream" },
  { href: "/simulator", label: "Simulator Gangguan", desc: "Uji injeksi skenario F1–F6 & reset demo" },
  { href: "/architecture", label: "Arsitektur Hardware", desc: "Topologi 3-kanal terisolasi & BOM" },
];

export function LandingNav({
  totalDevices,
  activeFaults,
  isDemoSimulation,
}: LandingNavProps) {
  const [surfaceTone, setSurfaceTone] = useState<"dark" | "light">("dark");
  const [atHeroTop, setAtHeroTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);

  useEffect(() => {
    const syncScroll = () => {
      setAtHeroTop(window.scrollY < 48);
    };
    syncScroll();
    window.addEventListener("scroll", syncScroll, { passive: true });

    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]"));
    if (targets.length === 0) {
      return () => window.removeEventListener("scroll", syncScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const nextTone = visible?.target.getAttribute("data-nav");
        if (nextTone === "dark" || nextTone === "light") {
          setSurfaceTone(nextTone);
        }
      },
      {
        rootMargin: "-14% 0px -74% 0px",
        threshold: [0, 0.25, 0.5, 0.85],
      }
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", syncScroll);
      observer.disconnect();
    };
  }, []);

  const isDarkChrome = atHeroTop || surfaceTone === "dark";

  const pillClasses = atHeroTop
    ? "bg-transparent shadow-none"
    : surfaceTone === "dark"
    ? "glass-navy"
    : "glass-light";

  const linkTextClass = isDarkChrome
    ? "text-white/85 hover:text-white hover:bg-white/10"
    : "text-[#062D5B]/85 hover:text-[#062D5B] hover:bg-[#062D5B]/5";

  return (
    <header className="fixed top-3 inset-x-0 z-50 px-3 sm:px-5 pointer-events-none">
      <div className="max-w-[1320px] mx-auto pointer-events-auto">
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl px-3.5 sm:px-5 py-2.5 transition-all duration-300 ${pillClasses}`}
        >
          {/* Logo resmi sesuai kontras permukaan */}
          <Link
            href="/"
            className="flex items-center gap-3 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FEB124] rounded-lg"
            aria-label="Beranda REKASURYA"
          >
            <RekasuryaLogo
              variant={isDarkChrome ? "on-dark" : "on-light"}
              height={34}
            />
          </Link>

          {/* Tautan jangkar & menu modul (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navigasi Utama">
            {ANCHOR_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${linkTextClass}`}
              >
                {item.label}
              </a>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setModulesOpen((prev) => !prev)}
                aria-expanded={modulesOpen}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${linkTextClass}`}
              >
                <span>Modul Konsol</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${modulesOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {modulesOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup menu modul"
                    onClick={() => setModulesOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute left-0 mt-2 w-[340px] z-20 rounded-xl bg-white border border-[#DCE3EC] shadow-[var(--sh-3)] p-2 grid grid-cols-1 gap-0.5 text-[#0B192C]">
                    {MODULE_LINKS.map((m) => (
                      <Link
                        key={m.href}
                        href={m.href}
                        onClick={() => setModulesOpen(false)}
                        className="px-3 py-2 rounded-lg hover:bg-[#F3F6FA] transition-colors block"
                      >
                        <div className="text-[12.5px] font-semibold text-[#062D5B]">
                          {m.label}
                        </div>
                        <div className="text-[11px] text-[#5B6B7F]">{m.desc}</div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Status & CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isDarkChrome
                  ? "bg-white/10 border-white/20 text-[#FFD585]"
                  : "bg-[#FFF8E7] border-[#FEB124]/60 text-[#062D5B]"
              }`}
              title="Status basis data operasional lokal"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeFaults > 0 ? "bg-[#FEB124]" : "bg-[#15803D]"
                }`}
              />
              <span>
                {isDemoSimulation ? "Simulasi" : "Live"} • {totalDevices} Tiang
              </span>
            </div>

            <Link
              href="/console"
              className="ops-btn-amber px-3.5 sm:px-4 py-2 text-[12.5px] inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm"
            >
              <span>Masuk Konsol</span>
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
              className={`lg:hidden p-2 rounded-lg border transition-colors cursor-pointer ${
                isDarkChrome
                  ? "border-white/20 text-white hover:bg-white/10"
                  : "border-[#DCE3EC] text-[#062D5B] hover:bg-[#EDF1F6]"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Drawer Navigasi Mobile */}
        {menuOpen && (
          <div className="lg:hidden mt-2 rounded-2xl bg-white border border-[#DCE3EC] shadow-[var(--sh-3)] p-4 text-[#0B192C] space-y-4">
            <div className="space-y-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5B6B7F] px-2">
                Bagian Halaman
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ANCHOR_LINKS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-2 rounded-lg bg-[#F4F6F9] hover:bg-[#EDF1F6] text-[12.5px] font-medium text-[#062D5B]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-1 border-t border-[#DCE3EC] pt-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[#5B6B7F] px-2">
                Modul Konsol Operasional
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MODULE_LINKS.map((m) => (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-2 rounded-lg border border-[#DCE3EC] hover:border-[#062D5B]/40 text-[12px] font-semibold text-[#062D5B]"
                  >
                    {m.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
