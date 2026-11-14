import type Database from "better-sqlite3";
import crypto from "node:crypto";
import type { AuditLogRecord } from "./types";

export const GENESIS_HASH = "REKASURYA-GENESIS-0000000000000000";

function computeEntryHash(payload: {
  seq: number;
  actorRole: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  detailJson: string;
  prevHash: string;
  createdAt: string;
}): string {
  const canonical = [
    payload.seq,
    payload.actorRole,
    payload.actorName,
    payload.action,
    payload.entityType,
    payload.entityId,
    payload.detailJson,
    payload.prevHash,
    payload.createdAt,
  ].join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function appendAudit(
  db: Database.Database,
  input: {
    actorRole: string;
    actorName: string;
    action: string;
    entityType: string;
    entityId: string;
    detail: Record<string, unknown>;
    createdAt?: string;
  }
): AuditLogRecord {
  const last = db
    .prepare("SELECT seq, entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1")
    .get() as { seq: number; entry_hash: string } | undefined;

  const seq = (last?.seq ?? 0) + 1;
  const prevHash = last?.entry_hash ?? GENESIS_HASH;
  const createdAt = input.createdAt ?? new Date().toISOString();
  const detailJson = JSON.stringify(input.detail);
  const id = `AUD-${String(seq).padStart(5, "0")}`;
  const entryHash = computeEntryHash({
    seq,
    actorRole: input.actorRole,
    actorName: input.actorName,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    detailJson,
    prevHash,
    createdAt,
  });

  db.prepare(
    `INSERT INTO audit_log
      (id, seq, actor_role, actor_name, action, entity_type, entity_id, detail_json, prev_hash, entry_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    seq,
    input.actorRole,
    input.actorName,
    input.action,
    input.entityType,
    input.entityId,
    detailJson,
    prevHash,
    entryHash,
    createdAt
  );

  return {
    id,
    seq,
    actor_role: input.actorRole,
    actor_name: input.actorName,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    detail_json: detailJson,
    prev_hash: prevHash,
    entry_hash: entryHash,
    created_at: createdAt,
  };
}

export function verifyAuditChain(db: Database.Database): {
  valid: boolean;
  totalEntries: number;
  brokenAtSeq: number | null;
  headHash: string;
} {
  const rows = db
    .prepare("SELECT * FROM audit_log ORDER BY seq ASC")
    .all() as AuditLogRecord[];

  let expectedPrev = GENESIS_HASH;
  for (const row of rows) {
    if (row.prev_hash !== expectedPrev) {
      return {
        valid: false,
        totalEntries: rows.length,
        brokenAtSeq: row.seq,
        headHash: expectedPrev,
      };
    }
    const recomputed = computeEntryHash({
      seq: row.seq,
      actorRole: row.actor_role,
      actorName: row.actor_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      detailJson: row.detail_json,
      prevHash: row.prev_hash,
      createdAt: row.created_at,
    });
    if (recomputed !== row.entry_hash) {
      return {
        valid: false,
        totalEntries: rows.length,
        brokenAtSeq: row.seq,
        headHash: row.entry_hash,
      };
    }
    expectedPrev = row.entry_hash;
  }

  return {
    valid: true,
    totalEntries: rows.length,
    brokenAtSeq: null,
    headHash: expectedPrev,
  };
}
