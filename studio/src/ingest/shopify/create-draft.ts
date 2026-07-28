import { z } from 'zod';
import { childLogger } from '@/lib/logger';
import type { DraftPayload } from '@/domain/draft';
import { ShopifyClient } from './client';

/**
 * Sending a draft to Shopify.
 *
 * Deliberately thin. The payload is built by `src/domain/draft.ts`, which is
 * pure and tested; this module does nothing but transmit it and report what
 * came back. Keeping the only irreversible operation in the app down to one
 * short function is the point — there is very little here to get wrong, and
 * what there is, is visible on one screen.
 *
 * The status sent is whatever the payload says, and the payload's type only
 * permits `'DRAFT'`. There is no code path here that publishes anything.
 */

const log = childLogger('shopify-draft');

const productCreateSchema = z.object({
  productCreate: z
    .object({
      product: z
        .object({ id: z.string(), title: z.string(), handle: z.string(), status: z.string() })
        .nullable(),
      userErrors: z.array(z.object({ field: z.array(z.string()).nullish(), message: z.string() })),
    })
    .nullable(),
});

const variantsUpdateSchema = z.object({
  productVariantsBulkUpdate: z
    .object({
      productVariants: z
        .array(z.object({ id: z.string(), sku: z.string().nullable() }))
        .nullable(),
      userErrors: z.array(z.object({ field: z.array(z.string()).nullish(), message: z.string() })),
    })
    .nullable(),
});

const PRODUCT_CREATE = /* GraphQL */ `
  mutation NorvikCreateDraft($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        title
        handle
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const VARIANTS_UPDATE = /* GraphQL */ `
  mutation NorvikSetVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        sku
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface CreatedDraft {
  productId: string;
  title: string;
  handle: string;
  status: string;
  adminUrl: string;
  /** Warnings that did not stop the product being created. */
  warnings: string[];
}

export class ShopifyDraftError extends Error {
  constructor(
    message: string,
    readonly userErrors: { field?: string[] | null; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ShopifyDraftError';
  }
}

/**
 * Creates the product as a draft and sets its price and SKUs.
 *
 * The variant update is a second call because Shopify creates a default
 * variant with the product; a failure there leaves a usable draft behind with
 * the wrong SKU rather than nothing at all, so it is reported as a warning and
 * the draft is still returned. Losing the product entirely over a SKU would be
 * the worse outcome.
 */
export async function createShopifyDraft(
  payload: DraftPayload,
  options: { client?: ShopifyClient } = {},
): Promise<CreatedDraft> {
  const client = options.client ?? new ShopifyClient();
  const warnings: string[] = [];

  const created = await client.query(PRODUCT_CREATE, productCreateSchema, {
    operationName: 'NorvikCreateDraft',
    variables: {
      product: {
        title: payload.title,
        descriptionHtml: payload.descriptionHtml,
        vendor: payload.vendor,
        productType: payload.productType,
        status: payload.status,
        tags: payload.tags,
        ...(payload.collectionIds.length > 0 ? { collectionsToJoin: payload.collectionIds } : {}),
      },
    },
  });

  const result = created.productCreate;
  if (!result || result.userErrors.length > 0) {
    const errors = result?.userErrors ?? [{ message: 'Shopify no devolvió ningún producto.' }];
    throw new ShopifyDraftError(
      `Shopify rechazó el borrador: ${errors.map((error) => error.message).join('; ')}`,
      errors,
    );
  }
  if (!result.product) {
    throw new ShopifyDraftError('Shopify aceptó la petición pero no devolvió el producto.');
  }

  const product = result.product;

  // Belt and braces: the payload type only allows DRAFT, but this is the one
  // place in the app that writes to the live shop, so what came back is
  // checked rather than assumed.
  if (product.status !== 'DRAFT') {
    warnings.push(
      `Shopify ha creado el producto con estado ${product.status} en lugar de borrador. Revísalo antes de nada.`,
    );
    log.error({ productId: product.id, status: product.status }, 'draft created with wrong status');
  }

  const firstSku = payload.skus[0];
  if (firstSku) {
    try {
      const variants = await client.query(VARIANTS_UPDATE, variantsUpdateSchema, {
        operationName: 'NorvikSetVariants',
        variables: {
          productId: product.id,
          // Only the default variant exists at this point, so only its price
          // and SKU are set here. Building out every size is a separate step
          // the owner does in Shopify, where the options UI is better than
          // anything this app would provide.
          variants: [{ price: payload.priceDollars.toFixed(2), inventoryItem: { sku: firstSku } }],
        },
      });

      const variantErrors = variants.productVariantsBulkUpdate?.userErrors ?? [];
      if (variantErrors.length > 0) {
        warnings.push(
          `El borrador se creó, pero no se pudo fijar el precio ni el SKU: ${variantErrors
            .map((error) => error.message)
            .join('; ')}`,
        );
      }
    } catch (error) {
      warnings.push(
        `El borrador se creó, pero falló al fijar precio y SKU: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  log.info({ productId: product.id, warnings: warnings.length }, 'draft created in Shopify');

  return {
    productId: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    adminUrl: `https://${client.storeDomain}/admin/products/${product.id.split('/').pop() ?? ''}`,
    warnings,
  };
}
