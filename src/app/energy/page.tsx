"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOperationalRole } from "@/components/AppShell";
import { PageHeader } from "@/components/UiPrimitives";
import {
  calculateEnergyAndSavings,
  DEFAULT_ENERGY_INPUT,
  type EnergyCalcInput,
  type EnergyCalcResult,
  type LegacyLampType,
} from "@/lib/energy/calculator";
import { formatIdr, formatNum } from "@/lib/format";
import type { CorridorRecord, DeviceRecord } from "@/lib/types";

export default function EnergyAnalyticsPage() {
  const { demoResetTick } = useOperationalRole();
  const [input, setInput] = useState<EnergyCalcInput>(DEFAULT_ENERGY_INPUT);
  const [result, setResult] = useState<EnergyCalcResult>(() =>
    calculateEnergyAndSavings(DEFAULT_ENERGY_INPUT)
  );
  const [recalcBusy, setRecalcBusy] = useState(false);
  const [fleetDevices, setFleetDevices] = useState<DeviceRecord[]>([]);
  const [corridors, setCorridors] = useState<CorridorRecord[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    setLoadingOverview(true);
    fetch("/api/overview", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) {
          setFleetDevices(json.data.devices ?? []);
          setCorridors(json.data.corridors ?? []);
        }
      })
      .catch(() => {
        // Biarkan bagian sensor menampilkan angka kosong jika gagal sementara
      })
      .finally(() => {
        setLoadingOverview(false);
      });
  }, [demoResetTick]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setRecalcBusy(true);
      try {
        const res = await fetch("/api/energy/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (active && res.ok && json.ok) {
          setResult(json.data);
        }
      } finally {
        if (active) setRecalcBusy(false);
      }
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [input]);

  const updateField = <K extends keyof EnergyCalcInput>(key: K, val: EnergyCalcInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: val }));
  };

  const corridorPowerStats = useMemo(() => {
    return corridors.map((cor) => {
      const members = fleetDevices.filter((d) => d.corridor_id === cor.id);
      const pvSum = members.reduce((s, d) => s + d.pv_p, 0);
      const loadSum = members.reduce((s, d) => s + d.load_p, 0);
      const avgSoc =
        members.length > 0
          ? members.reduce((s, d) => s + d.soc_pct, 0) / members.length
          : 0;
      return {
        corridor: cor,
        count: members.length,
        pvSum,
        loadSum,
        avgSoc,
      };
    });
  }, [corridors, fleetDevices]);

  const totalSimPvW = fleetDevices.reduce((s, d) => s + d.pv_p, 0);
  const totalSimLoadW = fleetDevices.reduce((s, d) => s + d.load_p, 0);
  const avgSimSoc =
    fleetDevices.length > 0
      ? fleetDevices.reduce((s, d) => s + d.soc_pct, 0) / fleetDevices.length
      : 0;
  const maxCorridorPv = Math.max(100, ...corridorPowerStats.map((c) => c.pvSum));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analitik Energi, Penghematan 2-Aliran & Kepatuhan Regulasi"
        subtitle="Memisahkan secara tegas antara hasil pengukuran sensor armada (simulasi), hasil perhitungan deterministik kalkulator, dan estimasi finansial berbasis asumsi proposal."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput(DEFAULT_ENERGY_INPUT)}
              className="ops-btn-primary px-3 py-1.5 text-[12px] cursor-pointer"
            >
              Preset Sukoharjo (100 + 354)
            </button>
            <button
              type="button"
              onClick={() =>
                setInput({
                  ...DEFAULT_ENERGY_INPUT,
                  conversionCount: 500,
                  retrofitOnlyCount: 895,
                  legacyLampType: "SON_T_250W",
                })
              }
              className="ops-btn-secondary px-3 py-1.5 text-[12px] cursor-pointer"
            >
              Preset Solo Raya (500 + 895)
            </button>
          </div>
        }
      />

      {/* BAGIAN 1: PENGUKURAN SENSOR (SIMULASI ARMADA SAAT INI) */}
      <section className="ops-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#DCE3EC] flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                1 · PENGUKURAN SENSOR (SIMULASI)
              </span>
              <h2 className="text-[14px] font-semibold text-[#062D5B]">
                Kinerja Pembangkitan PV &amp; Konsumsi Beban Armada ({loadingOverview ? "Memuat..." : `${fleetDevices.length} Tiang`})
              </h2>
            </div>
            <p className="text-[12px] text-[#5B6B7F]">
              Agregasi langsung dari kanal INA228 (PV) dan INA226 (Baterai/Beban) seluruh tiang Solo Raya pada kondisi simulasi aktif.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 font-mono text-[12px] tabular-nums">
            <div>
              <span className="text-[#5B6B7F]">Total PV: </span>
              <strong className="text-[#062D5B]">{formatNum(totalSimPvW, 1)} W</strong>
            </div>
            <div>
              <span className="text-[#5B6B7F]">Beban LED: </span>
              <strong className="text-[#B45309]">{formatNum(totalSimLoadW, 1)} W</strong>
            </div>
            <div>
              <span className="text-[#5B6B7F]">Rata-rata SoC: </span>
              <strong className="text-[#15803D]">{formatNum(avgSimSoc, 1)}%</strong>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          {corridorPowerStats.map((item) => (
            <div key={item.corridor.id} className="ops-inset p-3 space-y-2">
              <div className="text-[12px] font-semibold text-[#0B192C] truncate">
                {item.corridor.kabupaten}
              </div>
              <div className="text-[11px] text-[#5B6B7F] truncate">{item.corridor.name}</div>
              <div className="space-y-1 font-mono text-[11px] tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[#5B6B7F]">PV Simulasi</span>
                  <span className="font-semibold text-[#062D5B]">
                    {formatNum(item.pvSum, 1)} W
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#DCE3EC] overflow-hidden">
                  <div
                    className="h-full bg-[#062D5B]"
                    style={{ width: `${Math.min(100, (item.pvSum / maxCorridorPv) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[#5B6B7F]">
                  <span>SoC rata-rata</span>
                  <span className="text-[#0B192C] font-medium">{formatNum(item.avgSoc, 0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BAGIAN 2: HASIL PERHITUNGAN KALKULATOR DETERMINISTIK */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
              2 · HASIL PERHITUNGAN &amp; MODEL ASUMSI PROPOSAL
            </span>
            <h2 className="text-[15px] font-semibold text-[#0B192C]">
              Kalkulator Keekonomian 2-Aliran (Parameter Terbuka)
            </h2>
          </div>
          {recalcBusy && (
            <span className="text-[11px] font-mono text-[#062D5B]">Menghitung ulang...</span>
          )}
        </div>

        {/* Strip 4 Hasil Kunci */}
        <div className="ops-card overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#DCE3EC]">
            <div className="p-4">
              <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">
                Payback Aliran 1 ({result.lampSpecs.label})
              </div>
              <div
                className={`mt-1 text-[22px] font-bold font-mono tabular-nums ${
                  result.lampSpecs.paybackYears <= 6 ? "text-[#15803D]" : "text-[#B45309]"
                }`}
              >
                {result.lampSpecs.paybackYears >= 90
                  ? "> 50 tahun"
                  : `${formatNum(result.lampSpecs.paybackYears, 2)} tahun`}
              </div>
              <div className="text-[11px] text-[#5B6B7F]">
                Netto/tiang: {formatIdr(result.lampSpecs.annualNetSavingsPerPoleIdr)}/thn
              </div>
            </div>

            <div className="p-4">
              <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">
                Energi &amp; Emisi Dihindari (Aliran 1)
              </div>
              <div className="mt-1 text-[22px] font-bold font-mono tabular-nums text-[#062D5B]">
                {formatNum(result.stream1Conversion.totalAnnualKwhAvoided / 1000, 1)} MWh
              </div>
              <div className="text-[11px] text-[#5B6B7F]">
                {formatNum(result.stream1Conversion.totalCo2AvoidedTonPerYear, 1)} ton CO₂e/thn (0,85 kg/kWh)
              </div>
            </div>

            <div className="p-4">
              <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">
                Manfaat O&amp;M PJUTS Warisan (Aliran 2)
              </div>
              <div className="mt-1 text-[22px] font-bold font-mono tabular-nums text-[#15803D]">
                {formatIdr(result.stream2FleetOAndM.totalAnnualOAndMSavingsIdr)}
              </div>
              <div className="text-[11px] text-[#5B6B7F]">
                Hemat {formatNum(result.stream2FleetOAndM.annualAvoidedSkyLiftTrips, 0)} trip/thn · Payback{" "}
                {formatNum(result.stream2FleetOAndM.oAndMPaybackYears, 2)} thn
              </div>
            </div>

            <div className="p-4">
              <div className="text-[11px] font-medium uppercase text-[#5B6B7F]">
                Porsi dari Floor PBJT-TL PP 4/2023
              </div>
              <div className="mt-1 text-[22px] font-bold font-mono tabular-nums text-[#0B192C]">
                {formatNum(result.combined.investmentShareOfPp4FundPct, 1)}%
              </div>
              <div className="text-[11px] text-[#5B6B7F]">
                Alokasi min. {formatIdr(result.combined.pp4_2023Minimum10PctIdr)}/thn
              </div>
            </div>
          </div>
        </div>

        {/* Form Parameter + Tabel 4 Lampu + Rincian Aliran */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 ops-card p-4 space-y-3">
            <div className="border-b border-[#DCE3EC] pb-2">
              <h3 className="text-[14px] font-semibold text-[#0B192C]">
                Parameter Input &amp; Asumsi Finansial Proposal
              </h3>
              <p className="text-[11px] text-[#5B6B7F]">
                Ubah asumsi tarif listrik, CAPEX perangkat, dan populasi tiang untuk menguji kelayakan APBD.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              <div className="sm:col-span-2">
                <label className="block text-[#334155] font-medium mb-1">
                  Jenis Lampu Grid PLN Eksisting
                </label>
                <select
                  value={input.legacyLampType}
                  onChange={(e) => updateField("legacyLampType", e.target.value as LegacyLampType)}
                  className="ops-input w-full px-2.5 py-1.5"
                >
                  <option value="SON_T_250W">SON-T 250 W (+10% rugi balast = 275 W)</option>
                  <option value="MERKURI_150W">Merkuri 150 W (+10% rugi balast = 165 W)</option>
                  <option value="LED_100W">LED Jaringan 100 W (tanpa balast)</option>
                  <option value="LED_60W">LED Jaringan 60 W (Prioritas rendah)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">Konversi PLN → Surya (Tiang)</label>
                <input
                  type="number"
                  min={0}
                  max={25000}
                  value={input.conversionCount}
                  onChange={(e) =>
                    updateField("conversionCount", Math.max(0, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">Retrofit PJUTS Warisan (Tiang)</label>
                <input
                  type="number"
                  min={0}
                  max={25000}
                  value={input.retrofitOnlyCount}
                  onChange={(e) =>
                    updateField("retrofitOnlyCount", Math.max(0, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">CAPEX Kit Konversi / Tiang (Rp)</label>
                <input
                  type="number"
                  step={100000}
                  value={input.kitCapexIdr}
                  onChange={(e) =>
                    updateField("kitCapexIdr", Math.max(500000, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">CAPEX Modul Diagnosis (Rp)</label>
                <input
                  type="number"
                  step={50000}
                  value={input.retrofitCapexIdr}
                  onChange={(e) =>
                    updateField("retrofitCapexIdr", Math.max(100000, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">Tarif PLN P-3 / kWh (Rp)</label>
                <input
                  type="number"
                  step={10}
                  value={input.plnTariffIdrPerKwh}
                  onChange={(e) =>
                    updateField("plnTariffIdrPerKwh", Math.max(100, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">Biaya 1× Trip Sky-Lift (Rp)</label>
                <input
                  type="number"
                  step={50000}
                  value={input.skyLiftTripCostIdr}
                  onChange={(e) =>
                    updateField("skyLiftTripCostIdr", Math.max(0, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">Cadangan Baterai/Thn (Rp)</label>
                <input
                  type="number"
                  step={25000}
                  value={input.batteryReservePerYearIdr}
                  onChange={(e) =>
                    updateField("batteryReservePerYearIdr", Math.max(0, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block text-[#5B6B7F] mb-1">PBJT-TL Tahunan Daerah (Rp)</label>
                <input
                  type="number"
                  step={1000000000}
                  value={input.regionalPbjtTlAnnualIdr}
                  onChange={(e) =>
                    updateField("regionalPbjtTlAnnualIdr", Math.max(0, Number(e.target.value)))
                  }
                  className="ops-input w-full px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="ops-card overflow-hidden">
              <div className="px-4 py-3 border-b border-[#DCE3EC]">
                <h3 className="text-[14px] font-semibold text-[#0B192C]">
                  Audit Kelayakan Menurut Jenis Lampu Eksisting (4 Pembanding)
                </h3>
                <p className="text-[12px] text-[#5B6B7F]">
                  Transparansi kelayakan: konversi lampu efisien LED 60 W memiliki payback terlalu panjang dibanding penggantian SON-T 250 W / Merkuri.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px] font-mono tabular-nums">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-sans font-semibold uppercase text-[#5B6B7F]">
                      <th className="py-2.5 px-3">Jenis Lampu Eksisting</th>
                      <th className="py-2.5 px-3">Beban</th>
                      <th className="py-2.5 px-3">Netto/Tiang/Thn</th>
                      <th className="py-2.5 px-3">Payback</th>
                      <th className="py-2.5 px-3">Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE3EC]">
                    {result.comparisonByLampType.map((row) => (
                      <tr
                        key={row.type}
                        className={row.type === input.legacyLampType ? "bg-[#EBF1F8]" : "bg-[#FFFFFF]"}
                      >
                        <td className="py-2.5 px-3 font-sans font-semibold text-[#0B192C]">
                          {row.label}
                        </td>
                        <td className="py-2.5 px-3">{row.wattWithBallast} W</td>
                        <td className="py-2.5 px-3 text-[#15803D] font-semibold">
                          {formatIdr(row.annualNetIdr)}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.paybackYears >= 90
                            ? "> 50 thn"
                            : `${formatNum(row.paybackYears, 2)} thn`}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {row.economicallyAttractive ? (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] font-medium">
                              LAYAK PRIORITAS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] font-medium">
                              TIDAK LAYAK KONVERSI MURNI
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
              <div className="ops-card p-4 space-y-2 font-mono tabular-nums">
                <div className="font-sans text-[12px] font-semibold text-[#062D5B] uppercase">
                  Aliran 1 · Konversi Grid → Surya ({input.conversionCount} unit)
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#5B6B7F]">CAPEX Kit REKASURYA:</span>
                  <span className="text-[#0B192C]">
                    {formatIdr(result.stream1Conversion.totalCapexIdr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#5B6B7F]">Hemat vs PJUTS Baru:</span>
                  <span className="text-[#15803D] font-medium">
                    {formatIdr(result.stream1Conversion.capexVsNewPjutsSavingsIdr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#5B6B7F]">Hemat Listrik Kotor/Thn:</span>
                  <span>{formatIdr(result.stream1Conversion.totalAnnualGrossIdr)}</span>
                </div>
                <div className="flex justify-between border-t border-[#DCE3EC] pt-2 font-semibold">
                  <span className="font-sans text-[#0B192C]">Manfaat Netto/Thn:</span>
                  <span className="text-[#15803D]">
                    {formatIdr(result.stream1Conversion.totalAnnualNetIdr)}
                  </span>
                </div>
              </div>

              <div className="ops-card p-4 space-y-2 font-mono tabular-nums">
                <div className="font-sans text-[12px] font-semibold text-[#B45309] uppercase">
                  Aliran 2 · O&amp;M PJUTS Warisan ({input.retrofitOnlyCount} unit)
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#5B6B7F]">CAPEX Modul Diagnosis:</span>
                  <span className="text-[#0B192C]">
                    {formatIdr(result.stream2FleetOAndM.retrofitCapexTotalIdr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#5B6B7F]">Efisiensi Sky-Lift/Thn:</span>
                  <span className="text-[#15803D] font-medium">
                    {formatIdr(result.stream2FleetOAndM.annualTripCostSavedIdr)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#5B6B7F]">Perpanjangan Umur Baterai:</span>
                  <span className="text-[#15803D] font-medium">
                    {formatIdr(result.stream2FleetOAndM.annualBatteryLifeExtensionIdr)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#DCE3EC] pt-2 font-semibold">
                  <span className="font-sans text-[#0B192C]">Total Gabungan/Thn:</span>
                  <span className="text-[#062D5B]">
                    {formatIdr(result.combined.totalAnnualBenefitIdr)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAGIAN 3: MATRIKS KEPATUHAN REGULASI */}
      <section className="ops-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-[#F1F5F9] text-[#334155] border border-[#DCE3EC]">
            3 · REFERENSI REGULASI &amp; STANDAR
          </span>
          <h2 className="text-[14px] font-semibold text-[#0B192C]">
            Acuan Penerangan Jalan &amp; Keuangan Daerah
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
          <div className="ops-inset p-3.5 space-y-1.5">
            <div className="font-mono font-bold text-[#062D5B]">Permenhub PM 47/2023</div>
            <div className="font-semibold text-[#0B192C]">
              Alat Penerangan Jalan (APJ) Jalan Nasional / Daerah
            </div>
            <p className="text-[#334155] leading-relaxed">
              Nilai iluminansi di dasbor adalah contoh konfigurasi. Uji fotometri dan acuan kelas jalan perlu dikonfirmasi untuk pilot.
            </p>
          </div>
          <div className="ops-inset p-3.5 space-y-1.5">
            <div className="font-mono font-bold text-[#15803D]">SNI 7391:2008 dalam Proposal</div>
            <div className="font-semibold text-[#0B192C]">
              Acuan historis iluminansi
            </div>
            <p className="text-[#334155] leading-relaxed">
              Katalog BSN mencatat status Tidak Berlaku. Acuan fotometri pilot menunggu konfirmasi pengelola jalan.
            </p>
          </div>
          <div className="ops-inset p-3.5 space-y-1.5">
            <div className="font-mono font-bold text-[#B45309]">PP No. 4 Tahun 2023 (Pasal 25)</div>
            <div className="font-semibold text-[#0B192C]">
              Alokasi Minimal 10% Penerimaan PBJT-TL Daerah
            </div>
            <p className="text-[#334155] leading-relaxed">
              Pelaporan terukur kWh terhindari, umur pack LiFePO4, dan efisiensi armada sky-lift menjadi dasar audit pembiayaan Dishub &amp; Pemkab Solo Raya.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
