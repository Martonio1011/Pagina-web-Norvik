import { describe, expect, it } from 'vitest';
import { auditProduct, sectionCoverage, type AuditableProduct } from '@/domain/audit';
import { loadSections } from '@/lib/config';
import { makeSection } from '../helpers/sections';

const sections = loadSections();

function makeProduct(overrides: Partial<AuditableProduct> = {}): AuditableProduct {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Halter Neck Maxi Dress',
    status: 'ACTIVE',
    productType: 'Dress',
    tags: [],
    minPriceCents: 5999,
    maxPriceCents: 5999,
    totalInventory: 40,
    collectionHandles: ['dresses'],
    ...overrides,
  };
}

describe('auditProduct', () => {
  it('says nothing about a product that is priced, stocked and filed correctly', () => {
    expect(auditProduct(makeProduct(), sections)).toEqual([]);
  });

  it('reports a product that is live with no stock as critical', () => {
    const findings = auditProduct(makeProduct({ totalInventory: 0 }), sections);
    const stockout = findings.find((finding) => finding.kind === 'ACTIVE_WITHOUT_STOCK');

    expect(stockout?.severity).toBe('CRITICAL');
  });

  it('says nothing about a draft with no stock, which is normal', () => {
    const findings = auditProduct(makeProduct({ status: 'DRAFT', totalInventory: 0 }), sections);
    expect(findings.some((finding) => finding.kind === 'ACTIVE_WITHOUT_STOCK')).toBe(false);
  });

  it('judges the band by the dearest variant, not the cheapest', () => {
    const findings = auditProduct(
      makeProduct({ minPriceCents: 4999, maxPriceCents: 7999 }),
      sections,
    );

    expect(findings.map((finding) => finding.kind)).toContain('PRICE_ABOVE_BAND');
  });

  it('reports a product it cannot classify instead of filing it under a guess', () => {
    const findings = auditProduct(
      makeProduct({ title: 'Unclassifiable Thing', productType: 'Widget' }),
      sections,
    );
    const unclassified = findings.find((finding) => finding.kind === 'NO_SECTION');

    expect(unclassified).toBeDefined();
    expect(unclassified?.sectionKey).toBeNull();
  });
});

describe('sectionCoverage', () => {
  /**
   * The regression this guards: Maxi Dresses and Mini & Midi Dresses share the
   * single `dresses` collection in Shopify. Counting by collection reported the
   * same products under both headings and made each section look twice as full
   * as it was.
   */
  it('counts every product once, even when two sections share a collection', () => {
    const products = [
      makeProduct({ id: '1', title: 'Halter Neck Maxi Dress' }),
      makeProduct({ id: '2', title: 'Eyelet Grecian Neck Mini Dress' }),
      makeProduct({ id: '3', title: 'Satin Midi Dress' }),
    ];

    const coverage = sectionCoverage(products, sections, ['dresses']);
    const byKey = Object.fromEntries(coverage.map((entry) => [entry.sectionKey, entry]));

    expect(byKey['maxi-dresses']?.productCount).toBe(1);
    expect(byKey['mini-midi-dresses']?.productCount).toBe(2);

    const counted = coverage.reduce((sum, entry) => sum + entry.productCount, 0);
    expect(counted).toBe(products.length);
  });

  it('distinguishes a section with no collection from one whose collection is missing', () => {
    const coverage = sectionCoverage([], sections, ['dresses']);
    const byKey = Object.fromEntries(coverage.map((entry) => [entry.sectionKey, entry]));

    // Linen Sets names no collection at all: the fix is to create one.
    expect(byKey['linen-sets']?.hasConfiguredCollections).toBe(false);
    expect(byKey['linen-sets']?.missingCollections).toEqual([]);

    // Accessories names one the store does not currently have.
    expect(byKey['accessories']?.hasConfiguredCollections).toBe(true);
    expect(byKey['accessories']?.missingCollections).toEqual(['accessories']);
  });

  it('reports the price band alongside the count, so a gap is actionable', () => {
    const coverage = sectionCoverage([], [makeSection()], []);
    expect(coverage[0]?.priceBandCents).toEqual({ min: 4200, max: 7200 });
  });
});
