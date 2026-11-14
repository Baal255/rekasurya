"use client";

import React from "react";
import { formatNum, formatShortHourWib } from "@/lib/format";
import type { TelemetryHistoryRecord } from "@/lib/types";

function buildPolyline(
  points: number[],
  width: number,
  height: number,
  minY: number,
  maxY: number,
  padX = 42,
  padY = 18
): string {
  if (points.length === 0) return "";
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const span = Math.max(0.001, maxY - minY);

  return points
    .map((val, idx) => {
      const x =
        points.length === 1 ? padX + innerW / 2 : padX + (idx / (points.length - 1)) * innerW;
      const clamped = Math.max(minY, Math.min(maxY, val));
      const y = padY + (1 - (clamped - minY) / span) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function mapY(val: number, height: number, minY: number, maxY: number, padY = 18): number {
  const innerH = height - padY * 2;
  const span = Math.max(0.001, maxY - minY);
  const clamped = Math.max(minY, Math.min(maxY, val));
  return padY + (1 - (clamped - minY) / span) * innerH;
}

export function TelemetryCharts({
  history,
  ewmaUcl,
  ewmaLcl,
  neighborMedianZ,
}: {
  history: TelemetryHistoryRecord[];
  ewmaUcl: number;
  ewmaLcl: number;
  neighborMedianZ: number;
}) {
  if (history.length === 0) {
    return (
      <div className="scada-panel p-4 text-xs text-slate-400">
        Belum ada riwayat telemetri untuk tiang ini.
      </div>
    );
  }

  const W = 680;
  const H = 190;
  const padX = 44;
  const padY = 18;

  // 1. Data EWMA Control Chart
  const ewmaVals = history.map((h) => h.ewma_z);
  const ewmaMin = Math.min(-30, ewmaLcl - 10, ...ewmaVals);
  const ewmaMax = Math.max(25, ewmaUcl + 10, ...ewmaVals);
  const yZero = mapY(0, H, ewmaMin, ewmaMax, padY);
  const yUcl = mapY(ewmaUcl, H, ewmaMin, ewmaMax, padY);
  const yLcl = mapY(ewmaLcl, H, ewmaMin, ewmaMax, padY);
  const yNeighbor = mapY(neighborMedianZ, H, ewmaMin, ewmaMax, padY);
  const ewmaPoints = buildPolyline(ewmaVals, W, H, ewmaMin, ewmaMax, padX, padY);

  // 2. Data Daya Pengisian Aktual vs Regresi Ekspektasi
  const pvVals = history.map((h) => h.pv_p);
  const expVals = history.map((h) => h.expected_p_chg);
  const powerMax = Math.max(120, ...pvVals, ...expVals) * 1.1;
  const pvPoints = buildPolyline(pvVals, W, H, 0, powerMax, padX, padY);
  const expPoints = buildPolyline(expVals, W, H, 0, powerMax, padX, padY);

  // 3. Data SoC & Suhu
  const socVals = history.map((h) => h.soc_pct);
  const tempBattVals = history.map((h) => h.temp_batt_c);
  const socPoints = buildPolyline(socVals, W, H, 0, 100, padX, padY);
  const tempPoints = buildPolyline(tempBattVals, W, H, 0, 100, padX, padY);

  const firstTs = formatShortHourWib(history[0].recorded_at);
  const midTs = formatShortHourWib(history[Math.floor(history.length / 2)].recorded_at);
  const lastTs = formatShortHourWib(history[history.length - 1].recorded_at);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Grafik EWMA */}
      <div className="scada-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
              Peta Kendali EWMA Residu Pengisian (Zₜ)
            </h3>
            <p className="text-[11px] text-slate-400">
              Deteksi pergeseran persisten dibanding batas kendali ±{formatNum(Math.abs(ewmaLcl))} W &amp; median koridor
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-amber-300">── Zₜ Tiang</span>
            <span className="text-red-400">- - LCL ({formatNum(ewmaLcl)} W)</span>
            <span className="text-sky-400">- - Tetangga ({formatNum(neighborMedianZ)} W)</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-[#0B0F17] border border-[#1E293B] rounded">
          {/* Zona di luar LCL */}
          <rect
            x={padX}
            y={yLcl}
            width={W - padX * 2}
            height={Math.max(0, H - padY - yLcl)}
            fill="#EF4444"
            fillOpacity="0.1"
          />
          <line x1={padX} y1={yZero} x2={W - padX} y2={yZero} stroke="#334155" strokeWidth="1" />
          <line
            x1={padX}
            y1={yUcl}
            x2={W - padX}
            y2={yUcl}
            stroke="#64748B"
            strokeDasharray="4 3"
            strokeWidth="1"
          />
          <line
            x1={padX}
            y1={yLcl}
            x2={W - padX}
            y2={yLcl}
            stroke="#EF4444"
            strokeDasharray="4 3"
            strokeWidth="1.2"
          />
          <line
            x1={padX}
            y1={yNeighbor}
            x2={W - padX}
            y2={yNeighbor}
            stroke="#0EA5E9"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />
          <polyline fill="none" stroke="#F59E0B" strokeWidth="2.2" points={ewmaPoints} />
          <text x="6" y={yUcl + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace">
            +{formatNum(ewmaUcl, 0)}
          </text>
          <text x="6" y={yZero + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace">
            0 W
          </text>
          <text x="6" y={yLcl + 3} fill="#FCA5A5" fontSize="9" fontFamily="monospace">
            {formatNum(ewmaLcl, 0)}
          </text>
          <text x={padX} y={H - 4} fill="#64748B" fontSize="9" fontFamily="monospace">
            {firstTs}
          </text>
          <text x={W / 2} y={H - 4} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
            {midTs}
          </text>
          <text x={W - padX} y={H - 4} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
            {lastTs}
          </text>
        </svg>
      </div>

      {/* Grafik Daya Aktual vs Ekspektasi */}
      <div className="scada-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
              Daya PV Aktual vs Kurva Ekspektasi ({history.length} Sampel)
            </h3>
            <p className="text-[11px] text-slate-400">
              Selisih antara garis ekspektasi (putus-putus) dan daya INA228 mengungkap soiling/SCC fault
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-emerald-300">── PV Aktual (W)</span>
            <span className="text-sky-300">- - Ekspektasi (W)</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-[#0B0F17] border border-[#1E293B] rounded">
          <line x1={padX} y1={padY} x2={W - padX} y2={padY} stroke="#1E293B" strokeWidth="1" />
          <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="#1E293B" strokeWidth="1" />
          <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#334155" strokeWidth="1" />
          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="1.8"
            strokeDasharray="5 3"
            points={expPoints}
          />
          <polyline fill="none" stroke="#10B981" strokeWidth="2.2" points={pvPoints} />
          <text x="6" y={padY + 6} fill="#94A3B8" fontSize="9" fontFamily="monospace">
            {formatNum(powerMax, 0)}W
          </text>
          <text x="6" y={H / 2 + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace">
            {formatNum(powerMax / 2, 0)}W
          </text>
          <text x="6" y={H - padY} fill="#94A3B8" fontSize="9" fontFamily="monospace">
            0W
          </text>
          <text x={padX} y={H - 4} fill="#64748B" fontSize="9" fontFamily="monospace">
            {firstTs}
          </text>
          <text x={W - padX} y={H - 4} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
            {lastTs}
          </text>
        </svg>
      </div>

      {/* Grafik SoC vs Suhu Baterai */}
      <div className="scada-panel p-4 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider">
              Profil State of Charge (SoC %) &amp; Suhu Pack Baterai NTC (°C)
            </h3>
            <p className="text-[11px] text-slate-400">
              Pemantauan siklus pengisian-pengosongan LiFePO4 serta ambang termal 50 °C
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-sky-300">── SoC (%)</span>
            <span className="text-rose-300">── Suhu Baterai (°C)</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W * 1.4} 145`} className="w-full h-auto bg-[#0B0F17] border border-[#1E293B] rounded">
          <line
            x1={padX}
            y1={mapY(50, 145, 0, 100, padY)}
            x2={W * 1.4 - padX}
            y2={mapY(50, 145, 0, 100, padY)}
            stroke="#EF4444"
            strokeOpacity="0.45"
            strokeDasharray="4 3"
          />
          <polyline
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            points={buildPolyline(socVals, W * 1.4, 145, 0, 100, padX, padY)}
          />
          <polyline
            fill="none"
            stroke="#FB7185"
            strokeWidth="2"
            points={buildPolyline(tempBattVals, W * 1.4, 145, 0, 100, padX, padY)}
          />
          <text x="6" y="24" fill="#94A3B8" fontSize="9" fontFamily="monospace">
            100
          </text>
          <text x="6" y={mapY(50, 145, 0, 100, padY) + 3} fill="#FCA5A5" fontSize="9" fontFamily="monospace">
            50°C
          </text>
          <text x="6" y="128" fill="#94A3B8" fontSize="9" fontFamily="monospace">
            0
          </text>
        </svg>
      </div>
    </div>
  );
}
