import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  shopifyCollections,
  shopifyProductCollections,
  shopifyProducts,
  shopifySales,
  shopifyVariants,
} from '@/db/schema';
import { childLogger } from '@/lib/logger';
import { RunTracker } from '@/ingest/run-tracker';
import { ShopifyAuthError, ShopifyClient } from './client';
import { mapCollection, mapOrderToSales, mapProduct, type MappedProduct } from './map';
import {
  collectionsResponseSchema,
  ordersResponseSchema,
  productsResponseSchema,
  shopSchema,
  type CollectionsResponse,
  type OrdersResponse,
  type ProductsResponse,
} from './schemas';
import { COLLECTIONS_QUERY, ORDERS_QUERY, PRODUCTS_QUERY, SHOP_QUERY } from './queries';

/**
 * Pulls the store into the local database.
 *
 * The whole run is traced: how many products were seen, how many were new,
 * what failed and where. A product that fails to map is recorded and skipped
 * rather than aborting the sync, because one odd product should not cost you
 * the other eighteen.
 */

const log = childLogger('shopify-sync');

export interface SyncResult {
  runId: string;
  status: string;
  productsSeen: number;
  productsNew: number;
  productsUpdated: number;
  collectionsSeen: number;
  salesRows: number;
  errors: number;
  /** Set when sales could not be read; the rest of the sync still succeeded. */
  salesSkippedReason: string | null;
}

const PAGE_SIZE = 50;
const SALES_WINDOW_DAYS = 60;

export async function syncShopify(
  options: { client?: ShopifyClient; includeSales?: boolean } = {},
): Promise<SyncResult> {
  const client = options.client ?? new ShopifyClient();
  const includeSales = options.includeSales ?? true;
  const run = await RunTracker.start('SHOPIFY', {
    params: { store: client.storeDomain, apiVersion: client.apiVersion, includeSales },
  });

  let productsNew = 0;
  let productsUpdated = 0;
  let collectionsSeen = 0;
  let salesRows = 0;
  let salesSkippedReason: string | null = null;

  try {
    // Fail early and clearly if the token is wrong, rather than after a
    // half-finished sync.
    const shop = await client.query(SHOP_QUERY, shopSchema, { operationName: 'NorvikShop' });
    run.count('requestCount');
    log.info({ shop: shop.shop.name, domain: shop.shop.myshopifyDomain }, 'connected to Shopify');

    collectionsSeen = await syncCollections(client, run);
    const productResult = await syncProducts(client, run);
    productsNew = productResult.created;
    productsUpdated = productResult.updated;

    if (includeSales) {
      const salesResult = await syncSales(client, run);
      salesRows = salesResult.rows;
      salesSkippedReason = salesResult.skippedReason;
    }
  } catch (error) {
    if (error instanceof ShopifyAuthError) {
      await run.recordError({ stage: 'AUTH', message: error.message, detail: error });
      await run.finish('FAILED', error.message);
      throw error;
    }
    await run.fail(error);
  }

  const status = await run.finish();

  return {
    runId: run.id,
    status,
    productsSeen: run.stats.itemsSeen,
    productsNew,
    productsUpdated,
    collectionsSeen,
    salesRows,
    errors: run.errors,
    salesSkippedReason,
  };
}

async function syncCollections(client: ShopifyClient, run: RunTracker): Promise<number> {
  let after: string | null = null;
  let seen = 0;

  for (;;) {
    const page: CollectionsResponse = await client.query(
      COLLECTIONS_QUERY,
      collectionsResponseSchema,
      {
        operationName: 'NorvikCollections',
        variables: { first: PAGE_SIZE, after },
      },
    );
    run.count('requestCount');

    for (const node of page.collections.nodes) {
      const row = mapCollection(node);
      await db
        .insert(shopifyCollections)
        .values(row)
        .onConflictDoUpdate({
          target: shopifyCollections.id,
          set: { title: row.title, handle: row.handle, productsCount: row.productsCount },
        });
      seen += 1;
    }

    if (!page.collections.pageInfo.hasNextPage) break;
    after = page.collections.pageInfo.endCursor;
    if (!after) break;
  }

  return seen;
}

