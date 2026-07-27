import { describe, expect, it } from 'vitest';
import {
  MoneyParseError,
  formatCents,
  formatPercent,
  parseMoneyToCents,
  roundToCharmPrice,
  tryParseMoneyToCents,
} from '@/domain/money';

describe('parseMoneyToCents', () => {
  it('reads the formats suppliers actually use', () => {
    expect(parseMoneyToCents('22.57')).toBe(2257);
    expect(parseMoneyToCents('$22.57')).toBe(2257);
    expect(parseMoneyToCents('US$ 22.57')).toBe(2257);
    expect(parseMoneyToCents('1,234.50')).toBe(123450);
    expect(parseMoneyToCents('79')).toBe(7900);
    expect(parseMoneyToCents('0.99')).toBe(99);
  });

  it('does not silently round a third decimal away', () => {
    expect(() => parseMoneyToCents('22.579')).toThrow(MoneyParseError);
  });

  it('refuses anything that is not a price rather than guessing zero', () => {
    for (const input of ['', 'Free', 'Dropship', '--', 'N/A', '$']) {
      expect(() => parseMoneyToCents(input)).toThrow(MoneyParseError);
    }
  });

  it('survives the exactness problem that floats do not', () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point. In cents it is just 30.
    expect(parseMoneyToCents('0.10') + parseMoneyToCents('0.20')).toBe(30);
  });
});

describe('tryParseMoneyToCents', () => {
  it('returns null for a genuinely absent price', () => {
    expect(tryParseMoneyToCents(null)).toBeNull();
    expect(tryParseMoneyToCents(undefined)).toBeNull();
    expect(tryParseMoneyToCents('   ')).toBeNull();
    expect(tryParseMoneyToCents('N/A')).toBeNull();
  });

  it('still parses a real one', () => {
    expect(tryParseMoneyToCents('$59.99')).toBe(5999);
  });
});

describe('roundToCharmPrice', () => {
  it('rounds up to the next .99, matching how the store is priced', () => {
    expect(roundToCharmPrice(4200)).toBe(4299);
    expect(roundToCharmPrice(4299)).toBe(4299);
    expect(roundToCharmPrice(4301)).toBe(4399);
    expect(roundToCharmPrice(8020)).toBe(8099);
  });

  it('never produces a price below a cent', () => {
    expect(roundToCharmPrice(1)).toBe(99);
    expect(roundToCharmPrice(99)).toBe(99);
    expect(roundToCharmPrice(100)).toBe(199);
  });
});

describe('formatting', () => {
  it('shows an em dash rather than $0.00 for a missing number', () => {
    expect(formatCents(null)).toBe('—');
    expect(formatCents(undefined)).toBe('—');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(Number.NaN)).toBe('—');
  });

  it('formats money and percentages for display', () => {
    expect(formatCents(2257)).toBe('$22.57');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatPercent(0.6499)).toBe('65.0%');
  });
});
