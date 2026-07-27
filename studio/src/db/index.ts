import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/**
 * The database handle.
 *
 * One local SQLite file, opened once per process. In development Next.js
 * reloads modules on every edit, so the handle is cached on `globalThis` to
 * avoid leaking file handles across reloads.
 */

export type Db = ReturnType<typeof createDb>;

function resolveDatabasePath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./norvik-studio.db';
  const path = url.replace(/^file:/, '');
  return resolve(process.cwd(), path);
}

function createDb() {
  const path = resolveDatabasePath();
  const directory = dirname(path);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });

  const sqlite = new Database(path);
  // WAL lets the UI read while an ingestion run writes, which is the normal
  // state of this app: a long scrape in one process, a dashboard in another.
  sqlite.pragma('journal_mode = WAL');
  // SQLite has foreign keys switched off by default. The schema is full of
  // cascading deletes that would silently not happen.
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

const globalForDb = globalThis as unknown as { norvikDb?: Db };

export const db: Db = globalForDb.norvikDb ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.norvikDb = db;
}

export { schema };
