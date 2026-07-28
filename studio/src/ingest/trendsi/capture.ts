import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BrowserContext, Page } from 'playwright';
import { childLogger } from '@/lib/logger';

/**
 * Recording what Trendsi actually sends.
 *
 * Trendsi's catalogue pages are a single page app, so the interesting data
 * does not arrive in the HTML — it arrives as JSON, in the background
 * requests the page makes. Recording those responses gives a far more stable
 * base to parse than scraping rendered markup, which changes every time
 * somebody adjusts a stylesheet.
 *
 * This module only records. It makes no attempt to interpret what it sees:
 * writing a parser against a guessed shape, then discovering the guess was
 * wrong once it is already filling a database, is exactly the failure mode
 * worth avoiding here.
 */

const log = childLogger('trendsi-capture');

/** Keys whose values are dropped before anything touches the disk. */
const SENSITIVE_KEY_PATTERN =
  /(email|phone|mobile|password|token|secret|authorization|address|street|zip|postal|card|iban|ssn|tax)/i;

/**
 * Strips anything that looks like personal or account data.
 *
 * Captures exist to be read by someone writing a parser, and may well be sent
 * on for that purpose. Shipping the shop owner's address in a fixture because
 * nobody thought to look is not acceptable, so the redaction happens on the
 * way in rather than being left to a later review.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 12) return '[demasiado profundo]';
  if (value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redactado]' : redact(nested, depth + 1);
  }
  return output;
}

export interface CapturedResponse {
  url: string;
  /** Path only, for grouping in the summary. */
  path: string;
  status: number;
  method: string;
  /** Already redacted. */
  body: unknown;
}

/**
 * Attaches a recorder to a page.
 *
 * Returns the list it fills and a function to detach. Only JSON responses
 * from Trendsi's own origin are kept — analytics beacons and font requests
 * are noise.
 */
export function recordJsonResponses(
  page: Page,
  options: { origin: string; maxBodyBytes?: number } = { origin: 'app.trendsi.com' },
): { captured: CapturedResponse[]; stop: () => void } {
  const captured: CapturedResponse[] = [];
  const maxBodyBytes = options.maxBodyBytes ?? 4_000_000;

  const handler = (response: import('playwright').Response): void => {
    void (async () => {
      try {
        const url = new URL(response.url());
        if (!url.hostname.includes(options.origin)) return;

        const contentType = response.headers()['content-type'] ?? '';
        if (!contentType.includes('json')) return;

        const raw = await response.text();
        if (raw.length > maxBodyBytes) {
          log.warn({ url: url.pathname, bytes: raw.length }, 'response too large, skipped');
          return;
        }

        captured.push({
          url: response.url(),
          path: url.pathname,
          status: response.status(),
          method: response.request().method(),
          body: redact(JSON.parse(raw)),
        });
      } catch (error) {
        // A response that cannot be read or parsed is not a capture failure —
        // plenty of JSON-typed responses are empty or streamed. It is logged
        // so it is never simply invisible, and the run carries on.
        log.debug({ err: error, url: response.url() }, 'skipped an unreadable response');
      }
    })();
  };

  page.on('response', handler);
  return { captured, stop: () => page.off('response', handler) };
}

export interface CaptureSummary {
  /** Distinct endpoint paths seen, with how often and how big. */
  endpoints: {
    path: string;
    calls: number;
    statuses: number[];
    /** Top-level keys of the first response body, to hint at the shape. */
    topLevelKeys: string[];
    /** Where an array of objects was found, and how long it was. */
    arraysFound: { at: string; length: number; sampleKeys: string[] }[];
  }[];
}

/** Finds arrays of objects anywhere in a payload — usually the product list. */
function findArrays(
  value: unknown,
  path = '$',
  found: { at: string; length: number; sampleKeys: string[] }[] = [],
  depth = 0,
): { at: string; length: number; sampleKeys: string[] }[] {
  if (depth > 8 || value === null || typeof value !== 'object') return found;

  if (Array.isArray(value)) {
    const first = value[0];
    if (value.length > 0 && typeof first === 'object' && first !== null) {
      found.push({
        at: path,
        length: value.length,
        sampleKeys: Object.keys(first as Record<string, unknown>).slice(0, 40),
      });
    }
    return found;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    findArrays(nested, `${path}.${key}`, found, depth + 1);
  }
  return found;
}

