import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { childLogger } from '@/lib/logger';
import { classifyPageState, type PageState } from './page-state';

/**
 * The Trendsi browser session.
 *
 * Trendsi has no public API and its catalogue lives behind a login, so the
 * only honest way in is a real browser that a human has logged into. That
 * login happens once, by hand, in a visible window; the profile is kept on
 * disk and reused afterwards.
 *
 * Two things this module deliberately does not do:
 *
 *   • It does not disguise itself. No spoofed user agent, no stealth plugins,
 *     no attempt to look like something it is not. It is Chromium, driven by
 *     Playwright, logged in as the account holder.
 *   • It does not solve captchas. If one appears, everything stops and says
 *     so. That is a decision, not a limitation to work around later.
 */

const log = childLogger('trendsi-session');

export const TRENDSI_ORIGIN = 'https://app.trendsi.com';
export const TRENDSI_LOGIN_URL = `${TRENDSI_ORIGIN}/login`;
export const TRENDSI_SEARCH_URL = `${TRENDSI_ORIGIN}/products/search`;
export const TRENDSI_DETAIL_URL = `${TRENDSI_ORIGIN}/products/detail`;

export class TrendsiSessionError extends Error {
  constructor(
    message: string,
    readonly state: PageState,
  ) {
    super(message);
    this.name = 'TrendsiSessionError';
  }
}

/**
 * The browser itself could not be started.
 *
 * Separate from a session problem because the answer is different, and
 * because the raw Playwright failure is a hundred lines of Chromium command
 * line that would tell the person reading it nothing at all.
 */
export class TrendsiBrowserError extends Error {
  constructor(
    message: string,
    readonly hint: string,
    readonly underlying?: unknown,
  ) {
    super(message);
    this.name = 'TrendsiBrowserError';
  }
}

/** Turns a Playwright launch failure into something worth reading. */
function explainLaunchFailure(error: unknown): TrendsiBrowserError {
  const raw = error instanceof Error ? error.message : String(error);

  if (/Executable doesn't exist|Please run the following command/i.test(raw)) {
    return new TrendsiBrowserError(
      'Falta el navegador que usa la aplicación.',
      'Se instala una sola vez. En la ventana negra escribe:  npx playwright install chromium\n' +
        'O, más fácil: vuelve a hacer doble clic en "Norvik Studio.bat", que lo instala solo.',
      error,
    );
  }

  if (/Missing X server|\$DISPLAY|platform failed to initialize/i.test(raw)) {
    return new TrendsiBrowserError(
      'No hay ningún escritorio donde abrir la ventana del navegador.',
      'Esto pasa cuando la aplicación corre en un servidor sin pantalla. El paso de\n' +
        'conectar con Trendsi tiene que hacerse en un ordenador normal, con su monitor.',
      error,
    );
  }

  return new TrendsiBrowserError(
    'No se ha podido abrir el navegador.',
    `Detalle técnico: ${raw.split('\n')[0] ?? raw}`,
    error,
  );
}

export interface OpenSessionOptions {
  /** Where the browser profile lives. Defaults to TRENDSI_SESSION_DIR. */
  sessionDir?: string;
  /**
   * Show the window. True for logging in and for capture runs a human is
   * watching; scheduled runs can pass false once a session exists.
   */
  headed: boolean;
  /** Overrides the browser binary. Used where `playwright install` cannot run. */
  executablePath?: string;
}

export function resolveSessionDir(sessionDir?: string): string {
  const dir = resolve(process.cwd(), sessionDir ?? process.env.TRENDSI_SESSION_DIR ?? '.trendsi-session');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** True when a browser profile has been created at all. Says nothing about validity. */
export function hasStoredSession(sessionDir?: string): boolean {
  const dir = resolve(process.cwd(), sessionDir ?? process.env.TRENDSI_SESSION_DIR ?? '.trendsi-session');
  if (!existsSync(dir)) return false;
  try {
    // A persistent Chromium profile always writes these. An empty directory
    // means the login was never completed.
    return readdirSync(dir).some((entry) => entry === 'Default' || entry === 'Local State');
  } catch {
    return false;
  }
}

/**
 * Opens the browser with the saved profile.
 *
 * A persistent context rather than a `storageState` file: Trendsi is a single
 * page app that keeps its auth in localStorage as well as cookies, and a real
 * profile carries both without us having to work out which is which.
 */
export async function openSession(options: OpenSessionOptions): Promise<BrowserContext> {
  const userDataDir = resolveSessionDir(options.sessionDir);
  const executablePath = options.executablePath ?? process.env.PLAYWRIGHT_CHROMIUM_PATH;

  log.info({ userDataDir, headed: options.headed }, 'opening Trendsi browser session');

  try {
    return await chromium.launchPersistentContext(userDataDir, {
      headless: !options.headed,
      ...(executablePath ? { executablePath } : {}),
      viewport: { width: 1440, height: 900 },
      // The user agent is left exactly as Chromium reports it. Pretending to be
      // a different browser would be misrepresenting who is making the request.
      locale: 'en-US',
    });
  } catch (error) {
    throw explainLaunchFailure(error);
  }
}

/** Reads the page in front of us and says what it is. */
export async function observePage(page: Page, status?: number | null): Promise<PageState> {
  const [hasPasswordField, bodyText] = await Promise.all([
    page
      .locator('input[type="password"]')
      .first()
      .isVisible()
      .catch(() => false),
    page
      .locator('body')
      .innerText()
      .catch(() => ''),
  ]);

  return classifyPageState({
    url: page.url(),
    status: status ?? null,
    hasPasswordField,
    bodyText,
  });
}

/**
 * Checks whether the stored session still works, by asking for a page that
 * requires it.
 *
 * Returns the state rather than throwing, because "expired" is a normal thing
 * for a session to be and the UI needs to say so calmly.
 */
export async function checkSession(context: BrowserContext): Promise<PageState> {
  const page = await context.newPage();
  try {
    const response = await page.goto(`${TRENDSI_SEARCH_URL}?keyword=dress&curPage=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    // Give the single page app a moment to redirect to a login screen if it
    // is going to; checking too early reports a stale "authenticated".
    await page.waitForTimeout(3_000);
    return await observePage(page, response?.status() ?? null);
  } catch (error) {
    log.warn({ err: error }, 'could not reach Trendsi while checking the session');
    return 'UNKNOWN';
  } finally {
    await page.close();
  }
}

/** Turns a page state into a sentence aimed at the person using the app. */
export function describeState(state: PageState): string {
  switch (state) {
    case 'AUTHENTICATED':
      return 'La sesión de Trendsi está activa.';
    case 'SESSION_EXPIRED':
      return 'La sesión de Trendsi ha caducado. Hay que volver a entrar a mano una vez.';
    case 'CAPTCHA':
      return 'Trendsi está mostrando una verificación de seguridad. La aplicación se detiene aquí: no intenta resolverla ni saltársela.';
    case 'UNKNOWN':
      return 'No se ha podido determinar el estado de la sesión de Trendsi. Puede ser un problema de conexión.';
  }
}
