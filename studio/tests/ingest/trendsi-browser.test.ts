import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type BrowserContext } from 'playwright';
import { observePage } from '@/ingest/trendsi/session';
import { countRenderedTiles, recordJsonResponses } from '@/ingest/trendsi/capture';
import { classifySearchOutcome } from '@/ingest/trendsi/page-state';

/**
 * Browser-level tests for the Trendsi plumbing.
 *
 * These cannot talk to Trendsi — it is behind a login, and no test should ever
 * depend on someone's supplier account. Instead a local server serves pages
 * shaped like the ones Trendsi serves, and the real Playwright machinery is
 * driven against them.
 *
 * What this genuinely proves: the browser launches, response interception
 * catches background JSON, redaction runs on the way in, the tile counter
 * finds product links, and session detection reads a login page as a login
 * page. What it cannot prove is that Trendsi's markup matches these shapes —
 * that is what the capture step exists to find out.
 */

const PORT = 4399;
const BASE = `http://127.0.0.1:${PORT}`;

const LOGIN_PAGE = `<!doctype html><html><body>
  <h1>Sign in</h1>
  <form><input type="email" /><input type="password" /><button>Log in</button></form>
  <a href="#">Forgot password?</a>
</body></html>`;

const RESULTS_PAGE = `<!doctype html><html><body>
  <div id="grid">Loading…</div>
  <script>
    fetch('/api/products/search?keyword=linen')
      .then(r => r.json())
      .then(data => {
        document.getElementById('grid').innerHTML =
          'Showing 1-' + data.data.list.length + ' of ' + data.data.total + ' products' +
          data.data.list.map(p =>
            '<a href="/products/detail?id=' + p.productId + '">' + p.title + '</a>'
          ).join('');
      });
  </script>
</body></html>`;

const NO_RESULTS_PAGE = `<!doctype html><html><body>
  <p>No Results found for your search.</p>
  <h2>You may also like</h2>
  <div>
    <a href="/products/detail?id=901">Recommended Dress</a>
    <a href="/products/detail?id=902">Recommended Top</a>
    <a href="/products/detail?id=903">Recommended Skirt</a>
  </div>
</body></html>`;

const SEARCH_JSON = {
  code: 0,
  data: {
    total: 312,
    list: [
      { productId: '392458', title: 'Linen Set', dropshipPrice: '12.50', stock: 20 },
      { productId: '392459', title: 'Linen Dress', dropshipPrice: '14.00', stock: 8 },
    ],
  },
};

const PROFILE_JSON = { code: 0, data: { email: 'someone@example.com', phone: '+34600111222' } };

let server: Server;
let context: BrowserContext | null = null;

/**
 * Probed before the tests are declared, so a machine without a browser reports
 * these as SKIPPED rather than as passing.
 *
 * A test that quietly returns when its dependency is missing is worse than no
 * test: the suite goes green and nobody learns that nothing was checked.
 */
const probeDir = mkdtempSync(join(tmpdir(), 'norvik-probe-'));
const browserAvailable = await chromium
  .launchPersistentContext(probeDir, {
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}),
  })
  .then(async (probe) => {
    await probe.close();
    return true;
  })
  .catch(() => false);
rmSync(probeDir, { recursive: true, force: true });

if (!browserAvailable) {
  console.warn(
    '\n  ! Tests de navegador OMITIDOS: no hay Chromium disponible.\n' +
      '    Instálalo con `npx playwright install chromium`, o indica uno ya\n' +
      '    instalado con la variable PLAYWRIGHT_CHROMIUM_PATH.\n',
  );
}

let profileDir: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', BASE);

    if (url.pathname === '/api/products/search') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(SEARCH_JSON));
      return;
    }
    if (url.pathname === '/api/user/profile') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(PROFILE_JSON));
      return;
    }
    if (url.pathname === '/login') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(LOGIN_PAGE);
      return;
    }
    if (url.pathname === '/products/search') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(url.searchParams.get('keyword') === 'nothing' ? NO_RESULTS_PAGE : RESULTS_PAGE);
      return;
    }
    response.writeHead(404, { 'content-type': 'text/html' });
    response.end('<html><body>Not found</body></html>');
  });

  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  if (!browserAvailable) return;

  profileDir = mkdtempSync(join(tmpdir(), 'norvik-browser-'));
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

  context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
}, 120_000);

afterAll(async () => {
  await context?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (profileDir) rmSync(profileDir, { recursive: true, force: true });
});

describe.skipIf(!browserAvailable)('the browser plumbing', () => {
  it('reads a login page as an expired session', async () => {
    const page = await context!.newPage();
    const response = await page.goto(`${BASE}/login`);
    const state = await observePage(page, response?.status() ?? null);
    await page.close();

    expect(state).toBe('SESSION_EXPIRED');
  }, 60_000);

  it('reads a product page with no password box as logged in', async () => {
    const page = await context!.newPage();
    const response = await page.goto(`${BASE}/products/search?keyword=linen`);
    const state = await observePage(page, response?.status() ?? null);
    await page.close();

    expect(state).toBe('AUTHENTICATED');
  }, 60_000);

  it('captures the background JSON the page fetches, redacted', async () => {
    const page = await context!.newPage();
    const recorder = recordJsonResponses(page, { origin: '127.0.0.1' });

    await page.goto(`${BASE}/products/search?keyword=linen`);
    await page.waitForTimeout(1_500);
    // A second call, to prove more than one endpoint is picked up.
    await page.evaluate(() => fetch('/api/user/profile').then((r) => r.json()));
    await page.waitForTimeout(500);
    recorder.stop();
    await page.close();

    const paths = recorder.captured.map((entry) => entry.path);
    expect(paths).toContain('/api/products/search');
    expect(paths).toContain('/api/user/profile');

    const search = recorder.captured.find((entry) => entry.path === '/api/products/search');
    const body = search?.body as { data: { list: { productId: string }[] } };
    expect(body.data.list[0]?.productId).toBe('392458');

    // The profile response carried an email and a phone number. Neither should
    // have survived the trip to memory, let alone to disk.
    const profile = recorder.captured.find((entry) => entry.path === '/api/user/profile');
    const profileBody = profile?.body as { data: Record<string, unknown> };
    expect(profileBody.data.email).toBe('[redactado]');
    expect(profileBody.data.phone).toBe('[redactado]');
  }, 60_000);

  it('counts rendered product tiles', async () => {
    const page = await context!.newPage();
    await page.goto(`${BASE}/products/search?keyword=linen`);
    await page.waitForTimeout(1_500);
    const tiles = await countRenderedTiles(page);
    await page.close();

    expect(tiles).toBe(2);
  }, 60_000);

  it('does not mistake recommendation tiles for search results', async () => {
    const page = await context!.newPage();
    await page.goto(`${BASE}/products/search?keyword=nothing`);
    await page.waitForTimeout(500);

    const tiles = await countRenderedTiles(page);
    const bodyText = await page.locator('body').innerText();
    await page.close();

    // Three tiles on screen, and the honest answer is still "no results".
    expect(tiles).toBe(3);
    expect(classifySearchOutcome({ bodyText, resultCount: tiles })).toBe('NO_RESULTS');
  }, 60_000);
});
