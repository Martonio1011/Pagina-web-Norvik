import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated into `drizzle/` as plain SQL and committed. The
 * database is therefore reproducible from the repository alone, and a schema
 * change shows up in review as the SQL it will actually run.
 *
 * dialect: 'turso' is drizzle-kit's label for the libSQL wire protocol, which
 * is what `@libsql/client` speaks even in local-file mode — there is no
 * separate Turso account or network service involved here.
 */
export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./norvik-studio.db',
  },
  strict: true,
  verbose: true,
});
