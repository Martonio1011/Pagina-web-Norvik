import { describe, expect, it } from 'vitest';
import {
  PROMISING_SCORE,
  evaluateCandidate,
  rankCandidates,
  type EvaluationSettings,
  type TrendsiProductFacts,
} from '@/domain/candidate';
import { loadBrandRules, loadSections } from '@/lib/config';

const sections = loadSections();
const rules = loadBrandRules();

const settings: EvaluationSettings = {
  shippingCents: 550,
  paymentFeeRate: 0.03,
  returnRate: 0.08,
};

function facts(overrides: Partial<TrendsiProductFacts> = {}): TrendsiProductFacts {
  return {
    productId: '392458',
    title: 'Satin Halter Maxi Dress',
    description: 'An effortless, timeless piece for golden hour.',
    brand: 'Some Vendor',
    msrpCents: null,
    shipFrom: 'OVERSEAS',
    categories: ['Dress'],
    colors: ['Chocolate', 'Wine'],
    sizes: ['S', 'M', 'L'],
    minDropshipCents: 1800,
    totalStock: 40,
    imageUrl: null,
    detailUrl: 'https://app.trendsi.com/products/detail?id=392458',
    ...overrides,
  };
}

function evaluate(overrides: Partial<TrendsiProductFacts> = {}, duplicates = []) {
  return evaluateCandidate({ facts: facts(overrides), sections, rules, settings, duplicates });
}

describe('evaluateCandidate', () => {
  it('puts a strong product together end to end', () => {
    const result = evaluate();

    expect(result.section?.key).toBe('maxi-dresses');
    expect(result.economics).not.toBeNull();
    expect(result.economics?.suggestedRetailCents).toBe(6799);
    expect(result.score.total).toBeGreaterThanOrEqual(PROMISING_SCORE);
    expect(result.verdict).toBe('PROMISING');
  });

  it('feeds the economics into the brand score rather than scoring them apart', () => {
    const withPrice = evaluate();
    const priceGroup = withPrice.score.groups.find((group) => group.group === 'PRICE_FIT');

    expect(priceGroup?.points).toBe(20);
    expect(priceGroup?.components[0]?.evidence).toContain('$67.99');
    expect(priceGroup?.components[0]?.evidence).toContain('Maxi Dresses');
  });

  it('refuses to price a product it cannot classify, and says so', () => {
    const result = evaluate({ title: 'Unclassifiable Widget', categories: ['Widget'] });

    expect(result.section).toBeNull();
    expect(result.economics).toBeNull();
    expect(result.economicsError).toContain('Sin sección asignada');
    expect(result.verdict).toBe('REVIEW');
  });

  /**
   * A dropship price of zero means the parser failed, not that the supplier is
   * giving stock away. Pricing off it would produce a beautiful fake margin.
   */
  it('refuses to price a product whose cost did not parse', () => {
    const result = evaluate({ minDropshipCents: 0 });

    expect(result.economics).toBeNull();
    expect(result.economicsError).toContain('No se puede calcular el precio');
    expect(result.verdict).toBe('REVIEW');
  });

  it('never scores an excluded product, whatever its margin', () => {
    const result = evaluate({ title: 'Girls Satin Maxi Dress', minDropshipCents: 300 });

    expect(result.score.excluded).toBe(true);
    expect(result.score.total).toBeNull();
    expect(result.verdict).toBe('EXCLUDED');
    expect(result.verdictReason).toContain('Ropa infantil');
  });

  it('marks a product already in the shop rather than proposing it again', () => {
    const result = evaluateCandidate({
      facts: facts(),
      sections,
      rules,
      settings,
      duplicates: [
        {
          shopifyProductId: 'gid://shopify/Product/1',
          title: 'Satin Halter Maxi Dress',
          method: 'TRD_SKU',
          confidence: 1,
          needsConfirmation: false,
        },
      ],
    });

    expect(result.alreadyInStore).toBe(true);
    expect(result.verdict).toBe('ALREADY_STOCKED');
  });

  /**
   * A title match is a suggestion, not a fact. It must not silently remove a
   * product from the queue — it is surfaced so a human can confirm it.
   */
  it('does not treat an unconfirmed title match as already stocked', () => {
    const result = evaluateCandidate({
      facts: facts(),
      sections,
      rules,
      settings,
      duplicates: [
        {
          shopifyProductId: 'gid://shopify/Product/1',
          title: 'Satin Halter Maxi Dress in Sage',
          method: 'TITLE',
          confidence: 0.88,
          needsConfirmation: true,
        },
      ],
    });

    expect(result.alreadyInStore).toBe(false);
    expect(result.verdict).not.toBe('ALREADY_STOCKED');
    // Still shown, so the possible duplicate is not hidden.
    expect(result.duplicates).toHaveLength(1);
  });

  it('flags a product with no stock for review instead of recommending it', () => {
    const result = evaluate({ totalStock: 0 });
    expect(result.verdict).toBe('REVIEW');
    expect(result.verdictReason).toContain('Sin stock');
  });

  it('calls out a product whose margin falls under the minimum', () => {
    // $45 cost on a dress capped at $72 leaves nowhere near the floor margin.
    const result = evaluate({ minDropshipCents: 4500 });

    expect(result.economics?.meetsMinimumMargin).toBe(false);
    expect(result.verdict).toBe('WEAK');
    expect(result.verdictReason).toContain('margen');
  });

  it('separates "fits but the money is tight" from "does not fit"', () => {
    // $22.57 is the real cost behind the store's $79.99 dress: the brand fit is
    // fine, the target margin is not reachable inside the band.
    const tight = evaluate({ minDropshipCents: 2257 });
    expect(tight.economics?.meetsTargetMargin).toBe(false);
    expect(tight.economics?.meetsMinimumMargin).toBe(true);
    expect(tight.verdict).toBe('REVIEW');
    expect(tight.verdictReason).toContain('no alcanza el margen objetivo');

    const offBrand = evaluate({
      title: 'Sequin Bodycon Mini Dress',
      description: 'Party girl energy for the club.',
      colors: ['Hot Pink'],
    });
    expect(offBrand.verdict).toBe('WEAK');
    expect(offBrand.verdictReason).toContain('Encaja poco');
  });

  it('honours a section assigned by hand over the classifier', () => {
    const result = evaluateCandidate({
      facts: facts({ title: 'Something Ambiguous', categories: [] }),
      sections,
      rules,
      settings,
      forcedSectionKey: 'resort-wear',
    });

    expect(result.section?.key).toBe('resort-wear');
    expect(result.sectionReason).toBe('asignada a mano');
    expect(result.economics).not.toBeNull();
  });

  it("caps the suggested price at Trendsi's MSRP", () => {
    const result = evaluate({ msrpCents: 4999 });

    expect(result.economics?.suggestedRetailCents).toBe(4999);
    expect(result.economics?.adjustments.at(-1)?.rule).toBe('MSRP_CEILING');
  });
});

