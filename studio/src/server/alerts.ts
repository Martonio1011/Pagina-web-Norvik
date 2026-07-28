import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  alerts,
  productMatches,
  shopifyProducts,
  shopifyVariants,
  trendsiCostPoints,
  trendsiProducts,
  trendsiVariants,
} from '@/db/schema';
import { getEnv } from '@/env';
import { loadSections } from '@/lib/config';
import { classifySection, bandPosition } from '@/domain/sections';
import { landedCost, marginsAt } from '@/domain/economics';
import { parseTags } from '@/ingest/shopify/map';
import {
  costIncreaseAlerts,
  marginAlerts,
  priceBandAlerts,
  resolvedDedupeKeys,
  stockoutAlerts,
  type CostObservation,
  type MarginObservation,
  type RaisedAlert,
  type StockObservation,
} from '@/domain/alerts';
import type { AlertStatus } from '@/domain/types';

/**
 * Evaluating and storing alerts.
 *
 * The rules are pure and live in `src/domain/alerts.ts`; this module's job is
 * to gather the observations they need from the database, write what they
 * raise, and close what no longer applies.
 */

/** How much a supplier cost must rise before it is worth telling anyone. */
const DEFAULT_COST_INCREASE_THRESHOLD = 0.1;

export interface AlertView {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  status: AlertStatus;
  entityType: string;
  entityId: string | null;
  data: Record<string, string | number>;
  createdAt: Date;
}

function parseData(raw: string | null): Record<string, string | number> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, string | number>)
      : {};
  } catch {
    // Evidence that will not parse is not worth failing a page over; the alert
    // itself still carries its title and body.
    return {};
  }
}

