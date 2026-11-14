export type LegacyLampType = "SON_T_250W" | "MERKURI_150W" | "LED_100W" | "LED_60W";

export interface EnergyCalcInput {
  conversionCount: number; // Jumlah titik PJU PLN dikonversi menjadi REKASURYA Kit
  legacyLampType: LegacyLampType;
  retrofitOnlyCount: number; // Jumlah titik PJUTS warisan yang dipasang modul diagnosis
  kitCapexIdr: number; // Default Rp 6.500.000
  retrofitCapexIdr: number; // Default Rp 1.150.000
  plnTariffIdrPerKwh: number; // Default P-3 Rp 1.699,53/kWh
  burnHoursPerDay: number; // Default 12 jam/hari
  batteryReservePerYearIdr: number; // Default Rp 270.000/thn/tiang
  skyLiftTripCostIdr: number; // Biaya 1x trip sky-lift + kru (asumsi terbuka Rp 450.000)
  avoidedTripsPerPolePerYear: number; // Trip inspeksi berulang yang dihemat (asumsi 1.4 trip/tiang/thn)
  regionalPbjtTlAnnualIdr: number; // Penerimaan pajak tenaga listrik daerah/tahun (untuk konteks PP 4/2023 >=10%)
}

export interface EnergyCalcResult {
  assumptions: EnergyCalcInput;
  lampSpecs: {
    label: string;
    systemWattWithBallast: number;
    annualKwhPerPole: number;
    annualPlnGrossSavingsPerPoleIdr: number;
    annualNetSavingsPerPoleIdr: number;
    paybackYears: number;
    co2AvoidedTonPerPolePerYear: number;
  };
  stream1Conversion: {
    totalAnnualKwhAvoided: number;
    totalAnnualGrossIdr: number;
    totalAnnualNetIdr: number;
    totalCapexIdr: number;
    totalCo2AvoidedTonPerYear: number;
    capexVsNewPjutsSavingsIdr: number; // Dibanding PJUTS baru ESDM Rp 15,2 jt
    capexVsNewGridSavingsIdr: number; // Dibanding PJU jaringan baru Rp 18 jt
  };
  stream2FleetOAndM: {
    annualAvoidedSkyLiftTrips: number;
    annualTripCostSavedIdr: number;
    annualBatteryLifeExtensionIdr: number; // Penghematan perpanjangan umur baterai dari deteksi shading dini
    totalAnnualOAndMSavingsIdr: number;
    retrofitCapexTotalIdr: number;
    oAndMPaybackYears: number;
  };
  combined: {
    totalAnnualBenefitIdr: number;
    totalInvestmentIdr: number;
    pp4_2023Minimum10PctIdr: number;
    investmentShareOfPp4FundPct: number;
  };
  comparisonByLampType: Array<{
    type: LegacyLampType;
    label: string;
    wattWithBallast: number;
    annualNetIdr: number;
    paybackYears: number;
    economicallyAttractive: boolean;
  }>;
}

const LAMP_PROFILES: Record<LegacyLampType, { label: string; wattWithBallast: number }> = {
  SON_T_250W: { label: "SON-T 250 W (+10% rugi balast = 275 W)", wattWithBallast: 275 },
  MERKURI_150W: { label: "Merkuri 150 W (+10% rugi balast = 165 W)", wattWithBallast: 165 },
  LED_100W: { label: "LED Jaringan 100 W (tanpa balast)", wattWithBallast: 100 },
  LED_60W: { label: "LED Jaringan 60 W (tanpa balast)", wattWithBallast: 60 },
};

// Faktor emisi jaringan Jawa-Madura-Bali (~0.85 kg CO2 / kWh)
const GRID_EMISSION_TON_PER_KWH = 0.00085;
const NEW_PJUTS_ESDM_CAPEX_IDR = 15200000;
const NEW_GRID_PJU_CAPEX_IDR = 18000000;

export const DEFAULT_ENERGY_INPUT: EnergyCalcInput = {
  conversionCount: 100,
  legacyLampType: "SON_T_250W",
  retrofitOnlyCount: 354, // Armada PJUTS eksisting Kab. Sukoharjo (165 ESDM + 150 APBD + 39 EBTKE)
  kitCapexIdr: 6500000,
  retrofitCapexIdr: 1150000,
  plnTariffIdrPerKwh: 1699.53,
  burnHoursPerDay: 12,
  batteryReservePerYearIdr: 270000,
  skyLiftTripCostIdr: 450000,
  avoidedTripsPerPolePerYear: 1.2,
  regionalPbjtTlAnnualIdr: 80000000000, // Contoh skala kota ~Rp 80 M PBJT-TL
};

