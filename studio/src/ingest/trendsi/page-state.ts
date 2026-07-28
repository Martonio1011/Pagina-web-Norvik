/**
 * Reading what a Trendsi page actually is.
 *
 * Every scrape starts with the same question: did we get the page we asked
 * for, or did we get a login screen, a captcha, or an empty-handed "No
 * Results" that Trendsi dresses up with generic recommendations?
 *
 * Getting this wrong is how a scraper quietly fills a database with rubbish.
 * The logic lives here, as pure functions over plain observations, so every
 * case can be tested without a browser.
 */

export type PageState =
  /** We are logged in and looking at the page we asked for. */
  | 'AUTHENTICATED'
  /** The saved session is no longer valid. A human has to log in again. */
  | 'SESSION_EXPIRED'
  /**
   * A bot check is on screen. We stop here, always. Solving it is off the
   * table, and hammering it would only make things worse.
   */
  | 'CAPTCHA'
  /** Reached the site but cannot tell what we are looking at. Never assume. */
  | 'UNKNOWN';

/** What the browser can tell us about the page it has landed on. */
export interface PageObservation {
  url: string;
  /** HTTP status of the main document, when known. */
  status?: number | null;
  /** Whether the DOM contains a visible password input. */
  hasPasswordField: boolean;
  /** Visible text of the page, already lowercased by the caller if convenient. */
  bodyText: string;
}

const LOGIN_URL_HINTS = ['/login', '/signin', '/sign-in', '/auth', '/account/login'];

const CAPTCHA_HINTS = [
  'captcha',
  'recaptcha',
  'hcaptcha',
  'cloudflare',
  'are you a robot',
  'verify you are human',
  'unusual traffic',
  'security check',
];

const LOGIN_TEXT_HINTS = [
  'sign in',
  'log in',
  'sign into your account',
  'forgot password',
  'iniciar sesión',
];

/**
 * Works out what we are looking at.
 *
 * Order matters: a captcha shown on a login page is still a captcha, and
 * stopping is the right answer for both — but the message a human needs is
 * different, so the captcha wins.
 */
export function classifyPageState(observation: PageObservation): PageState {
  const url = observation.url.toLowerCase();
  const text = observation.bodyText.toLowerCase();

  if (CAPTCHA_HINTS.some((hint) => text.includes(hint))) return 'CAPTCHA';

  // 401/403 on the document itself is unambiguous.
  if (observation.status === 401 || observation.status === 403) return 'SESSION_EXPIRED';

  if (LOGIN_URL_HINTS.some((hint) => url.includes(hint))) return 'SESSION_EXPIRED';

  // A password box on the page we asked for means we were bounced to a login
  // form, whatever the URL says.
  if (observation.hasPasswordField && LOGIN_TEXT_HINTS.some((hint) => text.includes(hint))) {
    return 'SESSION_EXPIRED';
  }

  // Being on a product URL with no password box is the only positive signal we
  // trust. Anything else stays UNKNOWN rather than being waved through.
  if (url.includes('/products/') && !observation.hasPasswordField) return 'AUTHENTICATED';

  return 'UNKNOWN';
}

/**
 * Trendsi's search is a literal AND of every token, and it gives up easily:
 * more than four or five words and it returns nothing. What it shows then is
 * not an empty page — it is a "No Results" notice followed by a grid of
 * generic recommendations.
 *
 * Those recommendations look exactly like results to a scraper. Swallowing
 * them would fill the candidate list with products nobody searched for, which
 * is worse than returning nothing.
 */
export type SearchOutcome = 'RESULTS' | 'NO_RESULTS' | 'UNKNOWN';

const NO_RESULTS_HINTS = [
  'no results',
  'no result found',
  'no products found',
  'we could not find',
  "we couldn't find",
  'sin resultados',
  'try a different search',
  'you may also like',
  'recommended for you',
];

export interface SearchObservation {
  bodyText: string;
  /** How many product tiles the page rendered. */
  resultCount: number;
}

export function classifySearchOutcome(observation: SearchObservation): SearchOutcome {
  const text = observation.bodyText.toLowerCase();
  const saysNoResults = NO_RESULTS_HINTS.some((hint) => text.includes(hint));

  // The dangerous case: the page says "no results" and still shows tiles.
  // Those tiles are recommendations. Treat the search as empty.
  if (saysNoResults) return 'NO_RESULTS';

  if (observation.resultCount > 0) return 'RESULTS';
  if (observation.resultCount === 0) return 'NO_RESULTS';

  return 'UNKNOWN';
}

/**
 * Trendsi's search tolerates about four tokens before it starts returning
 * nothing. Longer queries are not an error we should discover at runtime —
 * they are a query we should never have sent.
 */
export const MAX_SEARCH_TOKENS = 4;

export function isQueryTooLong(query: string): boolean {
  return countQueryTokens(query) > MAX_SEARCH_TOKENS;
}

export function countQueryTokens(query: string): number {
  return query.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Trims a query to the token limit, keeping the leading words.
 *
 * Used only where a human typed something too long: the UI shows what it will
 * actually send, so the shortening is never a surprise.
 */
export function shortenQuery(query: string, maxTokens: number = MAX_SEARCH_TOKENS): string {
  return query.trim().split(/\s+/).filter(Boolean).slice(0, maxTokens).join(' ');
}
