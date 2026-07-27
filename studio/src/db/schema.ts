import { sql, relations } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * Norvik Sourcing Studio — data model.
 *
 * Three conventions run through this file and are worth stating once:
 *
 * 1. Money is stored as integer cents, never as a float. SQLite has no exact
 *    decimal type, and $22.57 in binary floating point is not $22.57. Every
 *    money column ends in `Cents` so the unit is impossible to misread.
 *
 * 2. Status columns are plain text. Their permitted values are declared — and
 *    validated — in `src/domain/types.ts`, and the allowed set is written in a
 *    comment above each one. SQLite has no enum type; pretending otherwise
 *    only moves the check somewhere less visible.
 *
 * 3. Timestamps are stored as Unix milliseconds and surface as `Date`.
 */

const now = sql`(unixepoch() * 1000)`;

// ---------------------------------------------------------------------------
// My Shopify store
// ---------------------------------------------------------------------------

export const shopifyProducts = sqliteTable(
  'shopify_products',
  {
    /** Shopify GID, e.g. gid://shopify/Product/8396732301501 */
    id: text('id').primaryKey(),
    /** Numeric id from the GID, for building admin links. */
    legacyId: text('legacy_id').notNull(),
    title: text('title').notNull(),
    handle: text('handle').notNull(),
    /** ACTIVE | ARCHIVED | DRAFT */
    status: text('status').notNull(),
    vendor: text('vendor').notNull().default(''),
    productType: text('product_type').notNull().default(''),
    descriptionHtml: text('description_html'),
    featuredImage: text('featured_image'),
    /** JSON array of tag strings. */
    tags: text('tags').notNull().default('[]'),
    totalInventory: integer('total_inventory').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    syncedAt: integer('synced_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [
    index('shopify_products_vendor_idx').on(table.vendor),
    index('shopify_products_status_idx').on(table.status),
  ],
);

export const shopifyVariants = sqliteTable(
  'shopify_variants',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => shopifyProducts.id, { onDelete: 'cascade' }),
    sku: text('sku'),
    title: text('title').notNull(),
    priceCents: integer('price_cents').notNull(),
    compareAtCents: integer('compare_at_cents'),
    inventoryQuantity: integer('inventory_quantity').notNull().default(0),
    /** JSON array of { name, value }. */
    options: text('options').notNull().default('[]'),
    position: integer('position').notNull().default(0),
  },
  (table) => [
    index('shopify_variants_product_idx').on(table.productId),
    index('shopify_variants_sku_idx').on(table.sku),
  ],
);

export const shopifyCollections = sqliteTable('shopify_collections', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  handle: text('handle').notNull(),
  productsCount: integer('products_count').notNull().default(0),
});

export const shopifyProductCollections = sqliteTable(
  'shopify_product_collections',
  {
    productId: text('product_id')
      .notNull()
      .references(() => shopifyProducts.id, { onDelete: 'cascade' }),
    collectionId: text('collection_id')
      .notNull()
      .references(() => shopifyCollections.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.collectionId] }),
    index('shopify_product_collections_collection_idx').on(table.collectionId),
  ],
);

/** Units sold per product — what separates a real seller from a shelf-warmer. */
export const shopifySales = sqliteTable(
  'shopify_sales',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    variantSku: text('variant_sku'),
    quantity: integer('quantity').notNull(),
    revenueCents: integer('revenue_cents').notNull(),
    orderedAt: integer('ordered_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('shopify_sales_product_idx').on(table.productId),
    index('shopify_sales_date_idx').on(table.orderedAt),
  ],
);

// ---------------------------------------------------------------------------
// Trendsi catalogue
// ---------------------------------------------------------------------------

