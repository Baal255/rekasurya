"use client";

import React, { useEffect, useState } from "react";
import {
  calculateEnergyAndSavings,
  DEFAULT_ENERGY_INPUT,
  type EnergyCalcInput,
  type EnergyCalcResult,
  type LegacyLampType,
} from "@/lib/energy/calculator";
import { formatIdr, formatNum } from "@/lib/format";

export default function EnergyAndCompliancePage() {
  const [input, setInput] = useState<EnergyCalcInput>(DEFAULT_ENERGY_INPUT);
  const [result, setResult] = useState<EnergyCalcResult>(() =>
    calculateEnergyAndSavings(DEFAULT_ENERGY_INPUT)
  );
  const [recalcBusy, setRecalcBusy] = useState(false);

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

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div className="scada-panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100">
            Kalkulator Energi 2-Aliran, Keekonomian Konversi &amp; Kepatuhan Regulasi
          </h1>
          <p className="text-xs text-slate-400">
            Memisahkan nilai konversi PJU grid PLN → surya (Aliran 1) dari efisiensi O&amp;M armada PJUTS warisan (Aliran 2) dengan parameter asumsi terbuka.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInput(DEFAULT_ENERGY_INPUT)}
            className="px-3 py-1.5 text-xs font-mono rounded border border-[#0EA5E9]/60 bg-[#0EA5E9]/15 text-sky-200 hover:bg-[#0EA5E9]/25 cursor-pointer"
          >
            Baseline Sukoharjo (100 Konversi + 354 PJUTS)
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
            className="px-3 py-1.5 text-xs font-mono rounded border border-[#334155] bg-[#161F30] text-slate-200 hover:border-slate-400 cursor-pointer"
          >
            Skala Solo Raya (500 Konversi + 895 PJUTS)
          </button>
        </div>
      </div>

      {/* Ringkasan Eksekutif Angka Kunci */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="scada-panel p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase">
            Payback Aliran 1 ({result.lampSpecs.label})
          </div>
          <div
            className={`mt-1 text-2xl font-bold font-mono ${
              result.lampSpecs.paybackYears <= 6 ? "text-emerald-400" : "text-amber-300"
            }`}
          >
            {result.lampSpecs.paybackYears >= 90
              ? "> 50 tahun"
              : `${formatNum(result.lampSpecs.paybackYears, 2)} tahun`}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Netto/tiang: {formatIdr(result.lampSpecs.annualNetSavingsPerPoleIdr)}/thn
          </div>
        </div>

        <div className="scada-panel p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase">
            Energi &amp; Emisi Dihindari (Aliran 1)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-sky-300">
            {formatNum(result.stream1Conversion.totalAnnualKwhAvoided / 1000, 1)} MWh
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {formatNum(result.stream1Conversion.totalCo2AvoidedTonPerYear, 1)} ton CO₂e/thn (faktor 0,85 kg/kWh)
          </div>
        </div>

        <div className="scada-panel p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase">
            Manfaat O&amp;M PJUTS Warisan (Aliran 2)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-300">
            {formatIdr(result.stream2FleetOAndM.totalAnnualOAndMSavingsIdr)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Hemat {formatNum(result.stream2FleetOAndM.annualAvoidedSkyLiftTrips, 0)} trip sky-lift/thn · Payback O&amp;M{" "}
            {formatNum(result.stream2FleetOAndM.oAndMPaybackYears, 2)} thn
          </div>
        </div>

        <div className="scada-panel p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase">
            Konteks Pendanaan PP 4/2023 (≥10% PBJT-TL)
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-100">
            {formatNum(result.combined.investmentShareOfPp4FundPct, 1)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Porsi capex dari floor {formatIdr(result.combined.pp4_2023Minimum10PctIdr)}/thn
          </div>
        </div>
      </div>

      {/* Form Parameter + Rincian 2 Aliran */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 scada-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Parameter &amp; Asumsi Terbuka
            </h2>
            {recalcBusy && (
              <span className="text-[11px] font-mono text-sky-400">Menghitung...</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Jenis Lampu Grid PLN yang Dikonversi</label>
              <select
                value={input.legacyLampType}
                onChange={(e) => updateField("legacyLampType", e.target.value as LegacyLampType)}
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 text-slate-100"
              >
                <option value="SON_T_250W">SON-T 250 W (+10% rugi balast = 275 W)</option>
                <option value="MERKURI_150W">Merkuri 150 W (+10% rugi balast = 165 W)</option>
                <option value="LED_100W">LED Jaringan 100 W (tanpa balast)</option>
                <option value="LED_60W">LED Jaringan 60 W (Prioritas rendah konversi)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Jumlah Konversi Grid → Surya (Tiang)</label>
              <input
                type="number"
                min={0}
                max={25000}
                value={input.conversionCount}
                onChange={(e) => updateField("conversionCount", Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Jumlah Retrofit PJUTS Warisan (Tiang)</label>
              <input
                type="number"
                min={0}
                max={25000}
                value={input.retrofitOnlyCount}
                onChange={(e) => updateField("retrofitOnlyCount", Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">CAPEX Kit Konversi / Tiang (Rp)</label>
              <input
                type="number"
                step={100000}
                value={input.kitCapexIdr}
                onChange={(e) => updateField("kitCapexIdr", Math.max(500000, Number(e.target.value)))}
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">CAPEX Modul Diagnosis PJUTS (Rp)</label>
              <input
                type="number"
                step={50000}
                value={input.retrofitCapexIdr}
                onChange={(e) => updateField("retrofitCapexIdr", Math.max(100000, Number(e.target.value)))}
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tarif PLN P-3 / kWh (Rp)</label>
              <input
                type="number"
                step={10}
                value={input.plnTariffIdrPerKwh}
                onChange={(e) => updateField("plnTariffIdrPerKwh", Math.max(100, Number(e.target.value)))}
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Biaya 1× Trip Sky-Lift (Rp)</label>
              <input
                type="number"
                step={50000}
                value={input.skyLiftTripCostIdr}
                onChange={(e) => updateField("skyLiftTripCostIdr", Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Cadangan Baterai/Tiang/Thn (Rp)</label>
              <input
                type="number"
                step={25000}
                value={input.batteryReservePerYearIdr}
                onChange={(e) =>
                  updateField("batteryReservePerYearIdr", Math.max(0, Number(e.target.value)))
                }
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">PBJT-TL Tahunan Daerah (Rp)</label>
              <input
                type="number"
                step={1000000000}
                value={input.regionalPbjtTlAnnualIdr}
                onChange={(e) =>
                  updateField("regionalPbjtTlAnnualIdr", Math.max(0, Number(e.target.value)))
                }
                className="w-full bg-[#0B0F17] border border-[#334155] rounded px-2.5 py-1.5 font-mono text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Rincian Aliran 1 vs Aliran 2 + Tabel Perbandingan 4 Lampu */}
        <div className="lg:col-span-7 space-y-4">
          <div className="scada-panel p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Evaluasi Keekonomian Menurut Jenis Lampu Eksisting (Kejujuran Teknik)
            </h2>
            <p className="text-xs text-slate-400">
              Audit kelayakan mencegah pemborosan anggaran: konversi PJU hemat energi LED 60 W ber-payback terlalu panjang dibanding mengganti SON-T 250 W / Merkuri.
            </p>
            <div className="overflow-x-auto border border-[#1E293B] rounded">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[#0F1623] border-b border-[#1E293B] text-[11px] uppercase text-slate-400">
                    <th className="py-2 px-3">Jenis Lampu Eksisting</th>
                    <th className="py-2 px-3">Beban Sistem</th>
                    <th className="py-2 px-3">Hemat Netto/Tiang/Thn</th>
                    <th className="py-2 px-3">Payback</th>
                    <th className="py-2 px-3">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {result.comparisonByLampType.map((row) => (
                    <tr
                      key={row.type}
                      className={
                        row.type === input.legacyLampType ? "bg-[#0EA5E9]/10" : ""
                      }
                    >
                      <td className="py-2 px-3 font-semibold text-slate-100">{row.label}</td>
                      <td className="py-2 px-3">{row.wattWithBallast} W</td>
                      <td className="py-2 px-3 text-emerald-300">
                        {formatIdr(row.annualNetIdr)}
                      </td>
                      <td className="py-2 px-3">
                        {row.paybackYears >= 90 ? "> 50 thn" : `${formatNum(row.paybackYears, 2)} thn`}
                      </td>
                      <td className="py-2 px-3">
                        {row.economicallyAttractive ? (
                          <span className="text-emerald-300">LAYAK PRIORITAS</span>
                        ) : (
                          <span className="text-amber-300">TIDAK LAYAK KONVERSI MURNI</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="scada-panel p-4 space-y-2 font-mono">
              <div className="text-sky-300 font-semibold uppercase">
                Aliran 1 · Konversi Grid PLN → Surya ({input.conversionCount} unit)
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CAPEX Kit REKASURYA:</span>
                <span className="text-slate-100">{formatIdr(result.stream1Conversion.totalCapexIdr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hemat CAPEX vs PJUTS Baru (15,2 jt):</span>
                <span className="text-emerald-300">
                  {formatIdr(result.stream1Conversion.capexVsNewPjutsSavingsIdr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Penghematan Listrik Kotor/Thn:</span>
                <span>{formatIdr(result.stream1Conversion.totalAnnualGrossIdr)}</span>
              </div>
              <div className="flex justify-between border-t border-[#1E293B] pt-1.5 font-semibold">
                <span className="text-slate-300">Manfaat Netto Aliran 1/Thn:</span>
                <span className="text-emerald-300">
                  {formatIdr(result.stream1Conversion.totalAnnualNetIdr)}
                </span>
              </div>
            </div>

            <div className="scada-panel p-4 space-y-2 font-mono">
              <div className="text-amber-300 font-semibold uppercase">
                Aliran 2 · O&amp;M PJUTS Warisan ({input.retrofitOnlyCount} unit)
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CAPEX Modul Diagnosis:</span>
                <span className="text-slate-100">
                  {formatIdr(result.stream2FleetOAndM.retrofitCapexTotalIdr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Efisiensi Trip Sky-Lift/Thn:</span>
                <span className="text-emerald-300">
                  {formatIdr(result.stream2FleetOAndM.annualTripCostSavedIdr)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nilai Perpanjangan Umur Baterai:</span>
                <span className="text-emerald-300">
                  {formatIdr(result.stream2FleetOAndM.annualBatteryLifeExtensionIdr)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#1E293B] pt-1.5 font-semibold">
                <span className="text-slate-300">Total Gabungan (Aliran 1 + 2)/Thn:</span>
                <span className="text-emerald-300">
                  {formatIdr(result.combined.totalAnnualBenefitIdr)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matriks Kepatuhan Regulasi */}
      <div className="scada-panel p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Matriks Kepatuhan Regulasi &amp; Standar Teknis PJU Indonesia
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="scada-inset p-3 space-y-1.5">
            <div className="font-mono font-bold text-sky-300">Permenhub PM 47/2023</div>
            <div className="text-slate-200 font-medium">
              Alat Penerangan Jalan (APJ) di Jalan Nasional / Provinsi / Kab-Kota
            </div>
            <p className="text-slate-400 leading-relaxed">
              REKASURYA memantau iluminansi target sesuai kelas jalan (Arteri 15–20 lx, Kolektor 10–15 lx) melalui kurva peredupan PWM aman UVLO dan menyediakan log inspeksi berkala per tiang.
            </p>
          </div>
          <div className="scada-inset p-3 space-y-1.5">
            <div className="font-mono font-bold text-emerald-300">SNI 7391:2008 &amp; Uji ESDM</div>
            <div className="text-slate-200 font-medium">
              Spesifikasi Penerangan Jalan &amp; Arsitektur PJUTS Retrofit
            </div>
            <p className="text-slate-400 leading-relaxed">
              Isolasi pengukuran PV 85 V (`INA228` + `B0303S`/`ADuM1250`), pemisahan jalur daya LED 40 W ke driver eksternal Buck CC-CV, proteksi lonjakan SMBJ30A, dan batas derating suhu baterai/driver menjaga ketahanan sistem.
            </p>
          </div>
          <div className="scada-inset p-3 space-y-1.5">
            <div className="font-mono font-bold text-amber-300">PP No. 4 Tahun 2023 (Pasal 25)</div>
            <div className="text-slate-200 font-medium">
              Alokasi Minimal 10% Penerimaan PBJT-TL untuk PJU Daerah
            </div>
            <p className="text-slate-400 leading-relaxed">
              Laporan terukur kWh terhindari, umur pack LiFePO4, dan efisiensi armada sky-lift menjadi bukti akuntabel penganggaran APBD/PBJT-TL Dishub &amp; DPU kabupaten/kota Solo Raya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
