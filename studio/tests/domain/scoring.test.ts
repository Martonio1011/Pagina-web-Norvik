import { describe, expect, it } from 'vitest';
import {
  containsTerm,
  normaliseForMatching,
  scoreProduct,
  summariseScore,
  type ScoreInput,
} from '@/domain/scoring';
import { loadBrandRules, resetConfigCache } from '@/lib/config';

const rules = loadBrandRules();

function score(input: ScoreInput) {
  return scoreProduct(rules, input);
}

describe('config/brand-rules.yaml', () => {
  it('parses, and its weights add up to 100', () => {
    resetConfigCache();
    const loaded = loadBrandRules();
    const total = Object.values(loaded.weights).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBe(100);
  });

  it('carries the materials the brief names as brand-defining', () => {
    for (const material of ['satin', 'eyelet', 'linen', 'knit', 'pearl', 'raffia']) {
      expect(rules.materials.positive).toContain(material);
    }
  });

  it('carries the five colours with proven demand', () => {
    for (const colour of ['chocolate', 'wine', 'black', 'sage', 'cream']) {
      expect(rules.color.positive).toContain(colour);
    }
  });
});

describe('text matching', () => {
  it('treats hyphens and spaces as the same thing, because Trendsi writes both', () => {
    expect(normaliseForMatching('Wide-Leg Jumpsuit')).toBe('wide leg jumpsuit');
    expect(containsTerm(normaliseForMatching('Wide-Leg Jumpsuit'), 'wide leg')).toBe(true);
    expect(containsTerm(normaliseForMatching('Wide Leg Jumpsuit'), 'wide-leg')).toBe(true);
  });

  it('strips accents so an accented listing still matches', () => {
    expect(containsTerm(normaliseForMatching('Vestido de Satén'), 'saten')).toBe(true);
  });

  /**
   * The regression that matters most in this module. Substring matching would
   * find "sage" inside "message" and "knit" inside "unknitted", and a scorer
   * that rewards a dress for containing the word "message" is worse than
   * having no scorer at all.
   */
  it('matches whole words only, never substrings', () => {
    expect(containsTerm(normaliseForMatching('Read the message below'), 'sage')).toBe(false);
    expect(containsTerm(normaliseForMatching('An unknitted fabric'), 'knit')).toBe(false);
    expect(containsTerm(normaliseForMatching('Blacksmith apron'), 'black')).toBe(false);
    expect(containsTerm(normaliseForMatching('Sage Green Midi Dress'), 'sage')).toBe(true);
  });

  it('ignores an empty term instead of matching everything', () => {
    expect(containsTerm('anything at all', '')).toBe(false);
    expect(containsTerm('anything at all', '   ')).toBe(false);
  });
});

describe('hard exclusions', () => {
  it('discards childrenswear, menswear, activewear, costume and christmas', () => {
    const cases: { title: string; reason: string }[] = [
      { title: 'Girls Floral Summer Dress', reason: 'Ropa infantil' },
      { title: "Mens Linen Shirt", reason: 'Ropa de hombre' },
      { title: 'High Waist Yoga Leggings Set', reason: 'Deportivo' },
      { title: 'Halloween Witch Costume', reason: 'Disfraz' },
      { title: 'Ugly Sweater Christmas Party', reason: 'Navideño' },
    ];

    for (const testCase of cases) {
      const result = score({ title: testCase.title });
      expect(result.excluded, testCase.title).toBe(true);
      expect(result.exclusionReason).toBe(testCase.reason);
      expect(result.total).toBeNull();
    }
  });

  it('names the term that caused the exclusion, so the decision can be checked', () => {
    const result = score({ title: 'Toddler Party Dress' });
    expect(result.exclusionTerm).toBe('toddler');
  });

  /**
   * An excluded product returns no score at all rather than a low one. A zero
   * would still sort above nothing, and the brief is explicit that brand fit
   * outranks margin: a kids' dress with a wonderful margin must never surface.
   */
  it('returns no score at all, not a low one', () => {
    const result = score({
      title: 'Girls Satin Maxi Dress in Sage',
      description: 'An effortless, timeless, romantic resort piece',
    });

    expect(result.excluded).toBe(true);
    expect(result.total).toBeNull();
    expect(result.components).toEqual([]);
  });

  it('catches an exclusion hiding in the description, not just the title', () => {
    const result = score({
      title: 'Ribbed Two Piece Set',
      description: 'Perfect activewear for the gym or a workout class.',
    });
    expect(result.excluded).toBe(true);
  });
});