describe('rankCandidates', () => {
  it('puts brand fit ahead of margin, as the brief requires', () => {
    // A product that fits the brand less well but earns more must not outrank
    // one that fits better — sorting by money would invert the whole point.
    //
    // The costs below are picked so the off-brand product genuinely earns more
    // in absolute terms, which takes some care: the section's price band caps
    // what anything can be sold for, so simply making a product cheap does not
    // make it more profitable — it just gets priced at the band floor.
    const strongFitThinMargin = evaluate({ minDropshipCents: 2257 });
    const weakFitFatMargin = evaluate({
      title: 'Sequin Bodycon Mini Dress',
      description: 'Party girl energy for the club.',
      colors: ['Hot Pink'],
      minDropshipCents: 1970,
    });

    const [first] = rankCandidates([weakFitFatMargin, strongFitThinMargin]);

    expect(weakFitFatMargin.economics!.netMarginCents).toBeGreaterThan(
      strongFitThinMargin.economics!.netMarginCents,
    );
    expect(first?.trendsiProductId).toBe(strongFitThinMargin.trendsiProductId);
  });

  it('sinks excluded and already-stocked products without dropping them', () => {
    const promising = evaluate();
    const excluded = evaluate({ productId: 'x', title: 'Girls Party Dress' });
    const stocked = evaluateCandidate({
      facts: facts({ productId: 'y' }),
      sections,
      rules,
      settings,
      duplicates: [
        {
          shopifyProductId: 'gid://shopify/Product/1',
          title: 'Satin Halter Maxi Dress',
          method: 'TRD_SKU',
          confidence: 1,
          needsConfirmation: false,
        },
      ],
    });

    const ranked = rankCandidates([excluded, stocked, promising]);

    expect(ranked.map((candidate) => candidate.verdict)).toEqual([
      'PROMISING',
      'ALREADY_STOCKED',
      'EXCLUDED',
    ]);
    expect(ranked).toHaveLength(3);
  });

  it('does not mutate the list it was given', () => {
    const list = [evaluate({ productId: 'a' }), evaluate({ productId: 'b', title: 'Girls Dress' })];
    const before = list.map((candidate) => candidate.trendsiProductId);

    rankCandidates(list);

    expect(list.map((candidate) => candidate.trendsiProductId)).toEqual(before);
  });
});
