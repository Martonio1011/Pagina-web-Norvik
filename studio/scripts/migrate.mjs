import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

/**
 * Applies the database migrations.
 *
 * Plain JavaScript, run with plain `node`, on purpose. Two earlier versions of
 * this step failed on a real machine for the same underlying reason: they
 * needed a *development* tool to *run* the app.
 *
 *   `drizzle-kit migrate`  — drizzle-kit is a devDependency. A half-finished
 *                            npm install produced `"drizzle-kit" no se reconoce
 *                            como un comando`, which tells the person reading
 *                            it nothing about what to do.
 *   `tsx scripts/migrate.ts` — tsx is a devDependency too, so it would have
 *                            failed in exactly the same way.
 *
 * This file imports only @libsql/client and drizzle-orm, both of which the app
 * needs at runtime anyway. If the app can start, this can run.
 */

const projectRoot = resolve(import.meta.dirname, '..');
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const url = process.env.DATABASE_URL ?? 'file:./norvik-studio.db';
const databasePath = resolve(projectRoot, url.replace(/^file:/, ''));
const migrationsFolder = resolve(projectRoot, 'drizzle');

if (!existsSync(migrationsFolder)) {
  console.error(
    `\n  No encuentro la carpeta de migraciones:\n    ${migrationsFolder}\n\n` +
      `  Parece que faltan archivos del proyecto. Vuelve a descomprimir el ZIP entero.\n`,
  );
  process.exit(1);
}

const client = createClient({ url: `file:${databasePath}` });

try {
  await migrate(drizzle(client), { migrationsFolder });
  console.warn(`  Base de datos lista.`);
} catch (error) {
  console.error(
    `\n  No se pudo preparar la base de datos.\n` +
      `  ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
} finally {
  client.close();
}
