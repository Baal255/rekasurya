import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { WorkOrderTransitionError } from "./domain/work-orders";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonErr(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: unknown
) {
  return NextResponse.json(
    { ok: false, error: message, code, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

export function extractActor(req: NextRequest): { role: string; name: string } {
  const role = req.headers.get("x-rekasurya-role")?.trim() || "OPERATOR_DISHUB";
  const name =
    req.headers.get("x-rekasurya-actor")?.trim() ||
    (role === "TEKNISI_SKYLIFT"
      ? "Teknisi Sky-Lift Lapangan"
      : role === "AUDITOR_PJU"
      ? "Auditor Energi & Pemda"
      : "Operator Dishub Solo Raya");
  return { role, name };
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonErr(
      "Validasi skema masukan gagal.",
      400,
      "VALIDATION_ERROR",
      err.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
    );
  }
  if (err instanceof WorkOrderTransitionError) {
    return jsonErr(err.message, err.statusCode, "WORK_ORDER_CONFLICT", err.details);
  }
  if (err instanceof SyntaxError) {
    return jsonErr("Body JSON tidak valid.", 400, "INVALID_JSON");
  }
  if (err instanceof Error) {
    const status = err.message.includes("tidak ditemukan") ? 404 : 400;
    return jsonErr(err.message, status, status === 404 ? "NOT_FOUND" : "DOMAIN_ERROR");
  }
  return jsonErr("Terjadi kesalahan internal server.", 500, "INTERNAL_ERROR");
}
