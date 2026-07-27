import { bandPosition, classifySection, type Section } from './sections';
import { formatCents } from './money';

/**
 * Auditing the catalogue that already exists.
 *
 * This is the part of the app that earns its keep before a single Trendsi page
 * has been read: it looks at what is on the shelf today and says what is
 * wrong with it. Pure functions over plain data, so every finding is
 * reproducible and testable.
 */

export interface AuditableProduct {
  id: string;
  title: string;
  /** ACTIVE | DRAFT | ARCHIVED */
  status: string;
  productType: string;
  tags: string[];
  /** Cheapest and dearest variant. Equal for a single-price product. */
  minPriceCents: number;
  maxPriceCents: number;
  totalInventory: number;
  collectionHandles: string[];
}

export type FindingKind =
  'PRICE_ABOVE_BAND' | 'PRICE_BELOW_BAND' | 'NO_SECTION' | 'ACTIVE_WITHOUT_STOCK' | 'NO_COLLECTION';

export type FindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CatalogFinding {
  kind: FindingKind;
  severity: FindingSeverity;
  productId: string;
  productTitle: string;
  sectionKey: string | null;
  /** Written to be shown to a human as-is. */
  message: string;
  /** The numbers behind the message, for the detail view. */
  evidence: Record<string, string | number>;
}

/**
 * Checks one product against the section rules.
 *
 * Note what this deliberately does not do: it never invents a section for a
 * product it cannot classify. An unclassifiable product is itself a finding,
 * because a product in no section is a product no customer will browse to.
 */
export function auditProduct(product: AuditableProduct, sections: Section[]): CatalogFinding[] {
  const findings: CatalogFinding[] = [];
  const { section } = classifySection(sections, {
    title: product.title,
    productType: product.productType,
    tags: product.tags,
  });

  if (!section) {
    findings.push({
      kind: 'NO_SECTION',
      severity: 'INFO',
      productId: product.id,
      productTitle: product.title,
      sectionKey: null,
      message: `No encaja en ninguna sección, así que no hay horquilla contra la que comparar su precio.`,
      evidence: { tipo: product.productType, etiquetas: product.tags.join(', ') },
    });
  } else {
    // The dearest variant is what decides the band: if the top of the range
    // is above the ceiling, the product reads as too expensive on the grid.
    const position = bandPosition(product.maxPriceCents, section);

    if (position === 'ABOVE') {
      findings.push({
        kind: 'PRICE_ABOVE_BAND',
        severity: 'WARNING',
        productId: product.id,
        productTitle: product.title,
        sectionKey: section.key,
        message:
          `A ${formatCents(product.maxPriceCents)}, por encima del techo de ${section.label}, ` +
          `que está en ${formatCents(section.priceBandCents.max)}.`,
        evidence: {
          precio: formatCents(product.maxPriceCents),
          techo: formatCents(section.priceBandCents.max),
          'se pasa por': formatCents(product.maxPriceCents - section.priceBandCents.max),
        },
      });
    } else if (bandPosition(product.minPriceCents, section) === 'BELOW') {
      findings.push({
        kind: 'PRICE_BELOW_BAND',
        severity: 'INFO',
        productId: product.id,
        productTitle: product.title,
        sectionKey: section.key,
        message:
          `A ${formatCents(product.minPriceCents)}, por debajo del suelo de ${section.label}, ` +
          `que está en ${formatCents(section.priceBandCents.min)}. Probablemente estés dejando margen sobre la mesa.`,
        evidence: {
          precio: formatCents(product.minPriceCents),
          suelo: formatCents(section.priceBandCents.min),
          'le falta': formatCents(section.priceBandCents.min - product.minPriceCents),
        },
      });
    }
  }

  if (product.status === 'ACTIVE' && product.totalInventory <= 0) {
    findings.push({
      kind: 'ACTIVE_WITHOUT_STOCK',
      severity: 'CRITICAL',
      productId: product.id,
      productTitle: product.title,
      sectionKey: section?.key ?? null,
      message: `Publicado en la tienda sin stock registrado.`,
      evidence: { inventario: product.totalInventory },
    });
  }

  if (product.status === 'ACTIVE' && product.collectionHandles.length === 0) {
    findings.push({
      kind: 'NO_COLLECTION',
      severity: 'WARNING',
      productId: product.id,
      productTitle: product.title,
      sectionKey: section?.key ?? null,
      message: `Publicado pero fuera de toda colección, así que nada de la web enlaza a él.`,
      evidence: {},
    });
  }

  return findings;
}

export function auditCatalog(products: AuditableProduct[], sections: Section[]): CatalogFinding[] {
  const severityOrder: Record<FindingSeverity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  return products
    .flatMap((product) => auditProduct(product, sections))
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export interface SectionCoverage {
  sectionKey: string;
  label: string;
  /** Products whose Shopify collections place them in this section. */
  productCount: number;
  activeCount: number;
  priceBandCents: { min: number; max: number };
  /** Collection handles configured for the section that the store does not have. */
  missingCollections: string[];
  /**
   * False when the section names no Shopify collection at all — which is a
   * different problem from naming one that is missing, and needs a different
   * answer: create the collection, then point the section at it.
   */
  hasConfiguredCollections: boolean;
}

/**
 * How full each section is.
 *
 * A section with two products is a gap in the catalogue, and gaps are the whole
 * reason for sourcing — so this count has to be right.
 *
 * Counting is done through the classifier, not through Shopify collections.
 * Collections cannot answer the question: Maxi Dresses and Mini & Midi Dresses
 * both live in the single `dresses` collection, so counting by collection
 * reports the same three products under both headings and makes each section
 * look twice as full as it is. The classifier puts every product in exactly
 * one section, so the numbers add up to the catalogue.
 */
export function sectionCoverage(
  products: AuditableProduct[],
  sections: Section[],
  existingCollectionHandles: string[],
): SectionCoverage[] {
  const existing = new Set(existingCollectionHandles);
  const bySection = new Map<string, AuditableProduct[]>();

  for (const product of products) {
    const { section } = classifySection(sections, {
      title: product.title,
      productType: product.productType,
      tags: product.tags,
    });
    if (!section) continue;

    const bucket = bySection.get(section.key);
    if (bucket) bucket.push(product);
    else bySection.set(section.key, [product]);
  }

  return sections.map((section) => {
    const inSection = bySection.get(section.key) ?? [];

    return {
      sectionKey: section.key,
      label: section.label,
      productCount: inSection.length,
      activeCount: inSection.filter((product) => product.status === 'ACTIVE').length,
      priceBandCents: section.priceBandCents,
      missingCollections: section.collections.filter((handle) => !existing.has(handle)),
      hasConfiguredCollections: section.collections.length > 0,
    };
  });
}
