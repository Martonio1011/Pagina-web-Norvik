import { describe, expect, it } from 'vitest';
import { buildDescription, buildDraft, buildSkus, type DraftInput } from '@/domain/draft';
import { makeSection } from '../helpers/sections';

function input(overrides: Partial<DraftInput> = {}): DraftInput {
  return {
    title: 'Satin Halter Maxi Dress',
    description: 'An effortless, timeless piece for golden hour.',
    trendsiProductId: '392458',
    section: makeSection(),
    suggestedRetailCents: 6799,
    colors: ['Chocolate', 'Wine'],
    sizes: ['S', 'M', 'L', 'XL'],
    shipFrom: 'OVERSEAS',
    collectionIds: ['gid://shopify/Collection/340307935421'],
    matchedTerms: ['satin', 'halter', 'maxi'],
    ...overrides,
  };
}

describe('buildSkus', () => {
  it('follows the TRD scheme with a size suffix, like the real catalogue', () => {
    expect(buildSkus('392458', ['S', 'M', 'L', 'XL'], ['Black'])).toEqual([
      'TRD-392458-S',
      'TRD-392458-M',
      'TRD-392458-L',
      'TRD-392458-XL',
    ]);
  });

  /**
   * Accessories in the real shop use a colour suffix — TRD-389533-BLACK — so a
   * product with no sizes must fall back to colour rather than losing the
   * suffix the matcher depends on.
   */
  it('falls back to a colour suffix when there are no sizes', () => {
    expect(buildSkus('389533', [], ['Black', 'Off-white'])).toEqual([
      'TRD-389533-BLACK',
      'TRD-389533-OFFWHITE',
    ]);
  });

  it('still produces a parseable SKU when there is neither size nor colour', () => {
    expect(buildSkus('123456', [], [])).toEqual(['TRD-123456-ONE']);
  });

  it('strips characters that would break the pattern', () => {
    expect(buildSkus('1', [], ['Off White / Cream'])).toEqual(['TRD-1-OFFWHITECREAM']);
  });
});

describe('buildDescription', () => {
  it("starts from the supplier's own copy rather than inventing prose", () => {
    const html = buildDescription(input());
    expect(html).toContain('An effortless, timeless piece for golden hour.');
  });

  it('lists only details that are actually known', () => {
    const html = buildDescription(input());

    expect(html).toContain('Tallas: S, M, L, XL');
    expect(html).toContain('Colores: Chocolate, Wine');
    expect(html).toContain('Satin · Halter · Maxi');
  });

  it('leaves out sizes and colours when there are none, instead of empty labels', () => {
    const html = buildDescription(input({ sizes: [], colors: [] }));

    expect(html).not.toContain('Tallas:');
    expect(html).not.toContain('Colores:');
  });

  it('states where it ships from, because it changes the delivery promise', () => {
    expect(buildDescription(input({ shipFrom: 'USA' }))).toContain('Estados Unidos');
    expect(buildDescription(input({ shipFrom: 'OVERSEAS' }))).toContain('8–15 días');
  });

  /**
   * The reminder is the signal in the Shopify admin that a human has not
   * written this yet. Removing it is part of finishing the product.
   */
  it('marks itself as an unreviewed draft', () => {
    expect(buildDescription(input())).toContain('Revisa el texto antes de publicar');
  });

  it('escapes HTML from the supplier so a stray tag cannot break the page', () => {
    const html = buildDescription(
      input({ description: 'A dress <script>alert("x")</script> & more' }),
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; more');
  });
});

describe('buildDraft', () => {
  /**
   * The single most important assertion in this file. The brief is
   * unambiguous: nothing gets published without a human. There is no parameter
   * that changes this, so there is nothing to get wrong at a call site.
   */
  it('is always a draft', () => {
    expect(buildDraft(input()).status).toBe('DRAFT');
    expect(buildDraft(input({ section: null })).status).toBe('DRAFT');
  });

  it('prices in dollars, from the suggested retail in cents', () => {
    expect(buildDraft(input()).priceDollars).toBe(67.99);
  });

  it('tags with the vendor, the section, the fabric and the shipping origin', () => {
    const draft = buildDraft(input());

    expect(draft.tags).toContain('Trendsi');
    expect(draft.tags).toContain('Maxi Dresses');
    expect(draft.tags).toContain('Satin');
    expect(draft.tags).toContain('Ship From Overseas');
  });

  it('produces the same tags every time, so recreating a draft is stable', () => {
    const first = buildDraft(input());
    const second = buildDraft(input());

    expect(first.tags).toEqual(second.tags);
    // Sorted and deduplicated.
    expect(first.tags).toEqual([...new Set(first.tags)].sort());
  });

  it('copes with a product it could not place in a section', () => {
    const draft = buildDraft(input({ section: null }));

    expect(draft.productType).toBe('');
    expect(draft.tags).toContain('Trendsi');
    expect(draft.status).toBe('DRAFT');
  });

  it('carries the collections to join', () => {
    expect(buildDraft(input()).collectionIds).toEqual([
      'gid://shopify/Collection/340307935421',
    ]);
  });
});
