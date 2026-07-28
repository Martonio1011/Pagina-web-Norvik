import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  ingestErrors,
  ingestRuns,
  shopifyCollections,
  shopifyProductCollections,
  shopifyProducts,
  shopifyVariants,
} from '@/db/schema';
import { loadSections } from '@/lib/config';
import { parseTags } from '@/ingest/shopify/map';
import {
  auditCatalog,
  sectionCoverage,
  type AuditableProduct,
  type CatalogFinding,
  type SectionCoverage,
} from '@/domain/audit';

/**
 * Everything the screens read.
 *
 * The pages are server components, so they call these directly — no API layer
 * in between for data the app already has on disk. Each function returns a
 * plain view model with the money already resolved, so a page never does
 * arithmetic in JSX.
 */

export interface CatalogProduct {
  id: string;
  legacyId: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  productType: string;
  featuredImage: string | null;
  tags: string[];
  totalInventory: number;
  minPriceCents: number;
  maxPriceCents: number;
  variantCount: number;
  skus: string[];
  collectionHandles: string[];
  collectionTitles: string[];
  updatedAt: Date;
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const products = await db.select().from(shopifyProducts).orderBy(desc(shopifyProducts.updatedAt));
  if (products.length === 0) return [];

  const [variants, links, collections] = await Promise.all([
    db.select().from(shopifyVariants),
    db.select().from(shopifyProductCollections),
    db.select().from(shopifyCollections),
  ]);
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));

  const variantsByProduct = new Map<string, typeof variants>();
  for (const variant of variants) {
    const bucket = variantsByProduct.get(variant.productId);
    if (bucket) bucket.push(variant);
    else variantsByProduct.set(variant.productId, [variant]);
  }

  const collectionsByProduct = new Map<string, string[]>();
  for (const link of links) {
    const bucket = collectionsByProduct.get(link.productId);
    if (bucket) bucket.push(link.collectionId);
    else collectionsByProduct.set(link.productId, [link.collectionId]);
  }

  return products.map((product) => {
    const productVariants = variantsByProduct.get(product.id) ?? [];
    const prices = productVariants.map((variant) => variant.priceCents);
    const collectionIds = collectionsByProduct.get(product.id) ?? [];
    const productCollections = collectionIds
      .map((id) => collectionById.get(id))
      .filter((collection): collection is (typeof collections)[number] => collection !== undefined);

    return {
      id: product.id,
      legacyId: product.legacyId,
      title: product.title,
      handle: product.handle,
      status: product.status,
      vendor: product.vendor,
      productType: product.productType,
      featuredImage: product.featuredImage,
      tags: parseTags(product.tags),
      totalInventory: product.totalInventory,
      // A product with no variants has no price. Zero would be a lie, so the
      // UI is given -1 and renders it as "sin precio".
      minPriceCents: prices.length > 0 ? Math.min(...prices) : -1,
      maxPriceCents: prices.length > 0 ? Math.max(...prices) : -1,
      variantCount: productVariants.length,
      skus: productVariants
        .map((variant) => variant.sku)
        .filter((sku): sku is string => sku !== null),
      collectionHandles: productCollections.map((collection) => collection.handle),
      collectionTitles: productCollections.map((collection) => collection.title),
      updatedAt: product.updatedAt,
    };
  });
}

function toAuditable(product: CatalogProduct): AuditableProduct {
  return {
    id: product.id,
    title: product.title,
    status: product.status,
    productType: product.productType,
    tags: product.tags,
    minPriceCents: product.minPriceCents,
    maxPriceCents: product.maxPriceCents,
    totalInventory: product.totalInventory,
    collectionHandles: product.collectionHandles,
  };
}

export interface CatalogOverview {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  totalVariants: number;
  trendsiProducts: number;
  /** Products carrying a SKU we can trace back to Trendsi, by either scheme. */
  traceableProducts: number;
  findings: CatalogFinding[];
  coverage: SectionCoverage[];
  lastSync: {
    id: string;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    durationMs: number | null;
    itemsSeen: number;
    errorCount: number;
  } | null;
}

export async function getCatalogOverview(): Promise<CatalogOverview> {
  const products = await getCatalogProducts();
  const sections = loadSections();
  const collections = await db.select().from(shopifyCollections);

  const auditable = products
    // A product with no price cannot be compared against a band; it is
    // reported by its own finding instead of being silently audited as $0.
    .filter((product) => product.minPriceCents >= 0)
    .map(toAuditable);

  const [lastSyncRow] = await db
    .select()
    .from(ingestRuns)
    .where(eq(ingestRuns.source, 'SHOPIFY'))
    .orderBy(desc(ingestRuns.startedAt))
    .limit(1);

  return {
    totalProducts: products.length,
    activeProducts: products.filter((product) => product.status === 'ACTIVE').length,
    draftProducts: products.filter((product) => product.status === 'DRAFT').length,
    totalVariants: products.reduce((sum, product) => sum + product.variantCount, 0),
    trendsiProducts: products.filter((product) => product.vendor.toLowerCase() === 'trendsi')
      .length,
    traceableProducts: products.filter((product) =>
      product.skus.some((sku) => /^TRD-\d+-/i.test(sku) || /^\d{12,18}$/.test(sku)),
    ).length,
    findings: auditCatalog(auditable, sections),
    coverage: sectionCoverage(
      auditable,
      sections,
      collections.map((collection) => collection.handle),
    ),
    lastSync: lastSyncRow
      ? {
          id: lastSyncRow.id,
          status: lastSyncRow.status,
          startedAt: lastSyncRow.startedAt,
          finishedAt: lastSyncRow.finishedAt,
          durationMs: lastSyncRow.durationMs,
          itemsSeen: lastSyncRow.itemsSeen,
          errorCount: lastSyncRow.errorCount,
        }
      : null,
  };
}

export interface RunSummary {
  id: string;
  source: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  itemsSeen: number;
  itemsNew: number;
  itemsUpdated: number;
  errorCount: number;
  dryRun: boolean;
  notes: string | null;
}

export async function getRuns(limit = 30): Promise<RunSummary[]> {
  return db.select().from(ingestRuns).orderBy(desc(ingestRuns.startedAt)).limit(limit);
}

export async function getRun(id: string): Promise<{
  run: RunSummary;
  errors: {
    id: string;
    stage: string;
    target: string | null;
    message: string;
    detail: string | null;
  }[];
} | null> {
  const [run] = await db.select().from(ingestRuns).where(eq(ingestRuns.id, id));
  if (!run) return null;

  const errors = await db
    .select()
    .from(ingestErrors)
    .where(eq(ingestErrors.runId, id))
    .orderBy(desc(ingestErrors.createdAt));

  return { run, errors };
}