function computeLampMetrics(
  type: LegacyLampType,
  input: EnergyCalcInput
): {
  label: string;
  systemWattWithBallast: number;
  annualKwhPerPole: number;
  annualPlnGrossSavingsPerPoleIdr: number;
  annualNetSavingsPerPoleIdr: number;
  paybackYears: number;
  co2AvoidedTonPerPolePerYear: number;
} {
  const profile = LAMP_PROFILES[type];
  const annualKwhPerPole = (profile.wattWithBallast * input.burnHoursPerDay * 365) / 1000;
  const annualPlnGrossSavingsPerPoleIdr = annualKwhPerPole * input.plnTariffIdrPerKwh;
  const annualNetSavingsPerPoleIdr =
    annualPlnGrossSavingsPerPoleIdr - input.batteryReservePerYearIdr;
  const paybackYears =
    annualNetSavingsPerPoleIdr > 0
      ? Number((input.kitCapexIdr / annualNetSavingsPerPoleIdr).toFixed(2))
      : 999;
  const co2AvoidedTonPerPolePerYear = Number(
    (annualKwhPerPole * GRID_EMISSION_TON_PER_KWH).toFixed(2)
  );

  return {
    label: profile.label,
    systemWattWithBallast: profile.wattWithBallast,
    annualKwhPerPole: Number(annualKwhPerPole.toFixed(1)),
    annualPlnGrossSavingsPerPoleIdr: Math.round(annualPlnGrossSavingsPerPoleIdr),
    annualNetSavingsPerPoleIdr: Math.round(annualNetSavingsPerPoleIdr),
    paybackYears,
    co2AvoidedTonPerPolePerYear,
  };
}

export function calculateEnergyAndSavings(partial?: Partial<EnergyCalcInput>): EnergyCalcResult {
  const input: EnergyCalcInput = {
    ...DEFAULT_ENERGY_INPUT,
    ...partial,
  };

  const lampSpecs = computeLampMetrics(input.legacyLampType, input);

  // Aliran 1: Konversi lampu boros jaringan ke surya
  const totalAnnualKwhAvoided = Number(
    (lampSpecs.annualKwhPerPole * input.conversionCount).toFixed(1)
  );
  const totalAnnualGrossIdr = Math.round(
    lampSpecs.annualPlnGrossSavingsPerPoleIdr * input.conversionCount
  );
  const totalAnnualNetIdr = Math.round(
    lampSpecs.annualNetSavingsPerPoleIdr * input.conversionCount
  );
  const totalCapexIdr = Math.round(input.kitCapexIdr * input.conversionCount);
  const totalCo2AvoidedTonPerYear = Number(
    (lampSpecs.co2AvoidedTonPerPolePerYear * input.conversionCount).toFixed(1)
  );

  // Aliran 2: Penghematan O&M armada PJUTS eksisting (tanpa klaim penghematan tagihan PLN)
  const totalMonitoredPoles = input.conversionCount + input.retrofitOnlyCount;
  const annualAvoidedSkyLiftTrips = Math.round(
    totalMonitoredPoles * input.avoidedTripsPerPolePerYear
  );
  const annualTripCostSavedIdr = Math.round(
    annualAvoidedSkyLiftTrips * input.skyLiftTripCostIdr
  );
  // Deteksi dini undercharging memperpanjang umur baterai rata-rata 1 tahun (hemat ~Rp 180 rb/tiang/thn untuk PJUTS eksisting)
  const annualBatteryLifeExtensionIdr = Math.round(input.retrofitOnlyCount * 180000);
  const totalAnnualOAndMSavingsIdr = annualTripCostSavedIdr + annualBatteryLifeExtensionIdr;
  const retrofitCapexTotalIdr = Math.round(input.retrofitOnlyCount * input.retrofitCapexIdr);
  const oAndMPaybackYears =
    totalAnnualOAndMSavingsIdr > 0
      ? Number((retrofitCapexTotalIdr / totalAnnualOAndMSavingsIdr).toFixed(2))
      : 999;

  const totalInvestmentIdr = totalCapexIdr + retrofitCapexTotalIdr;
  const totalAnnualBenefitIdr = totalAnnualNetIdr + totalAnnualOAndMSavingsIdr;
  const pp4_2023Minimum10PctIdr = Math.round(input.regionalPbjtTlAnnualIdr * 0.1);
  const investmentShareOfPp4FundPct =
    pp4_2023Minimum10PctIdr > 0
      ? Number(((totalInvestmentIdr / pp4_2023Minimum10PctIdr) * 100).toFixed(1))
      : 0;

  const comparisonByLampType = (Object.keys(LAMP_PROFILES) as LegacyLampType[]).map((type) => {
    const m = computeLampMetrics(type, input);
    return {
      type,
      label: m.label,
      wattWithBallast: m.systemWattWithBallast,
      annualNetIdr: m.annualNetSavingsPerPoleIdr,
      paybackYears: m.paybackYears,
      economicallyAttractive: m.paybackYears <= 6.5,
    };
  });

  return {
    assumptions: input,
    lampSpecs,
    stream1Conversion: {
      totalAnnualKwhAvoided,
      totalAnnualGrossIdr,
      totalAnnualNetIdr,
      totalCapexIdr,
      totalCo2AvoidedTonPerYear,
      capexVsNewPjutsSavingsIdr:
        Math.max(0, NEW_PJUTS_ESDM_CAPEX_IDR - input.kitCapexIdr) * input.conversionCount,
      capexVsNewGridSavingsIdr:
        Math.max(0, NEW_GRID_PJU_CAPEX_IDR - input.kitCapexIdr) * input.conversionCount,
    },
    stream2FleetOAndM: {
      annualAvoidedSkyLiftTrips,
      annualTripCostSavedIdr,
      annualBatteryLifeExtensionIdr,
      totalAnnualOAndMSavingsIdr,
      retrofitCapexTotalIdr,
      oAndMPaybackYears,
    },
    combined: {
      totalAnnualBenefitIdr,
      totalInvestmentIdr,
      pp4_2023Minimum10PctIdr,
      investmentShareOfPp4FundPct,
    },
    comparisonByLampType,
  };
}
