"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_META } from "@/lib/format";
import type { OperationalRole } from "@/lib/types";

interface RoleContextValue {
  role: OperationalRole;
  setRole: (role: OperationalRole) => void;
  getHeaders: () => Record<string, string>;
  demoResetTick: number;
  triggerResetDemo: () => Promise<void>;
  isResetting: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function useOperationalRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useOperationalRole harus dipanggil di dalam RoleProvider.");
  }
  return ctx;
}

const NAV_ITEMS = [
  { href: "/", label: "Peta & Armada" },
  { href: "/devices/SRG-009", matchPrefix: "/devices/", label: "Diagnostik Tiang" },
  { href: "/work-orders", label: "Work Order & Aduan ULAS" },
  { href: "/energy", label: "Energi & Regulasi" },
  { href: "/simulator", label: "Simulator Gangguan" },
  { href: "/architecture", label: "Arsitektur & AI v1.0" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRoleState] = useState<OperationalRole>("OPERATOR_DISHUB");
  const [demoResetTick, setDemoResetTick] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("rekasurya_role") as OperationalRole | null;
      if (saved && saved in ROLE_META) {
        setRoleState(saved);
      }
    } catch {
      // Abaikan jika localStorage dibatasi
    }
  }, []);

  const setRole = (next: OperationalRole) => {
    setRoleState(next);
    try {
      window.localStorage.setItem("rekasurya_role", next);
    } catch {
      // Abaikan
    }
  };

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "x-rekasurya-role": role,
    "x-rekasurya-actor": ROLE_META[role].actorName,
  });

  const triggerResetDemo = async () => {
    setIsResetting(true);
    try {
      await fetch("/api/simulator/reset", {
        method: "POST",
        headers: getHeaders(),
      });
      setDemoResetTick((n) => n + 1);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <RoleContext.Provider
      value={{ role, setRole, getHeaders, demoResetTick, triggerResetDemo, isResetting }}
    >
      <div className="min-h-screen flex flex-col bg-[#0B0F17] text-[#F8FAFC]">
        {/* Header Komando SCADA */}
        <header className="sticky top-0 z-40 bg-[#0B0F17]/95 border-b border-[#1E293B]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="flex items-center gap-2.5 shrink-0 group focus:outline-none"
              >
                <span className="h-7 w-7 rounded bg-[#0EA5E9]/15 border border-[#0EA5E9]/60 flex items-center justify-center font-mono text-xs font-bold text-[#38BDF8]">
                  RS
                </span>
                <div>
                  <div className="text-sm font-bold tracking-wide text-slate-100 leading-tight">
                    REKASURYA
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Pusat Diagnostik &amp; Pemeliharaan PJUTS Solo Raya
                  </div>
                </div>
              </Link>

              {/* Badge Kejujuran Sistem Wajib */}
              <div className="hidden xl:flex items-center gap-2 ml-2 pl-3 border-l border-[#1E293B]">
                <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-amber-700/70 bg-amber-950/60 text-amber-200">
                  MODE DEMO · DATA SIMULASI
                </span>
                <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-sky-700/70 bg-sky-950/60 text-sky-200">
                  AI ADAPTER SIMULASI v1.0.0 — MENUNGGU POC GPT ASTRA
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <label
                  htmlFor="role-switcher"
                  className="text-slate-400 hidden sm:inline text-[11px] uppercase tracking-wider font-mono"
                >
                  Peran:
                </label>
                <select
                  id="role-switcher"
                  value={role}
                  onChange={(e) => setRole(e.target.value as OperationalRole)}
                  className="bg-[#111827] border border-[#334155] text-slate-100 text-xs rounded px-2.5 py-1.5 font-medium focus:outline-none focus:border-[#0EA5E9]"
                  title={ROLE_META[role].hint}
                >
                  <option value="OPERATOR_DISHUB">Operator Dishub</option>
                  <option value="TEKNISI_SKYLIFT">Teknisi Sky-Lift</option>
                  <option value="AUDITOR_PJU">Auditor PJU &amp; Pemda</option>
                </select>
              </div>

              <Link
                href="/simulator"
                className="px-2.5 py-1.5 text-xs font-medium rounded border border-[#0EA5E9]/60 bg-[#0EA5E9]/15 text-sky-200 hover:bg-[#0EA5E9]/25 transition-colors"
              >
                Injeksi Simulasi
              </Link>

              <button
                type="button"
                onClick={triggerResetDemo}
                disabled={isResetting}
                className="px-2.5 py-1.5 text-xs font-medium rounded border border-[#334155] bg-[#161F30] text-slate-200 hover:border-slate-400 disabled:opacity-50 transition-colors cursor-pointer"
                title="Pulihkan 18 tiang & Work Order ke snapshot awal demo Solo Raya"
              >
                {isResetting ? "Mereset..." : "Reset Demo"}
              </button>
            </div>
          </div>

          {/* Banner Kejujuran pada layar menengah/kecil */}
          <div className="xl:hidden border-t border-[#1E293B] bg-[#0F1623] px-4 py-1 flex flex-wrap items-center gap-2 text-[10px] font-mono">
            <span className="text-amber-300">MODE DEMO · DATA SIMULASI</span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-300">AI ADAPTER SIMULASI v1.0.0 (MENUNGGU POC GPT ASTRA)</span>
          </div>

          {/* Navigasi 6 Modul */}
          <nav
            aria-label="Navigasi utama"
            className="border-t border-[#1E293B] bg-[#0E1420] overflow-x-auto"
          >
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center gap-1 min-w-max">
              {NAV_ITEMS.map((item) => {
                const isActive = item.matchPrefix
                  ? pathname.startsWith(item.matchPrefix)
                  : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? "border-[#0EA5E9] text-sky-300 bg-[#111827]/70"
                        : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-[#111827]/40"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        {/* Konten Utama */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5">
          {children}
        </main>

        {/* Footer Teknis */}
        <footer className="border-t border-[#1E293B] bg-[#0E1420] py-3 px-4 sm:px-6 text-[11px] text-slate-500">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2">
            <div>
              REKASURYA · Platform Retrofit &amp; Diagnostik PJUTS 3-Kanal (INA228 / INA226 Terisolasi + Sel Cadangan 18650) · Solo Raya
            </div>
            <div className="font-mono">
              Peran aktif: <span className="text-slate-300">{ROLE_META[role].label}</span> · Bukan integrasi resmi Pemkot Surakarta / ULAS
            </div>
          </div>
        </footer>
      </div>
    </RoleContext.Provider>
  );
}
