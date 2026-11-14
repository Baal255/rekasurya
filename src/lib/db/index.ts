import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./schema";
import { seedAll } from "./seed";

type GlobalWithDb = typeof globalThis & {
  __rekasuryaDb?: Database.Database;
};

export function migrate(db: Database.Database): void {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
  );
  const done = new Set(
    (db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[]).map((r) => r.id)
  );
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
        m.id,
        new Date().toISOString()
      );
    })();
  }
}

export function dbFile(): string {
  // Di Vercel (serverless) hanya /tmp yang dapat ditulisi. Pola diadaptasi dari proyek referensi SEHATI.
  return (
    process.env.REKASURYA_DB ??
    (process.env.VERCEL
      ? path.join("/tmp", "rekasurya-v1.db")
      : path.join(process.cwd(), "data", "rekasurya-v1.db"))
  );
}

export const PRESEEDED_DB = path.join(process.cwd(), "seed", "rekasurya-seed.db");

function restorePreseeded(targetFile: string): void {
  if (
    targetFile === ":memory:" ||
    process.env.REKASURYA_NO_PRESEED === "1" ||
    fs.existsSync(targetFile) ||
    !fs.existsSync(PRESEEDED_DB)
  ) {
    return;
  }
  try {
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.copyFileSync(PRESEEDED_DB, targetFile);
  } catch {
    // Jika gagal menyalin, lanjutkan dengan migrasi + seed langsung
  }
}

export function openDb(file: string): Database.Database {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  if (file !== ":memory:") {
    db.pragma("journal_mode = WAL");
  }
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function ensureSeeded(db: Database.Database): void {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM corridors").get() as { n: number }).n;
  if (count === 0) {
    seedAll(db);
  }
}

export function getDb(): Database.Database {
  const g = globalThis as GlobalWithDb;
  if (!g.__rekasuryaDb) {
    const file = dbFile();
    restorePreseeded(file);
    const db = openDb(file);
    ensureSeeded(db);
    g.__rekasuryaDb = db;
  }
  return g.__rekasuryaDb;
}

export function resetDb(db: Database.Database = getDb()): void {
  db.pragma("foreign_keys = OFF");
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];
  for (const t of tables) {
    if (t.name === "schema_migrations") continue;
    db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
  }
  db.exec("DELETE FROM schema_migrations");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedAll(db);
}

export function setTestDb(db: Database.Database | null): void {
  (globalThis as GlobalWithDb).__rekasuryaDb = db ?? undefined;
}

export function nextId(db: Database.Database, prefix: string, width = 4): string {
  const key = `seq:${prefix}`;
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  const n = (row ? Number(row.value) : 0) + 1;
  db.prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(n));
  if (prefix === "CIT") {
    return `ID. 2026${String(n).padStart(6, "0")}`;
  }
  if (prefix === "FLT" || prefix === "WO") {
    return `${prefix}-2026-${String(n).padStart(width, "0")}`;
  }
  return `${prefix}-${String(n).padStart(width, "0")}`;
}
