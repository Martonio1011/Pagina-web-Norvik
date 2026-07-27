import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { ingestErrors, ingestRuns } from '@/db/schema';
import { childLogger } from '@/lib/logger';
import type { IngestSource, IngestStage, IngestStatus } from '@/domain/types';

/**
 * Every ingestion run — Shopify sync, Trendsi scrape, competitor read — is
 * recorded: what it looked for, how long it took, how many things it saw and
 * every single thing that went wrong.
 *
 * This is the mechanism behind "no empty catch blocks". A failure is either
 * thrown or handed to `recordError`, and `recordError` writes it where the UI
 * can show it. There is no third path where an error disappears.
 */

const log = childLogger('ingest');

export interface RunCounters {
  itemsSeen: number;
  itemsNew: number;
  itemsUpdated: number;
  requestCount: number;
  cacheHits: number;
}

export class RunTracker {
  readonly id: string;
  private readonly startedAt = Date.now();
  private errorCount = 0;
  private readonly counters: RunCounters = {
    itemsSeen: 0,
    itemsNew: 0,
    itemsUpdated: 0,
    requestCount: 0,
    cacheHits: 0,
  };

  private constructor(
    id: string,
    readonly source: IngestSource,
    readonly dryRun: boolean,
  ) {
    this.id = id;
  }

  static start(
    source: IngestSource,
    options: { params?: unknown; dryRun?: boolean } = {},
  ): RunTracker {
    const id = randomUUID();
    db.insert(ingestRuns)
      .values({
        id,
        source,
        status: 'RUNNING',
        startedAt: new Date(),
        params: options.params ? JSON.stringify(options.params) : null,
        dryRun: options.dryRun ?? false,
      })
      .run();

    log.info({ runId: id, source, dryRun: options.dryRun ?? false }, 'ingestion run started');
    return new RunTracker(id, source, options.dryRun ?? false);
  }

  count(key: keyof RunCounters, amount = 1): void {
    this.counters[key] += amount;
  }

  /**
   * Records a failure against this run and carries on.
   *
   * Used for failures that affect one item — a product that will not parse,
   * one competitor store that is down — where stopping the whole run would be
   * a worse outcome than finishing with a reported gap.
   */
  recordError(input: {
    stage: IngestStage;
    message: string;
    target?: string | null;
    detail?: unknown;
  }): void {
    this.errorCount += 1;

    const detail =
      input.detail instanceof Error
        ? (input.detail.stack ?? input.detail.message)
        : input.detail === undefined
          ? null
          : typeof input.detail === 'string'
            ? input.detail
            : JSON.stringify(input.detail).slice(0, 4000);

    db.insert(ingestErrors)
      .values({
        id: randomUUID(),
        runId: this.id,
        stage: input.stage,
        target: input.target ?? null,
        message: input.message,
        detail,
        createdAt: new Date(),
      })
      .run();

    log.warn(
      { runId: this.id, stage: input.stage, target: input.target },
      `ingestion error: ${input.message}`,
    );
  }

  /**
   * Closes the run.
   *
   * When no status is given the run works out its own: clean if nothing
   * failed, PARTIAL if something did. A run that saw errors never reports OK.
   */
  finish(status?: IngestStatus, notes?: string): IngestStatus {
    const resolved: IngestStatus = status ?? (this.errorCount > 0 ? 'PARTIAL' : 'OK');
    const durationMs = Date.now() - this.startedAt;

    db.update(ingestRuns)
      .set({
        status: resolved,
        finishedAt: new Date(),
        durationMs,
        errorCount: this.errorCount,
        notes: notes ?? null,
        ...this.counters,
      })
      .where(eq(ingestRuns.id, this.id))
      .run();

    log.info(
      { runId: this.id, status: resolved, durationMs, errors: this.errorCount, ...this.counters },
      'ingestion run finished',
    );
    return resolved;
  }

  /** Closes the run as a hard failure, keeping the reason. */
  fail(error: unknown, status: IngestStatus = 'FAILED'): never {
    const message = error instanceof Error ? error.message : String(error);
    this.recordError({ stage: 'FETCH', message, detail: error });
    this.finish(status, message);
    throw error instanceof Error ? error : new Error(message);
  }

  get errors(): number {
    return this.errorCount;
  }

  get stats(): RunCounters {
    return { ...this.counters };
  }
}
