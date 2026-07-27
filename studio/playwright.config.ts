import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * The suite runs against its own throwaway database so it can never touch the
 * working one, and starts the app itself.
 *
 * Preparing that database is the job of `global-setup.ts` and not of this
 * file: Playwright re-evaluates the config in every worker process, so
 * anything with a side effect here would run again — and, in the case of
 * clearing the database, would wipe it out from under the running tests.
 */

const E2E_DATABASE = resolve(process.cwd(), 'e2e.db');

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,

  use: {
    baseURL: 'http://127.0.0.1:4322',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Normally Playwright uses the browser it downloaded itself. Set
        // PLAYWRIGHT_CHROMIUM_PATH to reuse a Chromium already on the machine
        // — useful on a box where `playwright install` cannot reach the
        // download servers.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],

  // A production build, not `next dev`: the suite then measures the app that
  // actually ships, and pages are not compiled on first request — which in dev
  // makes the first assertion of a run race the compiler.
  webServer: {
    command: 'next build && next start --port 4322',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: `file:${E2E_DATABASE}`,
    },
  },
});
