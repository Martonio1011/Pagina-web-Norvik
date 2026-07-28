import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * The database handle.
 *
 * libSQL rather than better-sqlite3. better-sqlite3 needs a C++ toolchain
 * (Python, a compiler) to install on a machine with no matching prebuilt
 * binary for its exact Node version — and npm forces that build attempt even
 * when a working prebuilt binary is already bundled inside the package,
 * because npm auto-runs `node-gyp rebuild` for any dependency that ships a
 * `binding.gyp` and defines no install script of its own, with no check for
 * whether a prebuild would have done. On a real Windows machine with no
 * compiler installed, that turns "double-click to start" into a wall of
 * red text. libSQL ships its native binary as a platform-specific
 * optionalDependency instead, so installing it never touches a compiler.
 *
 * The cost is that every query is now async, which is why this differs from
 * an early version of this file: `drizzle-orm/libsql` returns Promises where
 * `drizzle-orm/better-sqlite3` returned values directly.
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

  const client = createClient({ url: `file:${path}` });
  return drizzle(client, { schema });
}

const globalForDb = globalThis as unknown as { norvikDb?: Db };

export const db: Db = globalForDb.norvikDb ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.norvikDb = db;
}

export { schema };
