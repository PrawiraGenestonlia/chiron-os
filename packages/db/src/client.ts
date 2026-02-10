import Database, { type Database as DatabaseType } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { getChironDir } from "@chiron-os/shared";
import * as schema from "./schema/index.js";

const DB_DIR = getChironDir();
const DB_PATH = join(DB_DIR, "chiron.db");

if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

export const sqlite: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

/**
 * Run a function inside a SQLite transaction.
 * If the function throws, the transaction is rolled back.
 */
export function withTransaction<T>(fn: () => T): T {
  const txn = sqlite.transaction(fn);
  return txn();
}
