import { z } from 'zod';
import { requireShopifyEnv, type ShopifyEnv } from '@/env';
import { childLogger } from '@/lib/logger';

/**
 * Shopify Admin GraphQL client.
 *
 * Deliberately small: one authenticated POST with retries and throttle
 * awareness. The API version is pinned in `.env`, never "latest" — Shopify
 * ships breaking changes quarterly and an app that follows the newest version
 * breaks on Shopify's schedule rather than on ours.
 */

const log = childLogger('shopify');

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ShopifyApiError';
  }
}

/** Thrown when the token is missing, wrong, or lacks a scope. Actionable by a human. */
export class ShopifyAuthError extends ShopifyApiError {
  constructor(message: string, status: number | null, detail?: unknown) {
    super(message, status, detail);
    this.name = 'ShopifyAuthError';
  }
}

const userErrorSchema = z.object({
  field: z.array(z.string()).nullish(),
  message: z.string(),
});

const graphqlResponseSchema = z.object({
  data: z.unknown().nullish(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        extensions: z.object({ code: z.string().optional() }).loose().optional(),
      }),
    )
    .optional(),
  extensions: z
    .object({
      cost: z
        .object({
          requestedQueryCost: z.number(),
          actualQueryCost: z.number().nullish(),
          throttleStatus: z.object({
            maximumAvailable: z.number(),
            currentlyAvailable: z.number(),
            restoreRate: z.number(),
          }),
        })
        .optional(),
    })
    .optional(),
});

export type ShopifyUserError = z.infer<typeof userErrorSchema>;

export interface ShopifyRequestOptions {
  /** Named for the logs, so a slow or failing call is identifiable. */
  operationName: string;
  variables?: Record<string, unknown>;
  /** Total attempts including the first. */
  maxAttempts?: number;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ShopifyClient {
  private readonly endpoint: string;

  constructor(private readonly env: ShopifyEnv = requireShopifyEnv()) {
    this.endpoint = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
  }

  get storeDomain(): string {
    return this.env.SHOPIFY_STORE_DOMAIN;
  }

  get apiVersion(): string {
    return this.env.SHOPIFY_API_VERSION;
  }

  /**
   * Runs a query and validates the response against `schema`.
   *
   * Nothing untyped escapes this method: if Shopify returns a shape the schema
   * does not recognise, that is an error, not something to work around
   * downstream with optional chaining.
   */
  async query<T>(
    document: string,
    schema: z.ZodType<T>,
    options: ShopifyRequestOptions,
  ): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 4;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.attempt(document, schema, options, attempt);
      } catch (error) {
        lastError = error;

        // A bad token will still be a bad token on the fourth attempt.
        if (error instanceof ShopifyAuthError) throw error;

        const retryable =
          error instanceof ShopifyApiError &&
          (error.status === null || RETRYABLE_STATUS.has(error.status));

        if (!retryable || attempt === maxAttempts) throw error;

        const backoffMs = Math.min(2 ** attempt * 500, 8000);
        log.warn(
          {
            operation: options.operationName,
            attempt,
            backoffMs,
            status: (error as ShopifyApiError).status,
          },
          'Shopify call failed, backing off',
        );
        await sleep(backoffMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async attempt<T>(
    document: string,
    schema: z.ZodType<T>,
    options: ShopifyRequestOptions,
    attempt: number,
  ): Promise<T> {
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.env.SHOPIFY_ADMIN_TOKEN,
          Accept: 'application/json',
        },
        body: JSON.stringify({ query: document, variables: options.variables ?? {} }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      // Network-level failure: DNS, TLS, timeout. Retryable, so status is null.
      throw new ShopifyApiError(
        `Could not reach ${this.storeDomain}: ${error instanceof Error ? error.message : String(error)}`,
        null,
        error,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ShopifyAuthError(
        `Shopify rejected the admin token (HTTP ${response.status}). Check SHOPIFY_ADMIN_TOKEN in .env and that the app has the required scopes.`,
        response.status,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '<unreadable body>');
      throw new ShopifyApiError(
        `Shopify returned HTTP ${response.status} for ${options.operationName}`,
        response.status,
        body.slice(0, 1000),
      );
    }

    const json: unknown = await response.json();
    const envelope = graphqlResponseSchema.safeParse(json);
    if (!envelope.success) {
      throw new ShopifyApiError(
        `Shopify returned a response this app does not understand for ${options.operationName}`,
        response.status,
        envelope.error.issues,
      );
    }

    if (envelope.data.errors && envelope.data.errors.length > 0) {
      const messages = envelope.data.errors.map((e) => e.message).join('; ');
      const isAuth = envelope.data.errors.some(
        (e) =>
          e.extensions?.code === 'ACCESS_DENIED' || /access denied|not approved/i.test(e.message),
      );
      const ErrorClass = isAuth ? ShopifyAuthError : ShopifyApiError;
      throw new ErrorClass(
        `Shopify rejected ${options.operationName}: ${messages}`,
        response.status,
        envelope.data.errors,
      );
    }

    const throttle = envelope.data.extensions?.cost?.throttleStatus;
    if (throttle && throttle.currentlyAvailable < throttle.maximumAvailable * 0.2) {
      // Shopify meters by query cost, not request count. When the bucket runs
      // low we wait for it to refill rather than collecting 429s.
      const waitMs = Math.ceil(((throttle.maximumAvailable * 0.5) / throttle.restoreRate) * 1000);
      log.info({ operation: options.operationName, waitMs }, 'Shopify rate limit low, pausing');
      await sleep(Math.min(waitMs, 10_000));
    }

    const parsed = schema.safeParse(envelope.data.data);
    if (!parsed.success) {
      throw new ShopifyApiError(
        `Shopify's response for ${options.operationName} did not match the expected shape. ` +
          `This usually means the pinned API version (${this.apiVersion}) has moved on.`,
        response.status,
        parsed.error.issues.slice(0, 10),
      );
    }

    log.debug(
      { operation: options.operationName, attempt, ms: Date.now() - startedAt },
      'Shopify call ok',
    );
    return parsed.data;
  }
}

export { userErrorSchema };
