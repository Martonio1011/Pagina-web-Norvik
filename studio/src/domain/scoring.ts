import { z } from 'zod';

/**
 * The Brand Fit Score.
 *
 * This is the module that decides whether a garment is Norvik, and it is the
 * one place in the app where a subjective judgement about a brand becomes a
 * number you can sort a list by. Two rules govern how it is built:
 *
 * 1. **Every point is traceable.** The result is not a number with a
 *    justification attached afterwards — the number *is* the sum of the
 *    components, each of which names the term that fired, where it was found
 *    and what it was worth. The detail screen renders that list directly. If a
 *    score cannot be explained, it is a bug.
 *
 * 2. **Exclusions are not penalties.** Childrenswear does not score badly; it
 *    is not scored at all. A product can have a wonderful margin and still be
 *    wrong for the shop, and the brief is explicit that brand fit outranks
 *    margin. So an excluded product returns `excluded: true` and no score,
 *    rather than a low number that a generous sort might still float to the
 *    top.
 *
 * The weights and every term live in `config/brand-rules.yaml`, versioned and
 * editable without touching this file.
 */

// ---------------------------------------------------------------------------
// The shape of config/brand-rules.yaml
// ---------------------------------------------------------------------------

const termGroupSchema = z.object({
  pointsPerPositive: z.number().positive(),
  pointsPerNegative: z.number().positive(),
  positive: z.array(z.string()).default([]),
  negative: z.array(z.string()).default([]),
});

const exclusionSchema = z.object({
  terms: z.array(z.string()).min(1),
  reason: z.string().min(1),
});

const priceFitSchema = z.object({
  withinBandAndMargin: z.number(),
  withinBandBelowMargin: z.number(),
  outsideBandAcceptableMargin: z.number(),
  neither: z.number(),
  unknown: z.number(),
});

export const brandRulesSchema = z
  .object({
    weights: z.object({
      materials: z.number().nonnegative(),
      silhouette: z.number().nonnegative(),
      color: z.number().nonnegative(),
      priceFit: z.number().nonnegative(),
      vocabulary: z.number().nonnegative(),
    }),
    exclusions: z.array(exclusionSchema).default([]),
    materials: termGroupSchema,
    silhouette: termGroupSchema,
    color: termGroupSchema,
    vocabulary: termGroupSchema,
    priceFit: priceFitSchema,
  })
  .superRefine((rules, ctx) => {
    const total = Object.values(rules.weights).reduce((sum, weight) => sum + weight, 0);
    if (total !== 100) {
      ctx.addIssue({
        code: 'custom',
        message: `the five weights must add up to 100, they currently add up to ${total}`,
        path: ['weights'],
      });
    }
  });

export type BrandRules = z.infer<typeof brandRulesSchema>;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type ScoreGroup = 'MATERIALS' | 'SILHOUETTE' | 'COLOR' | 'PRICE_FIT' | 'VOCABULARY';

/** One thing that moved the score, and why. */
export interface ScoreComponent {
  group: ScoreGroup;
  /** The term that fired, or a description for price fit. */
  label: string;
  points: number;
  /** Where it was found, written for a human to read. */
  evidence: string;
}

export interface GroupResult {
  group: ScoreGroup;
  /** Points before the group ceiling is applied. */
  rawPoints: number;
  /** What actually counted, after clamping to 0..weight. */
  points: number;
  weight: number;
  components: ScoreComponent[];
}

export interface ScoreBreakdown {
  /** 0..100. Null when the product is excluded. */
  total: number | null;
  excluded: boolean;
  exclusionReason: string | null;
  /** The term that triggered the exclusion, so the decision is checkable. */
  exclusionTerm: string | null;
  groups: GroupResult[];
  /** Every component across every group, in the order they were found. */
  components: ScoreComponent[];
}

/** How the price side of the score is decided. Comes from the economics module. */
export interface PriceFitInput {
  withinBand: boolean;
  meetsTargetMargin: boolean;
  meetsMinimumMargin: boolean;
  /** Shown in the evidence line so the number is checkable. */
  suggestedRetailLabel?: string;
  sectionLabel?: string;
}

export interface ScoreInput {
  title: string;
  description?: string | null;
  productType?: string | null;
  /** Trendsi's own category breadcrumbs, when we have them. */
  categories?: string[];
  /** Colour names from the variants. */
  colors?: string[];
  /** Null when the product could not be placed in a section. */
  priceFit?: PriceFitInput | null;
}

// ---------------------------------------------------------------------------
// Text handling
// ---------------------------------------------------------------------------

/**
 * Normalises text for term matching: lowercase, accents stripped, punctuation
 * turned into spaces, whitespace collapsed.
 *
 * Punctuation becomes a space rather than nothing so that "wide-leg" and
 * "wide leg" are the same thing — Trendsi writes it both ways.
 */
export function normaliseForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Whether a term appears in the text as a whole word or phrase.
 *
 * Substring matching would be a disaster here: "sage" is inside "message",
 * "knit" is inside "unknitted", and a scorer that rewards a dress for the word
 * "message" is worse than no scorer. Both sides are normalised and padded with
 * spaces so only whole-word boundaries can match.
 */
export function containsTerm(haystack: string, term: string): boolean {
  const normalisedTerm = normaliseForMatching(term);
  if (normalisedTerm === '') return false;
  return ` ${haystack} `.includes(` ${normalisedTerm} `);
}

/** Builds the text a product is matched against, and remembers where each part came from. */
interface SearchField {
  name: string;
  text: string;
}

