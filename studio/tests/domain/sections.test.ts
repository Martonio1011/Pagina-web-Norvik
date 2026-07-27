import { describe, expect, it } from 'vitest';
import { bandPosition, classifySection } from '@/domain/sections';
import { loadSections, resetConfigCache } from '@/lib/config';
import { makeSection } from '../helpers/sections';

/**
 * These run against the real `config/sections.yaml`, because a config file
 * that no longer parses is a startup failure and should be caught here rather
 * than at boot.
 */

describe('config/sections.yaml', () => {
  it('parses and covers every section of the store', () => {
    resetConfigCache();
    const sections = loadSections();

    expect(sections.map((section) => section.key)).toEqual([
      'accessories',
      'jumpsuits',
      'linen-sets',
      'maxi-dresses',
      'mini-midi-dresses',
      'resort-wear',
    ]);
  });

  it('states the price bands the brief asked for, in cents', () => {
    const sections = loadSections();
    const byKey = Object.fromEntries(sections.map((section) => [section.key, section]));

    expect(byKey['maxi-dresses']?.priceBandCents).toEqual({ min: 4200, max: 7200 });
    expect(byKey['jumpsuits']?.priceBandCents).toEqual({ min: 5200, max: 6400 });
    expect(byKey['accessories']?.priceBandCents).toEqual({ min: 2600, max: 4900 });
    expect(byKey['linen-sets']?.priceBandCents).toEqual({ min: 4600, max: 7200 });
  });

  it('gives every section a usable margin target', () => {
    for (const section of loadSections()) {
      expect(section.targetMargin).toBeGreaterThan(0.4);
      expect(section.targetMargin).toBeLessThan(0.95);
    }
  });
});

describe('classifySection', () => {
  const sections = loadSections();

  it('puts real store products in the section a human would', () => {
    const cases: { title: string; productType: string; expected: string }[] = [
      {
        title: 'Striped Woven Straw Shoulder Bag',
        productType: 'Bags',
        expected: 'accessories',
      },
      { title: 'Cowl Neck Wide-Leg Jumpsuit', productType: 'Jumpsuit', expected: 'jumpsuits' },
      { title: 'Halter Neck Maxi Dress', productType: 'Dress', expected: 'maxi-dresses' },
      {
        title: 'Eyelet Grecian Neck Mini Dress',
        productType: 'Dress',
        expected: 'mini-midi-dresses',
      },
      {
        title: 'Pearl Necklace with Interlocking Clasp',
        productType: 'Necklace',
        expected: 'accessories',
      },
    ];

    for (const testCase of cases) {
      const { section } = classifySection(sections, {
        title: testCase.title,
        productType: testCase.productType,
      });
      expect(section?.key, `${testCase.title} should be ${testCase.expected}`).toBe(
        testCase.expected,
      );
    }
  });

  it('only calls something a linen set when the fabric supports it', () => {
    const linen = classifySection(sections, {
      title: 'Linen Top and Shorts Set',
      productType: 'Set',
    });
    expect(linen.section?.key).toBe('linen-sets');

    // "Set" alone is far too broad — a sequin party set is not a linen set.
    const sequin = classifySection(sections, {
      title: 'Sequin Party Set',
      productType: 'Set',
    });
    expect(sequin.section?.key).not.toBe('linen-sets');
  });

  it('returns no section instead of guessing, and says why', () => {
    const result = classifySection(sections, {
      title: 'Something Entirely Unclassifiable',
      productType: 'Widget',
    });

    expect(result.section).toBeNull();
    expect(result.reason).toMatch(/no section rule matched/);
  });

  it('explains which rule fired', () => {
    const result = classifySection(sections, {
      title: 'Cowl Neck Wide-Leg Jumpsuit',
      productType: 'Jumpsuit',
    });
    expect(result.reason).toContain('jumpsuit');
  });
});

describe('bandPosition', () => {
  const section = makeSection();

  it('places a price relative to its band', () => {
    expect(bandPosition(3999, section)).toBe('BELOW');
    expect(bandPosition(4200, section)).toBe('WITHIN');
    expect(bandPosition(5999, section)).toBe('WITHIN');
    expect(bandPosition(7200, section)).toBe('WITHIN');
    expect(bandPosition(7999, section)).toBe('ABOVE');
  });
});
