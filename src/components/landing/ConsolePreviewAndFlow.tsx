import React from "react";
import Link from "next/link";
import { RekasuryaLogo } from "@/components/RekasuryaLogo";
import { DeviceStatusBadge, FaultFamilyBadge } from "@/components/StatusBadges";
import { formatIdr, formatNum } from "@/lib/format";
import type {
  CorridorRecord,
  DeviceRecord,
  SparePartRecommendation,
  WorkOrderRecord,
} from "@/lib/types";

interface ConsolePreviewAndFlowProps {
  stats: {
    totalDevices: number;
    normalDevices: number;
    activeFaults: number;
    tamperCritical: number;
    openWorkOrders: number;
    avgUptime30dPct: number;
  };
  corridors: CorridorRecord[];
  priorityDevices: DeviceRecord[];
  leadWorkOrder:
    | (WorkOrderRecord & { pole_label: string; corridor_name: string; kabupaten: string })
    | null;
  leadWorkOrderParts: SparePartRecommendation[];
}

const FLOW_STEPS = [
  {
    num: "01",
    title: "Deteksi 3-Kanal",
    detail: "INA228 memantau PV, LiFePO4, dan LED secara terpisah tiap siklus.",
    output: "Zₜ & status fisik masuk",
  },
  {
    num: "02",
    title: "Lokalisasi Sekoridor",
    detail: "Residu EWMA dibandingkan dengan median tiang tetangga agar cuaca tidak memicu alarm.",
    output: "CUACA_SERUAS vs ANOMALI_LOKAL",
  },
  {
    num: "03",
    title: "Work Order & SKU",
    detail: "Kode F1–F6 menghasilkan tugas otomatis dengan suku cadang serta batas SLA jam.",
    output: "Daftar SKU di kabin sky-lift",
  },
  {
    num: "04",
    title: "Penanganan 90 m",
    detail: "Teknisi check-in GPS dalam geofence tiang agar pembukaan boks diberi izin sementara.",
    output: "maintenance_until aktif",
  },
  {
    num: "05",
    title: "Verifikasi Pemulihan",
    detail: "Pengukuran arus/tegangan pasca-perbaikan memastikan tiang kembali NORMAL.",
    output: "Tiket warga → Resolved",
  },
  {
    num: "06",
    title: "Dampak & Audit",
    detail: "Setiap perubahan status dan kWh tercatat berantai pada log hash SHA-256.",
    output: "Rekap penghematan PP 4/2023",
  },
];

