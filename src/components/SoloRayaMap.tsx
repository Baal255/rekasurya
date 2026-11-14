"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { DeviceStatusBadge, FaultFamilyBadge, SpatialVerdictBadge } from "./StatusBadges";
import { formatNum, formatWibTime } from "@/lib/format";
import type { CorridorRecord, DeviceRecord } from "@/lib/types";

// Batas geografis wilayah eks-Karesidenan Surakarta (Solo Raya) untuk proyeksi SVG datar presisi
const LAT_MAX = -7.39;
const LAT_MIN = -7.75;
const LNG_MIN = 110.56;
const LNG_MAX = 111.08;

function projectPoint(lat: number, lng: number): { x: number; y: number } {
  const padX = 56;
  const padY = 44;
  const width = 800 - padX * 2;
  const height = 430 - padY * 2;
  const x = padX + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * width;
  const y = padY + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * height;
  return {
    x: Math.max(24, Math.min(776, Number(x.toFixed(1)))),
    y: Math.max(24, Math.min(406, Number(y.toFixed(1)))),
  };
}

function statusFill(status: string): string {
  switch (status) {
    case "NORMAL":
      return "#10B981";
    case "WARNING_EWMA":
      return "#F59E0B";
    case "FAULT":
      return "#EF4444";
    case "TAMPER_CRITICAL":
      return "#D946EF";
    default:
      return "#64748B";
  }
}

