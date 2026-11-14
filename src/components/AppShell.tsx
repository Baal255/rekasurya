"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_META } from "@/lib/format";
import type { OperationalRole } from "@/lib/types";
import {
  AlertsIcon,
  ArchitectureIcon,
  CloseIcon,
  DevicesIcon,
  DiagnosticsIcon,
  EnergyIcon,
  MapIcon,
  MenuIcon,
  OverviewIcon,
  RefreshIcon,
  SimulatorIcon,
  WorkOrdersIcon,
} from "./Icons";
import { RekasuryaLogo } from "./RekasuryaLogo";

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

interface NavItem {
  href: string;
  label: string;
  matchPrefix?: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Operasi & Pemantauan",
    items: [
      { href: "/console", label: "Ringkasan Konsol", exact: true, icon: OverviewIcon },
      { href: "/devices", label: "Inventaris Perangkat", exact: true, icon: DevicesIcon },
      {
        href: "/devices/SRG-009",
        matchPrefix: "/devices/",
        label: "Diagnostik Perangkat",
        icon: DiagnosticsIcon,
      },
      { href: "/alerts", label: "Gangguan & Alarm", exact: true, icon: AlertsIcon },
      { href: "/work-orders", label: "Work Order & Aduan", exact: true, icon: WorkOrdersIcon },
      { href: "/map", label: "Peta Operasional", exact: true, icon: MapIcon },
      { href: "/energy", label: "Analitik Energi", exact: true, icon: EnergyIcon },
    ],
  },
  {
    heading: "Rekayasa & Pengujian",
    items: [
      { href: "/simulator", label: "Simulator Telemetri", exact: true, icon: SimulatorIcon },
      { href: "/architecture", label: "Arsitektur & Kontrak AI", exact: true, icon: ArchitectureIcon },
    ],
  },
];

