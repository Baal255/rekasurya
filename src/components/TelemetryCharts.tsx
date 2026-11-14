"use client";

import React, { useMemo, useState } from "react";
import { formatNum, formatShortHourWib } from "@/lib/format";
import type { TelemetryHistoryRecord } from "@/lib/types";

type TimeWindowOption = "12" | "24" | "48";

function buildPolyline(
  points: number[],
  width: number,
  height: number,
  minY: number,
  maxY: number,
  padX = 48,
  padY = 20
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

function mapY(val: number, height: number, minY: number, maxY: number, padY = 20): number {
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
  const [windowSize, setWindowSize] = useState<TimeWindowOption>("48");

  const slicedHistory = useMemo(() => {
    const limit = Number(windowSize);
    if (history.length <= limit) return history;
    return history.slice(history.length - limit);
  }, [history, windowSize]);

  if (history.length === 0) {
    return (
      <div className="ops-card p-5 text-xs text-[#64748B]">
        Belum ada riwayat telemetri untuk perangkat ini.
      </div>
    );
  }

  const W = 680;
  const H = 200;
  const padX = 48;
  const padY = 20;

  // 1. Data EWMA Control Chart
  const ewmaVals = slicedHistory.map((h) => h.ewma_z);
  const ewmaMin = Math.min(-30, ewmaLcl - 10, ...ewmaVals);
  const ewmaMax = Math.max(25, ewmaUcl + 10, ...ewmaVals);
  const yZero = mapY(0, H, ewmaMin, ewmaMax, padY);
  const yUcl = mapY(ewmaUcl, H, ewmaMin, ewmaMax, padY);
  const yLcl = mapY(ewmaLcl, H, ewmaMin, ewmaMax, padY);
  const yNeighbor = mapY(neighborMedianZ, H, ewmaMin, ewmaMax, padY);
  const ewmaPoints = buildPolyline(ewmaVals, W, H, ewmaMin, ewmaMax, padX, padY);

  // 2. Data Daya Pengisian Aktual vs Regresi Ekspektasi
  const pvVals = slicedHistory.map((h) => h.pv_p);
  const expVals = slicedHistory.map((h) => h.expected_p_chg);
  const loadVals = slicedHistory.map((h) => h.load_p);
  const powerMax = Math.max(120, ...pvVals, ...expVals, ...loadVals) * 1.1;
  const pvPoints = buildPolyline(pvVals, W, H, 0, powerMax, padX, padY);
  const expPoints = buildPolyline(expVals, W, H, 0, powerMax, padX, padY);
  const loadPoints = buildPolyline(loadVals, W, H, 0, powerMax, padX, padY);

  // 3. Data SoC & Suhu
  const socVals = slicedHistory.map((h) => h.soc_pct);
  const tempBattVals = slicedHistory.map((h) => h.temp_batt_c);
  const tempPanelVals = slicedHistory.map((h) => h.temp_panel_c);

  const firstTs = formatShortHourWib(slicedHistory[0].recorded_at);
  const midTs = formatShortHourWib(slicedHistory[Math.floor(slicedHistory.length / 2)].recorded_at);
  const lastTs = formatShortHourWib(slicedHistory[slicedHistory.length - 1].recorded_at);

  return (
    <section className="space-y-3">
      {/* Toolbar Rentang Waktu Bergaya Grafana */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[#062D5B]">
            Observabilitas Time-Series &amp; Ambang Batas Telemetri
          </h2>
          <p className="text-[12px] text-[#5B6B7F]">
            Menampilkan {slicedHistory.length} sampel historis ({firstTs} – {lastTs} WIB) beserta garis batas anomali
          </p>
        </div>
        <div
          className="inline-flex items-center rounded-md border border-[#DCE3EC] bg-[#FFFFFF] p-0.5 text-[11px] font-medium"
          role="group"
          aria-label="Pemilih rentang waktu grafik"
        >
          {(
            [
              { id: "12", label: "12 Sampel" },
              { id: "24", label: "24 Sampel" },
              { id: "48", label: "Semua (48)" },
            ] as Array<{ id: TimeWindowOption; label: string }>
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setWindowSize(opt.id)}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                windowSize === opt.id
                  ? "bg-[#062D5B] text-white"
                  : "text-[#5B6B7F] hover:text-[#062D5B]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Grafik EWMA */}
        <div className="ops-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[#062D5B]">
                EWMA Residu Daya Demo per Sampel (Zₜ)
              </h3>
              <p className="text-[11px] text-[#5B6B7F]">
                Ambang kendali ±{formatNum(Math.abs(ewmaLcl))} W dibandingkan median koridor
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span className="text-[#B45309] font-semibold">── Zₜ Tiang</span>
              <span className="text-[#B91C1C]">- - LCL ({formatNum(ewmaLcl)} W)</span>
              <span className="text-[#062D5B]">- - Tetangga ({formatNum(neighborMedianZ)} W)</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto bg-[#FFFFFF] border border-[#DCE3EC] rounded-md"
          >
            {/* Zona pelanggaran di luar LCL */}
            <rect
              x={padX}
              y={yLcl}
              width={W - padX * 2}
              height={Math.max(0, H - padY - yLcl)}
              fill="#C43C45"
              fillOpacity="0.08"
            />
            <line x1={padX} y1={padY} x2={W - padX} y2={padY} stroke="#F1F5F9" strokeWidth="1" />
            <line x1={padX} y1={yZero} x2={W - padX} y2={yZero} stroke="#CBD5E1" strokeWidth="1" />
            <line
              x1={padX}
              y1={yUcl}
              x2={W - padX}
              y2={yUcl}
              stroke="#94A3B8"
              strokeDasharray="4 3"
              strokeWidth="1"
            />
            <line
              x1={padX}
              y1={yLcl}
              x2={W - padX}
              y2={yLcl}
              stroke="#C43C45"
              strokeDasharray="4 3"
              strokeWidth="1.4"
            />
            <line
              x1={padX}
              y1={yNeighbor}
              x2={W - padX}
              y2={yNeighbor}
              stroke="#2563EB"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
            <polyline
              fill="none"
              stroke="#B7791F"
              strokeWidth="2.2"
              strokeLinejoin="round"
              points={ewmaPoints}
            />
            <text x="6" y={yUcl + 3} fill="#64748B" fontSize="9.5" fontFamily="monospace">
              +{formatNum(ewmaUcl, 0)}
            </text>
            <text x="6" y={yZero + 3} fill="#64748B" fontSize="9.5" fontFamily="monospace">
              0 W
            </text>
            <text x="6" y={yLcl + 3} fill="#C43C45" fontSize="9.5" fontFamily="monospace" fontWeight="600">
              {formatNum(ewmaLcl, 0)}
            </text>
            <text x={padX} y={H - 5} fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {firstTs}
            </text>
            <text x={W / 2} y={H - 5} textAnchor="middle" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {midTs}
            </text>
            <text x={W - padX} y={H - 5} textAnchor="end" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {lastTs}
            </text>
          </svg>
        </div>

        {/* Grafik Daya Aktual vs Ekspektasi vs Beban */}
        <div className="ops-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[#062D5B]">
                Daya PV dan Beban LED pada Simulasi (W)
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Ekspektasi demo dihitung dari iluminansi, suhu panel, dan SoC. Selisihnya dipakai sebagai indikasi dalam skenario.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span className="text-[#062D5B] font-semibold">── PV Simulasi</span>
              <span className="text-[#5B6B7F]">- - Ekspektasi</span>
              <span className="text-[#B45309]">── Beban LED</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto bg-[#FFFFFF] border border-[#DCE3EC] rounded-md"
          >
            <line x1={padX} y1={padY} x2={W - padX} y2={padY} stroke="#F1F5F9" strokeWidth="1" />
            <line x1={padX} y1={H / 2} x2={W - padX} y2={H / 2} stroke="#F1F5F9" strokeWidth="1" />
            <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#CBD5E1" strokeWidth="1" />
            <polyline
              fill="none"
              stroke="#5B6B7F"
              strokeWidth="1.6"
              strokeDasharray="5 3"
              points={expPoints}
            />
            <polyline
              fill="none"
              stroke="#FEB124"
              strokeWidth="2"
              strokeLinejoin="round"
              points={loadPoints}
            />
            <polyline
              fill="none"
              stroke="#062D5B"
              strokeWidth="2.3"
              strokeLinejoin="round"
              points={pvPoints}
            />
            <text x="6" y={padY + 6} fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {formatNum(powerMax, 0)}W
            </text>
            <text x="6" y={H / 2 + 3} fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {formatNum(powerMax / 2, 0)}W
            </text>
            <text x="6" y={H - padY} fill="#64748B" fontSize="9.5" fontFamily="monospace">
              0W
            </text>
            <text x={padX} y={H - 5} fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {firstTs}
            </text>
            <text x={W / 2} y={H - 5} textAnchor="middle" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {midTs}
            </text>
            <text x={W - padX} y={H - 5} textAnchor="end" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {lastTs}
            </text>
          </svg>
        </div>

        {/* Grafik SoC vs Suhu Pack & Panel */}
        <div className="ops-card p-4 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[#062D5B]">
                State of Charge (SoC %) &amp; Tren Termal Baterai/Panel (°C)
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Garis merah putus-putus menandai ambang suhu demo 50 °C.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span className="text-[#062D5B] font-semibold">── SoC (%)</span>
              <span className="text-[#B91C1C]">── Suhu Baterai (°C)</span>
              <span className="text-[#B45309]">── Suhu Panel (°C)</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${W * 1.4} 150`}
            className="w-full h-auto bg-[#FFFFFF] border border-[#DCE3EC] rounded-md"
          >
            <line x1={padX} y1={padY} x2={W * 1.4 - padX} y2={padY} stroke="#F1F5F9" strokeWidth="1" />
            <line
              x1={padX}
              y1={mapY(50, 150, 0, 100, padY)}
              x2={W * 1.4 - padX}
              y2={mapY(50, 150, 0, 100, padY)}
              stroke="#B91C1C"
              strokeOpacity="0.6"
              strokeDasharray="4 3"
            />
            <line
              x1={padX}
              y1={150 - padY}
              x2={W * 1.4 - padX}
              y2={150 - padY}
              stroke="#CBD5E1"
              strokeWidth="1"
            />
            <polyline
              fill="none"
              stroke="#062D5B"
              strokeWidth="2.2"
              strokeLinejoin="round"
              points={buildPolyline(socVals, W * 1.4, 150, 0, 100, padX, padY)}
            />
            <polyline
              fill="none"
              stroke="#FEB124"
              strokeWidth="1.8"
              strokeLinejoin="round"
              points={buildPolyline(tempPanelVals, W * 1.4, 150, 0, 100, padX, padY)}
            />
            <polyline
              fill="none"
              stroke="#B91C1C"
              strokeWidth="2"
              strokeLinejoin="round"
              points={buildPolyline(tempBattVals, W * 1.4, 150, 0, 100, padX, padY)}
            />
            <text x="6" y="25" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              100
            </text>
            <text x="6" y={mapY(50, 150, 0, 100, padY) + 3} fill="#C43C45" fontSize="9.5" fontFamily="monospace" fontWeight="600">
              50°C
            </text>
            <text x="6" y="132" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              0
            </text>
            <text x={padX} y="145" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {firstTs}
            </text>
            <text x={(W * 1.4) / 2} y="145" textAnchor="middle" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {midTs}
            </text>
            <text x={W * 1.4 - padX} y="145" textAnchor="end" fill="#64748B" fontSize="9.5" fontFamily="monospace">
              {lastTs}
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