export const trendsiProducts = sqliteTable(
  'trendsi_products',
  {
    /** Trendsi's product id — the `id` in /products/detail?id=... */
    productId: text('product_id').primaryKey(),
    title: text('title').notNull(),
    brand: text('brand'),
    description: text('description'),
    /** Manufacturer suggested retail price: the ceiling we sanity-check against. */
    msrpCents: integer('msrp_cents'),
    /** USA | OVERSEAS | UNKNOWN — drives the delivery promise on the storefront. */
    shipFrom: text('ship_from').notNull().default('UNKNOWN'),
    shippingDays: text('shipping_days'),
    /** JSON array of image URLs, in Trendsi's order. */
    images: text('images').notNull().default('[]'),
    /** JSON array of Trendsi's own category labels. */
    categories: text('categories').notNull().default('[]'),
    detailUrl: text('detail_url').notNull(),
    firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull().default(now),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [index('trendsi_products_last_seen_idx').on(table.lastSeenAt)],
);

export const trendsiVariants = sqliteTable(
  'trendsi_variants',
  {
    /**
     * Trendsi's sku id — the 15-digit number that becomes the Shopify SKU when
     * a product is imported through Trendsi's own Shopify app.
     */
    skuId: text('sku_id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => trendsiProducts.productId, { onDelete: 'cascade' }),
    color: text('color'),
    size: text('size'),
    /** My real per-unit cost. Every margin in the app is built on this. */
    dropshipCents: integer('dropship_cents').notNull(),
    /** Bulk price. Recorded for reference, never used for margins. */
    wholesaleCents: integer('wholesale_cents'),
    stock: integer('stock').notNull().default(0),
    imageUrl: text('image_url'),
  },
  (table) => [index('trendsi_variants_product_idx').on(table.productId)],
);

/**
 * One row per observed cost or stock reading, so a supplier raising prices is
 * visible as history rather than as a number that silently moved.
 */
export const trendsiCostPoints = sqliteTable(
  'trendsi_cost_points',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => trendsiProducts.productId, { onDelete: 'cascade' }),
    skuId: text('sku_id').notNull(),
    dropshipCents: integer('dropship_cents').notNull(),
    stock: integer('stock').notNull(),
    observedAt: integer('observed_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [
    index('trendsi_cost_points_product_idx').on(table.productId, table.observedAt),
    index('trendsi_cost_points_sku_idx').on(table.skuId, table.observedAt),
  ],
);

// ---------------------------------------------------------------------------
// Matching my catalogue against Trendsi's
// ---------------------------------------------------------------------------

/**
 * Links a product I already sell to the Trendsi product it came from.
 *
 * `method` records how the link was made, because the three routes are not
 * equally trustworthy and the UI has to say which was used:
 *   TRD_SKU        — my SKU is TRD-<productId>-<suffix>. Exact.
 *   TRENDSI_SKU_ID — my SKU is Trendsi's numeric sku id. Exact.
 *   TITLE          — normalised title match. A suggestion, not a fact.
 */
export const productMatches = sqliteTable(
  'product_matches',
  {
    id: text('id').primaryKey(),
    shopifyProductId: text('shopify_product_id')
      .notNull()
      .references(() => shopifyProducts.id, { onDelete: 'cascade' }),
    trendsiProductId: text('trendsi_product_id')
      .notNull()
      .references(() => trendsiProducts.productId, { onDelete: 'cascade' }),
    /** TRD_SKU | TRENDSI_SKU_ID | TITLE */
    method: text('method').notNull(),
    /** 0..1. Exact SKU routes score 1; title matches score their similarity. */
    confidence: real('confidence').notNull(),
    /** Whether a human has agreed with a low-confidence match. */
    confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
    evidence: text('evidence').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [
    uniqueIndex('product_matches_pair_idx').on(table.shopifyProductId, table.trendsiProductId),
    index('product_matches_trendsi_idx').on(table.trendsiProductId),
  ],
);

// ---------------------------------------------------------------------------
// Sourcing candidates and my decisions about them
// ---------------------------------------------------------------------------

export const candidates = sqliteTable(
  'candidates',
  {
    id: text('id').primaryKey(),
    trendsiProductId: text('trendsi_product_id')
      .notNull()
      .references(() => trendsiProducts.productId, { onDelete: 'cascade' }),
    /** Key from config/sections.yaml, e.g. "maxi-dresses". */
    sectionKey: text('section_key'),
    /** 0..100 brand fit. Null until scoring has run. */
    score: integer('score'),
    /** JSON ScoreBreakdown: every rule that fired, with points and evidence. */
    scoreBreakdown: text('score_breakdown'),
    /** True when a hard exclusion fired (kids, menswear, activewear, costume). */
    excluded: integer('excluded', { mode: 'boolean' }).notNull().default(false),
    excludedReason: text('excluded_reason'),

    landedCostCents: integer('landed_cost_cents'),
    suggestedRetailCents: integer('suggested_retail_cents'),
    grossMarginCents: integer('gross_margin_cents'),
    grossMarginPct: real('gross_margin_pct'),
    netMarginCents: integer('net_margin_cents'),
    netMarginPct: real('net_margin_pct'),

    /** NEW | APPROVED | REJECTED | PARKED */
    status: text('status').notNull().default('NEW'),
    /** Set when the candidate duplicates something already on the shelf. */
    alreadyInStore: integer('already_in_store', { mode: 'boolean' }).notNull().default(false),
    discoveredAt: integer('discovered_at', { mode: 'timestamp_ms' }).notNull().default(now),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(now),
    /** Which saved search surfaced it first. */
    sourceSearch: text('source_search'),
  },
  (table) => [
    uniqueIndex('candidates_trendsi_idx').on(table.trendsiProductId),
    index('candidates_status_idx').on(table.status),
    index('candidates_section_idx').on(table.sectionKey),
    index('candidates_score_idx').on(table.score),
  ],
);

export const decisions = sqliteTable(
  'decisions',
  {
    id: text('id').primaryKey(),
    candidateId: text('candidate_id')
      .notNull()
      .references(() => candidates.id, { onDelete: 'cascade' }),
    /** APPROVE | REJECT | PARK | REOPEN */
    action: text('action').notNull(),
    reason: text('reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [index('decisions_candidate_idx').on(table.candidateId)],
);

// ---------------------------------------------------------------------------
// Saved searches
// ---------------------------------------------------------------------------

export const savedSearches = sqliteTable(
  'saved_searches',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    sectionKey: text('section_key').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    /** MANUAL | DAILY | WEEKLY */
    schedule: text('schedule').notNull().default('MANUAL'),
    lastRunAt: integer('last_run_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [index('saved_searches_section_idx').on(table.sectionKey)],
);

export const searchTerms = sqliteTable(
  'search_terms',
  {
    id: text('id').primaryKey(),
    savedSearchId: text('saved_search_id')
      .notNull()
      .references(() => savedSearches.id, { onDelete: 'cascade' }),
    /**
     * Kept deliberately short: Trendsi ANDs every token and returns nothing
     * for queries longer than four or five words.
     */
    term: text('term').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    /** Result count from the most recent run, so dead terms are visible. */
    lastResults: integer('last_results'),
  },
  (table) => [index('search_terms_search_idx').on(table.savedSearchId)],
);

// ---------------------------------------------------------------------------
// Run traces
// ---------------------------------------------------------------------------

export const ingestRuns = sqliteTable(
  'ingest_runs',
  {
    id: text('id').primaryKey(),
    /** SHOPIFY | TRENDSI | COMPETITOR */
    source: text('source').notNull(),
    /** RUNNING | OK | PARTIAL | FAILED | BLOCKED | SESSION_EXPIRED */
    status: text('status').notNull().default('RUNNING'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull().default(now),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
    durationMs: integer('duration_ms'),
    itemsSeen: integer('items_seen').notNull().default(0),
    itemsNew: integer('items_new').notNull().default(0),
    itemsUpdated: integer('items_updated').notNull().default(0),
    requestCount: integer('request_count').notNull().default(0),
    cacheHits: integer('cache_hits').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    /** JSON of the parameters the run started with. */
    params: text('params'),
    notes: text('notes'),
    /** True when the run only read fixtures and never touched the network. */
    dryRun: integer('dry_run', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('ingest_runs_source_idx').on(table.source, table.startedAt)],
);

export const ingestErrors = sqliteTable(
  'ingest_errors',
  {
    id: text('id').primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => ingestRuns.id, { onDelete: 'cascade' }),
    /** FETCH | PARSE | VALIDATE | PERSIST | AUTH | ROBOTS */
    stage: text('stage').notNull(),
    /** The URL, product id or store key the failure relates to. */
    target: text('target'),
    message: text('message').notNull(),
    /** Stack trace or raw payload excerpt, for debugging after the fact. */
    detail: text('detail'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [index('ingest_errors_run_idx').on(table.runId)],
);

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export const alerts = sqliteTable(
  'alerts',
  {
    id: text('id').primaryKey(),
    /** STOCKOUT | COST_INCREASE | MARGIN_BELOW_TARGET | PRICE_OUT_OF_BAND | OFF_BRAND | SESSION_EXPIRED | STORE_BLOCKED */
    type: text('type').notNull(),
    /** INFO | WARNING | CRITICAL */
    severity: text('severity').notNull().default('WARNING'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    /** SHOPIFY_PRODUCT | TRENDSI_PRODUCT | CANDIDATE | COMPETITOR_STORE | SYSTEM */
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    /** JSON with the numbers behind the alert, so the UI can show the evidence. */
    data: text('data'),
    /** OPEN | ACKNOWLEDGED | RESOLVED */
    status: text('status').notNull().default('OPEN'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(now),
    resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
    /** Stops the same condition opening a new alert on every run. */
    dedupeKey: text('dedupe_key').notNull(),
  },
  (table) => [
    uniqueIndex('alerts_dedupe_idx').on(table.dedupeKey),
    index('alerts_status_idx').on(table.status, table.createdAt),
    index('alerts_type_idx').on(table.type),
  ],
);

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export const competitorStores = sqliteTable('competitor_stores', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  /**
   * UNTESTED | OK | BLOCKED | BROKEN | DISALLOWED
   * BLOCKED    — the store refuses automated reads. Expected, not a bug.
   * DISALLOWED — robots.txt says no. We comply and stop.
   */
  status: text('status').notNull().default('UNTESTED'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp_ms' }),
  lastError: text('last_error'),
  notes: text('notes'),
});

export const competitorProducts = sqliteTable(
  'competitor_products',
  {
    id: text('id').primaryKey(),
    storeKey: text('store_key')
      .notNull()
      .references(() => competitorStores.key, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    imageUrl: text('image_url'),
    priceCents: integer('price_cents'),
    /** BESTSELLERS | NEW_IN */
    listing: text('listing').notNull(),
    sectionKey: text('section_key'),
    seenAt: integer('seen_at', { mode: 'timestamp_ms' }).notNull().default(now),
  },
  (table) => [
    uniqueIndex('competitor_products_unique_idx').on(
      table.storeKey,
      table.externalId,
      table.listing,
    ),
    index('competitor_products_store_idx').on(table.storeKey, table.seenAt),
  ],
);

// ---------------------------------------------------------------------------
// Settings a human can change from the UI without editing files
// ---------------------------------------------------------------------------

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const shopifyProductsRelations = relations(shopifyProducts, ({ many }) => ({
  variants: many(shopifyVariants),
  collections: many(shopifyProductCollections),
  matches: many(productMatches),
}));

export const shopifyVariantsRelations = relations(shopifyVariants, ({ one }) => ({
  product: one(shopifyProducts, {
    fields: [shopifyVariants.productId],
    references: [shopifyProducts.id],
  }),
}));

export const shopifyCollectionsRelations = relations(shopifyCollections, ({ many }) => ({
  products: many(shopifyProductCollections),
}));

export const shopifyProductCollectionsRelations = relations(
  shopifyProductCollections,
  ({ one }) => ({
    product: one(shopifyProducts, {
      fields: [shopifyProductCollections.productId],
      references: [shopifyProducts.id],
    }),
    collection: one(shopifyCollections, {
      fields: [shopifyProductCollections.collectionId],
      references: [shopifyCollections.id],
    }),
  }),
);

export const trendsiProductsRelations = relations(trendsiProducts, ({ many, one }) => ({
  variants: many(trendsiVariants),
  matches: many(productMatches),
  costPoints: many(trendsiCostPoints),
  candidate: one(candidates),
}));

export const trendsiVariantsRelations = relations(trendsiVariants, ({ one }) => ({
  product: one(trendsiProducts, {
    fields: [trendsiVariants.productId],
    references: [trendsiProducts.productId],
  }),
}));

export const productMatchesRelations = relations(productMatches, ({ one }) => ({
  shopifyProduct: one(shopifyProducts, {
    fields: [productMatches.shopifyProductId],
    references: [shopifyProducts.id],
  }),
  trendsiProduct: one(trendsiProducts, {
    fields: [productMatches.trendsiProductId],
    references: [trendsiProducts.productId],
  }),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  trendsiProduct: one(trendsiProducts, {
    fields: [candidates.trendsiProductId],
    references: [trendsiProducts.productId],
  }),
  decisions: many(decisions),
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
  candidate: one(candidates, { fields: [decisions.candidateId], references: [candidates.id] }),
}));

export const savedSearchesRelations = relations(savedSearches, ({ many }) => ({
  terms: many(searchTerms),
}));

export const searchTermsRelations = relations(searchTerms, ({ one }) => ({
  savedSearch: one(savedSearches, {
    fields: [searchTerms.savedSearchId],
    references: [savedSearches.id],
  }),
}));

export const ingestRunsRelations = relations(ingestRuns, ({ many }) => ({
  errors: many(ingestErrors),
}));

export const ingestErrorsRelations = relations(ingestErrors, ({ one }) => ({
  run: one(ingestRuns, { fields: [ingestErrors.runId], references: [ingestRuns.id] }),
}));

export const competitorStoresRelations = relations(competitorStores, ({ many }) => ({
  products: many(competitorProducts),
}));

export const competitorProductsRelations = relations(competitorProducts, ({ one }) => ({
  store: one(competitorStores, {
    fields: [competitorProducts.storeKey],
    references: [competitorStores.key],
  }),
}));

export type ShopifyProductRow = typeof shopifyProducts.$inferSelect;
export type ShopifyVariantRow = typeof shopifyVariants.$inferSelect;
export type TrendsiProductRow = typeof trendsiProducts.$inferSelect;
export type TrendsiVariantRow = typeof trendsiVariants.$inferSelect;
export type CandidateRow = typeof candidates.$inferSelect;
export type IngestRunRow = typeof ingestRuns.$inferSelect;
export type AlertRow = typeof alerts.$inferSelect;
export type CompetitorStoreRow = typeof competitorStores.$inferSelect;
