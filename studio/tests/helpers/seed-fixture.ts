import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
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

export async function seedDatabaseFromFixture(
  databasePath: string,
): Promise<{ productCount: number; variantCount: number }> {
  const client = createClient({ url: `file:${databasePath}` });
  const db = drizzle(client, { schema });

  await migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });

  const raw: unknown = JSON.parse(
    readFileSync(resolve(process.cwd(), 'fixtures/shopify/products-2026-07-27.json'), 'utf8'),
  );
  const nodes = productsResponseSchema.parse(raw).products.nodes;

  // Start from a clean slate so a re-run is idempotent.
  await db.delete(schema.shopifyProductCollections);
  await db.delete(schema.shopifyVariants);
  await db.delete(schema.shopifyProducts);
  await db.delete(schema.shopifyCollections);
  await db.delete(schema.ingestErrors);
  await db.delete(schema.ingestRuns);

  let variantCount = 0;

  for (const node of nodes) {
    const mapped = mapProduct(node);

    await db.insert(schema.shopifyProducts).values(mapped.product);
    if (mapped.variants.length > 0) {
      await db.insert(schema.shopifyVariants).values(mapped.variants);
      variantCount += mapped.variants.length;
    }

    for (const collection of mapped.collections) {
      await db
        .insert(schema.shopifyCollections)
        .values({ ...collection, productsCount: 0 })
        .onConflictDoNothing();
      await db
        .insert(schema.shopifyProductCollections)
        .values({ productId: mapped.product.id, collectionId: collection.id })
        .onConflictDoNothing();
    }
  }

  // A run trace, so the dashboard's "last sync" panel has something real to
  // show rather than its empty state.
  await db.insert(schema.ingestRuns).values({
    id: 'e2e-seed-run',
    source: 'SHOPIFY',
    status: 'OK',
    startedAt: new Date('2026-07-27T10:00:00Z'),
    finishedAt: new Date('2026-07-27T10:00:03Z'),
    durationMs: 3000,
    itemsSeen: nodes.length,
    itemsNew: nodes.length,
    requestCount: 3,
  });

  client.close();
  return { productCount: nodes.length, variantCount };
}