export function ConsolePreviewAndFlow({
  stats,
  corridors,
  priorityDevices,
  leadWorkOrder,
  leadWorkOrderParts,
}: ConsolePreviewAndFlowProps) {
  return (
    <section
      id="pratinjau"
      data-nav="light"
      className="py-12 sm:py-16 bg-white border-y border-[#DCE3EC]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 space-y-12">
        {/* Header Seksi Pratinjau 1:1 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#B45309]">
              02 · PRATINJAU KONSOL &amp; MODE LAPANGAN 1:1
            </div>
            <h2 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-[#062D5B] leading-tight">
              Tampilan ruang kendali Dishub &amp; mode check-in regu sky-lift menggunakan data
              SQLite nyata.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/console" className="ops-btn-primary px-4 py-2 text-[12.5px]">
              Buka Konsol Lengkap →
            </Link>
            <Link href="/work-orders" className="ops-btn-secondary px-4 py-2 text-[12.5px]">
              Mode Teknisi Lapangan
            </Link>
          </div>
        </div>

        {/* Grid 1:1 Console Mockup + Field Sky-Lift Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Bingkai Konsol Operasional Asli (7 kolom) */}
          <div className="lg:col-span-7 min-w-0 rounded-2xl border border-[#DCE3EC] bg-[#F4F6F9] shadow-[var(--sh-3)] overflow-hidden">
            {/* Bar Jendela Browser Minimal */}
            <div className="h-9 bg-white border-b border-[#DCE3EC] px-3.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#DCE3EC]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#DCE3EC]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#DCE3EC]" />
                <span className="ml-2 font-mono text-[#5B6B7F]">/console</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#FFF8E7] border border-[#FEB124]/60 text-[10px] font-mono text-[#062D5B]">
                Live Snapshot DB
              </span>
            </div>

            {/* Isi Miniatur Konsol */}
            <div className="grid grid-cols-1 sm:grid-cols-12">
              {/* Mini Sidebar Navy */}
              <div className="hidden sm:flex sm:col-span-3 bg-[#062D5B] text-white p-3 flex-col justify-between min-h-[340px]">
                <div className="space-y-4">
                  <RekasuryaLogo variant="on-dark" height={24} />
                  <div className="space-y-1 text-[11px]">
                    <div className="px-2 py-1.5 rounded bg-white/15 border-l-2 border-[#FEB124] font-semibold text-white">
                      Ringkasan Konsol
                    </div>
                    <div className="px-2 py-1 text-white/75">Inventori Tiang</div>
                    <div className="px-2 py-1 text-white/75 flex items-center justify-between">
                      <span>Alarm</span>
                      <span className="px-1.5 rounded bg-[#FEB124] text-[#041E3E] font-mono text-[10px] font-bold">
                        {stats.activeFaults}
                      </span>
                    </div>
                    <div className="px-2 py-1 text-white/75">Work Order</div>
                    <div className="px-2 py-1 text-white/75">Peta Solo Raya</div>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/15 text-[10px] text-white/65 font-mono">
                  {corridors.length} koridor • {stats.avgUptime30dPct}% uptime
                </div>
              </div>

              {/* Area Kerja Utama Mini Konsol */}
              <div className="sm:col-span-9 p-3.5 space-y-3 bg-[#F4F6F9] min-w-0">
                {/* Command Banner Navy Ringkas */}
                <div className="rounded-lg bg-[#062D5B] text-white p-3 grid grid-cols-4 gap-2 text-center sm:text-left">
                  <div>
                    <div className="text-[9.5px] uppercase text-white/60">Armada</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums">
                      {stats.totalDevices}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase text-white/60">Normal</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums text-[#A7F3D0]">
                      {stats.normalDevices}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase text-white/60">Gangguan</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums text-[#FFD585]">
                      {stats.activeFaults}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase text-white/60">Tamper</div>
                    <div className="text-[15px] font-mono font-bold tabular-nums text-[#FEB124]">
                      {stats.tamperCritical}
                    </div>
                  </div>
                </div>

                {/* Tabel Antrean Prioritas Nyata */}
                <div className="rounded-lg bg-white border border-[#DCE3EC] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#DCE3EC] flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#062D5B]">
                      Antrean Prioritas Perangkat
                    </span>
                    <span className="text-[#5B6B7F] font-mono">urut severitas</span>
                  </div>
                  <div className="divide-y divide-[#DCE3EC]">
                    {priorityDevices.map((dev) => (
                      <Link
                        key={dev.id}
                        href={`/devices/${dev.id}`}
                        className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-[#F3F6FA] transition-colors text-[11.5px]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-[#062D5B]">{dev.id}</span>
                            <FaultFamilyBadge
                              family={dev.fault_family}
                              subCode={dev.fault_sub_code}
                            />
                          </div>
                          <div className="text-[11px] text-[#5B6B7F] truncate">
                            {dev.pole_label} · {dev.kabupaten}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="hidden sm:inline font-mono text-[11px] text-[#334155] tabular-nums">
                            SoC {formatNum(dev.soc_pct, 0)}%
                          </span>
                          <DeviceStatusBadge status={dev.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Mode Teknisi Sky-Lift Lapangan (5 kolom) */}
          <div className="lg:col-span-5 min-w-0 space-y-4">
            <div className="ops-card p-5 border-t-4 border-t-[#FEB124] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10.5px] font-mono font-semibold uppercase tracking-wider text-[#B45309]">
                    WORK ORDER AKTIF DI LAPANGAN
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#062D5B]">
                    {leadWorkOrder ? leadWorkOrder.id : "Belum ada Work Order terbuka"}
                  </h3>
                </div>
                {leadWorkOrder && (
                  <span className="px-2.5 py-1 rounded bg-[#FFF8E7] border border-[#FEB124]/60 font-mono text-[11px] font-bold text-[#062D5B]">
                    {leadWorkOrder.priority}
                  </span>
                )}
              </div>

              {leadWorkOrder ? (
                <>
                  <div className="space-y-1 text-[12.5px]">
                    <div className="font-semibold text-[#0B192C]">{leadWorkOrder.title}</div>
                    <div className="text-[#5B6B7F]">
                      Tiang <span className="font-mono text-[#062D5B]">{leadWorkOrder.device_id}</span>{" "}
                      · {leadWorkOrder.pole_label} ({leadWorkOrder.corridor_name})
                    </div>
                    <div className="text-[#334155] pt-1">{leadWorkOrder.diagnosis_summary}</div>
                  </div>

                  <div className="rounded-lg bg-[#F4F6F9] border border-[#DCE3EC] p-3 space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-[#5B6B7F]">Regu &amp; Armada</span>
                      <span className="font-semibold text-[#062D5B]">
                        {leadWorkOrder.assigned_team} · {leadWorkOrder.truck_unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5B6B7F]">Pagar Otorisasi GPS</span>
                      <span className="font-mono text-[#062D5B]">Radius ≤ 90 meter</span>
                    </div>
                  </div>

                  {leadWorkOrderParts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6B7F]">
                        Checklist Suku Cadang Dibawa ke Kabin
                      </div>
                      <ul className="space-y-1.5">
                        {leadWorkOrderParts.slice(0, 3).map((part) => (
                          <li
                            key={part.sku}
                            className="flex items-center justify-between gap-2 text-[12px] px-2.5 py-1.5 rounded bg-[#F8FAFC] border border-[#DCE3EC]"
                          >
                            <span className="truncate">
                              <span className="font-mono font-semibold text-[#062D5B]">
                                {part.sku}
                              </span>{" "}
                              — {part.name}
                            </span>
                            <span className="font-mono text-[#334155] shrink-0">
                              {part.quantity} {part.unit} ({formatIdr(part.estimatedIdr)})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#DCE3EC]">
                    <span className="text-[11.5px] text-[#5B6B7F]">
                      Total {stats.openWorkOrders} Work Order aktif di SQLite
                    </span>
                    <Link
                      href="/work-orders"
                      className="text-[12.5px] font-semibold text-[#062D5B] hover:underline"
                    >
                      Check-In &amp; Verifikasi →
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-[#5B6B7F]">
                  Seluruh Work Order dalam basis data simulasi telah berstatus VERIFIED/CLOSED.
                  Anda dapat memicu skenario gangguan baru dari halaman Simulator.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================
            RANTAI OPERASIONAL 6-TAHAP (RAIL ADAPTIF)
            ================================================================ */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#5B6B7F]">
                ALUR OPERASIONAL END-TO-END
              </div>
              <h3 className="text-[18px] sm:text-[20px] font-semibold text-[#062D5B]">
                Dari residu sensor di tiang hingga laporan warga tertutup dengan bukti.
              </h3>
            </div>
            <span className="text-[11.5px] font-mono text-[#5B6B7F]">
              Geser ke kanan pada layar sempit →
            </span>
          </div>

          <div className="landing-rail flex lg:grid lg:grid-cols-6 gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
            {FLOW_STEPS.map((step) => (
              <div
                key={step.num}
                className="min-w-[235px] lg:min-w-0 snap-start rounded-xl bg-[#F4F6F9] border border-[#DCE3EC] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] font-bold px-2 py-0.5 rounded bg-[#062D5B] text-[#FFD585]">
                      {step.num}
                    </span>
                    <span className="w-5 h-px bg-[#DCE3EC]" />
                  </div>
                  <h4 className="text-[14px] font-semibold text-[#062D5B]">{step.title}</h4>
                  <p className="text-[12px] text-[#334155] leading-relaxed">{step.detail}</p>
                </div>
                <div className="pt-2 border-t border-[#DCE3EC] text-[11px] font-mono text-[#5B6B7F]">
                  {step.output}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