async function syncProducts(
  client: ShopifyClient,
  run: RunTracker,
): Promise<{ created: number; updated: number }> {
  let after: string | null = null;
  let created = 0;
  let updated = 0;

  for (;;) {
    const page: ProductsResponse = await client.query(PRODUCTS_QUERY, productsResponseSchema, {
      operationName: 'NorvikProducts',
      variables: { first: PAGE_SIZE, after },
    });
    run.count('requestCount');

    for (const node of page.products.nodes) {
      run.count('itemsSeen');
      try {
        const mapped = mapProduct(node);
        const isNew = await persistProduct(mapped);
        if (isNew) {
          created += 1;
          run.count('itemsNew');
        } else {
          updated += 1;
          run.count('itemsUpdated');
        }
      } catch (error) {
        await run.recordError({
          stage: error instanceof Error && error.name === 'MoneyParseError' ? 'PARSE' : 'PERSIST',
          target: node.id,
          message: `Could not store "${node.title}": ${error instanceof Error ? error.message : String(error)}`,
          detail: error,
        });
      }
    }

    if (!page.products.pageInfo.hasNextPage) break;
    after = page.products.pageInfo.endCursor;
    if (!after) break;
  }

  return { created, updated };
}

/** Writes one product with its variants and collection links. Returns true if new. */
async function persistProduct(mapped: MappedProduct): Promise<boolean> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: shopifyProducts.id })
      .from(shopifyProducts)
      .where(eq(shopifyProducts.id, mapped.product.id));

    await tx
      .insert(shopifyProducts)
      .values(mapped.product)
      .onConflictDoUpdate({
        target: shopifyProducts.id,
        set: {
          title: mapped.product.title,
          handle: mapped.product.handle,
          status: mapped.product.status,
          vendor: mapped.product.vendor,
          productType: mapped.product.productType,
          descriptionHtml: mapped.product.descriptionHtml,
          featuredImage: mapped.product.featuredImage,
          tags: mapped.product.tags,
          totalInventory: mapped.product.totalInventory,
          updatedAt: mapped.product.updatedAt,
          syncedAt: mapped.product.syncedAt,
        },
      });

    // Variants and collection links are replaced wholesale: a variant removed
    // upstream has to disappear here too, and an upsert alone would leave it
    // behind for ever.
    await tx.delete(shopifyVariants).where(eq(shopifyVariants.productId, mapped.product.id));
    if (mapped.variants.length > 0) {
      await tx.insert(shopifyVariants).values(mapped.variants);
    }

    for (const collection of mapped.collections) {
      await tx
        .insert(shopifyCollections)
        .values({
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
          productsCount: 0,
        })
        .onConflictDoNothing();
    }

    await tx
      .delete(shopifyProductCollections)
      .where(eq(shopifyProductCollections.productId, mapped.product.id));
    if (mapped.collectionIds.length > 0) {
      await tx
        .insert(shopifyProductCollections)
        .values(
          mapped.collectionIds.map((collectionId) => ({
            productId: mapped.product.id,
            collectionId,
          })),
        )
        .onConflictDoNothing();
    }

    return existing.length === 0;
  });
}

async function syncSales(
  client: ShopifyClient,
  run: RunTracker,
): Promise<{ rows: number; skippedReason: string | null }> {
  const since = new Date(Date.now() - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const query = `created_at:>=${since.toISOString().slice(0, 10)}`;
  let after: string | null = null;
  let rows = 0;

  try {
    for (;;) {
      const page: OrdersResponse = await client.query(ORDERS_QUERY, ordersResponseSchema, {
        operationName: 'NorvikOrders',
        variables: { first: 25, after, query },
      });
      run.count('requestCount');

      for (const order of page.orders.nodes) {
        const sales = mapOrderToSales(order);
        if (sales.length === 0) continue;

        // Replacing by line-item id keeps a re-run idempotent.
        await db.delete(shopifySales).where(
          inArray(
            shopifySales.id,
            sales.map((sale) => sale.id),
          ),
        );
        await db.insert(shopifySales).values(sales);
        rows += sales.length;
      }

      if (!page.orders.pageInfo.hasNextPage) break;
      after = page.orders.pageInfo.endCursor;
      if (!after) break;
    }
  } catch (error) {
    // Order access is a separate scope most stores do not grant, and orders
    // older than 60 days need another one still. Missing sales history makes
    // the app less useful, not broken — so it is reported, not fatal.
    const message =
      error instanceof ShopifyAuthError
        ? `Sales history skipped: the app's token lacks the read_orders scope.`
        : `Sales history skipped: ${error instanceof Error ? error.message : String(error)}`;
    await run.recordError({ stage: 'AUTH', message, target: 'orders', detail: error });
    return { rows, skippedReason: message };
  }

  return { rows, skippedReason: null };
}
