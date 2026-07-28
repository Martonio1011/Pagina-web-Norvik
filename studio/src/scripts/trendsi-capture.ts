import { loadDotEnv } from '@/env';

loadDotEnv();

const {
  openSession,
  observePage,
  checkSession,
  describeState,
  hasStoredSession,
  TrendsiBrowserError,
  TRENDSI_SEARCH_URL,
} = await import('@/ingest/trendsi/session');
const { recordJsonResponses, writeCapture, countRenderedTiles } = await import(
  '@/ingest/trendsi/capture'
);
const { classifySearchOutcome, shortenQuery, isQueryTooLong, countQueryTokens } = await import(
  '@/ingest/trendsi/page-state'
);
const { RateLimiter } = await import('@/ingest/trendsi/rate-limit');
const { RunTracker } = await import('@/ingest/run-tracker');

/**
 * `npm run trendsi:capture` — records what Trendsi returns, so the parser can
 * be written against the real thing.
 *
 * It captures. It does not interpret. Until there is a recording of an actual
 * response, any parser would be built on a guess, and a guess that reaches the
 * database is far more expensive than a missing feature.
 */

function say(line = ''): void {
  console.warn(line);
}

/**
 * Deliberately short queries. Trendsi ANDs every token and gives up past four
 * or five words, so these are two and three words each, chosen to cover the
 * sections that are empty today.
 */
const DEFAULT_QUERIES = [
  'linen set',
  'eyelet dress',
  'satin maxi dress',
  'wide leg jumpsuit',
  'straw bag',
];

const requested = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const queries = requested.length > 0 ? requested : DEFAULT_QUERIES;

say();
say('  ┌─────────────────────────────────────────────────────────────┐');
say('  │  CAPTURAR DE TRENDSI                                        │');
say('  └─────────────────────────────────────────────────────────────┘');
say();

if (!hasStoredSession()) {
  say('  ✗ Todavía no hay ninguna sesión de Trendsi guardada.');
  say();
  say('    Haz primero doble clic en "Conectar con Trendsi" y entra con tu');
  say('    email y contraseña. Después vuelve aquí.');
  say();
  process.exit(1);
}

for (const query of queries) {
  if (isQueryTooLong(query)) {
    say(`  ⚠ "${query}" tiene ${countQueryTokens(query)} palabras.`);
    say(`    Trendsi no devuelve nada con más de 4. Se buscará "${shortenQuery(query)}".`);
    say();
  }
}

const delaySeconds = Number(process.env.TRENDSI_REQUEST_DELAY_SECONDS ?? 2.5);
const limiter = new RateLimiter({ minIntervalMs: delaySeconds * 1000, jitterMs: 800 });

say(`  Se van a hacer ${queries.length} búsquedas, esperando ~${delaySeconds}s entre cada una.`);
say('  Se abrirá una ventana de Chrome. Déjala abierta y no toques nada.');
say();

const run = await RunTracker.start('TRENDSI', { params: { queries, mode: 'capture' } });

/** Opens the browser, or explains why it could not and stops. */
async function openBrowserOrExit(): Promise<import('playwright').BrowserContext> {
  try {
    return await openSession({ headed: true });
  } catch (error) {
    if (error instanceof TrendsiBrowserError) {
      say(`  ✗ ${error.message}`);
      say();
      for (const line of error.hint.split('\n')) say(`    ${line}`);
      say();
      await run.recordError({ stage: 'FETCH', message: error.message, detail: error.hint });
      await run.finish('FAILED', error.message);
      process.exit(1);
    }
    // `run.fail` records the failure and rethrows. The throw below is
    // unreachable; it is here because the dynamic import loses the `never`
    // return type and the compiler cannot see that this branch ends.
    await run.fail(error);
    throw error;
  }
}

const context = await openBrowserOrExit();

let captureCount = 0;

try {
  const state = await checkSession(context);

  if (state !== 'AUTHENTICATED') {
    say(`  ✗ ${describeState(state)}`);
    say();
    if (state === 'SESSION_EXPIRED') {
      say('    Haz doble clic en "Conectar con Trendsi" para volver a entrar,');
      say('    y después repite esta captura.');
    }
    say();
    await run.recordError({ stage: 'AUTH', message: describeState(state), target: 'session' });
    await run.finish(state === 'SESSION_EXPIRED' ? 'SESSION_EXPIRED' : 'BLOCKED');
    await context.close();
    process.exit(1);
  }

  say('  ✓ Sesión válida. Empezando.');
  say();

  const page = context.pages()[0] ?? (await context.newPage());

  for (const rawQuery of queries) {
    const query = shortenQuery(rawQuery);
    await limiter.acquire();

    const recorder = recordJsonResponses(page);
    const url = `${TRENDSI_SEARCH_URL}?keyword=${encodeURIComponent(query)}&curPage=1`;

    say(`  → Buscando "${query}"…`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      run.count('requestCount');
      // The results arrive by background request, so the page needs a moment
      // after the document itself has loaded.
      await page.waitForTimeout(6_000);

      const pageState = await observePage(page);
      if (pageState === 'CAPTCHA') {
        say('  ⚠ Ha aparecido una verificación de seguridad. Se detiene aquí.');
        await run.recordError({ stage: 'FETCH', message: 'captcha shown', target: url });
        recorder.stop();
        break;
      }

      const tiles = await countRenderedTiles(page);
      const bodyText = await page
        .locator('body')
        .innerText()
        .catch(() => '');
      const outcome = classifySearchOutcome({ bodyText, resultCount: tiles });

      recorder.stop();

      const label = `search-${query.replace(/\s+/g, '-')}`;
      const { summaryPath, summary } = writeCapture({
        directory: 'fixtures/trendsi',
        label,
        query,
        captured: recorder.captured,
      });

      captureCount += 1;
      run.count('itemsSeen', recorder.captured.length);

      say(
        `    ${outcome === 'RESULTS' ? '✓' : '·'} ${outcome === 'RESULTS' ? `${tiles} resultados` : 'sin resultados'}` +
          ` · ${recorder.captured.length} respuestas guardadas · ${summary.endpoints.length} rutas`,
      );
      say(`      ${summaryPath}`);

      if (outcome === 'NO_RESULTS') {
        // Recorded on purpose: a term that finds nothing is worth knowing
        // about, and it is not an error.
        await run.recordError({
          stage: 'PARSE',
          message: `La búsqueda "${query}" no devolvió resultados propios de Trendsi.`,
          target: url,
        });
      }
    } catch (error) {
      recorder.stop();
      const message = error instanceof Error ? error.message : String(error);
      say(`    ✗ Falló: ${message}`);
      await run.recordError({ stage: 'FETCH', message, target: url, detail: error });
    }
  }
} finally {
  await context.close();
}

const status = await run.finish();

say();
if (captureCount > 0) {
  say(`  ✓ Listo. Se han guardado ${captureCount} capturas en la carpeta:`);
  say('      studio\\fixtures\\trendsi');
  say();
  say('  Siguiente paso: haz doble clic en "Enviar capturas" para subirlas,');
  say('  o abre los archivos que terminan en -RESUMEN.txt y pégame su');
  say('  contenido en el chat.');
} else {
  say('  ✗ No se ha guardado ninguna captura. Cuéntame qué has visto en');
  say('    pantalla y lo revisamos.');
}
say();

process.exit(status === 'FAILED' ? 1 : 0);
