import { NextRequest } from "next/server";
import { z } from "zod";
import { handleRouteError, jsonOk } from "@/lib/api-utils";
import { calculateEnergyAndSavings, DEFAULT_ENERGY_INPUT } from "@/lib/energy/calculator";

export const dynamic = "force-dynamic";

const EnergyCalcInputZ = z.object({
  conversionCount: z.number().int().min(0).max(50000).optional(),
  legacyLampType: z.enum(["SON_T_250W", "MERKURI_150W", "LED_100W", "LED_60W"]).optional(),
  retrofitOnlyCount: z.number().int().min(0).max(50000).optional(),
  kitCapexIdr: z.number().positive().optional(),
  retrofitCapexIdr: z.number().positive().optional(),
  plnTariffIdrPerKwh: z.number().positive().optional(),
  burnHoursPerDay: z.number().min(1).max(24).optional(),
  batteryReservePerYearIdr: z.number().nonnegative().optional(),
  skyLiftTripCostIdr: z.number().nonnegative().optional(),
  avoidedTripsPerPolePerYear: z.number().nonnegative().optional(),
  regionalPbjtTlAnnualIdr: z.number().nonnegative().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lamp = searchParams.get("legacyLampType");
    const conversionCount = searchParams.get("conversionCount");
    const partial = EnergyCalcInputZ.parse({
      ...(lamp ? { legacyLampType: lamp } : {}),
      ...(conversionCount ? { conversionCount: Number(conversionCount) } : {}),
    });
    return jsonOk(calculateEnergyAndSavings(partial));
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EnergyCalcInputZ.parse(body);
    return jsonOk(calculateEnergyAndSavings({ ...DEFAULT_ENERGY_INPUT, ...parsed }));
  } catch (err) {
    return handleRouteError(err);
  }
}
