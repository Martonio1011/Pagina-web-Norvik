import type { MatchMethod } from './types';

/**
 * Working out which products I already sell came from which Trendsi product.
 *
 * This matters twice over: it stops the app proposing something already on the
 * shelf, and it is what connects a Trendsi cost to a Shopify retail price so
 * margins on the existing catalogue can be audited at all.
 *
 * The brief assumed one SKU pattern, `TRD-<productId>-<size>`. The real store
 * has two, because products have arrived by two different routes:
 *
 *   TRD-392458-S      · TRD-389533-BLACK   — created with our own SKU scheme.
 *                       Note the suffix is a size *or* a colour.
 *   100100331278451                        — imported by Trendsi's own Shopify
 *                       app, where the SKU is Trendsi's 15-digit sku id.
 *
 * Half the catalogue uses each. Matching on only the first would leave the
 * other half invisible, so there are three layers here, in descending order of
 * trust, and every match records which one produced it.
 */

/** Trendsi sku ids seen in the wild are 12–18 digits with no separators. */
const TRENDSI_SKU_ID = /^\d{12,18}$/;
const TRD_SKU = /^TRD-(\d{3,12})-(.+)$/i;

export interface TrdSkuParts {
  productId: string;
  /** Size ("S", "XL") or colour ("BLACK", "OFFWHITE") depending on the product. */
  suffix: string;
}

/** Reads `TRD-392458-S` into its parts. Returns null for any other shape. */
export function parseTrdSku(sku: string | null | undefined): TrdSkuParts | null {
  if (!sku) return null;
  const match = TRD_SKU.exec(sku.trim());
  if (!match) return null;
  const [, productId, suffix] = match;
  if (!productId || !suffix) return null;
  return { productId, suffix: suffix.toUpperCase() };
}

/** True for a bare Trendsi sku id such as `100100331278451`. */
export function isTrendsiSkuId(sku: string | null | undefined): boolean {
  if (!sku) return false;
  return TRENDSI_SKU_ID.test(sku.trim());
}

/**
 * Words that carry no identity: they appear in half the supplier catalogue and
 * only dilute the similarity score.
 */
const NOISE_TOKENS = new Set([
  'the',
  'a',
  'and',
  'with',
  'for',
  'in',
  'of',
  'womens',
  'women',
  'woman',
  'ladies',
  'full',
  'size',
  'plus',
  'sizes',
  'new',
  'fashion',
  'style',
  'casual',
]);

/** Lowercase, strip punctuation, drop noise words, keep the order. */
export function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !NOISE_TOKENS.has(token));
}

export function normaliseTitle(title: string): string {
  return titleTokens(title).join(' ');
}

/**
 * Sørensen–Dice similarity over the two token sets: 0 for nothing in common,
 * 1 for the same words.
 */
export function titleSimilarity(a: string, b: string): number {
  const left = new Set(titleTokens(a));
  const right = new Set(titleTokens(b));
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return (2 * shared) / (left.size + right.size);
}

/**
 * Below this, two titles are not the same garment. Above it they might be —
 * "Halter Neck Maxi Dress" and "Halter Neck Satin Maxi Dress" score 0.89 and
 * are different products. That is exactly why a title match is never treated
 * as fact: it is surfaced for a human to confirm.
 */
export const TITLE_MATCH_THRESHOLD = 0.8;

export interface TrendsiIndexEntry {
  productId: string;
  title: string;
  skuIds: string[];
}

export interface TrendsiIndex {
  byProductId: Map<string, TrendsiIndexEntry>;
  bySkuId: Map<string, TrendsiIndexEntry>;
  all: TrendsiIndexEntry[];
}

export function buildTrendsiIndex(entries: TrendsiIndexEntry[]): TrendsiIndex {
  const byProductId = new Map<string, TrendsiIndexEntry>();
  const bySkuId = new Map<string, TrendsiIndexEntry>();

  for (const entry of entries) {
    byProductId.set(entry.productId, entry);
    for (const skuId of entry.skuIds) {
      bySkuId.set(skuId, entry);
    }
  }

  return { byProductId, bySkuId, all: entries };
}

export interface MatchableShopifyProduct {
  id: string;
  title: string;
  vendor: string;
  skus: (string | null | undefined)[];
}

export interface MatchResult {
  trendsiProductId: string;
  method: MatchMethod;
  confidence: number;
  /** Shown in the UI so a match can be understood without reading the code. */
  evidence: string;
  /** Exact matches are self-evident; title matches need a human to agree. */
  needsConfirmation: boolean;
}

/**
 * Finds the Trendsi product behind a Shopify product, or returns null.
 *
 * Returning null is a legitimate and common outcome — a product sourced
 * elsewhere has no Trendsi twin — and it is never filled in with a guess.
 */
export function matchShopifyProduct(
  product: MatchableShopifyProduct,
  index: TrendsiIndex,
): MatchResult | null {
  // Layer 1 — our own SKU scheme carries the Trendsi product id outright.
  for (const sku of product.skus) {
    const parts = parseTrdSku(sku);
    if (!parts) continue;
    const entry = index.byProductId.get(parts.productId);
    if (entry) {
      return {
        trendsiProductId: entry.productId,
        method: 'TRD_SKU',
        confidence: 1,
        evidence: `SKU ${sku} carries Trendsi product id ${parts.productId}`,
        needsConfirmation: false,
      };
    }
  }

  // Layer 2 — the SKU is Trendsi's own sku id, from their Shopify app import.
  for (const sku of product.skus) {
    if (!isTrendsiSkuId(sku)) continue;
    const entry = index.bySkuId.get((sku as string).trim());
    if (entry) {
      return {
        trendsiProductId: entry.productId,
        method: 'TRENDSI_SKU_ID',
        confidence: 1,
        evidence: `SKU ${sku} is Trendsi sku id on product ${entry.productId}`,
        needsConfirmation: false,
      };
    }
  }

  // Layer 3 — nothing in the SKUs, so fall back to the title. Only for
  // products whose vendor says they came from Trendsi in the first place.
  if (product.vendor.trim().toLowerCase() !== 'trendsi') return null;

  let best: { entry: TrendsiIndexEntry; score: number } | null = null;
  for (const entry of index.all) {
    const score = titleSimilarity(product.title, entry.title);
    if (!best || score > best.score) best = { entry, score };
  }

  if (!best || best.score < TITLE_MATCH_THRESHOLD) return null;

  return {
    trendsiProductId: best.entry.productId,
    method: 'TITLE',
    confidence: Number(best.score.toFixed(3)),
    evidence: `Title matches "${best.entry.title}" at ${(best.score * 100).toFixed(0)}% — confirm before trusting it`,
    needsConfirmation: true,
  };
}

/**
 * The Trendsi product ids referenced by a Shopify product's SKUs, whichever
 * scheme they use. Used to flag a search result as "already in the store"
 * before any Trendsi product record exists locally.
 */
export function trendsiProductIdsFromSkus(skus: (string | null | undefined)[]): string[] {
  const ids = new Set<string>();
  for (const sku of skus) {
    const parts = parseTrdSku(sku);
    if (parts) ids.add(parts.productId);
  }
  return [...ids];
}
