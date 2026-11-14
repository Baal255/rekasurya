"use client";

import React from "react";
import { formatNum } from "@/lib/format";
import type { DeviceRecord } from "@/lib/types";

function boxStroke(faultFamily: string, targets: string[]): string {
  if (targets.includes(faultFamily)) {
    return faultFamily === "F6" ? "#D946EF" : faultFamily === "F1" ? "#F59E0B" : "#EF4444";
  }
  return "#334155";
}

function boxFill(faultFamily: string, targets: string[]): string {
  if (targets.includes(faultFamily)) {
    return faultFamily === "F6"
      ? "rgba(217, 70, 239, 0.14)"
      : faultFamily === "F1"
      ? "rgba(245, 158, 11, 0.14)"
      : "rgba(239, 68, 68, 0.14)";
  }
  return "#0F172A";
}

export function PcbSchematicCard({ device }: { device: DeviceRecord }) {
  const ff = device.fault_family;
  return (
    <div className="scada-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Topologi Pengukuran 3-Kanal Terisolasi &amp; Jalur Daya LED
          </h3>
          <p className="text-xs text-slate-400">
            Sesuai <span className="font-mono text-slate-300">ARSITEKTUR BOARD REKASURYA.pdf</span>:
            daya utama LED 40 W mengalir langsung melalui SCC → Buck CC-CV eksternal (tidak membebani PCB kendali).
          </p>
        </div>
        <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-sky-700/60 bg-sky-950/60 text-sky-200">
          Profil: {device.battery_profile}
        </span>
      </div>

      <div className="scada-inset p-2 overflow-x-auto">
        <svg
          viewBox="0 0 920 270"
          className="w-full min-w-[740px] h-auto block font-mono"
          role="img"
          aria-label="Diagram Blok Hardware REKASURYA 3 Kanal Terisolasi"
        >
          {/* Jalur Daya Eksternal (Garis Tebal Biru/Kuning) */}
          <line x1="175" y1="64" x2="255" y2="64" stroke="#38BDF8" strokeWidth="3" />
          <line x1="405" y1="64" x2="480" y2="64" stroke="#38BDF8" strokeWidth="3" />
          <line x1="635" y1="64" x2="725" y2="64" stroke="#F59E0B" strokeWidth="3" />
          <line x1="557" y1="98" x2="557" y2="152" stroke="#10B981" strokeWidth="2.5" />

          {/* Blok 1: Panel Surya + INA228 85V */}
          <rect
            x="16"
            y="24"
            width="160"
            height="80"
            rx="5"
            fill={boxFill(ff, ["F1"])}
            stroke={boxStroke(ff, ["F1"])}
            strokeWidth="1.6"
          />
          <text x="26" y="43" fill="#94A3B8" fontSize="10">
            KANAL 1 · PV INPUT
          </text>
          <text x="26" y="61" fill="#F8FAFC" fontSize="13" fontWeight="700">
            {formatNum(device.pv_v)} V · {formatNum(device.pv_i, 2)} A
          </text>
          <text x="26" y="79" fill="#38BDF8" fontSize="11">
            {formatNum(device.pv_p)} W (INA228 85V)
          </text>
          <text x="26" y="95" fill="#64748B" fontSize="9.5">
            Isolasi B0303S + ADuM1250
          </text>

          {/* Blok 2: SCC MPPT */}
          <rect
            x="255"
            y="24"
            width="150"
            height="80"
            rx="5"
            fill={boxFill(ff, ["F3", "F5"])}
            stroke={boxStroke(ff, ["F3", "F5"])}
            strokeWidth="1.6"
          />
          <text x="265" y="43" fill="#94A3B8" fontSize="10">
            SCC MPPT + NTC
          </text>
          <text x="265" y="62" fill="#F8FAFC" fontSize="12" fontWeight="700">
            T_SCC {formatNum(device.temp_scc_c)} °C
          </text>
          <text x="265" y="79" fill="#94A3B8" fontSize="10">
            Exp {formatNum(device.expected_p_chg)} W
          </text>
          <text x="265" y="95" fill="#64748B" fontSize="9.5">
            Shunt 2–5 mΩ ≥3W
          </text>

          {/* Blok 3: Baterai LiFePO4 + INA226 */}
          <rect
            x="480"
            y="24"
            width="155"
            height="80"
            rx="5"
            fill={boxFill(ff, ["F2", "F5", "F6"])}
            stroke={boxStroke(ff, ["F2", "F5", "F6"])}
            strokeWidth="1.6"
          />
          <text x="490" y="43" fill="#94A3B8" fontSize="10">
            KANAL 2 · BATT INA226
          </text>
          <text x="490" y="61" fill="#F8FAFC" fontSize="13" fontWeight="700">
            {formatNum(device.batt_v)} V · {formatNum(device.batt_i, 2)} A
          </text>
          <text x="490" y="79" fill="#10B981" fontSize="11">
            SoC {formatNum(device.soc_pct, 0)}% · SoH {formatNum(device.soh_pct, 1)}%
          </text>
          <text x="490" y="95" fill="#64748B" fontSize="9.5">
            T_Batt {formatNum(device.temp_batt_c)}°C · UVLO 22V
          </text>

          {/* Blok 4: Jalur Daya Eksternal -> Buck CC-CV -> LED 40W */}
          <rect
            x="725"
            y="24"
            width="178"
            height="80"
            rx="5"
            fill={boxFill(ff, ["F4"])}
            stroke={boxStroke(ff, ["F4"])}
            strokeWidth="1.6"
          />
          <text x="735" y="43" fill="#94A3B8" fontSize="10">
            KANAL 3 · LOAD (EKSTERNAL)
          </text>
          <text x="735" y="61" fill="#F8FAFC" fontSize="13" fontWeight="700">
            {formatNum(device.load_v)} V · {formatNum(device.load_i, 2)} A
          </text>
          <text x="735" y="79" fill="#FBBF24" fontSize="11">
            {formatNum(device.load_p)} W · PWM {device.pwm_duty}%
          </text>
          <text x="735" y="95" fill="#64748B" fontSize="9.5">
            Buck CC-CV 40W Eksternal
          </text>

          {/* Panah PWM Terisolasi PC817 dari Board ESP32 ke Driver LED */}
          <path
            d="M 650 192 L 814 192 L 814 108"
            fill="none"
            stroke="#A78BFA"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
          <text x="724" y="184" fill="#C4B5FD" fontSize="9.5">
            Optocoupler PC817 (PWM 200–500Hz)
          </text>

          {/* Blok 5: Board Kendali ESP32-WROOM-32E (1-2 W terisolasi) */}
          <rect
            x="255"
            y="152"
            width="395"
            height="96"
            rx="5"
            fill={boxFill(ff, ["F5", "F6"])}
            stroke={boxStroke(ff, ["F5", "F6"])}
            strokeWidth="1.6"
          />
          <text x="268" y="172" fill="#38BDF8" fontSize="10.5" fontWeight="700">
            BOARD KENDALI ESP32-WROOM-32E (Konsumsi 1–2 W dari Bus BATT + Fuse + TVS SMBJ30A)
          </text>
          <text x="268" y="191" fill="#E2E8F0" fontSize="11">
            LTE Cat-1 + GNSS · RTC DS3231MZ · Flash W25Q (Ring Buffer Offline)
          </text>
          <text x="268" y="210" fill="#CBD5E1" fontSize="10.5">
            Lux: {formatNum(device.lux, 0)} lx · PIR: {device.pir_active ? "GERAK" : "DIAM"} ·
            Suhu PCB LM75B: {formatNum(device.temp_board_c)} °C
          </text>
          <text x="268" y="229" fill="#94A3B8" fontSize="10">
            Anti-Tamper: Sakelar Pintu [{device.door_open ? "TERBUKA" : "TERTUTUP"}] · LIS3DH{" "}
            {formatNum(device.accel_g, 2)} g
          </text>

          {/* Blok 6: Cadangan 18650 Power-Path */}
          <rect
            x="16"
            y="152"
            width="210"
            height="96"
            rx="5"
            fill={device.on_backup_cell ? "rgba(217, 70, 239, 0.16)" : "#0F172A"}
            stroke={device.on_backup_cell ? "#D946EF" : "#334155"}
            strokeWidth="1.6"
          />
          <text x="28" y="172" fill="#94A3B8" fontSize="10">
            SUBSISTEM CADANGAN ENERGI
          </text>
          <text x="28" y="192" fill="#F8FAFC" fontSize="13" fontWeight="700">
            Sel 18650: {formatNum(device.backup_cell_v, 2)} V
          </text>
          <text
            x="28"
            y="211"
            fill={device.on_backup_cell ? "#F0ABFC" : "#10B981"}
            fontSize="11"
            fontWeight="600"
          >
            Status: {device.on_backup_cell ? "AKTIF KIRIM ALERT F6" : "STANDBY TERISI"}
          </text>
          <text x="28" y="230" fill="#64748B" fontSize="9.5">
            Buzzer + GNSS aktif saat baterai dicabut
          </text>
          <line
            x1="226"
            y1="200"
            x2="255"
            y2="200"
            stroke={device.on_backup_cell ? "#D946EF" : "#475569"}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
