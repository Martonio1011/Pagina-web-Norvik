import { describe, expect, it } from 'vitest';
import {
  MAX_SEARCH_TOKENS,
  classifyPageState,
  classifySearchOutcome,
  countQueryTokens,
  isQueryTooLong,
  shortenQuery,
} from '@/ingest/trendsi/page-state';

describe('classifyPageState', () => {
  const base = { url: 'https://app.trendsi.com/products/search?keyword=dress', hasPasswordField: false, bodyText: 'Dropship $12.50 Wholesale $8.00' };

  it('accepts a product page with no password box as logged in', () => {
    expect(classifyPageState(base)).toBe('AUTHENTICATED');
  });

  it('treats a redirect to the login screen as an expired session', () => {
    expect(
      classifyPageState({
        ...base,
        url: 'https://app.trendsi.com/login?redirect=/products/search',
        hasPasswordField: true,
        bodyText: 'Sign in to your account',
      }),
    ).toBe('SESSION_EXPIRED');
  });

  it('treats 401 and 403 as an expired session whatever the page says', () => {
    expect(classifyPageState({ ...base, status: 401 })).toBe('SESSION_EXPIRED');
    expect(classifyPageState({ ...base, status: 403 })).toBe('SESSION_EXPIRED');
  });

  it('spots a login form served at the URL we asked for', () => {
    expect(
      classifyPageState({
        ...base,
        hasPasswordField: true,
        bodyText: 'Log in to continue. Forgot password?',
      }),
    ).toBe('SESSION_EXPIRED');
  });

  it('stops at a captcha rather than calling it anything else', () => {
    for (const text of [
      'Please complete the reCAPTCHA to continue',
      'Checking your browser before accessing — Cloudflare',
      'We have detected unusual traffic from your network',
      'Verify you are human',
    ]) {
      expect(classifyPageState({ ...base, bodyText: text })).toBe('CAPTCHA');
    }
  });

  it('reports a captcha even when it appears on a login page', () => {
    expect(
      classifyPageState({
        ...base,
        url: 'https://app.trendsi.com/login',
        hasPasswordField: true,
        bodyText: 'Sign in — please complete the captcha',
      }),
    ).toBe('CAPTCHA');
  });

  it('says UNKNOWN rather than guessing on a page it does not recognise', () => {
    expect(
      classifyPageState({
        url: 'https://app.trendsi.com/dashboard',
        hasPasswordField: false,
        bodyText: 'Welcome back',
      }),
    ).toBe('UNKNOWN');
  });
});

describe('classifySearchOutcome', () => {
  /**
   * The trap this guards: Trendsi answers a failed search with a "No Results"
   * notice *followed by a grid of generic recommendations*. Counting tiles
   * alone would read those recommendations as matches and quietly fill the
   * candidate list with products nobody searched for.
   */
  it('reports no results even when the page is full of recommendation tiles', () => {
    expect(
      classifySearchOutcome({
        bodyText: 'No Results found for your search. You may also like:',
        resultCount: 24,
      }),
    ).toBe('NO_RESULTS');
  });

  it('recognises a real result set', () => {
    expect(
      classifySearchOutcome({ bodyText: 'Showing 1-48 of 312 products', resultCount: 48 }),
    ).toBe('RESULTS');
  });

  it('treats an empty grid with no notice as no results', () => {
    expect(classifySearchOutcome({ bodyText: 'Loading', resultCount: 0 })).toBe('NO_RESULTS');
  });

  it('handles the Spanish wording too', () => {
    expect(classifySearchOutcome({ bodyText: 'Sin resultados', resultCount: 12 })).toBe(
      'NO_RESULTS',
    );
  });
});

describe('query length', () => {
  it('counts tokens the way the search does', () => {
    expect(countQueryTokens('linen top and shorts set')).toBe(5);
    expect(countQueryTokens('  eyelet   dress  ')).toBe(2);
    expect(countQueryTokens('')).toBe(0);
  });

  it('flags a query longer than the search can handle', () => {
    expect(isQueryTooLong('linen top and shorts set')).toBe(true);
    expect(isQueryTooLong('wide leg jumpsuit')).toBe(false);
    expect(isQueryTooLong('satin maxi dress green')).toBe(false);
  });

  it('shortens by keeping the leading words', () => {
    expect(shortenQuery('linen top and shorts set')).toBe('linen top and shorts');
    expect(shortenQuery('eyelet dress')).toBe('eyelet dress');
    expect(shortenQuery('a b c d e f', 2)).toBe('a b');
  });

  it('never produces a query the search would reject', () => {
    const long = 'one two three four five six seven';
    expect(countQueryTokens(shortenQuery(long))).toBeLessThanOrEqual(MAX_SEARCH_TOKENS);
  });
});
