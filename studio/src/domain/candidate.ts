import { computeEconomics, EconomicsInputError, type Economics } from './economics';
import { classifySection, findSection, type Section } from './sections';
import { scoreProduct, type BrandRules, type ScoreBreakdown } from './scoring';
import { formatCents } from './money';
import type { ShipFrom } from './types';

/**
 * Turning a supplier product into a decision.
 *
 * This module is where the separate pieces meet: which section a garment
 * belongs to, what it would really cost and earn, how well it fits the brand,
 * and whether the shop already sells it. It is deliberately the only place
 * that knows the order those questions must be asked in — the section decides
 * the price band, the price band decides the economics, and the economics feed
 * one fifth of the brand score.
 *
 * Pure. No database, no network, no clock.
 */

/** Everything known about a Trendsi product, flattened from its variants. */
export interface TrendsiProductFacts {
  productId: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  /** Manufacturer suggested retail, when the detail page carried one. */
  msrpCents?: number | null;
  shipFrom: ShipFrom;
  categories: string[];
  colors: string[];
  sizes: string[];
  /**
   * The cheapest dropship price across the variants. The cheapest is the
   * honest basis for a margin: it is what we would actually pay if we only
   * stocked the cheapest size, and it never flatters the result.
   */
  minDropshipCents: number;
  totalStock: number;
  imageUrl?: string | null;
  detailUrl: string;
}

export interface EvaluationSettings {
  shippingCents: number;
  paymentFeeRate: number;
  returnRate: number;
}

/** A product we already sell that this candidate appears to duplicate. */
export interface DuplicateHint {
  shopifyProductId: string;
  title: string;
  /** How the link was established, from the matching module. */
  method: string;
  confidence: number;
  needsConfirmation: boolean;
}

/**
 * What the app recommends, before a human decides.
 *
 * Never an instruction: the decision queue shows this as a starting position,
 * and the whole point of the queue is that a person overrules it when they
 * disagree.
 */
export type Verdict =
  /** Hard exclusion fired. Not shown as a candidate at all. */
  | 'EXCLUDED'
  /** Already in the shop. Nothing to source. */
  | 'ALREADY_STOCKED'
  /** Scores well and the money works. */
  | 'PROMISING'
  /** Worth a look, but something is off. */
  | 'REVIEW'
  /** Scores badly, or the economics do not stand up. */
  | 'WEAK';

export interface CandidateEvaluation {
  trendsiProductId: string;
  section: Section | null;
  /** Why that section, or why none. Shown in the UI. */
  sectionReason: string;
  score: ScoreBreakdown;
  economics: Economics | null;
  /**
   * Set when the economics could not be worked out, with the reason. Never
   * silently zero: a product whose cost failed to parse is a product we must
   * not price.
   */
  economicsError: string | null;
  duplicates: DuplicateHint[];
  alreadyInStore: boolean;
  verdict: Verdict;
  /** One line explaining the verdict, written to be shown as-is. */
  verdictReason: string;
}

export interface EvaluateInput {
  facts: TrendsiProductFacts;
  sections: Section[];
  rules: BrandRules;
  settings: EvaluationSettings;
  duplicates?: DuplicateHint[];
  /** Overrides the classifier when a human has already filed the product. */
  forcedSectionKey?: string | null;
}

/** The score below which a candidate is not worth a catalogue slot. */
export const PROMISING_SCORE = 65;
export const WEAK_SCORE = 40;

