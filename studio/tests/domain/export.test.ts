import { describe, expect, it } from 'vitest';
import {
  EXPORT_COLUMNS,
  toCsv,
  toCsvValue,
  toExportRow,
  type ExportableCandidate,
} from '@/domain/export';

function candidate(overrides: Partial<ExportableCandidate> = {}): ExportableCandidate {
  return {
    title: 'Satin Halter Maxi Dress',
    sectionLabel: 'Maxi Dresses',
    score: 78,
    verdictReason: 'Encaja con la marca (78/100) y el margen llega al objetivo.',
    colors: ['Chocolate', 'Wine'],
    sizes: ['S', 'M', 'L'],
    stock: 40,
    dropshipCents: 1800,
    shipFrom: 'OVERSEAS',
    detailUrl: 'https://app.trendsi.com/products/detail?id=392458',
    alreadyInStore: false,
    economics: {
      landedCostCents: 2350,
      suggestedRetailCents: 6799,
      grossMarginCents: 4449,
      grossMarginPct: 0.6543,
      netMarginCents: 3843,
      netMarginPct: 0.5652,
    },
    ...overrides,
  };
}

describe('toExportRow', () => {
  /**
   * The app works in integer cents everywhere so the arithmetic stays exact.
   * A spreadsheet column reading 6799 where a price belongs is unusable, so
   * the conversion to dollars happens here, at the edge, and only here.
   */
  it('converts cents to dollars for the spreadsheet', () => {
    const row = toExportRow(candidate());

    expect(row.costeDropship).toBe(18);
    expect(row.costeConEnvio).toBe(23.5);
    expect(row.pvpSugerido).toBe(67.99);
    expect(row.margenBruto).toBe(44.49);
    expect(row.margenNeto).toBe(38.43);
  });

  it('rounds percentages to one decimal so the column stays readable', () => {
    const row = toExportRow(candidate());
    expect(row.margenBrutoPct).toBe(65.4);
    expect(row.margenNetoPct).toBe(56.5);
  });

  it('leaves money blank rather than writing zero when it could not be worked out', () => {
    const row = toExportRow(candidate({ economics: null, dropshipCents: 0 }));

    expect(row.pvpSugerido).toBeNull();
    expect(row.margenBruto).toBeNull();
    expect(row.costeDropship).toBeNull();
    // A zero here would read as "this product is free and earns nothing",
    // which is a very different claim from "we could not calculate it".
    expect(row.pvpSugerido).not.toBe(0);
  });

  it('carries the Trendsi link so the export is clickable', () => {
    expect(toExportRow(candidate()).enlaceTrendsi).toBe(
      'https://app.trendsi.com/products/detail?id=392458',
    );
  });

  it('translates the shipping origin into something readable', () => {
    expect(toExportRow(candidate({ shipFrom: 'USA' })).envioDesde).toBe('Estados Unidos');
    expect(toExportRow(candidate({ shipFrom: 'OVERSEAS' })).envioDesde).toBe('Extranjero');
    expect(toExportRow(candidate({ shipFrom: 'UNKNOWN' })).envioDesde).toBe('Sin determinar');
  });

  it('says plainly when a product is already stocked', () => {
    expect(toExportRow(candidate({ alreadyInStore: true })).yaEnTienda).toBe('Sí');
    expect(toExportRow(candidate({ alreadyInStore: false })).yaEnTienda).toBe('No');
  });
});

describe('CSV escaping', () => {
  it('quotes values containing commas, quotes or newlines', () => {
    expect(toCsvValue('Dress, Maxi')).toBe('"Dress, Maxi"');
    expect(toCsvValue('The "best" dress')).toBe('"The ""best"" dress"');
    expect(toCsvValue('Line one\nLine two')).toBe('"Line one\nLine two"');
  });

  it('leaves simple values alone', () => {
    expect(toCsvValue('Maxi Dresses')).toBe('Maxi Dresses');
    expect(toCsvValue(67.99)).toBe('67.99');
  });

  it('writes an empty cell for a missing value, not the word null', () => {
    expect(toCsvValue(null)).toBe('');
  });
});

describe('toCsv', () => {
  it('writes a header row followed by the data', () => {
    const csv = toCsv([toExportRow(candidate())]);
    const lines = csv.split('\r\n');

    expect(lines[0]).toContain('Producto');
    expect(lines[0]).toContain('PVP sugerido');
    expect(lines[1]).toContain('Satin Halter Maxi Dress');
    expect(lines[1]).toContain('67.99');
  });

  /** Without a BOM, Excel on Windows renders "Sección" as "Secci├│n". */
  it('starts with a byte order mark so Excel reads the accents', () => {
    expect(toCsv([])).toMatch(/^\uFEFF/);
  });

  it('escapes a product title containing a comma without breaking the columns', () => {
    const csv = toCsv([toExportRow(candidate({ title: 'Dress, Long, Satin' }))]);
    const dataLine = csv.split('\r\n')[1] ?? '';

    expect(dataLine).toContain('"Dress, Long, Satin"');
    // The escaped title must not add columns to the row.
    const columnCount = (dataLine.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g) ?? []).length + 1;
    expect(columnCount).toBe(EXPORT_COLUMNS.length);
  });

  it('produces a header-only file when there is nothing approved yet', () => {
    const csv = toCsv([]);
    expect(csv.split('\r\n').filter((line) => line !== '')).toHaveLength(1);
  });
});
