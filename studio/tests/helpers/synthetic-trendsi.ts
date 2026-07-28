import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '@/db/schema';

/**
 * SYNTHETIC test data. Invented, not captured.
 *
 * Everything in this file was written by hand to exercise the decision queue.
 * It is NOT a recording of Trendsi and does not claim to be — no real capture
 * exists yet, and inventing one and passing it off as real would be far worse
 * than having no fixture.
 *
 * It lives in `tests/` rather than `fixtures/` precisely so it can never be
 * mistaken for captured data, and nothing outside the test suite loads it. The
 * app ships with no sample products at all.
 *
 * The four products below are chosen to produce one of each verdict, so the
 * queue's ranking and every branch of the card have something to render.
 */

export const SYNTHETIC_PRODUCTS = [
  {
    productId: 'SYNTH-001',
    title: 'Satin Halter Maxi Dress',
    description: 'An effortless, timeless piece for golden hour.',
    categories: ['Dress'],
    // Should score well and price inside the Maxi Dresses band → PROMISING.
    variants: [
      { skuId: 'SYNTH-001-S', color: 'Chocolate', size: 'S', dropshipCents: 1800, stock: 20 },
      { skuId: 'SYNTH-001-M', color: 'Wine', size: 'M', dropshipCents: 1800, stock: 18 },
    ],
  },
  {
    productId: 'SYNTH-002',
    title: 'Sequin Bodycon Mini Dress',
    description: 'Party girl energy for the club.',
    categories: ['Dress'],
    // Off-brand on materials, silhouette, colour and tone → WEAK.
    variants: [{ skuId: 'SYNTH-002-S', color: 'Hot Pink', size: 'S', dropshipCents: 900, stock: 30 }],
  },
  {
    productId: 'SYNTH-003',
    title: 'Girls Floral Party Dress',
    description: 'Sweet floral dress.',
    categories: ['Dress'],
    // Hard exclusion, whatever the margin → EXCLUDED.
    variants: [{ skuId: 'SYNTH-003-S', color: 'Cream', size: '4T', dropshipCents: 600, stock: 50 }],
  },
  {
    productId: '392458',
    title: 'Cowl Neck Wide-Leg Jumpsuit',
    description: 'Fluid wide legs and a draped cowl neckline.',
    categories: ['Jumpsuit'],
    // Matches the real TRD-392458 SKU in the Shopify fixture → ALREADY_STOCKED.
    variants: [{ skuId: '392458-S', color: 'Black', size: 'S', dropshipCents: 1500, stock: 25 }],
  },
];

/**
 * Loads the synthetic products, and links the jumpsuit to the real Shopify
 * product that carries SKU `TRD-392458-S`, so the duplicate path is exercised
 * against a genuine match rather than a made-up one.
 */
export async function seedSyntheticTrendsi(databasePath: string): Promise<{ products: number }> {
  const client = createClient({ url: `file:${databasePath}` });
  const db = drizzle(client, { schema });

  await db.delete(schema.decisions);
  await db.delete(schema.candidates);
  await db.delete(schema.productMatches);
  await db.delete(schema.trendsiVariants);
  await db.delete(schema.trendsiProducts);

  for (const product of SYNTHETIC_PRODUCTS) {
    await db.insert(schema.trendsiProducts).values({
      productId: product.productId,
      title: product.title,
      description: product.description,
      brand: 'Synthetic Vendor',
      msrpCents: null,
      shipFrom: 'OVERSEAS',
      images: JSON.stringify([]),
      categories: JSON.stringify(product.categories),
      detailUrl: `https://app.trendsi.com/products/detail?id=${product.productId}`,
      firstSeenAt: new Date('2026-07-28T06:00:00Z'),
      lastSeenAt: new Date('2026-07-28T06:00:00Z'),
    });

    for (const variant of product.variants) {
      await db.insert(schema.trendsiVariants).values({
        skuId: variant.skuId,
        productId: product.productId,
        color: variant.color,
        size: variant.size,
        dropshipCents: variant.dropshipCents,
        wholesaleCents: null,
        stock: variant.stock,
        imageUrl: null,
      });
    }
  }

  // The jumpsuit exists in the Shopify fixture under SKU TRD-392458-S.
  const [shopifyJumpsuit] = await db
    .select()
    .from(schema.shopifyProducts)
    .where(eq(schema.shopifyProducts.id, 'gid://shopify/Product/8396732301501'));

  if (shopifyJumpsuit) {
    await db.insert(schema.productMatches).values({
      id: 'synth-match-1',
      shopifyProductId: shopifyJumpsuit.id,
      trendsiProductId: '392458',
      method: 'TRD_SKU',
      confidence: 1,
      confirmed: true,
      evidence: 'SKU TRD-392458-S carries Trendsi product id 392458',
      createdAt: new Date(),
    });
  }

  client.close();
  return { products: SYNTHETIC_PRODUCTS.length };
}
