import { NextRequest } from "next/server";
import { runAiInference } from "@/lib/ai/adapter";
import { TelemetryInferenceRequestZ } from "@/lib/ai/contract";
import { handleRouteError, jsonOk } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = TelemetryInferenceRequestZ.parse(body);
    const inference = await runAiInference(validated);
    return jsonOk({
      validatedRequest: validated,
      inference: inference.result,
      latencyMs: inference.latencyMs,
      inputHash: inference.inputHash,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
