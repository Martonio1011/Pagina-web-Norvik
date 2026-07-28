import 'server-only';
import { randomUUID } from 'node:crypto';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { candidates, decisions, productMatches, shopifyProducts, trendsiProducts, trendsiVariants } from '@/db/schema';
import { loadBrandRules, loadSections } from '@/lib/config';
import { getEnv } from '@/env';
import {
  evaluateCandidate,
  rankCandidates,
  type CandidateEvaluation,
  type DuplicateHint,
  type TrendsiProductFacts,
} from '@/domain/candidate';
import { ShipFrom } from '@/domain/types';
import type { CandidateStatus, DecisionAction } from '@/domain/types';

/**
 * The decision queue, backed by the database.
 *
 * Evaluations are recomputed from the stored supplier facts on every read
 * rather than being trusted from the `candidates` row. That is deliberate:
 * the rules live in editable config files, so a stored score would go stale
 * the moment a price band or a term list changed, and the screen would show a
 * number the current rules no longer produce.
 */

function parseJsonArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    // A malformed column should not take the queue down; an empty list is the
    // safe reading and the rest of the product still shows.
    return [];
  }
}

export interface QueueEntry {
  candidateId: string | null;
  status: CandidateStatus;
  facts: TrendsiProductFacts;
  evaluation: CandidateEvaluation;
  lastDecisionReason: string | null;
}

/**
 * Builds the queue: every Trendsi product we know about, evaluated against the
 * current rules, ranked, with any decision already taken attached.
 */
export async function getDecisionQueue(): Promise<QueueEntry[]> {
  const products = await db.select().from(trendsiProducts).orderBy(desc(trendsiProducts.lastSeenAt));
  if (products.length === 0) return [];

  const productIds = products.map((product) => product.productId);

  const [variants, matches, existingCandidates, shopProducts] = await Promise.all([
    db.select().from(trendsiVariants).where(inArray(trendsiVariants.productId, productIds)),
    db.select().from(productMatches).where(inArray(productMatches.trendsiProductId, productIds)),
    db.select().from(candidates).where(inArray(candidates.trendsiProductId, productIds)),
    db.select().from(shopifyProducts),
  ]);

  const shopTitleById = new Map(shopProducts.map((product) => [product.id, product.title]));
  const candidateByProduct = new Map(
    existingCandidates.map((candidate) => [candidate.trendsiProductId, candidate]),
  );

  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const bucket = variantsByProduct.get(variant.productId);
    if (bucket) bucket.push(variant);
    else variantsByProduct.set(variant.productId, [variant]);
  }

  const matchesByProduct = new Map<string, DuplicateHint[]>();
  for (const match of matches) {
    const hint: DuplicateHint = {
      shopifyProductId: match.shopifyProductId,
      title: shopTitleById.get(match.shopifyProductId) ?? match.shopifyProductId,
      method: match.method,
      confidence: match.confidence,
      needsConfirmation: match.method === 'TITLE' && !match.confirmed,
    };
    const bucket = matchesByProduct.get(match.trendsiProductId);
    if (bucket) bucket.push(hint);
    else matchesByProduct.set(match.trendsiProductId, [hint]);
  }

  const sections = loadSections();
  const rules = loadBrandRules();
  const env = getEnv();
  const settings = {
    shippingCents: env.DEFAULT_SHIPPING_COST,
    paymentFeeRate: env.PAYMENT_FEE_RATE,
    returnRate: env.RETURN_RATE,
  };

  const entries: QueueEntry[] = products.map((product) => {
    const productVariants = variantsByProduct.get(product.productId) ?? [];
    const costs = productVariants
      .map((variant) => variant.dropshipCents)
      .filter((cost) => cost > 0);

    const facts: TrendsiProductFacts = {
      productId: product.productId,
      title: product.title,
      description: product.description,
      brand: product.brand,
      msrpCents: product.msrpCents,
      shipFrom: ShipFrom.catch('UNKNOWN').parse(product.shipFrom),
      categories: parseJsonArray(product.categories),
      colors: [
        ...new Set(
          productVariants
            .map((variant) => variant.color)
            .filter((color): color is string => color !== null),
        ),
      ],
      sizes: [
        ...new Set(
          productVariants
            .map((variant) => variant.size)
            .filter((size): size is string => size !== null),
        ),
      ],
      // Zero when nothing parsed, which the evaluator turns into an explicit
      // "cannot be priced" rather than a free product.
      minDropshipCents: costs.length > 0 ? Math.min(...costs) : 0,
      totalStock: productVariants.reduce((sum, variant) => sum + variant.stock, 0),
      imageUrl: parseJsonArray(product.images)[0] ?? null,
      detailUrl: product.detailUrl,
    };

    const stored = candidateByProduct.get(product.productId);

    return {
      candidateId: stored?.id ?? null,
      status: (stored?.status ?? 'NEW') as CandidateStatus,
      facts,
      evaluation: evaluateCandidate({
        facts,
        sections,
        rules,
        settings,
        duplicates: matchesByProduct.get(product.productId) ?? [],
        forcedSectionKey: stored?.sectionKey ?? null,
      }),
      lastDecisionReason: null,
    };
  });

  const ranked = rankCandidates(entries.map((entry) => entry.evaluation));
  const orderById = new Map(ranked.map((evaluation, index) => [evaluation.trendsiProductId, index]));

  return entries.sort(
    (a, b) =>
      (orderById.get(a.facts.productId) ?? 0) - (orderById.get(b.facts.productId) ?? 0),
  );
}

/**
 * Records a decision.
 *
 * The decision and the candidate's new status are written together, so the
 * queue can never show a status with no decision behind it explaining who
 * chose it and why.
 */
export async function recordDecision(input: {
  trendsiProductId: string;
  action: DecisionAction;
  reason?: string | null;
}): Promise<{ candidateId: string; status: CandidateStatus }> {
  const statusFor: Record<DecisionAction, CandidateStatus> = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    PARK: 'PARKED',
    REOPEN: 'NEW',
  };
  const status = statusFor[input.action];

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(candidates)
      .where(eq(candidates.trendsiProductId, input.trendsiProductId));

    const candidateId = existing?.id ?? randomUUID();

    if (existing) {
      await tx
        .update(candidates)
        .set({ status, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId));
    } else {
      await tx.insert(candidates).values({
        id: candidateId,
        trendsiProductId: input.trendsiProductId,
        status,
        discoveredAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await tx.insert(decisions).values({
      id: randomUUID(),
      candidateId,
      action: input.action,
      reason: input.reason?.trim() ? input.reason.trim() : null,
      createdAt: new Date(),
    });

    return { candidateId, status };
  });
}

/** The approved list, which is what gets exported as a buying list. */
export async function getApproved(): Promise<QueueEntry[]> {
  const queue = await getDecisionQueue();
  return queue.filter((entry) => entry.status === 'APPROVED');
}

export interface QueueCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  parked: number;
}

export function countQueue(entries: QueueEntry[]): QueueCounts {
  return {
    total: entries.length,
    pending: entries.filter((entry) => entry.status === 'NEW').length,
    approved: entries.filter((entry) => entry.status === 'APPROVED').length,
    rejected: entries.filter((entry) => entry.status === 'REJECTED').length,
    parked: entries.filter((entry) => entry.status === 'PARKED').length,
  };
}
