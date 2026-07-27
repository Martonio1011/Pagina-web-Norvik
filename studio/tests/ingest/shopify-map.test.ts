import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adminProductUrl, legacyIdFromGid, mapProduct, parseTags } from '@/ingest/shopify/map';
import { productsResponseSchema } from '@/ingest/shopify/schemas';
import { buildTrendsiIndex, matchShopifyProduct } from '@/domain/matching';
import { auditCatalog, type AuditableProduct } from '@/domain/audit';
import { loadSections } from '@/lib/config';

/**
 * Integration test for the Shopify layer, run against a saved response from
 * the real store rather than a hand-written mock. If Shopify changes a field,
 * or if the mapper stops reading one, this fails.
 */

const fixture: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'fixtures/shopify/products-2026-07-27.json'), 'utf8'),
);

describe('the saved response from norviik.myshopify.com', () => {
  it('still matches the schema the app validates against', () => {
    const parsed = productsResponseSchema.safeParse(fixture);
    expect(parsed.success, JSON.stringify(parsed.error?.issues.slice(0, 5), null, 2)).toBe(true);
  });
});

const products = productsResponseSchema.parse(fixture).products.nodes;

describe('mapProduct', () => {
  it('maps a real product without losing anything', () => {
    const jumpsuit = products.find((node) => node.handle === 'cowl-neck-wide-leg-jumpsuit');
    expect(jumpsuit).toBeDefined();

    const mapped = mapProduct(jumpsuit!, new Date('2026-07-27T00:00:00Z'));

    expect(mapped.product.legacyId).toBe('8396732301501');
    expect(mapped.product.status).toBe('DRAFT');
    expect(mapped.product.vendor).toBe('Trendsi');
    expect(mapped.product.featuredImage).toContain('cdn.shopify.com');
    expect(parseTags(mapped.product.tags)).toContain('Wide Leg');
    expect(mapped.collectionIds).toEqual(['gid://shopify/Collection/340308000957']);
    expect(mapped.variants).toHaveLength(2);
    expect(mapped.variants[0]).toMatchObject({ sku: 'TRD-392458-S', priceCents: 2999 });
  });

  it('reads prices as exact cents', () => {
    const dress = products.find((node) => node.handle === 'one-shoulder-ruched-maxi-dress');
    const mapped = mapProduct(dress!);

    expect(mapped.variants.every((variant) => variant.priceCents === 7999)).toBe(true);
    expect(mapped.variants.every((variant) => Number.isInteger(variant.priceCents))).toBe(true);
  });

  it('keeps both SKU schemes intact, which is what matching depends on', () => {
    const skus = products.flatMap((node) => mapProduct(node).variants.map((v) => v.sku));

    expect(skus).toContain('TRD-392458-S');
    expect(skus).toContain('TRD-389533-BLACK');
    expect(skus).toContain('100100331278451');
  });

  it('builds a working admin link', () => {
    expect(legacyIdFromGid('gid://shopify/Product/8396732301501')).toBe('8396732301501');
    expect(adminProductUrl('norviik.myshopify.com', 'gid://shopify/Product/8396732301501')).toBe(
      'https://norviik.myshopify.com/admin/products/8396732301501',
    );
  });
});

describe('the store as it actually stands', () => {
  const sections = loadSections();

  const auditable: AuditableProduct[] = products.map((node) => {
    const mapped = mapProduct(node);
    const prices = mapped.variants.map((variant) => variant.priceCents);
    return {
      id: mapped.product.id,
      title: mapped.product.title,
      status: mapped.product.status,
      productType: mapped.product.productType,
      tags: parseTags(mapped.product.tags),
      minPriceCents: Math.min(...prices),
      maxPriceCents: Math.max(...prices),
      totalInventory: mapped.product.totalInventory,
      collectionHandles: mapped.collections.map((collection) => collection.handle),
    };
  });

  it('flags the $79.99 maxi dress as priced above its band', () => {
    const findings = auditCatalog(auditable, sections);
    const overpriced = findings.find(
      (finding) =>
        finding.kind === 'PRICE_ABOVE_BAND' && finding.productTitle.includes('One-Shoulder Ruched'),
    );

    expect(overpriced).toBeDefined();
    expect(overpriced?.sectionKey).toBe('maxi-dresses');
    expect(overpriced?.evidence['se pasa por']).toBe('$7.99');
  });

  it('flags the $29.99 jumpsuit as priced below its band', () => {
    const findings = auditCatalog(auditable, sections);
    const underpriced = findings.find(
      (finding) => finding.kind === 'PRICE_BELOW_BAND' && finding.sectionKey === 'jumpsuits',
    );

    expect(underpriced).toBeDefined();
    expect(underpriced?.evidence['le falta']).toBe('$22.01');
  });

  it('matches products to Trendsi through both SKU schemes', () => {
    const index = buildTrendsiIndex([
      { productId: '392458', title: 'Cowl Neck Wide-Leg Jumpsuit', skuIds: [] },
      {
        productId: '331278',
        title: 'One-Shoulder Ruched Maxi Dress',
        skuIds: ['100100331278451', '100100331272779'],
      },
    ]);

    const matches = products
      .map((node) => {
        const mapped = mapProduct(node);
        return matchShopifyProduct(
          {
            id: mapped.product.id,
            title: mapped.product.title,
            vendor: mapped.product.vendor,
            skus: mapped.variants.map((variant) => variant.sku),
          },
          index,
        );
      })
      .filter((match) => match !== null);

    expect(matches.map((match) => match.method).sort()).toEqual(['TRD_SKU', 'TRENDSI_SKU_ID']);
  });
});
