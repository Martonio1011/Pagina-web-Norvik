import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@/db/schema';
import { mapProduct } from '@/ingest/shopify/map';
import { productsResponseSchema } from '@/ingest/shopify/schemas';

/**
 * Loads the saved Shopify response into a database, for the end-to-end suite.
 *
 * This is test scaffolding, not seed data for the app: what it loads is a
 * recorded response from the real store, and it is only ever pointed at a
 * throwaway database file. The app itself ships with no sample content at all.
 */

export function seedDatabaseFromFixture(databasePath: string): {
  productCount: number;
  variantCount: number;
} {
  const sqlite = new Database(databasePath);
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });

  const raw: unknown = JSON.parse(
    readFileSync(resolve(process.cwd(), 'fixtures/shopify/products-2026-07-27.json'), 'utf8'),
  );
  const nodes = productsResponseSchema.parse(raw).products.nodes;

  // Start from a clean slate so a re-run is idempotent.
  db.delete(schema.shopifyProductCollections).run();
  db.delete(schema.shopifyVariants).run();
  db.delete(schema.shopifyProducts).run();
  db.delete(schema.shopifyCollections).run();
  db.delete(schema.ingestErrors).run();
  db.delete(schema.ingestRuns).run();

  let variantCount = 0;

  for (const node of nodes) {
    const mapped = mapProduct(node);

    db.insert(schema.shopifyProducts).values(mapped.product).run();
    if (mapped.variants.length > 0) {
      db.insert(schema.shopifyVariants).values(mapped.variants).run();
      variantCount += mapped.variants.length;
    }

    for (const collection of mapped.collections) {
      db.insert(schema.shopifyCollections)
        .values({ ...collection, productsCount: 0 })
        .onConflictDoNothing()
        .run();
      db.insert(schema.shopifyProductCollections)
        .values({ productId: mapped.product.id, collectionId: collection.id })
        .onConflictDoNothing()
        .run();
    }
  }

  // A run trace, so the dashboard's "last sync" panel has something real to
  // show rather than its empty state.
  db.insert(schema.ingestRuns)
    .values({
      id: 'e2e-seed-run',
      source: 'SHOPIFY',
      status: 'OK',
      startedAt: new Date('2026-07-27T10:00:00Z'),
      finishedAt: new Date('2026-07-27T10:00:03Z'),
      durationMs: 3000,
      itemsSeen: nodes.length,
      itemsNew: nodes.length,
      requestCount: 3,
    })
    .run();

  sqlite.close();
  return { productCount: nodes.length, variantCount };
}
