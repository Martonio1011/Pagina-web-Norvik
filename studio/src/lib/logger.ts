import pino from 'pino';

/**
 * Structured logging.
 *
 * Every ingestion run, every HTTP call to a supplier and every parse failure
 * goes through here. Logs are JSON in production and human-readable during
 * development.
 */

const level = process.env.LOG_LEVEL ?? 'info';
const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
  // Tokens must never reach a log file, however deeply they are nested.
  redact: {
    paths: [
      'token',
      '*.token',
      'headers["X-Shopify-Access-Token"]',
      'headers.authorization',
      'password',
      '*.password',
      'cookies',
      '*.cookies',
    ],
    censor: '[redacted]',
  },
});

/** A logger tagged with the subsystem it belongs to. */
export function childLogger(scope: string): pino.Logger {
  return logger.child({ scope });
}
