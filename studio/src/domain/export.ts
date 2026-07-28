import { centsToDollars } from './money';

/**
 * The buying list, as rows.
 *
 * Kept separate from the spreadsheet writer so the shape of the export is
 * decided by a pure function that a test can assert on, rather than being
 * buried inside a library call.
 */

export interface ExportRow {
  producto: string;
  seccion: string;
  score: number | null;
  veredicto: string;
  colores: string;
  tallas: string;
  stock: number;
  costeDropship: number | null;
  costeConEnvio: number | null;
  pvpSugerido: number | null;
  margenBruto: number | null;
  margenBrutoPct: number | null;
  margenNeto: number | null;
  margenNetoPct: number | null;
  envioDesde: string;
  enlaceTrendsi: string;
  yaEnTienda: string;
}

export interface ExportableCandidate {
  title: string;
  sectionLabel: string | null;
  score: number | null;
  verdictReason: string;
  colors: string[];
  sizes: string[];
  stock: number;
  dropshipCents: number;
  shipFrom: string;
  detailUrl: string;
  alreadyInStore: boolean;
  economics: {
    landedCostCents: number;
    suggestedRetailCents: number;
    grossMarginCents: number;
    grossMarginPct: number;
    netMarginCents: number;
    netMarginPct: number;
  } | null;
}

const SHIP_FROM_LABEL: Record<string, string> = {
  USA: 'Estados Unidos',
  OVERSEAS: 'Extranjero',
  UNKNOWN: 'Sin determinar',
};

/**
 * Money is exported as dollars, not cents.
 *
 * The app works in integer cents everywhere to stay exact, but a spreadsheet
 * column reading 6799 where a price belongs is a column nobody can use. The
 * conversion happens here, at the edge, and nowhere else.
 */
export function toExportRow(candidate: ExportableCandidate): ExportRow {
  const economics = candidate.economics;

  return {
    producto: candidate.title,
    seccion: candidate.sectionLabel ?? 'Sin sección',
    score: candidate.score,
    veredicto: candidate.verdictReason,
    colores: candidate.colors.join(', '),
    tallas: candidate.sizes.join(', '),
    stock: candidate.stock,
    costeDropship: candidate.dropshipCents > 0 ? centsToDollars(candidate.dropshipCents) : null,
    costeConEnvio: economics ? centsToDollars(economics.landedCostCents) : null,
    pvpSugerido: economics ? centsToDollars(economics.suggestedRetailCents) : null,
    margenBruto: economics ? centsToDollars(economics.grossMarginCents) : null,
    margenBrutoPct: economics ? Number((economics.grossMarginPct * 100).toFixed(1)) : null,
    margenNeto: economics ? centsToDollars(economics.netMarginCents) : null,
    margenNetoPct: economics ? Number((economics.netMarginPct * 100).toFixed(1)) : null,
    envioDesde: SHIP_FROM_LABEL[candidate.shipFrom] ?? candidate.shipFrom,
    enlaceTrendsi: candidate.detailUrl,
    yaEnTienda: candidate.alreadyInStore ? 'Sí' : 'No',
  };
}

export const EXPORT_COLUMNS: { key: keyof ExportRow; header: string; width: number }[] = [
  { key: 'producto', header: 'Producto', width: 44 },
  { key: 'seccion', header: 'Sección', width: 20 },
  { key: 'score', header: 'Score', width: 8 },
  { key: 'veredicto', header: 'Por qué', width: 46 },
  { key: 'costeDropship', header: 'Coste Trendsi', width: 14 },
  { key: 'costeConEnvio', header: 'Coste + envío', width: 14 },
  { key: 'pvpSugerido', header: 'PVP sugerido', width: 14 },
  { key: 'margenBruto', header: 'Margen bruto', width: 14 },
  { key: 'margenBrutoPct', header: 'Bruto %', width: 10 },
  { key: 'margenNeto', header: 'Margen neto', width: 14 },
  { key: 'margenNetoPct', header: 'Neto %', width: 10 },
  { key: 'stock', header: 'Stock', width: 8 },
  { key: 'colores', header: 'Colores', width: 26 },
  { key: 'tallas', header: 'Tallas', width: 18 },
  { key: 'envioDesde', header: 'Envío desde', width: 16 },
  { key: 'yaEnTienda', header: 'Ya en tienda', width: 12 },
  { key: 'enlaceTrendsi', header: 'Enlace a Trendsi', width: 40 },
];

/** Escapes a value for CSV: quotes, commas and newlines all need handling. */
export function toCsvValue(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: ExportRow[]): string {
  const header = EXPORT_COLUMNS.map((column) => toCsvValue(column.header)).join(',');
  const body = rows.map((row) =>
    EXPORT_COLUMNS.map((column) => toCsvValue(row[column.key])).join(','),
  );
  // A byte order mark, written as an escape so it is visible in the source:
  // without it, Excel on Windows renders "Secci\u00f3n" as "Secci\u251c\u2502n".
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
}
