import { loadDotEnv } from '@/env';

loadDotEnv();

const { syncShopify } = await import('@/ingest/shopify/sync');
const { ShopifyAuthError } = await import('@/ingest/shopify/client');
const { EnvError } = await import('@/env');

/**
 * `npm run sync:shopify`
 *
 * Pulls the store into the local database and prints a report of what
 * happened. Exits non-zero when the sync could not run at all, so it can be
 * used from a scheduler without needing the output read.
 */

try {
  const result = await syncShopify();

  console.warn(
    [
      '',
      `  Shopify sync ${result.status}`,
      `  products seen ......... ${result.productsSeen}`,
      `  new ................... ${result.productsNew}`,
      `  updated ............... ${result.productsUpdated}`,
      `  collections ........... ${result.collectionsSeen}`,
      `  sales rows ............ ${result.salesRows}`,
      `  errors ................ ${result.errors}`,
      result.salesSkippedReason ? `  note .................. ${result.salesSkippedReason}` : '',
      '',
      result.errors > 0
        ? `  Errors are listed on the Runs screen: npm run dev, then /runs/${result.runId}`
        : '',
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  process.exit(result.status === 'FAILED' ? 1 : 0);
} catch (error) {
  if (error instanceof EnvError || error instanceof ShopifyAuthError) {
    console.error(`\n  ${error.message}\n`);
    process.exit(1);
  }
  throw error;
}
