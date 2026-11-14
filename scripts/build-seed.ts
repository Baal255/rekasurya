import fs from "node:fs";
import path from "node:path";
import { openDb, resetDb } from "../src/lib/db";

const out = path.join(process.cwd(), "seed", "rekasurya-seed.db");
fs.mkdirSync(path.dirname(out), { recursive: true });
for (const f of [out, `${out}-wal`, `${out}-shm`]) {
  fs.rmSync(f, { force: true });
}

const db = openDb(out);
resetDb(db);
db.pragma("wal_checkpoint(TRUNCATE)");
db.pragma("journal_mode = DELETE");
db.close();

const sizeMb = (fs.statSync(out).size / 1e6).toFixed(2);
console.log(`[REKASURYA prebuild] Basis data awal dibuat: ${out} (${sizeMb} MB)`);
