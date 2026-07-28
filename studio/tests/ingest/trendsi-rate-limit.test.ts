import { describe, expect, it, vi } from 'vitest';
import { RateLimiter, withBackoff } from '@/ingest/trendsi/rate-limit';

/** A clock the test drives, so spacing can be proved without waiting for it. */
function fakeClock(startAt = 0) {
  let now = startAt;
  const slept: number[] = [];
  return {
    now: () => now,
    sleep: async (ms: number) => {
      slept.push(ms);
      now += ms;
    },
    advance: (ms: number) => {
      now += ms;
    },
    slept,
  };
}

describe('RateLimiter', () => {
  it('lets the first request straight through', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ minIntervalMs: 2500, now: clock.now, sleep: clock.sleep });

    await limiter.acquire();

    expect(clock.slept).toEqual([]);
  });

  it('spaces out consecutive requests by the configured interval', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ minIntervalMs: 2500, now: clock.now, sleep: clock.sleep });

    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();

    expect(clock.slept).toEqual([2500, 2500]);
  });

  it('does not wait when enough time has already passed', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ minIntervalMs: 2500, now: clock.now, sleep: clock.sleep });

    await limiter.acquire();
    clock.advance(9000);
    await limiter.acquire();

    expect(clock.slept).toEqual([]);
  });

  it('adds jitter so the requests are not perfectly periodic', async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({
      minIntervalMs: 2000,
      jitterMs: 1000,
      now: clock.now,
      sleep: clock.sleep,
      random: () => 0.5,
    });

    await limiter.acquire();
    await limiter.acquire();

    expect(clock.slept).toEqual([2500]);
  });

  it('refuses a negative interval instead of behaving unpredictably', () => {
    expect(() => new RateLimiter({ minIntervalMs: -1 })).toThrow();
  });
});

describe('withBackoff', () => {
  it('returns straight away when the operation succeeds', async () => {
    const clock = fakeClock();
    const operation = vi.fn().mockResolvedValue('ok');

    const result = await withBackoff(operation, {
      maxAttempts: 4,
      baseDelayMs: 500,
      maxDelayMs: 8000,
      sleep: clock.sleep,
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(clock.slept).toEqual([]);
  });

  it('doubles the delay between attempts', async () => {
    const clock = fakeClock();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue('ok');

    const result = await withBackoff(operation, {
      maxAttempts: 4,
      baseDelayMs: 500,
      maxDelayMs: 8000,
      sleep: clock.sleep,
    });

    expect(result).toBe('ok');
    expect(clock.slept).toEqual([500, 1000]);
  });

  it('honours the ceiling so a long outage does not become an hour-long sleep', async () => {
    const clock = fakeClock();
    const operation = vi.fn().mockRejectedValue(new Error('down'));

    await expect(
      withBackoff(operation, {
        maxAttempts: 6,
        baseDelayMs: 1000,
        maxDelayMs: 4000,
        sleep: clock.sleep,
      }),
    ).rejects.toThrow('down');

    expect(clock.slept).toEqual([1000, 2000, 4000, 4000, 4000]);
  });

  it('gives up after the limit rather than retrying for ever', async () => {
    const clock = fakeClock();
    const operation = vi.fn().mockRejectedValue(new Error('down'));

    await expect(
      withBackoff(operation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        sleep: clock.sleep,
      }),
    ).rejects.toThrow('down');

    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry a failure that will never succeed', async () => {
    const clock = fakeClock();
    const operation = vi.fn().mockRejectedValue(new Error('bad credentials'));

    await expect(
      withBackoff(operation, {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        sleep: clock.sleep,
        isRetryable: (error) => !(error instanceof Error && error.message.includes('credentials')),
      }),
    ).rejects.toThrow('bad credentials');

    expect(operation).toHaveBeenCalledTimes(1);
    expect(clock.slept).toEqual([]);
  });

  it('reports every retry so a run trace can record them', async () => {
    const clock = fakeClock();
    const onRetry = vi.fn();
    const operation = vi.fn().mockRejectedValueOnce(new Error('blip')).mockResolvedValue('ok');

    await withBackoff(operation, {
      maxAttempts: 3,
      baseDelayMs: 250,
      maxDelayMs: 1000,
      sleep: clock.sleep,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledWith(1, 250, expect.any(Error));
  });
});