describe('scoreProduct', () => {
  it('scores a quintessentially Norvik product highly', () => {
    const result = score({
      title: 'Satin Halter Maxi Dress',
      description: 'An effortless, timeless piece for golden hour. Quietly flattering.',
      colors: ['Chocolate', 'Wine'],
      priceFit: {
        withinBand: true,
        meetsTargetMargin: true,
        meetsMinimumMargin: true,
        suggestedRetailLabel: '$67.99',
        sectionLabel: 'Maxi Dresses',
      },
    });

    expect(result.excluded).toBe(false);
    expect(result.total).toBeGreaterThanOrEqual(85);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('scores an off-brand product low without excluding it', () => {
    const result = score({
      title: 'Sequin Bodycon Mini Dress',
      description: 'Turn heads at the club. Party girl energy.',
      colors: ['Hot Pink'],
      priceFit: {
        withinBand: false,
        meetsTargetMargin: false,
        meetsMinimumMargin: false,
      },
    });

    expect(result.excluded).toBe(false);
    expect(result.total).toBe(0);
  });

  it('never goes above 100 however many good terms pile up', () => {
    const result = score({
      title: 'Satin Linen Knit Lace Pearl Raffia Straw Crochet Cotton Maxi Midi Column Halter Cowl Wrap Tiered Dress',
      description:
        'Effortless timeless elegant romantic resort vacation golden hour flattering refined feminine',
      colors: ['Chocolate', 'Wine', 'Black', 'Sage', 'Cream'],
      priceFit: { withinBand: true, meetsTargetMargin: true, meetsMinimumMargin: true },
    });

    expect(result.total).toBe(100);
    for (const group of result.groups) {
      expect(group.points).toBeLessThanOrEqual(group.weight);
    }
  });

  it('never goes below 0 however many bad terms pile up', () => {
    const result = score({
      title: 'Sequin Glitter Rhinestone Camo Faux Leather Neon Bodycon Cutout Crop Top',
      description: 'Club rave festival streetwear edgy baddie y2k party girl',
      colors: ['Hot Pink', 'Lime', 'Neon Green'],
      priceFit: { withinBand: false, meetsTargetMargin: false, meetsMinimumMargin: false },
    });

    expect(result.total).toBe(0);
    for (const group of result.groups) {
      expect(group.points).toBeGreaterThanOrEqual(0);
    }
  });

  it('adds up to exactly the sum of its groups, with nothing unaccounted for', () => {
    const result = score({
      title: 'Eyelet Midi Dress',
      colors: ['Cream'],
      priceFit: { withinBand: true, meetsTargetMargin: true, meetsMinimumMargin: true },
    });

    const fromGroups = result.groups.reduce((sum, group) => sum + group.points, 0);
    expect(result.total).toBe(Math.round(fromGroups));
  });

  it('explains every point it awarded', () => {
    const result = score({
      title: 'Linen Wide-Leg Jumpsuit',
      colors: ['Sage'],
      priceFit: { withinBand: true, meetsTargetMargin: true, meetsMinimumMargin: true },
    });

    expect(result.components.length).toBeGreaterThan(0);
    for (const component of result.components) {
      expect(component.evidence).not.toBe('');
      expect(component.label).not.toBe('');
    }

    const labels = result.components.map((component) => component.label);
    expect(labels).toContain('linen');
    expect(labels).toContain('wide leg');
    expect(labels).toContain('sage');
  });

  it('says where each term was found, so an odd score can be traced', () => {
    const result = score({
      title: 'Ruffle Dress',
      description: 'Cut from soft linen.',
      colors: ['Chocolate'],
    });

    const linen = result.components.find((component) => component.label === 'linen');
    const chocolate = result.components.find((component) => component.label === 'chocolate');

    expect(linen?.evidence).toContain('descripción');
    expect(chocolate?.evidence).toContain('color');
  });
});

describe('the price fit group', () => {
  const base: ScoreInput = { title: 'Plain Dress' };

  it('rewards a price that lands in the band and hits the margin', () => {
    const result = score({
      ...base,
      priceFit: { withinBand: true, meetsTargetMargin: true, meetsMinimumMargin: true },
    });
    const priceGroup = result.groups.find((group) => group.group === 'PRICE_FIT');
    expect(priceGroup?.points).toBe(20);
  });

  it('gives partial credit when the price fits but the margin is thin', () => {
    const result = score({
      ...base,
      priceFit: { withinBand: true, meetsTargetMargin: false, meetsMinimumMargin: true },
    });
    const priceGroup = result.groups.find((group) => group.group === 'PRICE_FIT');
    expect(priceGroup?.points).toBe(12);
  });

  it('gives nothing when neither the band nor the minimum margin is met', () => {
    const result = score({
      ...base,
      priceFit: { withinBand: false, meetsTargetMargin: false, meetsMinimumMargin: false },
    });
    const priceGroup = result.groups.find((group) => group.group === 'PRICE_FIT');
    expect(priceGroup?.points).toBe(0);
  });

  /**
   * Before a Trendsi cost is known there is no honest price score to give, so
   * it scores zero and says why — rather than assuming the best and inflating
   * every candidate by twenty points on the strength of nothing.
   */
  it('scores zero and explains itself when there is no cost data yet', () => {
    const result = score(base);
    const priceGroup = result.groups.find((group) => group.group === 'PRICE_FIT');

    expect(priceGroup?.points).toBe(0);
    expect(priceGroup?.components[0]?.evidence).toContain('coste de proveedor');
  });
});

describe('against the real catalogue', () => {
  /**
   * Real products from norviik.myshopify.com, scored with no price data since
   * none of them has a Trendsi cost recorded yet. What is being checked is the
   * ordering the brand rules produce, not absolute numbers.
   */
  it('ranks the eyelet dress above the bodycon mini', () => {
    const eyelet = score({
      title: 'Eyelet Grecian Neck Mini Dress',
      description: 'Crisp white eyelet fabric and a graceful grecian neckline.',
      productType: 'Dress',
    });

    const bodycon = score({
      title: 'Off-Shoulder Bodycon Mini Dress',
      description: 'An off-shoulder neckline, a backless cut and a stretch fabric.',
      productType: 'Dress',
    });

    expect(eyelet.total).toBeGreaterThan(bodycon.total!);
  });

  it('flags the bodycon mini the store currently sells as poorly fitting', () => {
    const result = score({
      title: 'Off-Shoulder Bodycon Mini Dress',
      description: 'An off-shoulder neckline, a backless cut and a stretch fabric.',
      colors: ['White', 'Burgundy', 'Navy Blue', 'Pink'],
    });

    const silhouette = result.groups.find((group) => group.group === 'SILHOUETTE');
    expect(silhouette?.rawPoints).toBeLessThan(0);
    expect(result.components.some((component) => component.label === 'bodycon')).toBe(true);
  });

  it('scores the straw bag well on materials', () => {
    const result = score({
      title: 'Striped Woven Straw Shoulder Bag',
      description: 'Handwoven from natural straw. Pairs with resort dresses and linen sets.',
      productType: 'Bags',
    });

    const materials = result.groups.find((group) => group.group === 'MATERIALS');
    expect(materials?.points).toBeGreaterThan(0);
    expect(result.components.some((component) => component.label === 'straw')).toBe(true);
  });
});

describe('summariseScore', () => {
  it('names the strongest reasons a product fits', () => {
    const result = score({
      title: 'Satin Maxi Dress',
      colors: ['Chocolate'],
      priceFit: { withinBand: true, meetsTargetMargin: true, meetsMinimumMargin: true },
    });

    expect(summariseScore(result)).toContain('precio y margen correctos');
  });

  it('says why a product was discarded instead of summarising a score it has not got', () => {
    expect(summariseScore(score({ title: 'Girls Party Dress' }))).toBe('Descartado: Ropa infantil');
  });

  it('is honest when nothing at all matched', () => {
    expect(summariseScore(score({ title: 'Plain Item' }))).toBe(
      'Nada en la ficha encaja con la marca',
    );
  });
});
