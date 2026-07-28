import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getApproved } from '@/server/candidates';
import { EXPORT_COLUMNS, toCsv, toExportRow, type ExportableCandidate } from '@/domain/export';

/**
 * Downloads the approved list as a spreadsheet.
 *
 * `?format=csv` for CSV, anything else gives XLSX. The Trendsi link is written
 * as a real hyperlink in the XLSX, so the buying list can be worked through by
 * clicking rather than by copying URLs out of cells.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const format = new URL(request.url).searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const approved = await getApproved();

  const rows = approved.map((entry) => {
    const exportable: ExportableCandidate = {
      title: entry.facts.title,
      sectionLabel: entry.evaluation.section?.label ?? null,
      score: entry.evaluation.score.total,
      verdictReason: entry.evaluation.verdictReason,
      colors: entry.facts.colors,
      sizes: entry.facts.sizes,
      stock: entry.facts.totalStock,
      dropshipCents: entry.facts.minDropshipCents,
      shipFrom: entry.facts.shipFrom,
      detailUrl: entry.facts.detailUrl,
      alreadyInStore: entry.evaluation.alreadyInStore,
      economics: entry.evaluation.economics,
    };
    return toExportRow(exportable);
  });

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    return new NextResponse(toCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="norvik-compras-${stamp}.csv"`,
      },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Norvik Sourcing Studio';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Lista de compra');
  sheet.columns = EXPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of rows) {
    const added = sheet.addRow(row);

    const linkCell = added.getCell('enlaceTrendsi');
    if (typeof linkCell.value === 'string' && linkCell.value !== '') {
      linkCell.value = { text: 'Ver en Trendsi', hyperlink: linkCell.value };
      linkCell.font = { color: { argb: 'FF7E8E6E' }, underline: true };
    }

    for (const key of [
      'costeDropship',
      'costeConEnvio',
      'pvpSugerido',
      'margenBruto',
      'margenNeto',
    ] as const) {
      added.getCell(key).numFmt = '"$"#,##0.00';
    }
    for (const key of ['margenBrutoPct', 'margenNetoPct'] as const) {
      added.getCell(key).numFmt = '0.0"%"';
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="norvik-compras-${stamp}.xlsx"`,
    },
  });
}