/**
 * Describes a capture without reproducing it.
 *
 * This is the part a human can read, and the part worth sending on: endpoint
 * paths and field names, no values.
 */
export function summarise(captured: CapturedResponse[]): CaptureSummary {
  const byPath = new Map<string, CapturedResponse[]>();
  for (const response of captured) {
    const bucket = byPath.get(response.path);
    if (bucket) bucket.push(response);
    else byPath.set(response.path, [response]);
  }

  return {
    endpoints: [...byPath.entries()]
      .map(([path, responses]) => {
        const first = responses[0];
        const body = first?.body;
        return {
          path,
          calls: responses.length,
          statuses: [...new Set(responses.map((response) => response.status))],
          topLevelKeys:
            body !== null && typeof body === 'object' && !Array.isArray(body)
              ? Object.keys(body as Record<string, unknown>)
              : [],
          arraysFound: findArrays(body)
            .sort((a, b) => b.length - a.length)
            .slice(0, 5),
        };
      })
      .sort((a, b) => b.calls - a.calls),
  };
}

/** Renders the summary as something readable in Notepad. */
export function renderSummary(summary: CaptureSummary, context: { query: string; when: Date }): string {
  const lines: string[] = [
    'RESUMEN DE LA CAPTURA DE TRENDSI',
    '='.repeat(60),
    '',
    `Búsqueda:  ${context.query}`,
    `Fecha:     ${context.when.toISOString()}`,
    '',
    'Esto describe la FORMA de los datos que devuelve Trendsi, no los datos.',
    'Los valores personales ya están eliminados de los archivos guardados.',
    '',
    `Se han detectado ${summary.endpoints.length} rutas distintas:`,
    '',
  ];

  for (const endpoint of summary.endpoints) {
    lines.push('-'.repeat(60));
    lines.push(`RUTA:      ${endpoint.path}`);
    lines.push(`Llamadas:  ${endpoint.calls}   Estados: ${endpoint.statuses.join(', ')}`);
    if (endpoint.topLevelKeys.length > 0) {
      lines.push(`Campos:    ${endpoint.topLevelKeys.join(', ')}`);
    }
    for (const array of endpoint.arraysFound) {
      lines.push(`  Lista en ${array.at} — ${array.length} elementos`);
      lines.push(`    campos: ${array.sampleKeys.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export interface WriteCaptureOptions {
  directory: string;
  label: string;
  query: string;
  captured: CapturedResponse[];
}

/** Writes the raw captures and the human-readable summary to disk. */
export function writeCapture(options: WriteCaptureOptions): {
  files: string[];
  summaryPath: string;
  summary: CaptureSummary;
} {
  const directory = resolve(options.directory);
  mkdirSync(directory, { recursive: true });

  const files: string[] = [];
  const rawPath = join(directory, `${options.label}.json`);
  writeFileSync(
    rawPath,
    JSON.stringify(
      {
        _capture: {
          query: options.query,
          capturedAt: new Date().toISOString(),
          note: 'Respuestas JSON reales de app.trendsi.com, con los campos personales ya redactados.',
        },
        responses: options.captured,
      },
      null,
      2,
    ),
    'utf8',
  );
  files.push(rawPath);

  const summary = summarise(options.captured);
  const summaryPath = join(directory, `${options.label}-RESUMEN.txt`);
  writeFileSync(summaryPath, renderSummary(summary, { query: options.query, when: new Date() }), 'utf8');
  files.push(summaryPath);

  return { files, summaryPath, summary };
}

/** Counts the product tiles the page rendered, for the no-results check. */
export async function countRenderedTiles(page: Page): Promise<number> {
  // Several selectors, because we do not yet know which one Trendsi uses —
  // and the count is only ever used as a corroborating signal alongside the
  // page text, never on its own.
  const candidates = [
    '[class*="product-item"]',
    '[class*="productCard"]',
    '[class*="product-card"]',
    'a[href*="/products/detail"]',
  ];

  let best = 0;
  for (const selector of candidates) {
    const count = await page
      .locator(selector)
      .count()
      .catch(() => 0);
    if (count > best) best = count;
  }
  return best;
}

export type { BrowserContext };
