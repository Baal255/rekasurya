import { NextRequest } from "next/server";
import { z } from "zod";
import { extractActor, handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import { injectSimulationScenario } from "@/lib/domain/telemetry";
import { SIMULATION_SCENARIOS, type SimulationScenarioId } from "@/lib/simulator/engine";

export const dynamic = "force-dynamic";

const ScenarioIds = SIMULATION_SCENARIOS.map((s) => s.id) as [
  SimulationScenarioId,
  ...SimulationScenarioId[],
];

const InjectInputZ = z.object({
  device_id: z.string().min(2),
  scenario: z.enum(ScenarioIds),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = InjectInputZ.parse(body);
    const actor = extractActor(req);
    const db = getDb();
    const result = await injectSimulationScenario(db, {
      deviceId: parsed.device_id,
      scenario: parsed.scenario,
      actorRole: actor.role,
      actorName: actor.name,
    });
    return jsonOk({
      isSimulated: true,
      scenario: parsed.scenario,
      ...result,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
