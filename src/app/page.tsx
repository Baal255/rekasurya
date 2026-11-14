import React from "react";
import { AI_CONTRACT_VERSION } from "@/lib/ai/contract";
import { verifyAuditChain } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { calculateEnergyAndSavings, DEFAULT_ENERGY_INPUT } from "@/lib/energy/calculator";
import type {
  CorridorRecord,
  DeviceRecord,
  SparePartRecommendation,
  WorkOrderRecord,
} from "@/lib/types";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroAndConvergence } from "@/components/landing/HeroAndConvergence";
import { ConsolePreviewAndFlow } from "@/components/landing/ConsolePreviewAndFlow";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { PrinciplesAndClosing } from "@/components/landing/PrinciplesAndClosing";

export const dynamic = "force-dynamic";

function safeParseParts(raw: string | null | undefined): SparePartRecommendation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SparePartRecommendation[]) : [];
  } catch {
    return [];
  }
}

export default function RekasuryaPublicHomePage() {
  const db = getDb();

  const corridors = db
    .prepare(
      `SELECT c.*, COUNT(d.id) AS pole_count
       FROM corridors c
       LEFT JOIN devices d ON d.corridor_id = c.id
       GROUP BY c.id
       ORDER BY c.id`
    )
    .all() as CorridorRecord[];

  const devices = db
    .prepare(
      `SELECT d.*, c.name AS corridor_name, c.kabupaten, c.road_class, c.managing_agency
       FROM devices d
       JOIN corridors c ON d.corridor_id = c.id
       ORDER BY
         CASE d.status
           WHEN 'TAMPER_CRITICAL' THEN 1
           WHEN 'FAULT' THEN 2
           WHEN 'WARNING_EWMA' THEN 3
           WHEN 'OFFLINE' THEN 4
           ELSE 5
         END,
         d.id`
    )
    .all() as DeviceRecord[];

  const openWorkOrders = db
    .prepare(
      `SELECT w.*, d.pole_label, c.name AS corridor_name, c.kabupaten
       FROM work_orders w
       JOIN devices d ON w.device_id = d.id
       JOIN corridors c ON d.corridor_id = c.id
       WHERE w.status NOT IN ('VERIFIED', 'CLOSED')
       ORDER BY
         CASE w.priority WHEN 'DARURAT' THEN 1 WHEN 'TINGGI' THEN 2 WHEN 'SEDANG' THEN 3 ELSE 4 END,
         w.created_at DESC`
    )
    .all() as Array<
    WorkOrderRecord & { pole_label: string; corridor_name: string; kabupaten: string }
  >;

  const openCitizenRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM citizen_reports WHERE status != 'Resolved'`)
    .get() as { cnt: number };

  const activeFaults = devices.filter((d) => d.status !== "NORMAL").length;
  const tamperCritical = devices.filter((d) => d.status === "TAMPER_CRITICAL").length;
  const avgUptime30dPct =
    devices.length > 0
      ? Number(
          (devices.reduce((acc, d) => acc + d.uptime_30d_pct, 0) / devices.length).toFixed(2)
        )
      : 0;

  const auditIntegrity = verifyAuditChain(db);
  const energySummary = calculateEnergyAndSavings(DEFAULT_ENERGY_INPUT);

  const aiAdapterMode = process.env.REKASURYA_AI_SERVICE_URL
    ? "EXTERNAL_POC_ASTRA"
    : "MOCK_EWMA_DETERMINISTIC";

  // Pilih maks 4 perangkat representatif untuk inspektor node interaktif (prioritas gangguan + normal pembanding)
  const faultSamples = devices.filter((d) => d.status !== "NORMAL").slice(0, 3);
  const normalSample = devices.find((d) => d.status === "NORMAL");
  const sampleDevices = normalSample
    ? [...faultSamples, normalSample].slice(0, 4)
    : devices.slice(0, 4);

  const leadWorkOrder = openWorkOrders[0] ?? null;
  const leadWorkOrderParts = safeParseParts(leadWorkOrder?.parts_checklist_json);

  const stats = {
    totalDevices: devices.length,
    normalDevices: devices.length - activeFaults,
    activeFaults,
    tamperCritical,
    openWorkOrders: openWorkOrders.length,
    openCitizenReports: openCitizenRow.cnt,
    avgUptime30dPct,
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#0B192C] overflow-x-clip">
      <LandingNav
        totalDevices={stats.totalDevices}
        activeFaults={stats.activeFaults}
        isDemoSimulation={true}
      />

      <main>
        <HeroAndConvergence
          stats={stats}
          sampleDevices={sampleDevices}
          corridorCount={corridors.length}
          auditValid={auditIntegrity.valid}
          aiContractVersion={AI_CONTRACT_VERSION}
        />

        <ConsolePreviewAndFlow
          stats={stats}
          corridors={corridors}
          priorityDevices={devices.slice(0, 5)}
          leadWorkOrder={leadWorkOrder}
          leadWorkOrderParts={leadWorkOrderParts}
        />

        <CapabilitiesSection energySummary={energySummary} />

        <PrinciplesAndClosing
          totalDevices={stats.totalDevices}
          activeFaults={stats.activeFaults}
          openWorkOrders={stats.openWorkOrders}
          aiAdapterMode={aiAdapterMode}
          aiContractVersion={AI_CONTRACT_VERSION}
          auditValid={auditIntegrity.valid}
          auditRowCount={auditIntegrity.totalEntries}
        />
      </main>
    </div>
  );
}
