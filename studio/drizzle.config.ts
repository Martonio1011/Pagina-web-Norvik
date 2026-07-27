import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated into `drizzle/` as plain SQL and committed. The
 * database is therefore reproducible from the repository alone, and a schema
 * change shows up in review as the SQL it will actually run.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace(/^file:/, '') ?? './norvik-studio.db',
  },
  strict: true,
  verbose: true,
});