function buildFields(input: ScoreInput): SearchField[] {
  const fields: SearchField[] = [{ name: 'título', text: normaliseForMatching(input.title) }];

  if (input.description) {
    fields.push({ name: 'descripción', text: normaliseForMatching(input.description) });
  }
  if (input.productType) {
    fields.push({ name: 'tipo', text: normaliseForMatching(input.productType) });
  }
  if (input.categories && input.categories.length > 0) {
    fields.push({ name: 'categoría', text: normaliseForMatching(input.categories.join(' ')) });
  }
  if (input.colors && input.colors.length > 0) {
    fields.push({ name: 'color', text: normaliseForMatching(input.colors.join(' ')) });
  }

  return fields;
}

/** Finds a term across the fields, returning the field it was found in. */
function findTerm(fields: SearchField[], term: string): string | null {
  for (const field of fields) {
    if (containsTerm(field.text, term)) return field.name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreTermGroup(
  group: ScoreGroup,
  config: z.infer<typeof termGroupSchema>,
  weight: number,
  fields: SearchField[],
): GroupResult {
  const components: ScoreComponent[] = [];
  let rawPoints = 0;

  for (const term of config.positive) {
    const field = findTerm(fields, term);
    if (!field) continue;
    rawPoints += config.pointsPerPositive;
    components.push({
      group,
      label: term,
      points: config.pointsPerPositive,
      evidence: `"${term}" aparece en ${field}`,
    });
  }

  for (const term of config.negative) {
    const field = findTerm(fields, term);
    if (!field) continue;
    rawPoints -= config.pointsPerNegative;
    components.push({
      group,
      label: term,
      points: -config.pointsPerNegative,
      evidence: `"${term}" aparece en ${field}`,
    });
  }

  // Clamped to the group's weight so no single group can eat another's share,
  // and floored at zero so a very off-brand product does not go negative and
  // start dragging the total below what an empty product would score.
  const points = Math.max(0, Math.min(rawPoints, weight));

  return { group, rawPoints, points, weight, components };
}

function scorePriceFit(
  config: BrandRules['priceFit'],
  weight: number,
  priceFit: PriceFitInput | null | undefined,
): GroupResult {
  const build = (points: number, label: string, evidence: string): GroupResult => ({
    group: 'PRICE_FIT',
    rawPoints: points,
    points: Math.max(0, Math.min(points, weight)),
    weight,
    components: [{ group: 'PRICE_FIT', label, points, evidence }],
  });

  if (!priceFit) {
    return build(
      config.unknown,
      'sin datos de precio',
      'Todavía no hay coste de proveedor, así que no se puede saber si el precio encaja',
    );
  }

  const where = priceFit.sectionLabel ? ` de ${priceFit.sectionLabel}` : '';
  const price = priceFit.suggestedRetailLabel ? ` (${priceFit.suggestedRetailLabel})` : '';

  if (priceFit.withinBand && priceFit.meetsTargetMargin) {
    return build(
      config.withinBandAndMargin,
      'precio y margen correctos',
      `El PVP sugerido${price} cae en la horquilla${where} y alcanza el margen objetivo`,
    );
  }
  if (priceFit.withinBand) {
    return build(
      config.withinBandBelowMargin,
      'precio correcto, margen justo',
      `El PVP sugerido${price} cae en la horquilla${where} pero no llega al margen objetivo`,
    );
  }
  if (priceFit.meetsMinimumMargin) {
    return build(
      config.outsideBandAcceptableMargin,
      'fuera de horquilla, margen aceptable',
      `El PVP sugerido${price} se sale de la horquilla${where}, aunque el margen sigue por encima del mínimo`,
    );
  }
  return build(
    config.neither,
    'ni horquilla ni margen',
    `El PVP sugerido${price} ni cae en la horquilla${where} ni alcanza el margen mínimo`,
  );
}

/** Checks the hard exclusions. Returns the first that fires, or null. */
export function findExclusion(
  rules: BrandRules,
  input: ScoreInput,
): { reason: string; term: string } | null {
  const fields = buildFields(input);

  for (const exclusion of rules.exclusions) {
    for (const term of exclusion.terms) {
      const field = findTerm(fields, term);
      if (field) return { reason: exclusion.reason, term };
    }
  }
  return null;
}

/**
 * Scores a product against the brand rules.
 *
 * Pure: same input, same output, no clock, no network, no database.
 */
export function scoreProduct(rules: BrandRules, input: ScoreInput): ScoreBreakdown {
  const exclusion = findExclusion(rules, input);
  if (exclusion) {
    return {
      total: null,
      excluded: true,
      exclusionReason: exclusion.reason,
      exclusionTerm: exclusion.term,
      groups: [],
      components: [],
    };
  }

  const fields = buildFields(input);

  const groups: GroupResult[] = [
    scoreTermGroup('MATERIALS', rules.materials, rules.weights.materials, fields),
    scoreTermGroup('SILHOUETTE', rules.silhouette, rules.weights.silhouette, fields),
    scoreTermGroup('COLOR', rules.color, rules.weights.color, fields),
    scorePriceFit(rules.priceFit, rules.weights.priceFit, input.priceFit),
    scoreTermGroup('VOCABULARY', rules.vocabulary, rules.weights.vocabulary, fields),
  ];

  const total = groups.reduce((sum, group) => sum + group.points, 0);

  return {
    total: Math.round(total),
    excluded: false,
    exclusionReason: null,
    exclusionTerm: null,
    groups,
    components: groups.flatMap((group) => group.components),
  };
}

/** A short human summary of a score, for lists where the full breakdown will not fit. */
export function summariseScore(breakdown: ScoreBreakdown): string {
  if (breakdown.excluded) return `Descartado: ${breakdown.exclusionReason}`;

  const wins = breakdown.components
    .filter((component) => component.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((component) => component.label);

  if (wins.length === 0) return 'Nada en la ficha encaja con la marca';
  return wins.join(', ');
}
