import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { redact, renderSummary, summarise, writeCapture, type CapturedResponse } from '@/ingest/trendsi/capture';

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'norvik-capture-'));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('redact', () => {
  /**
   * Captures get sent on to whoever is writing the parser. Anything personal
   * has to be gone before it reaches the disk, not before it is shared —
   * relying on someone remembering to check is how it leaks.
   */
  it('removes anything that looks like personal or account data', () => {
    const redacted = redact({
      productId: '392458',
      account: {
        email: 'noorviik@gmail.com',
        phone: '+34600111222',
        shippingAddress: '12 Somewhere Street',
        accessToken: 'abc123',
      },
      price: 12.5,
    }) as Record<string, unknown>;

    expect(redacted.productId).toBe('392458');
    expect(redacted.price).toBe(12.5);

    const account = redacted.account as Record<string, unknown>;
    expect(account.email).toBe('[redactado]');
    expect(account.phone).toBe('[redactado]');
    expect(account.shippingAddress).toBe('[redactado]');
    expect(account.accessToken).toBe('[redactado]');
  });

  it('reaches inside arrays', () => {
    const redacted = redact({
      orders: [{ id: 1, email: 'a@b.com' }, { id: 2, email: 'c@d.com' }],
    }) as { orders: Record<string, unknown>[] };

    expect(redacted.orders.map((order) => order.email)).toEqual(['[redactado]', '[redactado]']);
    expect(redacted.orders.map((order) => order.id)).toEqual([1, 2]);
  });

  it('leaves the product data a parser actually needs', () => {
    const redacted = redact({
      id: '392458',
      title: 'Cowl Neck Wide-Leg Jumpsuit',
      dropshipPrice: '12.50',
      wholesalePrice: '8.00',
      msrp: '39.99',
      stock: 42,
      shipFrom: 'Overseas',
      colors: ['Black', 'Sage'],
    });

    expect(redacted).toEqual({
      id: '392458',
      title: 'Cowl Neck Wide-Leg Jumpsuit',
      dropshipPrice: '12.50',
      wholesalePrice: '8.00',
      msrp: '39.99',
      stock: 42,
      shipFrom: 'Overseas',
      colors: ['Black', 'Sage'],
    });
  });

  it('does not run away on a self-referencing structure', () => {
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 30; i += 1) {
      const next: Record<string, unknown> = {};
      cursor.next = next;
      cursor = next;
    }

    expect(() => redact(deep)).not.toThrow();
  });
});

const sample: CapturedResponse[] = [
  {
    url: 'https://app.trendsi.com/api/products/search?keyword=linen',
    path: '/api/products/search',
    status: 200,
    method: 'GET',
    body: {
      code: 0,
      data: {
        total: 312,
        list: [
          { productId: '1', title: 'Linen Set', dropshipPrice: '12.50', stock: 20 },
          { productId: '2', title: 'Linen Dress', dropshipPrice: '14.00', stock: 8 },
        ],
      },
    },
  },
  {
    url: 'https://app.trendsi.com/api/user/profile',
    path: '/api/user/profile',
    status: 200,
    method: 'GET',
    body: { code: 0, data: { email: '[redactado]' } },
  },
  {
    url: 'https://app.trendsi.com/api/products/search?keyword=linen&curPage=2',
    path: '/api/products/search',
    status: 200,
    method: 'GET',
    body: { code: 0, data: { total: 312, list: [] } },
  },
];

describe('summarise', () => {
  it('groups by endpoint and counts the calls', () => {
    const summary = summarise(sample);

    expect(summary.endpoints).toHaveLength(2);
    expect(summary.endpoints[0]?.path).toBe('/api/products/search');
    expect(summary.endpoints[0]?.calls).toBe(2);
  });

  it('finds the product list and reports its field names', () => {
    const summary = summarise(sample);
    const search = summary.endpoints.find((entry) => entry.path === '/api/products/search');
    const list = search?.arraysFound.find((array) => array.at.endsWith('list'));

    expect(list?.length).toBe(2);
    expect(list?.sampleKeys).toEqual(['productId', 'title', 'dropshipPrice', 'stock']);
  });

  it('reports top-level keys so the envelope shape is visible', () => {
    const summary = summarise(sample);
    expect(summary.endpoints[0]?.topLevelKeys).toEqual(['code', 'data']);
  });
});

describe('renderSummary', () => {
  it('describes the shape without reproducing the values', () => {
    const text = renderSummary(summarise(sample), {
      query: 'linen set',
      when: new Date('2026-07-28T10:00:00Z'),
    });

    expect(text).toContain('/api/products/search');
    expect(text).toContain('productId, title, dropshipPrice, stock');
    // Field names yes; the values behind them, no.
    expect(text).not.toContain('12.50');
    expect(text).not.toContain('Linen Dress');
  });
});

describe('writeCapture', () => {
  it('writes the raw capture and a readable summary next to it', () => {
    const { files, summaryPath } = writeCapture({
      directory,
      label: 'search-linen-set',
      query: 'linen set',
      captured: sample,
    });

    expect(files).toHaveLength(2);

    const raw = JSON.parse(readFileSync(files[0]!, 'utf8')) as {
      _capture: { query: string };
      responses: CapturedResponse[];
    };
    expect(raw._capture.query).toBe('linen set');
    expect(raw.responses).toHaveLength(3);

    expect(readFileSync(summaryPath, 'utf8')).toContain('RESUMEN DE LA CAPTURA');
  });
});
