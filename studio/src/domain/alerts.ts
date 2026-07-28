import { formatCents, formatPercent } from './money';
import type { AlertSeverity, AlertType } from './types';

/**
 * Working out what deserves the shop owner's attention.
 *
 * Pure functions over observations. The rule they all obey: an alert is only
 * raised when something *changed* or is *actionable*, never merely because a
 * number exists. A list that fills up with things you cannot act on is a list
 * nobody reads, and then the one alert that mattered goes unread too.
 *
 * Every alert carries a `dedupeKey` so the same condition seen on ten
 * consecutive runs is one row, not ten.
 */

export interface RaisedAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  body: string;
  entityType: 'SHOPIFY_PRODUCT' | 'TRENDSI_PRODUCT' | 'CANDIDATE' | 'COMPETITOR_STORE' | 'SYSTEM';
  entityId: string | null;
  /** The numbers behind the alert, so the UI can show the evidence. */
  data: Record<string, string | number>;
  dedupeKey: string;
}

// ---------------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------------

export interface StockObservation {
  trendsiProductId: string;
  title: string;
  /** Total stock across every variant, as Trendsi reports it now. */
  currentStock: number;
  /** True when this product is one we actually sell. */
  soldByUs: boolean;
  /** Our Shopify product, when we sell it. */
  shopifyProductId?: string | null;
  /** Whether our listing is live right now. */
  liveOnStorefront: boolean;
}

/**
 * A supplier stockout on something we are actively selling.
 *
 * Deliberately narrow: a product going out of stock at Trendsi matters when it
 * is on our storefront taking orders we cannot fulfil. The same event on a
 * product we do not sell is not news.
 */
