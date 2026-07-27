import { z } from 'zod';

/**
 * Zod schemas for everything Shopify sends back.
 *
 * Anything crossing the network boundary is validated here before it reaches
 * the rest of the app. When Shopify changes a field, the failure happens at
 * this line with a message naming the field — not three screens later as an
 * undefined price.
 */

const moneyString = z.string().regex(/^-?\d+(\.\d+)?$/, 'expected a decimal amount as a string');

export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
});

export const shopSchema = z.object({
  shop: z.object({
    name: z.string(),
    myshopifyDomain: z.string(),
    currencyCode: z.string(),
    ianaTimezone: z.string(),
  }),
});
export type ShopResponse = z.infer<typeof shopSchema>;

export const productVariantSchema = z.object({
  id: z.string(),
  sku: z.string().nullable(),
  title: z.string(),
  price: moneyString,
  compareAtPrice: moneyString.nullable(),
  inventoryQuantity: z.number().int().nullable(),
  selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })),
});
export type ProductVariantNode = z.infer<typeof productVariantSchema>;

export const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  status: z.string(),
  vendor: z.string(),
  productType: z.string(),
  tags: z.array(z.string()),
  descriptionHtml: z.string().nullable(),
  totalInventory: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  featuredMedia: z
    .object({
      preview: z.object({ image: z.object({ url: z.string() }).nullable() }).nullable(),
    })
    .nullable(),
  collections: z.object({
    nodes: z.array(z.object({ id: z.string(), title: z.string(), handle: z.string() })),
  }),
  variants: z.object({ nodes: z.array(productVariantSchema) }),
});
export type ProductNode = z.infer<typeof productSchema>;

export const productsResponseSchema = z.object({
  products: z.object({
    pageInfo: pageInfoSchema,
    nodes: z.array(productSchema),
  }),
});

export const collectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  productsCount: z.object({ count: z.number().int() }).nullable(),
});
export type CollectionNode = z.infer<typeof collectionSchema>;

export const collectionsResponseSchema = z.object({
  collections: z.object({
    pageInfo: pageInfoSchema,
    nodes: z.array(collectionSchema),
  }),
});

export const orderSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  lineItems: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        quantity: z.number().int(),
        sku: z.string().nullable(),
        product: z.object({ id: z.string() }).nullable(),
        originalTotalSet: z.object({ shopMoney: z.object({ amount: moneyString }) }).nullable(),
      }),
    ),
  }),
});
export type OrderNode = z.infer<typeof orderSchema>;

export const ordersResponseSchema = z.object({
  orders: z.object({
    pageInfo: pageInfoSchema,
    nodes: z.array(orderSchema),
  }),
});

export type ProductsResponse = z.infer<typeof productsResponseSchema>;
export type CollectionsResponse = z.infer<typeof collectionsResponseSchema>;
export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
