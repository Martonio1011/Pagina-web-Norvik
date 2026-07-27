import { resolve } from 'node:path';
import { seedDatabaseFromFixture } from '../helpers/seed-fixture';

/**
 * Prepares the end-to-end database, once, before any test runs.
 *
 * The file is migrated and re-populated rather than deleted: the app server is
 * already running by this point and holds an open handle to it, and deleting
 * the file would leave that handle pointing at an inode nothing else can see.
 */
export default function globalSetup(): void {
  const database = resolve(process.cwd(), 'e2e.db');
  const { productCount, variantCount } = seedDatabaseFromFixture(database);
  console.warn(`  e2e database ready: ${productCount} products, ${variantCount} variants`);
}