export function SoloRayaMap({
  corridors,
  devices,
  selectedCorridorId,
  selectedDeviceId,
  onSelectDevice,
  onSelectCorridor,
}: {
  corridors: CorridorRecord[];
  devices: DeviceRecord[];
  selectedCorridorId: string;
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onSelectCorridor: (corridorId: string) => void;
}) {
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

  return (
    <div className="scada-panel p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Peta Telemetri &amp; Koridor Wilayah Solo Raya
          </h2>
          <p className="text-xs text-slate-400">
            5 koridor (Surakarta, Sukoharjo, Karanganyar, Klaten, Sragen) · klik pin tiang untuk triase &amp; korelasi tetangga
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Normal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> EWMA
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" /> Fault F2–F5
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D946EF]" /> Sabotase F6
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Kanvas SVG GIS */}
        <div className="lg:col-span-8 scada-inset scada-grid-bg relative overflow-hidden">
          <svg
            viewBox="0 0 800 430"
            className="w-full h-auto block select-none"
            role="img"
            aria-label="Peta GIS Sebaran Tiang REKASURYA Solo Raya"
          >
            {/* Referensi Koordinat Lat/Lng Halus */}
            <text x="16" y="20" fill="#64748B" fontSize="10" fontFamily="monospace">
              LAT 7°23&apos;S – 7°45&apos;S · LON 110°33&apos;E – 111°05&apos;E (WGS84)
            </text>

            {/* Garis Referensi Alur Sungai Bengawan Solo (ilustratif wilayah) */}
            <path
              d="M 110 385 Q 250 320 350 245 T 550 135 T 730 70"
              fill="none"
              stroke="#0E7490"
              strokeOpacity="0.35"
              strokeWidth="4"
              strokeDasharray="6 4"
            />
            <text x="580" y="138" fill="#0E7490" fillOpacity="0.65" fontSize="9" fontFamily="monospace">
              Alur Bengawan Solo
            </text>

            {/* Label Wilayah Kab/Kota Solo Raya */}
            {[
              { name: "KLATEN", ...projectPoint(-7.705, 110.61) },
              { name: "SUKOHARJO", ...projectPoint(-7.688, 110.84) },
              { name: "KOTA SURAKARTA", ...projectPoint(-7.542, 110.81) },
              { name: "KARANGANYAR", ...projectPoint(-7.605, 110.95) },
              { name: "SRAGEN", ...projectPoint(-7.425, 111.01) },
            ].map((reg) => (
              <g key={reg.name} transform={`translate(${reg.x}, ${reg.y - 26})`}>
                <text
                  textAnchor="middle"
                  fill="#94A3B8"
                  fillOpacity="0.45"
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="2"
                >
                  {reg.name}
                </text>
              </g>
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
                  stroke={isSelected ? "#0EA5E9" : "#334155"}
                  strokeOpacity={isSelected ? 0.65 : 0.25}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
              );
            })}

            {/* Pin Tiang REKASURYA */}
            {projected.map(({ device, x, y }) => {
              const isSelected = activeDevice?.id === device.id;
              const isDimmed =
                selectedCorridorId !== "ALL" && device.corridor_id !== selectedCorridorId;
              const fill = statusFill(device.status);
              const isAlert = device.status !== "NORMAL";
              return (
                <g
                  key={device.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  opacity={isDimmed ? 0.28 : 1}
                  onClick={() => onSelectDevice(device.id)}
                >
                  {/* Lingkar Geofence untuk Sabotase / Pilihan */}
                  {(isSelected || device.status === "TAMPER_CRITICAL") && (
                    <circle
                      r={device.status === "TAMPER_CRITICAL" ? 16 : 13}
                      fill={fill}
                      fillOpacity="0.14"
                      stroke={fill}
                      strokeWidth="1.25"
                      strokeDasharray={device.status === "TAMPER_CRITICAL" ? "3 2" : undefined}
                    />
                  )}
                  <circle
                    r={isSelected ? 7.5 : isAlert ? 6.5 : 5}
                    fill={fill}
                    stroke="#0B0F17"
                    strokeWidth="2"
                  />
                  {/* Label ID tiang pada perangkat bermasalah atau sedang dipilih */}
                  {(isAlert || isSelected) && (
                    <g transform="translate(0, -14)">
                      <rect
                        x="-32"
                        y="-12"
                        width="64"
                        height="15"
                        rx="3"
                        fill="#0B0F17"
                        fillOpacity="0.9"
                        stroke={fill}
                        strokeWidth="0.9"
                      />
                      <text
                        y="-1.5"
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {device.id}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Bilah Filter Cepat Koridor di bawah peta */}
          <div className="border-t border-[#1E293B] bg-[#0F1623] px-3 py-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectCorridor("ALL")}
              className={`px-2 py-1 text-[11px] font-mono rounded border cursor-pointer ${
                selectedCorridorId === "ALL"
                  ? "bg-[#0EA5E9]/20 border-[#0EA5E9] text-sky-200"
                  : "bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200"
              }`}
            >
              Semua ({devices.length})
            </button>
            {corridors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCorridor(c.id)}
                className={`px-2 py-1 text-[11px] font-mono rounded border cursor-pointer ${
                  selectedCorridorId === c.id
                    ? "bg-[#0EA5E9]/20 border-[#0EA5E9] text-sky-200"
                    : "bg-[#111827] border-[#1E293B] text-slate-400 hover:text-slate-200"
                }`}
              >
                {c.kabupaten} ({c.pole_count})
              </button>
            ))}
          </div>
        </div>

        {/* Kartu Ringkas Tiang Terpilih */}
        <div className="lg:col-span-4 scada-inset p-3.5 flex flex-col justify-between gap-3">
          {activeDevice ? (
            <>
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2 border-b border-[#1E293B] pb-2.5">
                  <div>
                    <div className="text-[11px] font-mono text-sky-400 uppercase tracking-wider">
                      Tiang Terpilih
                    </div>
                    <div className="text-base font-bold font-mono text-slate-100">
                      {activeDevice.id}
                    </div>
                    <div className="text-xs text-slate-300">{activeDevice.pole_label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
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
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#0B0F17] border border-[#1E293B] rounded p-2">
                    <div className="text-[10px] text-slate-400">PV INA228</div>
                    <div className="text-slate-100 font-semibold">
                      {formatNum(activeDevice.pv_v)} V / {formatNum(activeDevice.pv_i, 2)} A
                    </div>
                    <div className="text-[11px] text-sky-300">{formatNum(activeDevice.pv_p)} W</div>
                  </div>
                  <div className="bg-[#0B0F17] border border-[#1E293B] rounded p-2">
                    <div className="text-[10px] text-slate-400">BATT INA226</div>
                    <div className="text-slate-100 font-semibold">
                      {formatNum(activeDevice.batt_v)} V · SoC {formatNum(activeDevice.soc_pct, 0)}%
                    </div>
                    <div className="text-[11px] text-slate-300">
                      SoH {formatNum(activeDevice.soh_pct, 1)}%
                    </div>
                  </div>
                  <div className="bg-[#0B0F17] border border-[#1E293B] rounded p-2">
                    <div className="text-[10px] text-slate-400">LOAD LED / PWM</div>
                    <div className="text-slate-100 font-semibold">
                      {formatNum(activeDevice.load_i, 2)} A · PWM {activeDevice.pwm_duty}%
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Lux {formatNum(activeDevice.lux, 0)}
                    </div>
                  </div>
                  <div className="bg-[#0B0F17] border border-[#1E293B] rounded p-2">
                    <div className="text-[10px] text-slate-400">EWMA Z / 18650</div>
                    <div
                      className={`font-semibold ${
                        activeDevice.ewma_z < activeDevice.ewma_lcl
                          ? "text-amber-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {formatNum(activeDevice.ewma_z, 1)} W
                    </div>
                    <div className="text-[11px] text-slate-300">
                      18650: {formatNum(activeDevice.backup_cell_v, 2)} V{" "}
                      {activeDevice.on_backup_cell === 1 ? "(AKTIF)" : ""}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
                  <span>
                    Koordinat: {activeDevice.lat.toFixed(4)}, {activeDevice.lng.toFixed(4)}
                  </span>
                  <span>{formatWibTime(activeDevice.last_seen_at)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1E293B]">
                <Link
                  href={`/devices/${activeDevice.id}`}
                  className="flex-1 text-center px-3 py-1.5 text-xs font-semibold rounded bg-[#0EA5E9] text-slate-950 hover:bg-sky-400 transition-colors"
                >
                  Diagnostik 3-Kanal
                </Link>
                <Link
                  href={`/work-orders?device=${activeDevice.id}`}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-[#334155] bg-[#111827] text-slate-200 hover:border-slate-400 transition-colors"
                >
                  Work Order
                </Link>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">Tidak ada perangkat untuk filter ini.</div>
          )}
        </div>
      </div>
    </div>
  );
}