export async function getAlerts(status: AlertStatus | 'ALL' = 'OPEN'): Promise<AlertView[]> {
  const rows =
    status === 'ALL'
      ? await db.select().from(alerts).orderBy(desc(alerts.createdAt))
      : await db.select().from(alerts).where(eq(alerts.status, status)).orderBy(desc(alerts.createdAt));

  const severityRank: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

  return rows
    .map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      body: row.body,
      status: row.status as AlertStatus,
      entityType: row.entityType,
      entityId: row.entityId,
      data: parseData(row.data),
      createdAt: row.createdAt,
    }))
    .sort(
      (a, b) =>
        (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
}

export interface AlertRunResult {
  raised: number;
  reopened: number;
  resolved: number;
  unchanged: number;
}

/**
 * Runs every alert rule and reconciles the result with what is already open.
 *
 * Nothing here invents data: if there are no Trendsi products yet, the
 * supplier rules simply produce nothing, and only the checks that can run on
 * the Shopify catalogue alone do.
 */
export async function evaluateAlerts(): Promise<AlertRunResult> {
  const env = getEnv();
  const sections = loadSections();

  const [shopProducts, shopVariants, trendsiRows, trendsiVariantRows, matches, costPoints] =
    await Promise.all([
      db.select().from(shopifyProducts),
      db.select().from(shopifyVariants),
      db.select().from(trendsiProducts),
      db.select().from(trendsiVariants),
      db.select().from(productMatches),
      db.select().from(trendsiCostPoints).orderBy(desc(trendsiCostPoints.observedAt)),
    ]);

  // --- Shopify-side observations -------------------------------------------
  const variantsByProduct = new Map<string, typeof shopVariants>();
  for (const variant of shopVariants) {
    const bucket = variantsByProduct.get(variant.productId);
    if (bucket) bucket.push(variant);
    else variantsByProduct.set(variant.productId, [variant]);
  }

  const trendsiIdByShopifyId = new Map(
    matches.map((match) => [match.shopifyProductId, match.trendsiProductId]),
  );
  const shopifyIdByTrendsiId = new Map(
    matches.map((match) => [match.trendsiProductId, match.shopifyProductId]),
  );

  const costByTrendsiProduct = new Map<string, number>();
  for (const variant of trendsiVariantRows) {
    const current = costByTrendsiProduct.get(variant.productId);
    if (current === undefined || variant.dropshipCents < current) {
      costByTrendsiProduct.set(variant.productId, variant.dropshipCents);
    }
  }

  const marginObservations: MarginObservation[] = [];

  for (const product of shopProducts) {
    const variants = variantsByProduct.get(product.id) ?? [];
    const prices = variants.map((variant) => variant.priceCents).filter((price) => price > 0);
    if (prices.length === 0) continue;

    const retailCents = Math.max(...prices);
    const { section } = classifySection(sections, {
      title: product.title,
      productType: product.productType,
      tags: parseTags(product.tags),
    });
    if (!section) continue;

    const trendsiId = trendsiIdByShopifyId.get(product.id);
    const dropship = trendsiId ? costByTrendsiProduct.get(trendsiId) : undefined;

    // Margin needs a real supplier cost. Without one we can still say whether
    // the price sits in its band, but we must not invent a margin.
    const observation: MarginObservation = {
      shopifyProductId: product.id,
      title: product.title,
      retailCents,
      landedCostCents: dropship ? landedCost(dropship, env.DEFAULT_SHIPPING_COST) : 0,
      grossMarginPct: 1,
      targetMarginPct: section.targetMargin,
      minimumMarginPct: section.minAcceptableMarginPct,
      sectionLabel: section.label,
      withinBand: bandPosition(retailCents, section) === 'WITHIN',
      bandMinCents: section.priceBandCents.min,
      bandMaxCents: section.priceBandCents.max,
    };

    if (dropship) {
      observation.grossMarginPct = marginsAt(
        retailCents,
        observation.landedCostCents,
        env.PAYMENT_FEE_RATE,
        env.RETURN_RATE,
      ).grossMarginPct;
    }

    marginObservations.push(observation);
  }

  // --- Trendsi-side observations -------------------------------------------
  const stockByProduct = new Map<string, number>();
  for (const variant of trendsiVariantRows) {
    stockByProduct.set(
      variant.productId,
      (stockByProduct.get(variant.productId) ?? 0) + variant.stock,
    );
  }

  const liveShopifyIds = new Set(
    shopProducts.filter((product) => product.status === 'ACTIVE').map((product) => product.id),
  );

  const stockObservations: StockObservation[] = trendsiRows.map((product) => {
    const shopifyId = shopifyIdByTrendsiId.get(product.productId) ?? null;
    return {
      trendsiProductId: product.productId,
      title: product.title,
      currentStock: stockByProduct.get(product.productId) ?? 0,
      soldByUs: shopifyId !== null,
      shopifyProductId: shopifyId,
      liveOnStorefront: shopifyId !== null && liveShopifyIds.has(shopifyId),
    };
  });

  // Cost history: the most recent reading before the current one.
  const previousCostByProduct = new Map<string, number>();
  const seen = new Set<string>();
  for (const point of costPoints) {
    if (seen.has(point.productId)) {
      if (!previousCostByProduct.has(point.productId)) {
        previousCostByProduct.set(point.productId, point.dropshipCents);
      }
      continue;
    }
    seen.add(point.productId);
  }

  const retailByShopifyId = new Map(
    marginObservations.map((observation) => [observation.shopifyProductId, observation.retailCents]),
  );

  const costObservations: CostObservation[] = trendsiRows.flatMap((product) => {
    const previous = previousCostByProduct.get(product.productId);
    const current = costByTrendsiProduct.get(product.productId);
    if (previous === undefined || current === undefined) return [];

    const shopifyId = shopifyIdByTrendsiId.get(product.productId) ?? null;
    return [
      {
        trendsiProductId: product.productId,
        title: product.title,
        previousCostCents: previous,
        currentCostCents: current,
        soldByUs: shopifyId !== null,
        ourRetailCents: shopifyId ? (retailByShopifyId.get(shopifyId) ?? null) : null,
      },
    ];
  });

  // --- Apply the rules -----------------------------------------------------
  const raised: RaisedAlert[] = [
    ...stockoutAlerts(stockObservations),
    ...costIncreaseAlerts(costObservations, DEFAULT_COST_INCREASE_THRESHOLD),
    ...marginAlerts(marginObservations.filter((observation) => observation.landedCostCents > 0)),
    ...priceBandAlerts(marginObservations),
  ];

  return persistAlerts(raised);
}

async function persistAlerts(raised: RaisedAlert[]): Promise<AlertRunResult> {
  const open = await db.select().from(alerts).where(eq(alerts.status, 'OPEN'));
  const openByKey = new Map(open.map((alert) => [alert.dedupeKey, alert]));

  let created = 0;
  let reopened = 0;
  let unchanged = 0;

  for (const alert of raised) {
    const existing = openByKey.get(alert.dedupeKey);
    if (existing) {
      unchanged += 1;
      continue;
    }

    // A previously resolved condition that has come back reopens the same row
    // rather than piling up duplicates.
    const [previous] = await db.select().from(alerts).where(eq(alerts.dedupeKey, alert.dedupeKey));

    if (previous) {
      await db
        .update(alerts)
        .set({ status: 'OPEN', resolvedAt: null, createdAt: new Date(), body: alert.body })
        .where(eq(alerts.id, previous.id));
      reopened += 1;
      continue;
    }

    await db.insert(alerts).values({
      id: randomUUID(),
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      entityType: alert.entityType,
      entityId: alert.entityId,
      data: JSON.stringify(alert.data),
      status: 'OPEN',
      createdAt: new Date(),
      dedupeKey: alert.dedupeKey,
    });
    created += 1;
  }

  const toResolve = resolvedDedupeKeys(
    open.map((alert) => alert.dedupeKey),
    raised,
  );

  if (toResolve.length > 0) {
    await db
      .update(alerts)
      .set({ status: 'RESOLVED', resolvedAt: new Date() })
      .where(and(inArray(alerts.dedupeKey, toResolve), eq(alerts.status, 'OPEN')));
  }

  return { raised: created, reopened, resolved: toResolve.length, unchanged };
}

export async function setAlertStatus(alertId: string, status: AlertStatus): Promise<void> {
  await db
    .update(alerts)
    .set({ status, resolvedAt: status === 'RESOLVED' ? new Date() : null })
    .where(eq(alerts.id, alertId));
}