function resolvePageTitle(pathname: string): { section: string; page: string } {
  if (pathname === "/console" || pathname === "/dashboard") {
    return { section: "Konsol Operasi", page: "Ringkasan Komando Armada" };
  }
  if (pathname === "/devices") return { section: "Aset PJU", page: "Inventaris Perangkat (18 Tiang)" };
  if (pathname.startsWith("/devices/")) {
    const id = pathname.replace("/devices/", "");
    return { section: "Diagnostik Teknis", page: `Inspeksi Tiang ${id}` };
  }
  if (pathname === "/alerts") return { section: "Pemantauan", page: "Manajemen Gangguan & Alarm" };
  if (pathname === "/work-orders") return { section: "Pemeliharaan", page: "Work Order & Aduan Warga" };
  if (pathname === "/map") return { section: "Geospasial", page: "Peta Operasional Solo Raya" };
  if (pathname === "/energy") return { section: "Energi", page: "Analitik Energi & Penghematan" };
  if (pathname === "/simulator") return { section: "Pengujian", page: "Simulator Injeksi Telemetri" };
  if (pathname === "/architecture") return { section: "Tata Kelola", page: "Arsitektur Hardware & Kontrak AI" };
  return { section: "REKASURYA", page: "Konsol Operasi" };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRoleState] = useState<OperationalRole>("OPERATOR_DISHUB");
  const [demoResetTick, setDemoResetTick] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolbarTimeWib, setToolbarTimeWib] = useState<string>("—");

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const updateClock = () => {
      const formatted = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      setToolbarTimeWib(`${formatted} WIB`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, [demoResetTick]);

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

  // Homepage publik "/" berdiri sebagai antarmuka produk terpisah tanpa sidebar konsol
  if (pathname === "/") {
    return (
      <RoleContext.Provider
        value={{ role, setRole, getHeaders, demoResetTick, triggerResetDemo, isResetting }}
      >
        {children}
      </RoleContext.Provider>
    );
  }

  const breadcrumb = resolvePageTitle(pathname);

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-[#062D5B] text-white">
      {/* Identitas Logo Resmi REKASURYA pada permukaan Navy */}
      <div className="px-4 py-3.5 border-b border-white/12 flex items-center justify-between gap-2 shrink-0">
        <Link
          href="/"
          aria-label="Kembali ke beranda produk REKASURYA"
          className="flex items-center gap-3 min-w-0 group"
        >
          <RekasuryaLogo variant="on-dark" mode="full" height={34} />
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10"
          aria-label="Tutup menu navigasi"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-2 border-b border-white/10 bg-[#041E3E]/60 flex items-center justify-between text-[11px]">
        <span className="text-[#CBD8EA]">Solo Raya · PJUTS</span>
        <Link
          href="/"
          className="font-medium text-[#FFD585] hover:text-[#FEB124] transition-colors"
        >
          ← Beranda Produk
        </Link>
      </div>

      {/* Daftar Menu Navigasi Konsol */}
      <nav aria-label="Navigasi konsol utama" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="space-y-1">
            <div className="px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#9FB3CE]">
              {group.heading}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/console"
                  ? pathname === "/console" || pathname === "/dashboard"
                  : item.matchPrefix
                  ? pathname.startsWith(item.matchPrefix)
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${
                    isActive
                      ? "bg-white/12 text-white font-semibold border border-[#FEB124]/40"
                      : "text-[#DCE6F3] hover:text-white hover:bg-white/8 border border-transparent font-medium"
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#FEB124]"
                    />
                  )}
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-[#FEB124]" : "text-[#9FB3CE]"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Panel Status Sistem & Kejujuran Operasional di Bawah Sidebar */}
      <div className="p-3.5 border-t border-white/12 bg-[#041E3E] space-y-2 text-[11px] text-[#CBD8EA]">
        <div className="flex items-center justify-between text-white font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FEB124]" />
            Koneksi Basis Data
          </span>
          <span className="font-mono text-[#FFD585]">SQLite</span>
        </div>
        <div className="text-[#A8BCD6] leading-snug">
          Diagnosis demo berbasis aturan dan EWMA per sampel.
        </div>
        <div className="text-[10px] text-[#8EA5C4] font-mono pt-1 border-t border-white/10">
          Simulasi internal · Bukan sistem resmi ULAS Surakarta
        </div>
      </div>
    </div>
  );

  return (
    <RoleContext.Provider
      value={{ role, setRole, getHeaders, demoResetTick, triggerResetDemo, isResetting }}
    >
      <div className="min-h-screen flex bg-[#F4F6F9] text-[#0B192C]">
        {/* Sidebar Desktop Navy Tetap */}
        <aside className="hidden lg:flex lg:w-[248px] lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#041E3E] z-30">
          {renderNavContent()}
        </aside>

        {/* Drawer Navigasi Mobile / Tablet */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-[#041E3E]/60"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative w-[272px] max-w-[85vw] shadow-2xl z-10 flex flex-col">
              {renderNavContent()}
            </aside>
          </div>
        )}

        {/* Kolom Konten Utama */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[248px]">
          {/* Compact Application Toolbar (56px) */}
          <header className="sticky top-0 z-20 h-14 bg-[#FFFFFF]/95 backdrop-blur-xs border-b border-[#DCE3EC] px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 -ml-1 rounded-md border border-[#DCE3EC] text-[#062D5B] hover:bg-[#EDF1F6]"
                aria-label="Buka menu navigasi"
              >
                <MenuIcon className="w-4 h-4" />
              </button>

              <Link href="/" className="lg:hidden shrink-0" aria-label="Beranda REKASURYA">
                <RekasuryaLogo variant="on-light" mode="mark" height={24} />
              </Link>

              <div className="flex items-center gap-1.5 text-[13px] min-w-0 truncate">
                <span className="text-[#5B6B7F] hidden sm:inline">{breadcrumb.section}</span>
                <span className="text-[#C4D0DE] hidden sm:inline">/</span>
                <span className="font-semibold text-[#062D5B] truncate">{breadcrumb.page}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFF8E7] border border-[#FEB124]/60 text-[#062D5B] text-[11px] font-mono font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FEB124]" />
                SIMULASI<span className="hidden md:inline">DEMO</span>
              </span>

              <span className="hidden xl:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4F6F9] border border-[#DCE3EC] text-[#334155] text-[11px] font-mono tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
                {toolbarTimeWib}
              </span>

              <div className="flex items-center gap-1.5">
                <label htmlFor="role-switcher" className="sr-only">
                  Peran operasional
                </label>
                <select
                  id="role-switcher"
                  value={role}
                  onChange={(e) => setRole(e.target.value as OperationalRole)}
                  className="ops-input px-2.5 py-1.5 text-[12px] font-medium max-w-[144px] sm:max-w-none cursor-pointer"
                  title={ROLE_META[role].hint}
                >
                  <option value="OPERATOR_DISHUB">Operator Dishub</option>
                  <option value="TEKNISI_SKYLIFT">Teknisi Sky-Lift</option>
                  <option value="AUDITOR_PJU">Auditor PJU &amp; Pemda</option>
                </select>
              </div>

              <button
                type="button"
                onClick={triggerResetDemo}
                disabled={isResetting}
                className="ops-btn-secondary px-2.5 py-1.5 text-[12px] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Pulihkan 18 tiang dan Work Order ke snapshot awal demo"
              >
                <RefreshIcon className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">
                  {isResetting ? "Mereset..." : "Reset Demo"}
                </span>
              </button>
            </div>
          </header>

          {/* Kanvas Utama */}
          <main className="flex-1 w-full min-w-0 max-w-[1520px] mx-auto px-4 sm:px-6 py-5 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </RoleContext.Provider>
  );
}
