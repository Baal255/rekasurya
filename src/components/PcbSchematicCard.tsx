"use client";

import React from "react";
import { formatNum } from "@/lib/format";
import type { DeviceRecord } from "@/lib/types";

function boxStroke(faultFamily: string, targets: string[]): string {
  if (targets.includes(faultFamily)) {
    return faultFamily === "F6" ? "#9D174D" : faultFamily === "F1" ? "#B45309" : "#B91C1C";
  }
  return "#CBD5E1";
}

function boxFill(faultFamily: string, targets: string[]): string {
  if (targets.includes(faultFamily)) {
    return faultFamily === "F6"
      ? "#FDF2F8"
      : faultFamily === "F1"
      ? "#FFFBEB"
      : "#FEF2F2";
  }
  return "#FFFFFF";
}

export function PcbSchematicCard({ device }: { device: DeviceRecord }) {
  const ff = device.fault_family;
  return (
    <div className="ops-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0B192C]">
            Diagram Jalur Daya dan Pengukuran
          </h3>
          <p className="text-[12px] text-[#5B6B7F]">
            Rancangan board memakai keluaran SCC LOAD untuk driver eksternal dan catu baterai untuk PCB kendali. Angka berasal dari skenario demo.
          </p>
        </div>
        <span className="px-2.5 py-1 text-[11px] font-mono rounded-md border border-[#DCE3EC] bg-[#F8FAFC] text-[#0B192C]">
          Profil: {device.battery_profile}
        </span>
      </div>

      <div className="ops-inset p-3 overflow-x-auto">
        <svg
          viewBox="0 0 920 270"
          className="w-full min-w-[720px] h-auto block font-mono"
          role="img"
          aria-label="Diagram jalur PV, baterai, dan beban dari SCC"
        >
          {/* Jalur Daya Eksternal */}
          <line x1="175" y1="64" x2="255" y2="64" stroke="#062D5B" strokeWidth="2.8" />
          <line x1="405" y1="64" x2="480" y2="64" stroke="#062D5B" strokeWidth="2.8" />
          <path d="M 375 24 V 10 H 814 V 24" fill="none" stroke="#B45309" strokeWidth="2.8" />
          <text x="407" y="55" fill="#5B6B7F" fontSize="9">SCC BAT</text>
          <line x1="557" y1="98" x2="557" y2="152" stroke="#15803D" strokeWidth="2.4" />

          {/* Blok 1: Panel Surya + INA228 85V */}
          <rect
            x="16"
            y="24"
            width="160"
            height="80"
            rx="6"
            fill={boxFill(ff, ["F1"])}
            stroke={boxStroke(ff, ["F1"])}
            strokeWidth="1.6"
          />
          <text x="26" y="43" fill="#5B6B7F" fontSize="10">
            KANAL 1 · PV INPUT
          </text>
          <text x="26" y="61" fill="#0B192C" fontSize="13" fontWeight="700">
            {formatNum(device.pv_v)} V · {formatNum(device.pv_i, 2)} A
          </text>
          <text x="26" y="79" fill="#062D5B" fontSize="11" fontWeight="600">
            {formatNum(device.pv_p)} W (INA228 85V)
          </text>
          <text x="26" y="95" fill="#5B6B7F" fontSize="9.5">
            Isolasi B0303S + ADuM1250
          </text>

          {/* Blok 2: SCC MPPT */}
          <rect
            x="255"
            y="24"
            width="150"
            height="80"
            rx="6"
            fill={boxFill(ff, ["F3", "F5"])}
            stroke={boxStroke(ff, ["F3", "F5"])}
            strokeWidth="1.6"
          />
          <text x="265" y="43" fill="#5B6B7F" fontSize="10">
            SCC MPPT + NTC
          </text>
          <text x="265" y="62" fill="#0B192C" fontSize="12" fontWeight="700">
            T_SCC {formatNum(device.temp_scc_c)} °C
          </text>
          <text x="265" y="79" fill="#334155" fontSize="10">
            Exp {formatNum(device.expected_p_chg)} W
          </text>
          <text x="265" y="95" fill="#5B6B7F" fontSize="9.5">
            Shunt 2–5 mΩ ≥3W
          </text>

          {/* Blok 3: Baterai LiFePO4 + INA226 */}
          <rect
            x="480"
            y="24"
            width="155"
            height="80"
            rx="6"
            fill={boxFill(ff, ["F2", "F5", "F6"])}
            stroke={boxStroke(ff, ["F2", "F5", "F6"])}
            strokeWidth="1.6"
          />
          <text x="490" y="43" fill="#5B6B7F" fontSize="10">
            KANAL 2 · BATT INA226
          </text>
          <text x="490" y="61" fill="#0B192C" fontSize="13" fontWeight="700">
            {formatNum(device.batt_v)} V · {formatNum(device.batt_i, 2)} A
          </text>
          <text x="490" y="79" fill="#15803D" fontSize="11" fontWeight="600">
            SoC {formatNum(device.soc_pct, 0)}% · SoH {formatNum(device.soh_pct, 1)}%
          </text>
          <text x="490" y="95" fill="#5B6B7F" fontSize="9.5">
            Isolasi B0303S + ADuM1250
          </text>

          {/* Blok 4: Jalur Daya Eksternal -> Buck CC-CV -> LED 40W */}
          <rect
            x="725"
            y="24"
            width="178"
            height="80"
            rx="6"
            fill={boxFill(ff, ["F4"])}
            stroke={boxStroke(ff, ["F4"])}
            strokeWidth="1.6"
          />
          <text x="735" y="43" fill="#5B6B7F" fontSize="10">
            KANAL 3 · LOAD (EKSTERNAL)
          </text>
          <text x="735" y="61" fill="#0B192C" fontSize="13" fontWeight="700">
            {formatNum(device.load_v)} V · {formatNum(device.load_i, 2)} A
          </text>
          <text x="735" y="79" fill="#B45309" fontSize="11" fontWeight="600">
            {formatNum(device.load_p)} W · PWM {device.pwm_duty}%
          </text>
          <text x="735" y="95" fill="#5B6B7F" fontSize="9.5">
            SCC LOAD → Buck CC-CV
          </text>

          {/* Panah PWM Terisolasi PC817 dari Board ESP32 ke Driver LED */}
          <path
            d="M 625 200 L 814 200 L 814 108"
            fill="none"
            stroke="#062D5B"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
          <text x="638" y="191" fill="#062D5B" fontSize="9.5" fontWeight="600">
            Opto PC817 (PWM 200–500Hz)
          </text>

          {/* Blok 5: Board Kendali ESP32-WROOM-32E */}
          <rect
            x="255"
            y="152"
            width="370"
            height="96"
            rx="6"
            fill={boxFill(ff, ["F5", "F6"])}
            stroke={boxStroke(ff, ["F5", "F6"])}
            strokeWidth="1.6"
          />
          <text x="268" y="172" fill="#062D5B" fontSize="10" fontWeight="700">
            BOARD KENDALI ESP32-WROOM-32E (1–2 W · Fuse + TVS)
          </text>
          <text x="268" y="191" fill="#0B192C" fontSize="10">
            LTE Cat-1 + GNSS · RTC DS3231MZ · W25Q Ring Buffer
          </text>
          <text x="268" y="210" fill="#334155" fontSize="10.5">
            Lux: {formatNum(device.lux, 0)} lx · PIR: {device.pir_active ? "GERAK" : "DIAM"} ·
            PCB LM75B: {formatNum(device.temp_board_c)} °C
          </text>
          <text x="268" y="229" fill="#5B6B7F" fontSize="10">
            Anti-Tamper: Sakelar Pintu [{device.door_open ? "TERBUKA" : "TERTUTUP"}] · LIS3DH{" "}
            {formatNum(device.accel_g, 2)} g
          </text>

          {/* Blok 6: Cadangan 18650 Power-Path */}
          <rect
            x="16"
            y="152"
            width="210"
            height="96"
            rx="6"
            fill={device.on_backup_cell ? "#FDF2F8" : "#FFFFFF"}
            stroke={device.on_backup_cell ? "#9D174D" : "#CBD5E1"}
            strokeWidth="1.6"
          />
          <text x="28" y="172" fill="#5B6B7F" fontSize="10">
            SUBSISTEM CADANGAN ENERGI
          </text>
          <text x="28" y="192" fill="#0B192C" fontSize="13" fontWeight="700">
            Sel 18650: {formatNum(device.backup_cell_v, 2)} V
          </text>
          <text
            x="28"
            y="211"
            fill={device.on_backup_cell ? "#9D174D" : "#15803D"}
            fontSize="11"
            fontWeight="700"
          >
            Status: {device.on_backup_cell ? "AKTIF KIRIM ALERT F6" : "STANDBY TERISI"}
          </text>
          <text x="28" y="230" fill="#5B6B7F" fontSize="9">
            GNSS + Buzzer aktif saat putus
          </text>
          <line
            x1="226"
            y1="200"
            x2="255"
            y2="200"
            stroke={device.on_backup_cell ? "#9D174D" : "#94A3B8"}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
