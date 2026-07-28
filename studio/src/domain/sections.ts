import { z } from 'zod';
import { dollarsToCents } from './money';

/**
 * Store sections: their price bands, margin targets, and how a supplier
 * product gets assigned to one.
 *
 * The rules themselves live in `config/sections.yaml`. This module only knows
 * how to validate that file and how to apply it. Adjusting a price band is
 * therefore an edit to a config file, not a code change.
 */

const priceBandSchema = z.object({
  min: z.number().positive(),
  max: z.number().positive(),
});

const matchRulesSchema = z.object({
  productTypes: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  /**
   * When present, at least one of these must also appear. Used by Linen Sets,
   * where "set" alone is far too broad to be a useful signal.
   */
  requireAny: z.array(z.string()).default([]),
});

const sectionSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/, 'section keys are lowercase and hyphenated'),
  label: z.string().min(1),
  priceBand: priceBandSchema,
  targetMargin: z.number().min(0).max(0.95).optional(),
  collections: z.array(z.string()).default([]),
  match: matchRulesSchema,
  /**
   * Starting search terms. Copied into the database the first time the saved
   * searches are created; after that the database is the live copy and this
   * list is only the starting point.
   */
  seedTerms: z.array(z.string()).default([]),
});

export const sectionsConfigSchema = z
  .object({
    defaults: z.object({
      targetMargin: z.number().min(0).max(0.95),
      minAcceptableMarginPct: z.number().min(0).max(0.95),
    }),
    sections: z.array(sectionSchema).min(1),
  })
  .superRefine((config, ctx) => {
    for (const section of config.sections) {
      if (section.priceBand.min >= section.priceBand.max) {
        ctx.addIssue({
          code: 'custom',
          message: `section "${section.key}": priceBand.min must be below priceBand.max`,
          path: ['sections'],
        });
      }
    }
    const keys = config.sections.map((s) => s.key);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `duplicate section keys: ${[...new Set(duplicates)].join(', ')}`,
        path: ['sections'],
      });
    }
  });

export type SectionsConfigInput = z.infer<typeof sectionsConfigSchema>;

/** A section with its defaults resolved and its money converted to cents. */
export interface Section {
  key: string;
  label: string;
  priceBandCents: { min: number; max: number };
  targetMargin: number;
  minAcceptableMarginPct: number;
  collections: string[];
  match: z.infer<typeof matchRulesSchema>;
  seedTerms: string[];
}

export function resolveSections(config: SectionsConfigInput): Section[] {
  return config.sections.map((section) => ({
    key: section.key,
    label: section.label,
    priceBandCents: {
      min: dollarsToCents(section.priceBand.min),
      max: dollarsToCents(section.priceBand.max),
    },
    targetMargin: section.targetMargin ?? config.defaults.targetMargin,
    minAcceptableMarginPct: config.defaults.minAcceptableMarginPct,
    collections: section.collections,
    match: section.match,
    seedTerms: section.seedTerms,
  }));
}

export function findSection(sections: Section[], key: string): Section | undefined {
  return sections.find((section) => section.key === key);
}

/** Lowercases and collapses whitespace so keyword tests are predictable. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

export interface ClassifiableProduct {
  title: string;
  productType?: string | null;
  tags?: string[];
  categories?: string[];
}

export interface SectionAssignment {
  section: Section | null;
  /** Which rule fired, so the UI can explain an assignment that looks odd. */
  reason: string;
}

/**
 * Assigns a product to a section.
 *
 * Sections are tried in the order they appear in the config file and the first
 * match wins, which is why `config/sections.yaml` lists the narrow sections
 * (accessories, jumpsuits) before the broad ones (dresses, resort wear).
 *
 * Returns a null section rather than guessing when nothing matches. An
 * unassigned product is a visible state in the UI, not a silent default.
 */
export function classifySection(
  sections: Section[],
  product: ClassifiableProduct,
): SectionAssignment {
  const haystack = normalise(
    [
      product.title,
      product.productType ?? '',
      ...(product.tags ?? []),
      ...(product.categories ?? []),
    ].join(' | '),
  );
  const productType = normalise(product.productType ?? '');

  for (const section of sections) {
    const typeHit = section.match.productTypes.find((type) => productType === normalise(type));
    const keywordHit = section.match.keywords.find((keyword) =>
      haystack.includes(normalise(keyword)),
    );

    if (!typeHit && !keywordHit) continue;

    if (section.match.requireAny.length > 0) {
      const supportHit = section.match.requireAny.find((term) =>
        haystack.includes(normalise(term)),
      );
      if (!supportHit) continue;
      return {
        section,
        reason: `matched "${keywordHit ?? typeHit}" supported by "${supportHit}"`,
      };
    }

    // A product type match is a stronger signal than a word in the title, so
    // it is what gets reported when both fire.
    return {
      section,
      reason: typeHit ? `product type "${typeHit}"` : `keyword "${keywordHit}"`,
    };
  }

  return { section: null, reason: 'no section rule matched' };
}

/** Where a retail price sits relative to a section's band. */
export type BandPosition = 'BELOW' | 'WITHIN' | 'ABOVE';

export function bandPosition(priceCents: number, section: Section): BandPosition {
  if (priceCents < section.priceBandCents.min) return 'BELOW';
  if (priceCents > section.priceBandCents.max) return 'ABOVE';
  return 'WITHIN';
}
