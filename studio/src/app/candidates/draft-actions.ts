'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { shopifyCollections } from '@/db/schema';
import { getShopifyEnv } from '@/env';
import { buildDraft } from '@/domain/draft';
import { getDecisionQueue } from '@/server/candidates';
import { createShopifyDraft, ShopifyDraftError } from '@/ingest/shopify/create-draft';

/**
 * Creating a Shopify draft from an approved candidate.
 *
 * Two guards before anything is written to the live shop:
 *
 *   1. The candidate must already be APPROVED. Creating a product for something
 *      that has not been decided on would make the decision queue pointless.
 *   2. The caller must pass `confirmed: true`. The UI only sets that after an
 *      explicit second click, so a stray click cannot put a product in the shop.
 */

export interface DraftResult {
  ok: boolean;
  message: string;
  adminUrl?: string;
  warnings?: string[];
}

export async function createDraftForCandidate(input: {
  trendsiProductId: string;
  confirmed: boolean;
}): Promise<DraftResult> {
  if (!input.confirmed) {
    return { ok: false, message: 'Hace falta confirmar antes de crear nada en Shopify.' };
  }

  const shopify = getShopifyEnv();
  if (!shopify.ok) {
    return {
      ok: false,
      message: 'Shopify no está configurado. Falta el token en el archivo .env.',
    };
  }

  const queue = await getDecisionQueue();
  const entry = queue.find((candidate) => candidate.facts.productId === input.trendsiProductId);

  if (!entry) {
    return { ok: false, message: 'Ese candidato ya no está en la lista.' };
  }
  if (entry.status !== 'APPROVED') {
    return { ok: false, message: 'Solo se crean borradores de candidatos aprobados.' };
  }
  if (!entry.evaluation.economics) {
    return {
      ok: false,
      message: `No hay precio calculado para este producto: ${entry.evaluation.economicsError ?? 'motivo desconocido'}`,
    };
  }

  // Only join collections that genuinely exist in the shop; a missing handle
  // would make Shopify reject the whole product.
  const collectionIds: string[] = [];
  for (const handle of entry.evaluation.section?.collections ?? []) {
    const [collection] = await db
      .select()
      .from(shopifyCollections)
      .where(eq(shopifyCollections.handle, handle));
    if (collection) collectionIds.push(collection.id);
  }

  const payload = buildDraft({
    title: entry.facts.title,
    description: entry.facts.description,
    trendsiProductId: entry.facts.productId,
    section: entry.evaluation.section,
    suggestedRetailCents: entry.evaluation.economics.suggestedRetailCents,
    colors: entry.facts.colors,
    sizes: entry.facts.sizes,
    shipFrom: entry.facts.shipFrom,
    collectionIds,
    matchedTerms: entry.evaluation.score.components
      .filter((component) => component.points > 0 && component.group !== 'PRICE_FIT')
      .map((component) => component.label),
  });

  try {
    const created = await createShopifyDraft(payload);
    revalidatePath('/candidates');
    revalidatePath('/catalog');

    return {
      ok: true,
      message: `Borrador creado en Shopify: «${created.title}».`,
      adminUrl: created.adminUrl,
      warnings: created.warnings,
    };
  } catch (error) {
    if (error instanceof ShopifyDraftError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: `No se pudo crear el borrador: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
