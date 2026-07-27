import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Environment configuration, validated with Zod.
 *
 * It is split in two on purpose. The core settings are what the app needs to
 * open its database and show you what it already knows; the Shopify settings
 * are only needed when actually talking to Shopify. Keeping them apart means a
 * missing API token gives you a dashboard with a clear "connect your store"
 * message instead of a stack trace on every page.
 */

/**
 * Accepts "5.50" and turns it into 550 cents, rejecting anything else.
 *
 * The fallback is given as the string a human would write in `.env`, and goes
 * through the same validation as a supplied value — so a typo in the default
 * would fail here rather than quietly becoming a price.
 */
function dollarsToCents(fallback: string) {
  return z.preprocess(
    (value) => (value === undefined || value === '' ? fallback : value),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'must be a dollar amount such as 5.50')
      .transform((value) => Math.round(Number(value) * 100)),
  );
}

const rate = z.coerce
  .number()
  .min(0, 'must be zero or more')
  .max(1, 'must be a fraction between 0 and 1, not a percentage');

const coreEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  DEFAULT_SHIPPING_COST: dollarsToCents('5.50'),
  PAYMENT_FEE_RATE: rate.default(0.03),
  RETURN_RATE: rate.default(0.08),

  TRENDSI_SESSION_DIR: z.string().default('.trendsi-session'),
  TRENDSI_REQUEST_DELAY_SECONDS: z.coerce
    .number()
    .min(0.5, 'refusing to hammer Trendsi: keep this at 0.5 seconds or more')
    .default(2.5),
  TRENDSI_CACHE_TTL_HOURS: z.coerce.number().min(0).default(12),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

const shopifyEnvSchema = z.object({
  SHOPIFY_STORE_DOMAIN: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/,
      'must be your myshopify domain without https://, e.g. norviik.myshopify.com',
    ),
  SHOPIFY_ADMIN_TOKEN: z
    .string()
    .min(10, 'is required — see .env.example for where to find it in your Shopify admin'),
  SHOPIFY_API_VERSION: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'must be a Shopify API version such as 2025-07')
    .default('2025-07'),
});

export type CoreEnv = z.infer<typeof coreEnvSchema>;
export type ShopifyEnv = z.infer<typeof shopifyEnvSchema>;

/**
 * Loads `.env` into `process.env` when running outside Next.js.
 *
 * Next.js already does this for the web app; standalone scripts run through
 * `tsx` do not, so they call this first.
 */
export function loadDotEnv(cwd: string = process.cwd()): void {
  const envPath = resolve(cwd, '.env');
  if (!existsSync(envPath)) return;
  process.loadEnvFile(envPath);
}

function formatIssues(issues: z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

let coreCache: CoreEnv | null = null;

/** The settings the app always needs. Throws listing every problem at once. */
export function getEnv(): CoreEnv {
  if (coreCache) return coreCache;

  const parsed = coreEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new EnvError(
      `Your .env is incomplete or invalid:\n\n${formatIssues(parsed.error.issues)}\n\n` +
        `Copy .env.example to .env and fill in the missing values.`,
    );
  }

  coreCache = parsed.data;
  return coreCache;
}

/**
 * The Shopify credentials, or a description of what is missing.
 *
 * Returns a result rather than throwing so the UI can render the "connect your
 * store" state instead of crashing. Callers that genuinely cannot proceed
 * without it use {@link requireShopifyEnv}.
 */
export function getShopifyEnv(): { ok: true; env: ShopifyEnv } | { ok: false; problems: string } {
  const parsed = shopifyEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    return { ok: false, problems: formatIssues(parsed.error.issues) };
  }
  return { ok: true, env: parsed.data };
}

export function requireShopifyEnv(): ShopifyEnv {
  const result = getShopifyEnv();
  if (!result.ok) {
    throw new EnvError(
      `Shopify is not configured:\n\n${result.problems}\n\n` +
        `Copy .env.example to .env and fill in the Shopify section.`,
    );
  }
  return result.env;
}

/** Test-only escape hatch so suites can validate a synthetic environment. */
export function resetEnvCache(): void {
  coreCache = null;
}
