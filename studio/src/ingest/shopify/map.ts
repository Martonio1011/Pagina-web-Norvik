import { parseMoneyToCents, tryParseMoneyToCents } from '@/domain/money';
import type { CollectionNode, OrderNode, ProductNode } from './schemas';

/**
 * Turning Shopify's API shapes into our rows.
 *
 * Pure functions with no database and no network, so they can be tested
 * directly against a saved response from the real store.
 */

export interface MappedVariant {
  id: string;
  productId: string;
  sku: string | null;
  title: string;
  priceCents: number;
  compareAtCents: number | null;
  inventoryQuantity: number;
  options: string;
  position: number;
}

export interface MappedProduct {
  product: {
    id: string;
    legacyId: string;
    title: string;
    handle: string;
    status: string;
    vendor: string;
    productType: string;
    descriptionHtml: string | null;
    featuredImage: string | null;
    tags: string;
    totalInventory: number;
    createdAt: Date;
    updatedAt: Date;
    syncedAt: Date;
  };
  variants: MappedVariant[];
  collectionIds: string[];
  collections: { id: string; title: string; handle: string }[];
}

/** `gid://shopify/Product/8396732301501` → `8396732301501`. */
export function legacyIdFromGid(gid: string): string {
  const tail = gid.split('/').pop();
  if (!tail) throw new Error(`Not a Shopify global id: ${gid}`);
  return tail;
}

/** Builds the admin URL for a product, for the "open in Shopify" links. */
export function adminProductUrl(storeDomain: string, gid: string): string {
  return `https://${storeDomain}/admin/products/${legacyIdFromGid(gid)}`;
}

function parseTimestamp(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Shopify sent an unreadable ${field}: ${JSON.stringify(value)}`);
  }
  return date;
}

export function mapProduct(node: ProductNode, syncedAt: Date = new Date()): MappedProduct {
  const variants: MappedVariant[] = node.variants.nodes.map((variant, index) => ({
    id: variant.id,
    productId: node.id,
    sku: variant.sku && variant.sku.trim() !== '' ? variant.sku.trim() : null,
    title: variant.title,
    priceCents: parseMoneyToCents(variant.price),
    compareAtCents: tryParseMoneyToCents(variant.compareAtPrice),
    // Shopify reports null inventory for untracked variants. Zero is the
    // honest reading: we know of no stock, and the UI says "not tracked".
    inventoryQuantity: variant.inventoryQuantity ?? 0,
    options: JSON.stringify(variant.selectedOptions),
    position: index,
  }));

  return {
    product: {
      id: node.id,
      legacyId: legacyIdFromGid(node.id),
      title: node.title,
      handle: node.handle,
      status: node.status,
      vendor: node.vendor,
      productType: node.productType,
      descriptionHtml: node.descriptionHtml,
      featuredImage: node.featuredMedia?.preview?.image?.url ?? null,
      tags: JSON.stringify(node.tags),
      totalInventory: node.totalInventory ?? 0,
      createdAt: parseTimestamp(node.createdAt, 'createdAt'),
      updatedAt: parseTimestamp(node.updatedAt, 'updatedAt'),
      syncedAt,
    },
    variants,
    collectionIds: node.collections.nodes.map((collection) => collection.id),
    collections: node.collections.nodes,
  };
}

export function mapCollection(node: CollectionNode): {
  id: string;
  title: string;
  handle: string;
  productsCount: number;
} {
  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    productsCount: node.productsCount?.count ?? 0,
  };
}

export interface MappedSale {
  id: string;
  productId: string;
  variantSku: string | null;
  quantity: number;
  revenueCents: number;
  orderedAt: Date;
}

/**
 * Flattens an order into one row per line item that we can attribute to a
 * product. Line items whose product has been deleted carry no product id and
 * are skipped — they cannot be attributed to anything.
 */
export function mapOrderToSales(node: OrderNode): MappedSale[] {
  const orderedAt = parseTimestamp(node.createdAt, 'order createdAt');

  return node.lineItems.nodes.flatMap((item) => {
    if (!item.product) return [];
    return [
      {
        id: item.id,
        productId: item.product.id,
        variantSku: item.sku,
        quantity: item.quantity,
        revenueCents: item.originalTotalSet
          ? parseMoneyToCents(item.originalTotalSet.shopMoney.amount)
          : 0,
        orderedAt,
      },
    ];
  });
}

/** Reads the JSON tag column back into an array. */
export function parseTags(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === 'string')
      : [];
  } catch {
    // A malformed tag column should not take a page down; an empty tag list
    // is a safe reading, and the row is still shown with everything else.
    return [];
  }
}
