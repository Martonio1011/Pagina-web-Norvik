import { describe, expect, it } from 'vitest';
import { EconomicsInputError, computeEconomics, landedCost, marginsAt } from '@/domain/economics';
import { accessoriesSection, makeSection } from '../helpers/sections';

const FEES = 0.03;
const RETURNS = 0.08;

describe('landedCost', () => {
  it('adds shipping to the dropship price', () => {
    expect(landedCost(2257, 550)).toBe(2807);
  });

  it('treats a zero cost as a parsing failure, not a free product', () => {
    expect(() => landedCost(0, 550)).toThrow(EconomicsInputError);
    expect(() => landedCost(-100, 550)).toThrow(EconomicsInputError);
  });

  it('rejects fractional cents, which mean someone passed dollars', () => {
    expect(() => landedCost(22.57, 550)).toThrow(EconomicsInputError);
  });
});

describe('computeEconomics', () => {
  it('prices a normal dress from the target margin', () => {
    // $18.00 cost + $5.50 shipping = $23.50 landed.
    // At a 65% target: 23.50 / 0.35 = $67.14 → charm rounded to $67.99,
    // which sits inside the $42–72 band and needs no further adjustment.
    const result = computeEconomics({
      dropshipCents: 1800,
      shippingCents: 550,
      section: makeSection(),
      paymentFeeRate: FEES,
      returnRate: RETURNS,
    });

    expect(result.landedCostCents).toBe(2350);
    expect(result.idealRetailCents).toBe(6714);
    expect(result.suggestedRetailCents).toBe(6799);
    expect(result.withinBand).toBe(true);
    expect(result.meetsTargetMargin).toBe(true);
    expect(result.adjustments.map((a) => a.rule)).toEqual(['CHARM_ROUNDING']);
  });

  it('caps at the band ceiling and reports that the target is no longer met', () => {
    // The real case from the store: a $22.57 cost sitting behind a $79.99 price.
    // Landed $28.07 → the 65% target would ask $80.99, but Maxi Dresses stops
    // at $72. The price is capped and the shortfall is stated, not hidden.
    const result = computeEconomics({
      dropshipCents: 2257,
      shippingCents: 550,
      section: makeSection(),
      paymentFeeRate: FEES,
      returnRate: RETURNS,
    });

    expect(result.idealRetailCents).toBe(8020);
    expect(result.suggestedRetailCents).toBe(7200);
    expect(result.adjustments.map((a) => a.rule)).toEqual(['CHARM_ROUNDING', 'BAND_CEILING']);
    expect(result.withinBand).toBe(true);
    expect(result.meetsTargetMargin).toBe(false);
    // Still comfortably above the floor below which it is not worth a slot.
    expect(result.meetsMinimumMargin).toBe(true);
    expect(result.grossMarginCents).toBe(4393);
    expect(result.grossMarginPct).toBeCloseTo(0.61, 2);
  });

  it('lifts a very cheap product to the band floor', () => {
    // $3.00 + $5.50 = $8.50 landed. The margin alone would ask $24.99, which
    // would undersell the section, so it is raised to the $42 floor.
    const result = computeEconomics({
      dropshipCents: 300,
      shippingCents: 550,
      section: makeSection(),
      paymentFeeRate: FEES,
      returnRate: RETURNS,
    });

    expect(result.adjustments.map((a) => a.rule)).toEqual(['CHARM_ROUNDING', 'BAND_FLOOR']);
    expect(result.suggestedRetailCents).toBe(4200);
    expect(result.grossMarginPct).toBeGreaterThan(0.79);
  });

  it("never prices above Trendsi's MSRP", () => {
    const result = computeEconomics({
      dropshipCents: 1800,
      shippingCents: 550,
      msrpCents: 4999,
      section: makeSection(),
      paymentFeeRate: FEES,
      returnRate: RETURNS,
    });

    expect(result.suggestedRetailCents).toBe(4999);
    expect(result.adjustments.at(-1)?.rule).toBe('MSRP_CEILING');
  });

  it('leaves the price alone when the MSRP is above it', () => {
    const result = computeEconomics({
      dropshipCents: 1800,
      shippingCents: 550,
      msrpCents: 9900,
      section: makeSection(),
      paymentFeeRate: FEES,
      returnRate: RETURNS,
    });

    expect(result.suggestedRetailCents).toBe(6799);
    expect(result.adjustments.some((a) => a.rule === 'MSRP_CEILING')).toBe(false);
  });

  it('applies the accessories section its own higher target margin', () => {
    // $8.00 + $5.50 = $13.50 landed, 68% target → $42.19 → $42.99, inside
    // the $26–49 accessories band.
    const result = computeEconomics({
      dropshipCents: 800,
      shippingCents: 550,
      section: accessoriesSection,
      paymentFeeRate: FEES,
      returnRate: RETURNS,
    });

    expect(result.suggestedRetailCents).toBe(4299);
    expect(result.meetsTargetMargin).toBe(true);
  });

  it('records every adjustment in the order it was applied', () => {
    const result = computeEconomics({
      dropshipCents: 300,
      shippingCents: 550,
      msrpCents: 3500,
      section: makeSection(),
      paymentFeeRate: FEES,
      returnRate: RETURNS,
    });

    expect(result.adjustments.map((a) => a.rule)).toEqual([
      'CHARM_ROUNDING',
      'BAND_FLOOR',
      'MSRP_CEILING',
    ]);
    // Each step hands its result to the next, so the trail reads continuously.
    for (let i = 1; i < result.adjustments.length; i += 1) {
      expect(result.adjustments[i]?.fromCents).toBe(result.adjustments[i - 1]?.toCents);
    }
    expect(result.suggestedRetailCents).toBe(3500);
    // Capped below the band floor by the supplier's own MSRP: worth flagging.
    expect(result.withinBand).toBe(false);
  });

  it('rejects a percentage passed where a fraction was expected', () => {
    expect(() =>
      computeEconomics({
        dropshipCents: 1800,
        shippingCents: 550,
        section: makeSection(),
        paymentFeeRate: 3,
        returnRate: RETURNS,
      }),
    ).toThrow(EconomicsInputError);
  });
});

describe('marginsAt', () => {
  it('computes the margins on a price that already exists', () => {
    // The store's $79.99 dress against its real $28.07 landed cost.
    const result = marginsAt(7999, 2807, FEES, RETURNS);

    expect(result.grossMarginCents).toBe(5192);
    expect(result.grossMarginPct).toBeCloseTo(0.649, 3);
    // Net: 79.99 × 0.92 kept − 79.99 × 0.03 fees − 28.07 cost = $43.12.
    expect(result.netMarginCents).toBe(4312);
    expect(result.netMarginPct).toBeCloseTo(0.539, 3);
  });

  it('reports a loss as a negative margin instead of clamping it to zero', () => {
    const result = marginsAt(2000, 2807, FEES, RETURNS);
    expect(result.grossMarginCents).toBe(-807);
    expect(result.netMarginPct).toBeLessThan(0);
  });

  it('refuses to divide by a zero price', () => {
    expect(() => marginsAt(0, 2807, FEES, RETURNS)).toThrow(EconomicsInputError);
  });

  it('shows returns eating margin as the return rate climbs', () => {
    const low = marginsAt(6799, 2350, FEES, 0.02);
    const high = marginsAt(6799, 2350, FEES, 0.2);

    expect(high.netMarginCents).toBeLessThan(low.netMarginCents);
    // Gross is blind to returns; that is exactly why net is shown next to it.
    expect(high.grossMarginCents).toBe(low.grossMarginCents);
  });
});
