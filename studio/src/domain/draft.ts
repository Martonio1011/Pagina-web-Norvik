import { centsToDollars } from './money';
import type { Section } from './sections';

/**
 * Building the Shopify draft for an approved candidate.
 *
 * Pure: it produces the payload, it does not send it. That split is what makes
 * the copy and the tagging testable, and it keeps the one irreversible part of
 * the app — writing to the real shop — down to a single thin function
 * elsewhere that does nothing but transmit what this returned.
 *
 * The status is always DRAFT. Never published, never scheduled. The brief is
 * unambiguous about that and so is this module: there is no parameter to
 * override it.
 */

export interface DraftInput {
  title: string;
  description?: string | null;
  trendsiProductId: string;
  section: Section | null;
  suggestedRetailCents: number;
  colors: string[];
  sizes: string[];
  shipFrom: string;
  /** Handles of the Shopify collections to join. */
  collectionIds: string[];
  /** Materials and details the scorer found, used for tags. */
  matchedTerms: string[];
}

export interface DraftPayload {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  /** Always DRAFT. */
  status: 'DRAFT';
  tags: string[];
  priceDollars: number;
  /** SKUs following our own scheme, one per size or colour. */
  skus: string[];
  collectionIds: string[];
}

/** Title-cases a term for a tag: "wide leg" → "Wide Leg". */
function toTag(term: string): string {
  return term
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Builds the SKUs for a draft, following the `TRD-<productId>-<suffix>`
 * scheme the shop already uses.
 *
 * Sizes win over colours when both exist, because that is what the existing
 * catalogue does: `TRD-392458-S` for a sized garment, `TRD-389533-BLACK` for
 * an accessory that comes in one size.
 */
export function buildSkus(trendsiProductId: string, sizes: string[], colors: string[]): string[] {
  const suffixes =
    sizes.length > 0
      ? sizes
      : colors.length > 0
        ? colors
        : // Neither: a single SKU with no suffix would break the pattern the
          // matcher relies on, so it gets a plain ONE marker instead.
          ['ONE'];

  return suffixes.map(
    (suffix) => `TRD-${trendsiProductId}-${suffix.toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
  );
}

/**
 * Writes the product description.
 *
 * Deliberately built from what is actually known — fabric, silhouette, where it
 * ships from — rather than from generated prose. A description that invents
 * details about a garment nobody has seen is a description that will eventually
 * be wrong in a way a customer notices.
 */
export function buildDescription(input: DraftInput): string {
  const paragraphs: string[] = [];

  if (input.description && input.description.trim() !== '') {
    // The supplier's own copy, kept as the starting point. It is about the
    // real garment, which is more than can be said for anything invented here.
    paragraphs.push(`<p>${escapeHtml(input.description.trim())}</p>`);
  }

  const details: string[] = [];
  if (input.matchedTerms.length > 0) {
    details.push(input.matchedTerms.map(toTag).join(' · '));
  }
  if (input.sizes.length > 0) {
    details.push(`Tallas: ${input.sizes.join(', ')}`);
  }
  if (input.colors.length > 0) {
    details.push(`Colores: ${input.colors.join(', ')}`);
  }
  details.push(
    input.shipFrom === 'USA'
      ? 'Enviado desde Estados Unidos'
      : 'Enviado desde el extranjero, 8–15 días',
  );

  paragraphs.push(`<ul>${details.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);

  // A visible reminder that a human has not written this yet. Removing it is
  // part of finishing the product, and its presence in the shop admin is the
  // signal that the draft is still a draft.
  paragraphs.push(
    '<p><em>Borrador creado por Norvik Sourcing Studio. Revisa el texto antes de publicar.</em></p>',
  );

  return paragraphs.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDraft(input: DraftInput): DraftPayload {
  const tags = [
    'Trendsi',
    ...(input.section ? [input.section.label] : []),
    ...input.matchedTerms.map(toTag),
    input.shipFrom === 'USA' ? 'Ship From USA' : 'Ship From Overseas',
  ];

  return {
    title: input.title,
    descriptionHtml: buildDescription(input),
    vendor: 'Trendsi',
    productType: input.section?.label ?? '',
    status: 'DRAFT',
    // Deduplicated and stable, so re-creating a draft produces the same tags.
    tags: [...new Set(tags)].sort(),
    priceDollars: centsToDollars(input.suggestedRetailCents),
    skus: buildSkus(input.trendsiProductId, input.sizes, input.colors),
    collectionIds: input.collectionIds,
  };
}
