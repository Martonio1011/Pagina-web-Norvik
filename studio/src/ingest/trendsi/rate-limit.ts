/**
 * Rate limiting for supplier requests.
 *
 * The default is deliberately slow — one request every two and a half seconds
 * with jitter on top. This is someone else's server and we are a guest on it.
 * A scraper that behaves gets to keep working; one that hammers gets blocked,
 * and rightly so.
 *
 * The clock and the sleep are injectable so the tests can prove the spacing
 * without actually waiting.
 */

export interface RateLimiterOptions {
  /** Minimum gap between the start of one request and the next, in ms. */
  minIntervalMs: number;
  /**
   * Random extra delay, 0..jitterMs, added to every gap. Requests spaced
   * exactly 2500ms apart look like a machine; a little variation does not.
   */
  jitterMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private lastStartedAt: number | null = null;
  private readonly minIntervalMs: number;
  private readonly jitterMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: RateLimiterOptions) {
    if (options.minIntervalMs < 0) {
      throw new Error('minIntervalMs cannot be negative');
    }
    this.minIntervalMs = options.minIntervalMs;
    this.jitterMs = options.jitterMs ?? 0;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  /** Waits until it is polite to make the next request. */
  async acquire(): Promise<void> {
    const now = this.now();

    if (this.lastStartedAt !== null) {
      const target = this.lastStartedAt + this.minIntervalMs + this.random() * this.jitterMs;
      const waitMs = target - now;
      if (waitMs > 0) await this.sleep(waitMs);
    }

    this.lastStartedAt = this.now();
  }

  /** Test and diagnostic aid: when the last request was allowed through. */
  get lastRequestAt(): number | null {
    return this.lastStartedAt;
  }
}

export interface BackoffOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
  /** Decides whether a given failure is worth another try. */
  isRetryable?: (error: unknown) => boolean;
  /** Called before each retry, for run tracing. */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

/**
 * Runs an operation, retrying with exponential backoff, up to a hard limit.
 *
 * The limit is the point: a scraper that retries for ever against a supplier
 * having a bad day is indistinguishable from an attack.
 */
export async function withBackoff<T>(
  operation: () => Promise<T>,
  options: BackoffOptions,
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  const isRetryable = options.isRetryable ?? (() => true);
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === options.maxAttempts || !isRetryable(error)) break;

      const delayMs = Math.min(options.baseDelayMs * 2 ** (attempt - 1), options.maxDelayMs);
      options.onRetry?.(attempt, delayMs, error);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
