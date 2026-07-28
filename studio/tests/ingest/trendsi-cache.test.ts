import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DiskCache } from '@/ingest/trendsi/cache';

let directory: string;
let clock = 0;
const now = (): number => clock;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'norvik-cache-'));
  clock = 1_000_000;
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

const HOUR = 60 * 60 * 1000;

describe('DiskCache', () => {
  it('returns what it stored', () => {
    const cache = new DiskCache({ directory, ttlMs: 12 * HOUR, now });
    cache.set('linen set', { products: [1, 2, 3] });

    expect(cache.get('linen set')).toEqual({ products: [1, 2, 3] });
  });

  it('misses on a key it has never seen', () => {
    const cache = new DiskCache({ directory, ttlMs: 12 * HOUR, now });
    expect(cache.get('never asked')).toBeNull();
  });

  it('expires an entry once its TTL has passed', () => {
    const cache = new DiskCache({ directory, ttlMs: 12 * HOUR, now });
    cache.set('eyelet dress', { price: 1250 });

    clock += 11 * HOUR;
    expect(cache.get('eyelet dress')).toEqual({ price: 1250 });

    clock += 2 * HOUR;
    expect(cache.get('eyelet dress')).toBeNull();
  });

  it('handles keys with spaces, slashes and accents', () => {
    const cache = new DiskCache({ directory, ttlMs: HOUR, now });
    const key = 'https://app.trendsi.com/products/search?keyword=vestido cañí&curPage=2';

    cache.set(key, { ok: true });

    expect(cache.get(key)).toEqual({ ok: true });
    // Every file on disk is a plain hash, never the key itself.
    for (const file of readdirSync(directory)) {
      expect(file).toMatch(/^[0-9a-f]{32}\.json$/);
    }
  });

  it('treats a corrupt entry as a miss and clears it out', () => {
    const cache = new DiskCache({ directory, ttlMs: HOUR, now });
    cache.set('broken', { a: 1 });

    const [file] = readdirSync(directory);
    writeFileSync(join(directory, file!), 'this is not json', 'utf8');

    // A cache can always be rebuilt from the source, so a bad file is a miss,
    // not an error to propagate.
    expect(cache.get('broken')).toBeNull();
    expect(readdirSync(directory)).toHaveLength(0);
  });

  it('counts only entries still within their TTL', () => {
    const cache = new DiskCache({ directory, ttlMs: 2 * HOUR, now });
    cache.set('a', 1);
    clock += 3 * HOUR;
    cache.set('b', 2);

    expect(cache.countFresh()).toBe(1);
  });

  it('prunes expired entries and leaves fresh ones alone', () => {
    const cache = new DiskCache({ directory, ttlMs: 2 * HOUR, now });
    cache.set('old', 1);
    clock += 3 * HOUR;
    cache.set('new', 2);

    expect(cache.prune()).toBe(1);
    expect(cache.get('new')).toBe(2);
    expect(cache.get('old')).toBeNull();
  });

  it('creates its directory when it does not exist yet', () => {
    const nested = join(directory, 'deep', 'nested');
    const cache = new DiskCache({ directory: nested, ttlMs: HOUR, now });

    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('clears everything on request', () => {
    const cache = new DiskCache({ directory, ttlMs: HOUR, now });
    cache.set('a', 1);
    cache.set('b', 2);

    cache.clear();

    expect(cache.get('a')).toBeNull();
    expect(cache.countFresh()).toBe(0);
  });
});
