import { loadDotEnv } from '@/env';

loadDotEnv();

const {
  openSession,
  observePage,
  TrendsiBrowserError,
  TRENDSI_LOGIN_URL,
  TRENDSI_SEARCH_URL,
  resolveSessionDir,
} = await import('@/ingest/trendsi/session');

/**
 * `npm run trendsi:login` — the one step that cannot be automated.
 *
 * Trendsi has no API and its catalogue is behind a login, so a person has to
 * sign in once, by hand, in a real browser window. This script opens that
 * window, waits, and saves the session so nothing else has to ask again.
 *
 * It never types the password, never reads it, and never stores it. All it
 * keeps is the browser profile Chromium writes for itself.
 */

const WAIT_LIMIT_MS = 10 * 60 * 1000;
const POLL_EVERY_MS = 3_000;

function say(line = ''): void {
  console.warn(line);
}

const sessionDir = resolveSessionDir();

say();
say('  ┌─────────────────────────────────────────────────────────────┐');
say('  │  CONECTAR CON TRENDSI                                       │');
say('  └─────────────────────────────────────────────────────────────┘');
say();
say('  Se va a abrir una ventana de Chrome.');
say();
say('  1. Escribe tu email y tu contraseña de Trendsi en esa ventana.');
say('  2. Entra como entras siempre.');
say('  3. Cuando veas el catálogo, NO cierres la ventana:');
say('     este programa se dará cuenta solo y la cerrará él.');
say();
say('  Tu contraseña no pasa por esta aplicación. La escribes tú en');
say('  la ventana de Chrome, igual que en cualquier otra web.');
say();
say(`  La sesión se guardará en: ${sessionDir}`);
say();

let context;
try {
  context = await openSession({ headed: true });
} catch (error) {
  if (error instanceof TrendsiBrowserError) {
    say(`  ✗ ${error.message}`);
    say();
    for (const line of error.hint.split('\n')) say(`    ${line}`);
    say();
    process.exit(1);
  }
  throw error;
}

const page = context.pages()[0] ?? (await context.newPage());

try {
  await page.goto(TRENDSI_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
} catch (error) {
  say('  ✗ No se ha podido abrir la página de Trendsi.');
  say(`    ${error instanceof Error ? error.message : String(error)}`);
  say();
  say('    Comprueba que tienes conexión a internet y vuelve a intentarlo.');
  await context.close();
  process.exit(1);
}

say('  Esperando a que entres…  (hay 10 minutos de margen)');
say();

const startedAt = Date.now();
let state = await observePage(page);

while (state !== 'AUTHENTICATED' && Date.now() - startedAt < WAIT_LIMIT_MS) {
  if (state === 'CAPTCHA') {
    say('  ⚠ Trendsi está mostrando una verificación de seguridad.');
    say();
    say('    La aplicación se para aquí a propósito: no intenta resolverla');
    say('    ni saltársela. Resuélvela tú en la ventana si puedes, y el');
    say('    programa seguirá esperando.');
    say();
  }

  await page.waitForTimeout(POLL_EVERY_MS);

  // Nudge the app onto a page that requires a session, so a completed login
  // is noticed even if Trendsi leaves you on a dashboard afterwards.
  if (!page.url().includes('/products/')) {
    await page
      .goto(`${TRENDSI_SEARCH_URL}?keyword=dress&curPage=1`, { waitUntil: 'domcontentloaded' })
      .catch(() => undefined);
    await page.waitForTimeout(2_000);
  }

  state = await observePage(page);
}

if (state === 'AUTHENTICATED') {
  say('  ✓ Sesión guardada correctamente.');
  say();
  say('    Ya puedes cerrar esta ventana negra.');
  say('    El siguiente paso es "Capturar de Trendsi".');
  say();
  await context.close();
  process.exit(0);
}

say('  ✗ Se ha agotado el tiempo de espera sin detectar la sesión.');
say();
say('    Si has entrado correctamente y aun así ves este mensaje, avísame:');
say('    significa que Trendsi ha cambiado algo y tengo que ajustar la');
say('    detección. No es culpa tuya.');
say();
await context.close();
process.exit(1);