export function evaluateCandidate(input: EvaluateInput): CandidateEvaluation {
  const { facts, sections, rules, settings } = input;
  const duplicates = input.duplicates ?? [];
  const alreadyInStore = duplicates.some((duplicate) => !duplicate.needsConfirmation);

  // 1. Which section. Everything downstream depends on it, because the price
  //    band and the margin target live on the section.
  const forced = input.forcedSectionKey ? findSection(sections, input.forcedSectionKey) : undefined;
  const assignment = forced
    ? { section: forced, reason: 'asignada a mano' }
    : classifySection(sections, {
        title: facts.title,
        productType: facts.categories[0] ?? null,
        categories: facts.categories,
      });

  // 2. What it costs and earns. Needs a section for the band, and a cost that
  //    makes sense.
  let economics: Economics | null = null;
  let economicsError: string | null = null;

  if (!assignment.section) {
    economicsError = 'Sin sección asignada, no hay horquilla contra la que calcular el precio.';
  } else {
    try {
      economics = computeEconomics({
        dropshipCents: facts.minDropshipCents,
        shippingCents: settings.shippingCents,
        msrpCents: facts.msrpCents ?? null,
        section: assignment.section,
        paymentFeeRate: settings.paymentFeeRate,
        returnRate: settings.returnRate,
      });
    } catch (error) {
      // A cost of zero means the parser failed, not that the product is free.
      // Recording the reason and refusing to price it is the only safe answer.
      economicsError =
        error instanceof EconomicsInputError
          ? `No se puede calcular el precio: ${error.message}`
          : `No se puede calcular el precio: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // 3. Brand fit, with the price side fed from the economics above.
  const score = scoreProduct(rules, {
    title: facts.title,
    description: facts.description ?? null,
    productType: facts.categories[0] ?? null,
    categories: facts.categories,
    colors: facts.colors,
    priceFit:
      economics && assignment.section
        ? {
            withinBand: economics.withinBand,
            meetsTargetMargin: economics.meetsTargetMargin,
            meetsMinimumMargin: economics.meetsMinimumMargin,
            suggestedRetailLabel: formatCents(economics.suggestedRetailCents),
            sectionLabel: assignment.section.label,
          }
        : null,
  });

  const { verdict, verdictReason } = decide({
    score,
    economics,
    economicsError,
    alreadyInStore,
    stock: facts.totalStock,
  });

  return {
    trendsiProductId: facts.productId,
    section: assignment.section,
    sectionReason: assignment.reason,
    score,
    economics,
    economicsError,
    duplicates,
    alreadyInStore,
    verdict,
    verdictReason,
  };
}

function decide(input: {
  score: ScoreBreakdown;
  economics: Economics | null;
  economicsError: string | null;
  alreadyInStore: boolean;
  stock: number;
}): { verdict: Verdict; verdictReason: string } {
  if (input.score.excluded) {
    return {
      verdict: 'EXCLUDED',
      verdictReason: `Descartado automáticamente: ${input.score.exclusionReason}.`,
    };
  }

  if (input.alreadyInStore) {
    return {
      verdict: 'ALREADY_STOCKED',
      verdictReason: 'Ya lo tienes en la tienda.',
    };
  }

  if (input.economicsError) {
    return { verdict: 'REVIEW', verdictReason: input.economicsError };
  }

  if (input.stock <= 0) {
    return {
      verdict: 'REVIEW',
      verdictReason: 'Sin stock en Trendsi ahora mismo, aunque encaje.',
    };
  }

  const total = input.score.total ?? 0;
  const economics = input.economics;

  if (economics && !economics.meetsMinimumMargin) {
    return {
      verdict: 'WEAK',
      verdictReason: `El margen se queda en el ${(economics.grossMarginPct * 100).toFixed(0)}%, por debajo del mínimo aceptable.`,
    };
  }

  if (total >= PROMISING_SCORE && economics?.meetsTargetMargin === true) {
    return {
      verdict: 'PROMISING',
      verdictReason: `Encaja con la marca (${total}/100) y el margen llega al objetivo.`,
    };
  }

  if (total < WEAK_SCORE) {
    return {
      verdict: 'WEAK',
      verdictReason: `Encaja poco con la marca (${total}/100).`,
    };
  }

  return {
    verdict: 'REVIEW',
    verdictReason:
      total >= PROMISING_SCORE
        ? `Encaja bien (${total}/100) pero no alcanza el margen objetivo.`
        : `Encaja a medias (${total}/100). Míralo tú.`,
  };
}

/**
 * Sorts candidates for the decision queue.
 *
 * Brand fit first, margin second — the brief is explicit that fit outranks
 * margin, and a queue sorted by money would quietly invert that every day.
 * Excluded and already-stocked products sink to the bottom rather than being
 * removed, so nothing disappears without being accounted for.
 */
export function rankCandidates(candidates: CandidateEvaluation[]): CandidateEvaluation[] {
  const verdictRank: Record<Verdict, number> = {
    PROMISING: 0,
    REVIEW: 1,
    WEAK: 2,
    ALREADY_STOCKED: 3,
    EXCLUDED: 4,
  };

  return [...candidates].sort((a, b) => {
    const byVerdict = verdictRank[a.verdict] - verdictRank[b.verdict];
    if (byVerdict !== 0) return byVerdict;

    const scoreDelta = (b.score.total ?? -1) - (a.score.total ?? -1);
    if (scoreDelta !== 0) return scoreDelta;

    return (b.economics?.netMarginCents ?? 0) - (a.economics?.netMarginCents ?? 0);
  });
}
