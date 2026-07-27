import { roundToCharmPrice } from './money';
import type { Section } from './sections';

/**
 * Product economics: what a product costs me, what I should charge for it, and
 * what I actually keep.
 *
 * Pure functions, integer cents, no I/O. Every number the UI shows about money
 * comes from here, and every one of them can be traced back to an input.
 *
 * The returns model is the one modelling decision worth stating up front.
 * A returned order in dropshipping loses the sale but not the costs:
 *   • the refund gives back the revenue,
 *   • the payment processor keeps its fee (Shopify does not refund it),
 *   • the goods are gone, because the supplier does not restock a dropship
 *     return and it is not economic to have it shipped back to Spain.
 * So net margin is computed per order across a run of orders:
 *   revenue kept = retail × (1 − returnRate)
 *   fees         = retail × paymentFeeRate      (on every order, returned or not)
 *   cost of goods= landed cost                  (on every order, returned or not)
 * This is deliberately pessimistic. A model that flatters the numbers is worse
 * than useless when the decision it feeds is "do I stock this".
 */

export class EconomicsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EconomicsInputError';
  }
}

export interface EconomicsInput {
  /** What Trendsi charges me per unit. Always the Dropship price, never Wholesale. */
  dropshipCents: number;
  /** Estimated shipping, from settings. */
  shippingCents: number;
  /** Trendsi's MSRP, used as a ceiling sanity check. Optional: not every product has one. */
  msrpCents?: number | null;
  section: Section;
  paymentFeeRate: number;
  returnRate: number;
}

/** One reason the suggested price moved away from the pure margin calculation. */
export interface PriceAdjustment {
  rule: 'CHARM_ROUNDING' | 'BAND_FLOOR' | 'BAND_CEILING' | 'MSRP_CEILING';
  /** Human-readable, and written to be shown directly in the UI. */
  explanation: string;
  fromCents: number;
  toCents: number;
}

export interface Economics {
  landedCostCents: number;
  /** What the target margin alone would ask for, before any constraint. */
  idealRetailCents: number;
  suggestedRetailCents: number;
  /** Ordered trail of how ideal became suggested. Empty when nothing moved. */
  adjustments: PriceAdjustment[];

  grossMarginCents: number;
  grossMarginPct: number;
  netMarginCents: number;
  netMarginPct: number;

  /** Does the suggested price sit inside the section's band? */
  withinBand: boolean;
  /** Does it still hit the section's target gross margin? */
  meetsTargetMargin: boolean;
  /** Is it at least above the floor below which the product is not worth a slot? */
  meetsMinimumMargin: boolean;
}

/**
 * Margins for a price I have already decided on — used to audit the products
 * already in the store, where the retail price is a fact rather than a
 * suggestion.
 */
export function marginsAt(
  retailCents: number,
  landedCostCents: number,
  paymentFeeRate: number,
  returnRate: number,
): Pick<Economics, 'grossMarginCents' | 'grossMarginPct' | 'netMarginCents' | 'netMarginPct'> {
  if (retailCents <= 0) {
    throw new EconomicsInputError(`retail price must be positive, got ${retailCents} cents`);
  }

  const grossMarginCents = retailCents - landedCostCents;

  const revenueKept = retailCents * (1 - returnRate);
  const fees = retailCents * paymentFeeRate;
  const netMarginCents = Math.round(revenueKept - fees - landedCostCents);

  return {
    grossMarginCents,
    grossMarginPct: grossMarginCents / retailCents,
    netMarginCents,
    netMarginPct: netMarginCents / retailCents,
  };
}

export function landedCost(dropshipCents: number, shippingCents: number): number {
  if (!Number.isInteger(dropshipCents) || !Number.isInteger(shippingCents)) {
    throw new EconomicsInputError('costs must be integer cents');
  }
  if (dropshipCents <= 0) {
    throw new EconomicsInputError(
      `dropship cost must be positive, got ${dropshipCents} cents — a free product is a parsing failure, not a bargain`,
    );
  }
  if (shippingCents < 0) {
    throw new EconomicsInputError(`shipping cost cannot be negative, got ${shippingCents} cents`);
  }
  return dropshipCents + shippingCents;
}

/**
 * Works out what to charge, and what that leaves.
 *
 * The price starts from the section's target margin, is rounded to the store's
 * charm pricing, and is then pulled inside the section's band and under
 * Trendsi's MSRP. Every one of those moves is recorded in `adjustments` so the
 * detail screen can explain the final number instead of asserting it.
 */
export function computeEconomics(input: EconomicsInput): Economics {
  const { dropshipCents, shippingCents, msrpCents, section, paymentFeeRate, returnRate } = input;

  if (paymentFeeRate < 0 || paymentFeeRate >= 1) {
    throw new EconomicsInputError(
      `paymentFeeRate must be a fraction below 1, got ${paymentFeeRate}`,
    );
  }
  if (returnRate < 0 || returnRate >= 1) {
    throw new EconomicsInputError(`returnRate must be a fraction below 1, got ${returnRate}`);
  }

  const landedCostCents = landedCost(dropshipCents, shippingCents);
  const adjustments: PriceAdjustment[] = [];

  const idealRetailCents = Math.round(landedCostCents / (1 - section.targetMargin));
  let price = roundToCharmPrice(idealRetailCents);

  if (price !== idealRetailCents) {
    adjustments.push({
      rule: 'CHARM_ROUNDING',
      explanation: `Rounded up to the store's .99 pricing`,
      fromCents: idealRetailCents,
      toCents: price,
    });
  }

  const { min, max } = section.priceBandCents;

  if (price < min) {
    adjustments.push({
      rule: 'BAND_FLOOR',
      explanation: `Raised to the ${section.label} floor — cheap enough that pricing it lower would undersell the section`,
      fromCents: price,
      toCents: min,
    });
    price = min;
  } else if (price > max) {
    adjustments.push({
      rule: 'BAND_CEILING',
      explanation: `Capped at the ${section.label} ceiling — above this it stops competing`,
      fromCents: price,
      toCents: max,
    });
    price = max;
  }

  // MSRP is the supplier's own ceiling. Pricing above it invites the customer
  // to find the same garment cheaper elsewhere.
  if (msrpCents !== null && msrpCents !== undefined && msrpCents > 0 && price > msrpCents) {
    const capped = roundToCharmPrice(Math.min(price, msrpCents));
    const target = capped > msrpCents ? msrpCents : capped;
    adjustments.push({
      rule: 'MSRP_CEILING',
      explanation: `Capped at Trendsi's MSRP — pricing above it is not defensible`,
      fromCents: price,
      toCents: target,
    });
    price = target;
  }

  const margins = marginsAt(price, landedCostCents, paymentFeeRate, returnRate);

  return {
    landedCostCents,
    idealRetailCents,
    suggestedRetailCents: price,
    adjustments,
    ...margins,
    withinBand: price >= min && price <= max,
    meetsTargetMargin: margins.grossMarginPct >= section.targetMargin - 0.005,
    meetsMinimumMargin: margins.grossMarginPct >= section.minAcceptableMarginPct,
  };
}
