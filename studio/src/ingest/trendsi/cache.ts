import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * On-disk cache of pages already fetched.
 *
 * The reason this exists is iteration: writing a parser means running the same
 * search twenty times, and there is no excuse for asking Trendsi twenty times
 * for a page we already have. Entries expire on a TTL so a stale price never
 * silently becomes today's price.
 */

export interface CacheEntry<T> {
  /** When the entry was written, as epoch milliseconds. */
  storedAt: number;
  /** The URL or query this was the answer to, for debugging by hand. */
  key: string;
  payload: T;
}

export interface CacheOptions {
  directory: string;
  ttlMs: number;
  now?: () => number;
}

export class DiskCache {
  private readonly directory: string;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: CacheOptions) {
    this.directory = resolve(options.directory);
    this.ttlMs = options.ttlMs;
    this.now = options.now ?? Date.now;
    if (!existsSync(this.directory)) mkdirSync(this.directory, { recursive: true });
  }

  /**
   * Cache filenames are a hash of the key, not the key itself: search terms
   * contain spaces, slashes and accents, and none of those belong in a
   * filename on someone's laptop.
   */
  private pathFor(key: string): string {
    const hash = createHash('sha256').update(key).digest('hex').slice(0, 32);
    return join(this.directory, `${hash}.json`);
  }

  get<T>(key: string): T | null {
    const path = this.pathFor(key);
    if (!existsSync(path)) return null;

    let entry: CacheEntry<T>;
    try {
      entry = JSON.parse(readFileSync(path, 'utf8')) as CacheEntry<T>;
    } catch {
      // A corrupt cache file is not worth an error: the whole point of a cache
      // is that it can always be rebuilt from the source. Drop it and refetch.
      rmSync(path, { force: true });
      return null;
    }

    if (this.now() - entry.storedAt > this.ttlMs) return null;
    return entry.payload;
  }

  set<T>(key: string, payload: T): void {
    const entry: CacheEntry<T> = { storedAt: this.now(), key, payload };
    writeFileSync(this.pathFor(key), JSON.stringify(entry, null, 2), 'utf8');
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Number of entries still within their TTL. */
  countFresh(): number {
    if (!existsSync(this.directory)) return 0;
    let fresh = 0;
    for (const file of readdirSync(this.directory)) {
      if (!file.endsWith('.json')) continue;
      const path = join(this.directory, file);
      try {
        const entry = JSON.parse(readFileSync(path, 'utf8')) as CacheEntry<unknown>;
        if (this.now() - entry.storedAt <= this.ttlMs) fresh += 1;
      } catch {
        // Unreadable entry: not fresh, and not worth failing a count over.
        continue;
      }
    }
    return fresh;
  }

  /** Removes expired entries. Safe to call whenever. */
  prune(): number {
    if (!existsSync(this.directory)) return 0;
    let removed = 0;
    for (const file of readdirSync(this.directory)) {
      if (!file.endsWith('.json')) continue;
      const path = join(this.directory, file);
      try {
        const entry = JSON.parse(readFileSync(path, 'utf8')) as CacheEntry<unknown>;
        if (this.now() - entry.storedAt > this.ttlMs) {
          rmSync(path, { force: true });
          removed += 1;
        }
      } catch {
        rmSync(path, { force: true });
        removed += 1;
      }
    }
    return removed;
  }

  clear(): void {
    if (!existsSync(this.directory)) return;
    for (const file of readdirSync(this.directory)) {
      if (file.endsWith('.json')) rmSync(join(this.directory, file), { force: true });
    }
  }

  /** Age of an entry in milliseconds, or null when it is not cached. */
  ageOf(key: string): number | null {
    const path = this.pathFor(key);
    if (!existsSync(path)) return null;
    try {
      return this.now() - statSync(path).mtimeMs;
    } catch {
      return null;
    }
  }
}
