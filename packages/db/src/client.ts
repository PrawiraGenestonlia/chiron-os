import Database, { type Database as DatabaseType } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { join, dirname } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import * as schema from "./schema/index.js";

function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return startDir;
}

const PROJECT_ROOT = findProjectRoot(process.cwd());
const DB_DIR = join(PROJECT_ROOT, ".chiron");
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
