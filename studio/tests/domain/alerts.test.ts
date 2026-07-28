import { describe, expect, it } from 'vitest';
import {
  costIncreaseAlerts,
  marginAlerts,
  priceBandAlerts,
  resolvedDedupeKeys,
  stockoutAlerts,
  type CostObservation,
  type MarginObservation,
  type StockObservation,
} from '@/domain/alerts';

function stock(overrides: Partial<StockObservation> = {}): StockObservation {
  return {
    trendsiProductId: '392458',
    title: 'Cowl Neck Wide-Leg Jumpsuit',
    currentStock: 0,
    soldByUs: true,
    shopifyProductId: 'gid://shopify/Product/8396732301501',
    liveOnStorefront: true,
    ...overrides,
  };
}

function cost(overrides: Partial<CostObservation> = {}): CostObservation {
  return {
    trendsiProductId: '392458',
    title: 'Cowl Neck Wide-Leg Jumpsuit',
    previousCostCents: 1500,
    currentCostCents: 1800,
    soldByUs: true,
    ourRetailCents: 5999,
    ...overrides,
  };
}

function margin(overrides: Partial<MarginObservation> = {}): MarginObservation {
  return {
    shopifyProductId: 'gid://shopify/Product/1',
    title: 'One-Shoulder Ruched Maxi Dress',
    retailCents: 7999,
    landedCostCents: 2807,
    grossMarginPct: 0.649,
    targetMarginPct: 0.65,
    minimumMarginPct: 0.5,
    sectionLabel: 'Maxi Dresses',
    withinBand: false,
    bandMinCents: 4200,
    bandMaxCents: 7200,
    ...overrides,
  };
}

describe('stockoutAlerts', () => {
  it('raises a critical alert for a live product the supplier cannot fulfil', () => {
    const [alert] = stockoutAlerts([stock()]);

    expect(alert?.type).toBe('STOCKOUT');
    expect(alert?.severity).toBe('CRITICAL');
    expect(alert?.body).toContain('despublicarlo');
  });

  it('softens the alert when our listing is not published', () => {
    const [alert] = stockoutAlerts([stock({ liveOnStorefront: false })]);

    expect(alert?.severity).toBe('WARNING');
    expect(alert?.body).toContain('no está publicada');
  });

  /**
   * The narrowing that keeps the list readable: a supplier running out of
   * something we do not sell is not news, and a list full of things you cannot
   * act on is a list nobody reads.
   */
  it('says nothing about a stockout on a product we do not sell', () => {
    expect(stockoutAlerts([stock({ soldByUs: false })])).toEqual([]);
  });

  it('says nothing while there is stock', () => {
    expect(stockoutAlerts([stock({ currentStock: 12 })])).toEqual([]);
  });

  it('gives the same product the same dedupe key every run', () => {
    const first = stockoutAlerts([stock()])[0];
    const second = stockoutAlerts([stock()])[0];
    expect(first?.dedupeKey).toBe(second?.dedupeKey);
  });
});

