/**
 * Money handling.
 *
 * Everything in this project is integer cents. Floating point dollars are how
 * you end up with a $22.57 cost that reports a margin of 64.99999999999999%,
 * and worse, how you end up with two screens disagreeing about the same
 * number. Cents in, cents out; dollars exist only for display and for parsing
 * what a supplier's page shows.
 */

export class MoneyParseError extends Error {
  constructor(readonly raw: string) {
    super(`Could not read a price from ${JSON.stringify(raw)}`);
    this.name = 'MoneyParseError';
  }
}

/** "22.57", "$22.57", "US$ 1,234.50" → cents. Throws rather than guessing. */
export function parseMoneyToCents(raw: string): number {
  const cleaned = raw
    // Scraped prices arrive with ordinary spaces, non-breaking spaces and
    // narrow no-break spaces in them, depending on the page. All of them go.
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/^(US|USD|\$|US\$)+/i, '')
    .replace(/,/g, '');

  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new MoneyParseError(raw);
  }

  return Math.round(Number(cleaned) * 100);
}

/**
 * Same as {@link parseMoneyToCents} but returns null instead of throwing.
 *
 * Used only where a missing price is a legitimate outcome — an accessory with
 * no MSRP, say. Never used to paper over a parser that stopped working.
 */
export function tryParseMoneyToCents(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  try {
    return parseMoneyToCents(raw);
  } catch (error) {
    if (error instanceof MoneyParseError) return null;
    throw error;
  }
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return usd.format(cents / 100);
}

export function formatPercent(fraction: number | null | undefined, digits = 1): string {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return '—';
  return `${(fraction * 100).toFixed(digits)}%`;
}

/**
 * Rounds a price up to the next `.99`, which is how the whole storefront is
 * priced today ($34.99, $59.99, $79.99). Charm pricing is a deliberate choice,
 * so the rounding lives here rather than being sprinkled through the callers.
 *
 * 4200 → 4299. 4299 → 4299. 4301 → 4399.
 */
export function roundToCharmPrice(cents: number): number {
  if (cents <= 99) return 99;
  const wholeDollars = Math.ceil(cents / 100);
  const candidate = wholeDollars * 100 - 1;
  return candidate >= cents ? candidate : wholeDollars * 100 + 99;
}
