import { NextRequest } from "next/server";
import { extractActor, handleRouteError, jsonOk } from "@/lib/api-utils";
import { getDb } from "@/lib/db";
import { listCitizenReports, submitCitizenReport } from "@/lib/domain/citizen-reports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") ?? undefined;
    const phoneLast4 = searchParams.get("phone_last4") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const reports = listCitizenReports(db, { id, phoneLast4, status });
    return jsonOk({
      isDemoModule: true,
      disclaimer:
        "Kanal simulasi aduan warga internal terinspirasi alur ULAS Surakarta — tidak terhubung ke portal resmi Pemkot Surakarta.",
      reports,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actor = extractActor(req);
    const db = getDb();
    const result = submitCitizenReport(db, body, actor);
    return jsonOk(result, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