export function stockoutAlerts(observations: StockObservation[]): RaisedAlert[] {
  return observations
    .filter((observation) => observation.soldByUs && observation.currentStock <= 0)
    .map((observation) => ({
      type: 'STOCKOUT' as const,
      severity: observation.liveOnStorefront ? ('CRITICAL' as const) : ('WARNING' as const),
      title: `Sin stock en Trendsi: ${observation.title}`,
      body: observation.liveOnStorefront
        ? 'Lo tienes publicado y aceptando pedidos, pero Trendsi se ha quedado sin existencias. Conviene despublicarlo hasta que reponga.'
        : 'Trendsi se ha quedado sin existencias. Tu ficha no está publicada, así que no corre prisa.',
      entityType: 'TRENDSI_PRODUCT' as const,
      entityId: observation.trendsiProductId,
      data: {
        stock: observation.currentStock,
        publicado: observation.liveOnStorefront ? 'Sí' : 'No',
      },
      dedupeKey: `STOCKOUT:${observation.trendsiProductId}`,
    }));
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export interface CostObservation {
  trendsiProductId: string;
  title: string;
  previousCostCents: number;
  currentCostCents: number;
  soldByUs: boolean;
  /** What we charge, when we sell it — so the alert can say what it does to the margin. */
  ourRetailCents?: number | null;
}

/**
 * A supplier raising its price by more than the configured threshold.
 *
 * Only increases. A cost going down is good news that needs no action, and
 * putting it in the same list as the problems would dilute the list.
 */
export function costIncreaseAlerts(
  observations: CostObservation[],
  thresholdFraction: number,
): RaisedAlert[] {
  return observations.flatMap((observation) => {
    if (observation.previousCostCents <= 0) return [];

    const delta = observation.currentCostCents - observation.previousCostCents;
    if (delta <= 0) return [];

    const increase = delta / observation.previousCostCents;
    if (increase < thresholdFraction) return [];

    const marginNote =
      observation.soldByUs && observation.ourRetailCents && observation.ourRetailCents > 0
        ? ` Tu margen bruto pasa del ${formatPercent(
            (observation.ourRetailCents - observation.previousCostCents) / observation.ourRetailCents,
            0,
          )} al ${formatPercent(
            (observation.ourRetailCents - observation.currentCostCents) / observation.ourRetailCents,
            0,
          )}.`
        : '';

    return [
      {
        type: 'COST_INCREASE' as const,
        severity: (increase >= thresholdFraction * 2 ? 'CRITICAL' : 'WARNING') as AlertSeverity,
        title: `Trendsi ha subido el precio: ${observation.title}`,
        body:
          `De ${formatCents(observation.previousCostCents)} a ${formatCents(observation.currentCostCents)}, ` +
          `un ${formatPercent(increase, 0)} más.${marginNote}`,
        entityType: 'TRENDSI_PRODUCT' as const,
        entityId: observation.trendsiProductId,
        data: {
          antes: formatCents(observation.previousCostCents),
          ahora: formatCents(observation.currentCostCents),
          subida: formatPercent(increase, 1),
        },
        // The new cost is part of the key so a second rise raises a second
        // alert, rather than being hidden by the first one still being open.
        dedupeKey: `COST_INCREASE:${observation.trendsiProductId}:${observation.currentCostCents}`,
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Our own pricing
// ---------------------------------------------------------------------------

export interface MarginObservation {
  shopifyProductId: string;
  title: string;
  retailCents: number;
  landedCostCents: number;
  grossMarginPct: number;
  targetMarginPct: number;
  minimumMarginPct: number;
  sectionLabel: string;
  withinBand: boolean;
  bandMinCents: number;
  bandMaxCents: number;
}

/** Products of ours whose margin has fallen below the floor we set. */
export function marginAlerts(observations: MarginObservation[]): RaisedAlert[] {
  return observations
    .filter((observation) => observation.grossMarginPct < observation.minimumMarginPct)
    .map((observation) => ({
      type: 'MARGIN_BELOW_TARGET' as const,
      severity: 'WARNING' as const,
      title: `Margen bajo: ${observation.title}`,
      body:
        `Lo vendes a ${formatCents(observation.retailCents)} y te cuesta ${formatCents(observation.landedCostCents)}, ` +
        `así que el margen bruto se queda en ${formatPercent(observation.grossMarginPct, 0)}, por debajo del mínimo de ` +
        `${formatPercent(observation.minimumMarginPct, 0)}.`,
      entityType: 'SHOPIFY_PRODUCT' as const,
      entityId: observation.shopifyProductId,
      data: {
        precio: formatCents(observation.retailCents),
        coste: formatCents(observation.landedCostCents),
        margen: formatPercent(observation.grossMarginPct, 1),
        mínimo: formatPercent(observation.minimumMarginPct, 0),
      },
      dedupeKey: `MARGIN_BELOW_TARGET:${observation.shopifyProductId}`,
    }));
}

/** Products of ours priced outside the band their section is meant to occupy. */
export function priceBandAlerts(observations: MarginObservation[]): RaisedAlert[] {
  return observations
    .filter((observation) => !observation.withinBand)
    .map((observation) => {
      const above = observation.retailCents > observation.bandMaxCents;
      return {
        type: 'PRICE_OUT_OF_BAND' as const,
        severity: 'INFO' as const,
        title: `Precio fuera de horquilla: ${observation.title}`,
        body: above
          ? `A ${formatCents(observation.retailCents)}, por encima del techo de ${observation.sectionLabel} (${formatCents(observation.bandMaxCents)}).`
          : `A ${formatCents(observation.retailCents)}, por debajo del suelo de ${observation.sectionLabel} (${formatCents(observation.bandMinCents)}).`,
        entityType: 'SHOPIFY_PRODUCT' as const,
        entityId: observation.shopifyProductId,
        data: {
          precio: formatCents(observation.retailCents),
          horquilla: `${formatCents(observation.bandMinCents)} – ${formatCents(observation.bandMaxCents)}`,
        },
        dedupeKey: `PRICE_OUT_OF_BAND:${observation.shopifyProductId}`,
      };
    });
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Which currently-open alerts no longer apply.
 *
 * An alert that has stopped being true has to close itself. Leaving resolved
 * problems on the list is how a list stops being trusted — and once it is not
 * trusted, it is not read.
 */
export function resolvedDedupeKeys(
  openDedupeKeys: string[],
  stillRaised: RaisedAlert[],
): string[] {
  const raised = new Set(stillRaised.map((alert) => alert.dedupeKey));
  return openDedupeKeys.filter((key) => {
    // A cost-increase key carries the cost that triggered it, so it never
    // "stops being true" on its own; those are closed by hand once actioned.
    if (key.startsWith('COST_INCREASE:')) return false;
    return !raised.has(key);
  });
}