describe('costIncreaseAlerts', () => {
  it('raises an alert once the rise passes the threshold', () => {
    // 15 → 18 dollars is a 20% rise, over a 10% threshold.
    const [alert] = costIncreaseAlerts([cost()], 0.1);

    expect(alert?.type).toBe('COST_INCREASE');
    expect(alert?.body).toContain('$15.00');
    expect(alert?.body).toContain('$18.00');
    expect(alert?.body).toContain('20%');
  });

  it('stays quiet for a rise under the threshold', () => {
    expect(costIncreaseAlerts([cost({ currentCostCents: 1550 })], 0.1)).toEqual([]);
  });

  /** A cost going down needs no action, and would only dilute the list. */
  it('says nothing when the cost goes down', () => {
    expect(costIncreaseAlerts([cost({ currentCostCents: 1200 })], 0.1)).toEqual([]);
  });

  it('escalates a very large rise to critical', () => {
    const [alert] = costIncreaseAlerts([cost({ currentCostCents: 2400 })], 0.1);
    expect(alert?.severity).toBe('CRITICAL');
  });

  it('spells out what the rise does to the margin on something we sell', () => {
    const [alert] = costIncreaseAlerts([cost()], 0.1);
    expect(alert?.body).toContain('Tu margen bruto pasa del');
  });

  it('leaves out the margin note for something we do not sell', () => {
    const [alert] = costIncreaseAlerts([cost({ soldByUs: false, ourRetailCents: null })], 0.1);
    expect(alert?.body).not.toContain('Tu margen');
  });

  /**
   * The new cost is part of the key, so a second rise raises a second alert
   * instead of being swallowed by the first one still sitting open.
   */
  it('raises a fresh alert when the cost rises again', () => {
    const first = costIncreaseAlerts([cost({ currentCostCents: 1800 })], 0.1)[0];
    const second = costIncreaseAlerts(
      [cost({ previousCostCents: 1800, currentCostCents: 2200 })],
      0.1,
    )[0];

    expect(first?.dedupeKey).not.toBe(second?.dedupeKey);
  });

  it('ignores a product with no previous cost to compare against', () => {
    expect(costIncreaseAlerts([cost({ previousCostCents: 0 })], 0.1)).toEqual([]);
  });
});

describe('marginAlerts', () => {
  it('flags a product whose margin fell below the floor', () => {
    const [alert] = marginAlerts([margin({ grossMarginPct: 0.42 })]);

    expect(alert?.type).toBe('MARGIN_BELOW_TARGET');
    expect(alert?.body).toContain('42%');
    expect(alert?.body).toContain('50%');
  });

  /**
   * Below target is normal and not worth an alert; below the minimum is the
   * point at which the product stops being worth its catalogue slot.
   */
  it('does not fire merely for missing the target', () => {
    expect(marginAlerts([margin({ grossMarginPct: 0.6 })])).toEqual([]);
  });
});

describe('priceBandAlerts', () => {
  it('flags the real $79.99 dress as above its band', () => {
    const [alert] = priceBandAlerts([margin()]);

    expect(alert?.type).toBe('PRICE_OUT_OF_BAND');
    expect(alert?.body).toContain('$79.99');
    expect(alert?.body).toContain('por encima del techo');
    expect(alert?.body).toContain('$72.00');
  });

  it('flags a product priced under the floor too', () => {
    const [alert] = priceBandAlerts([margin({ retailCents: 2999 })]);
    expect(alert?.body).toContain('por debajo del suelo');
  });

  it('says nothing about a product inside its band', () => {
    expect(priceBandAlerts([margin({ withinBand: true })])).toEqual([]);
  });
});

describe('resolvedDedupeKeys', () => {
  /**
   * An alert that has stopped being true has to close itself. Leaving solved
   * problems on the list is how the list stops being trusted, and an untrusted
   * list is an unread one.
   */
  it('closes an alert whose condition no longer holds', () => {
    const open = ['STOCKOUT:392458', 'PRICE_OUT_OF_BAND:gid://shopify/Product/1'];
    const stillRaised = stockoutAlerts([stock()]);

    expect(resolvedDedupeKeys(open, stillRaised)).toEqual([
      'PRICE_OUT_OF_BAND:gid://shopify/Product/1',
    ]);
  });

  it('keeps an alert open while its condition still holds', () => {
    const stillRaised = stockoutAlerts([stock()]);
    expect(resolvedDedupeKeys(['STOCKOUT:392458'], stillRaised)).toEqual([]);
  });

  /**
   * A price rise does not un-happen. Those close when a human has dealt with
   * them, not because the next run saw the same (already risen) price.
   */
  it('never auto-closes a cost increase', () => {
    expect(resolvedDedupeKeys(['COST_INCREASE:392458:1800'], [])).toEqual([]);
  });
});
