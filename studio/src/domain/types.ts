import { z } from 'zod';

/**
 * The string constants the database stores.
 *
 * Prisma cannot express enums on SQLite, so every `status`-style column is a
 * plain string. These schemas are what makes them safe: nothing reaches the
 * database without going through one, and nothing leaves the database into the
 * UI without being narrowed back to a union type.
 */

export const ProductStatus = z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']);
export type ProductStatus = z.infer<typeof ProductStatus>;

export const ShipFrom = z.enum(['USA', 'OVERSEAS', 'UNKNOWN']);
export type ShipFrom = z.infer<typeof ShipFrom>;

export const MatchMethod = z.enum(['TRD_SKU', 'TRENDSI_SKU_ID', 'TITLE']);
export type MatchMethod = z.infer<typeof MatchMethod>;

export const CandidateStatus = z.enum(['NEW', 'APPROVED', 'REJECTED', 'PARKED']);
export type CandidateStatus = z.infer<typeof CandidateStatus>;

export const DecisionAction = z.enum(['APPROVE', 'REJECT', 'PARK', 'REOPEN']);
export type DecisionAction = z.infer<typeof DecisionAction>;

export const IngestSource = z.enum(['SHOPIFY', 'TRENDSI', 'COMPETITOR']);
export type IngestSource = z.infer<typeof IngestSource>;

export const IngestStatus = z.enum([
  'RUNNING',
  'OK',
  /** Finished, but some items failed. The run report lists which. */
  'PARTIAL',
  'FAILED',
  /** A supplier or competitor refused automated access. Not our bug to fix. */
  'BLOCKED',
  /** The saved Trendsi login is no longer valid and needs renewing by hand. */
  'SESSION_EXPIRED',
]);
export type IngestStatus = z.infer<typeof IngestStatus>;

export const IngestStage = z.enum(['FETCH', 'PARSE', 'VALIDATE', 'PERSIST', 'AUTH', 'ROBOTS']);
export type IngestStage = z.infer<typeof IngestStage>;

export const AlertType = z.enum([
  'STOCKOUT',
  'COST_INCREASE',
  'MARGIN_BELOW_TARGET',
  'PRICE_OUT_OF_BAND',
  'OFF_BRAND',
  'SESSION_EXPIRED',
  'STORE_BLOCKED',
]);
export type AlertType = z.infer<typeof AlertType>;

export const AlertSeverity = z.enum(['INFO', 'WARNING', 'CRITICAL']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const AlertStatus = z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']);
export type AlertStatus = z.infer<typeof AlertStatus>;

export const AlertEntityType = z.enum([
  'SHOPIFY_PRODUCT',
  'TRENDSI_PRODUCT',
  'CANDIDATE',
  'COMPETITOR_STORE',
  'SYSTEM',
]);
export type AlertEntityType = z.infer<typeof AlertEntityType>;

export const CompetitorStatus = z.enum([
  'UNTESTED',
  'OK',
  /** The store detects and refuses automation. Shown as-is, never hidden. */
  'BLOCKED',
  /** Reachable, but the adapter no longer understands the page. Our bug. */
  'BROKEN',
  /** robots.txt asks us not to. We comply. */
  'DISALLOWED',
]);
export type CompetitorStatus = z.infer<typeof CompetitorStatus>;

export const SearchSchedule = z.enum(['MANUAL', 'DAILY', 'WEEKLY']);
export type SearchSchedule = z.infer<typeof SearchSchedule>;

/**
 * Narrows a database string to its union type.
 *
 * Returns the fallback and says so rather than throwing, because one row with
 * an unexpected status should not take a whole page down — but it must not
 * pass silently either, so callers log what happened.
 */
export function narrowOr<T extends string>(
  schema: z.ZodType<T>,
  value: string,
  fallback: T,
): { value: T; unexpected: boolean } {
  const parsed = schema.safeParse(value);
  return parsed.success
    ? { value: parsed.data, unexpected: false }
    : { value: fallback, unexpected: true };
}
