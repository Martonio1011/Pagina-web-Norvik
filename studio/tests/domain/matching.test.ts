import { describe, expect, it } from 'vitest';
import {
  TITLE_MATCH_THRESHOLD,
  buildTrendsiIndex,
  isTrendsiSkuId,
  matchShopifyProduct,
  normaliseTitle,
  parseTrdSku,
  titleSimilarity,
  trendsiProductIdsFromSkus,
} from '@/domain/matching';

/**
 * Every SKU in this file is a real one from norviik.myshopify.com. The two
 * schemes below are the reason this module exists: the brief assumed only the
 * first, and matching on it alone would leave half the catalogue unmatched.
 */

describe('parseTrdSku', () => {
  it('reads our own SKU scheme, with either a size or a colour suffix', () => {
    expect(parseTrdSku('TRD-392458-S')).toEqual({ productId: '392458', suffix: 'S' });
    expect(parseTrdSku('TRD-389533-BLACK')).toEqual({ productId: '389533', suffix: 'BLACK' });
    expect(parseTrdSku('TRD-389539-OFFWHITE')).toEqual({ productId: '389539', suffix: 'OFFWHITE' });
    expect(parseTrdSku('TRD-80634-XL')).toEqual({ productId: '80634', suffix: 'XL' });
  });

  it('is case insensitive and tolerates surrounding whitespace', () => {
    expect(parseTrdSku('  trd-392458-m  ')).toEqual({ productId: '392458', suffix: 'M' });
  });

  it('returns null for anything else instead of inventing an id', () => {
    for (const sku of [
      '100100331278451',
      'TRD-392458',
      'TRD--S',
      '',
      null,
      undefined,
      'ABC-123-S',
    ]) {
      expect(parseTrdSku(sku)).toBeNull();
    }
  });
});

describe('isTrendsiSkuId', () => {
  it("recognises the 15-digit ids left by Trendsi's own Shopify app", () => {
    expect(isTrendsiSkuId('100100331278451')).toBe(true);
    expect(isTrendsiSkuId('100100207181247')).toBe(true);
  });

  it('rejects short numbers and our own scheme', () => {
    expect(isTrendsiSkuId('12345')).toBe(false);
    expect(isTrendsiSkuId('TRD-392458-S')).toBe(false);
    expect(isTrendsiSkuId(null)).toBe(false);
  });
});

describe('titleSimilarity', () => {
  it('scores the same garment as identical', () => {
    expect(titleSimilarity('Halter Neck Maxi Dress', 'Halter Neck Maxi Dress')).toBe(1);
  });

  it('ignores the noise words suppliers pad titles with', () => {
    expect(normaliseTitle('Full Size Sleeveless Lace Trim Midi Dress Plus Size')).toBe(
      'sleeveless lace trim midi dress',
    );
    expect(
      titleSimilarity(
        'Sleeveless Lace Trim Midi Dress',
        'Full Size Sleeveless Lace Trim Midi Dress',
      ),
    ).toBe(1);
  });

  it('scores unrelated products low', () => {
    expect(titleSimilarity('Woven Straw Shoulder Bag', 'Halter Neck Maxi Dress')).toBeLessThan(0.2);
  });

  it('scores two similar but different dresses high enough to be dangerous', () => {
    // This is precisely why a title match is never treated as fact: these are
    // two different products from the real catalogue.
    const score = titleSimilarity('Halter Neck Maxi Dress', 'Halter Neck Satin Maxi Dress');
    expect(score).toBeGreaterThan(TITLE_MATCH_THRESHOLD);
    expect(score).toBeLessThan(1);
  });
});

const index = buildTrendsiIndex([
  {
    productId: '392458',
    title: 'Cowl Neck Wide-Leg Jumpsuit',
    skuIds: ['100100392458001', '100100392458002'],
  },
  {
    productId: '331278',
    title: 'One-Shoulder Ruched Maxi Dress',
    skuIds: ['100100331278451', '100100331272779'],
  },
  { productId: '389533', title: 'Striped Woven Straw Shoulder Bag', skuIds: ['100100389533111'] },
]);

describe('matchShopifyProduct', () => {
  it('matches through our own SKU scheme with full confidence', () => {
    const match = matchShopifyProduct(
      {
        id: 'gid://shopify/Product/8396732301501',
        title: 'Cowl Neck Wide-Leg Jumpsuit',
        vendor: 'Trendsi',
        skus: ['TRD-392458-S', 'TRD-392458-M'],
      },
      index,
    );

    expect(match).toMatchObject({
      trendsiProductId: '392458',
      method: 'TRD_SKU',
      confidence: 1,
      needsConfirmation: false,
    });
  });

  it("matches through Trendsi's own sku id — the half of the catalogue the brief missed", () => {
    const match = matchShopifyProduct(
      {
        id: 'gid://shopify/Product/8378058997949',
        title: 'One-Shoulder Ruched Maxi Dress',
        vendor: 'Trendsi',
        skus: ['100100331278451', '100100331272779'],
      },
      index,
    );

    expect(match).toMatchObject({
      trendsiProductId: '331278',
      method: 'TRENDSI_SKU_ID',
      confidence: 1,
      needsConfirmation: false,
    });
  });

  it('falls back to the title, but flags it for confirmation', () => {
    const match = matchShopifyProduct(
      {
        id: 'gid://shopify/Product/1',
        title: 'Striped Woven Straw Shoulder Bag',
        vendor: 'Trendsi',
        skus: [null, 'SOME-INTERNAL-SKU'],
      },
      index,
    );

    expect(match?.method).toBe('TITLE');
    expect(match?.needsConfirmation).toBe(true);
    expect(match?.confidence).toBeGreaterThanOrEqual(TITLE_MATCH_THRESHOLD);
  });

  it('will not title-match a product from another supplier', () => {
    const match = matchShopifyProduct(
      {
        id: 'gid://shopify/Product/2',
        title: 'Striped Woven Straw Shoulder Bag',
        vendor: 'Some Other Supplier',
        skus: ['XYZ-1'],
      },
      index,
    );

    expect(match).toBeNull();
  });

  it('returns null rather than guessing when nothing is close', () => {
    const match = matchShopifyProduct(
      {
        id: 'gid://shopify/Product/3',
        title: 'Pearl & Crystal Beaded Bracelet',
        vendor: 'Trendsi',
        skus: ['TRD-999999-WHITE'],
      },
      index,
    );

    expect(match).toBeNull();
  });

  it('prefers the exact SKU route when both routes are available', () => {
    const match = matchShopifyProduct(
      {
        id: 'gid://shopify/Product/4',
        title: 'One-Shoulder Ruched Maxi Dress',
        vendor: 'Trendsi',
        skus: ['TRD-392458-S', '100100331278451'],
      },
      index,
    );

    expect(match?.method).toBe('TRD_SKU');
    expect(match?.trendsiProductId).toBe('392458');
  });
});

describe('trendsiProductIdsFromSkus', () => {
  it("collects the distinct product ids across a product's variants", () => {
    expect(
      trendsiProductIdsFromSkus(['TRD-392458-S', 'TRD-392458-M', 'TRD-80634-L', '100100331278451']),
    ).toEqual(['392458', '80634']);
  });

  it('returns an empty list when no SKU carries an id', () => {
    expect(trendsiProductIdsFromSkus([null, undefined, '100100331278451'])).toEqual([]);
  });
});
