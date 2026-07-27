'use server';

import { revalidatePath } from 'next/cache';
import { getShopifyEnv } from '@/env';
import { ShopifyAuthError } from '@/ingest/shopify/client';
import { syncShopify } from '@/ingest/shopify/sync';

/**
 * Server actions the UI can trigger.
 *
 * These return a result object rather than throwing, because every one of
 * these failures is something the person using the app can act on — a missing
 * token, a revoked scope — and a red box with an explanation is far more
 * useful than an error boundary.
 */

export interface ActionResult {
  ok: boolean;
  message: string;
  detail?: string;
}

export async function runShopifySync(): Promise<ActionResult> {
  const env = getShopifyEnv();
  if (!env.ok) {
    return {
      ok: false,
      message: 'Shopify no está configurado todavía.',
      detail: env.problems,
    };
  }

  try {
    const result = await syncShopify();

    const parts = [
      `${result.productsSeen} productos leídos`,
      `${result.productsNew} nuevos`,
      `${result.productsUpdated} actualizados`,
      `${result.collectionsSeen} colecciones`,
    ];
    if (result.salesRows > 0) parts.push(`${result.salesRows} líneas de venta`);

    revalidatePath('/');
    revalidatePath('/catalog');
    revalidatePath('/audit');
    revalidatePath('/runs');

    return {
      ok: result.status !== 'FAILED',
      message:
        result.errors > 0
          ? `Sincronización terminada con ${result.errors} error(es): ${parts.join(', ')}.`
          : `Sincronización correcta: ${parts.join(', ')}.`,
      detail: result.salesSkippedReason ?? undefined,
    };
  } catch (error) {
    if (error instanceof ShopifyAuthError) {
      return {
        ok: false,
        message: 'Shopify ha rechazado el token.',
        detail: error.message,
      };
    }
    return {
      ok: false,
      message: 'La sincronización ha fallado.',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
