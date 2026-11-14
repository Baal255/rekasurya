"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { DeviceStatusBadge, FaultFamilyBadge, SpatialVerdictBadge } from "./StatusBadges";
import { formatNum, formatWibTime } from "@/lib/format";
import type { CorridorRecord, DeviceRecord } from "@/lib/types";

const LAT_MAX = -7.39;
const LAT_MIN = -7.75;
const LNG_MIN = 110.56;
const LNG_MAX = 111.08;

function projectPoint(lat: number, lng: number): { x: number; y: number } {
  const padX = 56;
  const padY = 46;
  const width = 800 - padX * 2;
  const height = 430 - padY * 2;
  const x = padX + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * width;
  const y = padY + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * height;
  return {
    x: Math.max(28, Math.min(772, Number(x.toFixed(1)))),
    y: Math.max(28, Math.min(402, Number(y.toFixed(1)))),
  };
}

function statusFill(status: string): string {
  switch (status) {
    case "NORMAL":
      return "#15803D";
    case "WARNING_EWMA":
      return "#B45309";
    case "FAULT":
      return "#B91C1C";
    case "TAMPER_CRITICAL":
      return "#9D174D";
    default:
      return "#5B6B7F";
  }
}

export function SoloRayaMap({
  corridors,
  devices,
  selectedCorridorId,
  selectedDeviceId,
  onSelectDevice,
  onSelectCorridor,
  title = "Peta Operasional & Koridor Solo Raya",
  subtitle = "5 wilayah (Surakarta, Sukoharjo, Karanganyar, Klaten, Sragen) · ketuk titik tiang untuk inspeksi cepat",
  extraHeaderSlot,
}: {
  corridors: CorridorRecord[];
  devices: DeviceRecord[];
  selectedCorridorId: string;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onSelectCorridor: (corridorId: string) => void;
  title?: string;
  subtitle?: string;
  extraHeaderSlot?: React.ReactNode;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const projected = useMemo(() => {
    return devices.map((d) => ({
      device: d,
      ...projectPoint(d.lat, d.lng),
    }));
  }, [devices]);

  const corridorSegments = useMemo(() => {
    const groups = new Map<string, Array<{ x: number; y: number; id: string }>>();
    for (const item of projected) {
      const list = groups.get(item.device.corridor_id) ?? [];
      list.push({ x: item.x, y: item.y, id: item.device.id });
      groups.set(item.device.corridor_id, list);
    }
    return Array.from(groups.entries()).map(([corridorId, pts]) => ({
      corridorId,
      pointsAttr: pts.map((p) => `${p.x},${p.y}`).join(" "),
    }));
  }, [projected]);

  const activeDevice =
    devices.find((d) => d.id === selectedDeviceId) ??
    devices.find((d) => d.status !== "NORMAL") ??
    devices[0] ??
    null;

  // Label wilayah ditempatkan di area bebas agar tidak bertumpuk dengan pin atau callout tiang
  const regionLabels = [
    { name: "KLATEN", x: 96, y: 318 },
    { name: "SUKOHARJO", x: 432, y: 382 },
    { name: "KOTA SURAKARTA", x: 356, y: 174 },
    { name: "KARANGANYAR", x: 642, y: 320 },
    { name: "SRAGEN", x: 678, y: 62 },
  ];

  return (
    <section className="ops-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-semibold text-[#062D5B]">{title}</h2>
          <p className="text-[12px] text-[#5B6B7F]">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {extraHeaderSlot}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#334155] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#15803D]" /> Normal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B45309]" /> EWMA
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B91C1C]" /> Fault F2–F5
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9D174D]" /> Sabotase F6
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Kanvas Kartografi SVG Terang */}
        <div className="lg:col-span-8 bg-[#F8FAFC] border-b lg:border-b-0 lg:border-r border-[#DCE3EC] flex flex-col justify-between">
          <div className="relative overflow-hidden">
            <svg
              viewBox="0 0 800 430"
              className="w-full h-auto block select-none"
              role="img"
              aria-label="Peta GIS Sebaran Tiang REKASURYA Solo Raya"
            >
              <defs>
                <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#DCE3EC"
                    strokeWidth="0.8"
                  />
                </pattern>
              </defs>
              <rect width="800" height="430" fill="url(#map-grid)" />

              {/* Referensi Koordinat WGS84 */}
              <text x="16" y="22" fill="#5B6B7F" fontSize="10" fontFamily="monospace">
                WGS84 · 7°23&apos;S–7°45&apos;S · 110°33&apos;E–111°05&apos;E
              </text>

              {/* Alur Sungai Bengawan Solo */}
              <path
                d="M 110 385 Q 250 320 350 245 T 550 135 T 730 70"
                fill="none"
                stroke="#BAE6FD"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <text x="546" y="160" fill="#0284C7" fillOpacity="0.7" fontSize="9.5" fontWeight="600">
                Alur Bengawan Solo
              </text>

              {/* Label Wilayah Non-Tumpang-Tindih */}
              {regionLabels.map((reg) => (
                <text
                  key={reg.name}
                  x={reg.x}
                  y={reg.y}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="10.5"
                  fontWeight="700"
                  letterSpacing="1.6"
                >
                  {reg.name}
                </text>
              ))}

              {/* Garis Penghubung Koridor */}
              {corridorSegments.map((seg) => {
                const isSelected =
                  selectedCorridorId === "ALL" || selectedCorridorId === seg.corridorId;
                return (
                  <polyline
                    key={seg.corridorId}
                    points={seg.pointsAttr}
                    fill="none"
                    stroke={isSelected ? "#062D5B" : "#CBD5E1"}
                    strokeOpacity={isSelected ? 0.42 : 0.35}
                    strokeWidth={isSelected ? 2.4 : 1.5}
                    strokeLinejoin="round"
                  />
                );
              })}

              {/* Pin Tiang REKASURYA dengan Touch Hitbox Luas */}
              {projected.map(({ device, x, y }) => {
                const isSelected = activeDevice?.id === device.id;
                const isHovered = hoveredId === device.id;
                const isDimmed =
                  selectedCorridorId !== "ALL" && device.corridor_id !== selectedCorridorId;
                const fill = statusFill(device.status);
                const isAlert = device.status !== "NORMAL";
                const showPill = isSelected || isHovered || isAlert;

                return (
                  <g
                    key={device.id}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer"
                    opacity={isDimmed ? 0.28 : 1}
                    onClick={() => onSelectDevice(device.id)}
                    onMouseEnter={() => setHoveredId(device.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Target sentuh besar untuk layar mobile */}
                    <circle r="16" fill="transparent" />

                    {(isSelected || device.status === "TAMPER_CRITICAL") && (
                      <circle
                        r={isSelected ? 14 : 16}
                        fill={fill}
                        fillOpacity="0.14"
                        stroke={fill}
                        strokeWidth="1.5"
                        strokeDasharray={device.status === "TAMPER_CRITICAL" ? "3 2" : undefined}
                      />
                    )}
                    <circle
                      r={isSelected ? 7.5 : isAlert ? 6.5 : 5.2}
                      fill={fill}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />

                    {showPill && (
                      <g transform={`translate(0, ${isSelected ? -17 : -14})`}>
                        <rect
                          x="-30"
                          y="-12"
                          width="60"
                          height="15"
                          rx="4"
                          fill={isSelected ? "#062D5B" : "#FFFFFF"}
                          stroke={isSelected ? "#FEB124" : fill}
                          strokeWidth={isSelected ? "1.5" : "1"}
                        />
                        <text
                          y="-1.5"
                          textAnchor="middle"
                          fill={isSelected ? "#FFFFFF" : "#0B192C"}
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="700"
                        >
                          {device.id}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bilah Filter Koridor Ringkas */}
          <div className="border-t border-[#DCE3EC] bg-[#FFFFFF] px-3 py-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectCorridor("ALL")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md border cursor-pointer transition-colors ${
                selectedCorridorId === "ALL"
                  ? "bg-[#EBF1F8] border-[#062D5B] text-[#062D5B] font-semibold"
                  : "bg-[#FFFFFF] border-[#DCE3EC] text-[#334155] hover:bg-[#F3F6FA]"
              }`}
            >
              Semua Wilayah ({devices.length})
            </button>
            {corridors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCorridor(c.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border cursor-pointer transition-colors ${
                  selectedCorridorId === c.id
                    ? "bg-[#EBF1F8] border-[#062D5B] text-[#062D5B] font-semibold"
                    : "bg-[#FFFFFF] border-[#DCE3EC] text-[#334155] hover:bg-[#F3F6FA]"
                }`}
              >
                {c.kabupaten} ({c.pole_count})
              </button>
            ))}
          </div>
        </div>

        {/* Panel Inspeksi Tiang Terpilih */}
        <div className="lg:col-span-4 bg-[#FFFFFF] p-4 flex flex-col justify-between gap-3">
          {activeDevice ? (
            <>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-[#DCE3EC] pb-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#062D5B]">
                      Inspector Perangkat Terpilih
                    </div>
                    <div className="text-[18px] font-bold font-mono text-[#062D5B] mt-0.5">
                      {activeDevice.id}
                    </div>
                    <div className="text-[13px] font-medium text-[#0B192C] truncate">
                      {activeDevice.pole_label}
                    </div>
                    <div className="text-[12px] text-[#5B6B7F]">
                      {activeDevice.corridor_name} · {activeDevice.kabupaten}
                    </div>
                  </div>
                  <DeviceStatusBadge status={activeDevice.status} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <FaultFamilyBadge
                    family={activeDevice.fault_family}
                    subCode={activeDevice.fault_sub_code}
                  />
                  <SpatialVerdictBadge verdict={activeDevice.spatial_verdict} />
                </div>

                {/* Grid Ringkas 3-Kanal */}
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="ops-inset p-2.5">
                    <div className="text-[11px] text-[#5B6B7F]">PV Input (INA228)</div>
                    <div className="font-mono font-semibold text-[#0B192C] tabular-nums mt-0.5">
                      {formatNum(activeDevice.pv_p)} W
                    </div>
                    <div className="text-[11px] font-mono text-[#5B6B7F] tabular-nums">
                      {formatNum(activeDevice.pv_v)} V · {formatNum(activeDevice.pv_i, 2)} A
                    </div>
                  </div>
                  <div className="ops-inset p-2.5">
                    <div className="text-[11px] text-[#5B6B7F]">Baterai (INA226)</div>
                    <div className="font-mono font-semibold text-[#0B192C] tabular-nums mt-0.5">
                      SoC {formatNum(activeDevice.soc_pct, 0)}% · {formatNum(activeDevice.batt_v)} V
                    </div>
                    <div className="text-[11px] font-mono text-[#5B6B7F] tabular-nums">
                      SoH {formatNum(activeDevice.soh_pct, 1)}% · {formatNum(activeDevice.temp_batt_c)}°C
                    </div>
                  </div>
                  <div className="ops-inset p-2.5">
                    <div className="text-[11px] text-[#5B6B7F]">Beban LED &amp; PWM</div>
                    <div className="font-mono font-semibold text-[#0B192C] tabular-nums mt-0.5">
                      {formatNum(activeDevice.load_p)} W · PWM {activeDevice.pwm_duty}%
                    </div>
                    <div className="text-[11px] font-mono text-[#5B6B7F] tabular-nums">
                      {formatNum(activeDevice.lux, 0)} lx · {formatNum(activeDevice.load_i, 2)} A
                    </div>
                  </div>
                  <div className="ops-inset p-2.5">
                    <div className="text-[11px] text-[#5B6B7F]">EWMA Z &amp; Sel 18650</div>
                    <div
                      className={`font-mono font-semibold tabular-nums mt-0.5 ${
                        activeDevice.ewma_z < activeDevice.ewma_lcl
                          ? "text-[#B45309]"
                          : "text-[#15803D]"
                      }`}
                    >
                      {formatNum(activeDevice.ewma_z, 1)} W
                    </div>
                    <div className="text-[11px] font-mono text-[#5B6B7F] tabular-nums">
                      18650: {formatNum(activeDevice.backup_cell_v, 2)} V{" "}
                      {activeDevice.on_backup_cell === 1 ? "(AKTIF)" : ""}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-[#5B6B7F] flex items-center justify-between pt-1">
                  <span>
                    {activeDevice.lat.toFixed(4)}, {activeDevice.lng.toFixed(4)}
                  </span>
                  <span>{formatWibTime(activeDevice.last_seen_at)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-[#DCE3EC]">
                <Link
                  href={`/devices/${activeDevice.id}`}
                  className="ops-btn-primary flex-1 text-center px-3 py-2 text-[12px]"
                >
                  Buka Diagnostik Teknis
                </Link>
                <Link
                  href={`/work-orders?device=${activeDevice.id}`}
                  className="ops-btn-secondary px-3 py-2 text-[12px]"
                >
                  Work Order
                </Link>
              </div>
            </>
          ) : (
            <div className="text-xs text-[#5B6B7F]">Tidak ada perangkat untuk filter wilayah ini.</div>
          )}
        </div>
      </div>
    </section>
  );
}
