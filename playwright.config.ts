import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config. The app is served by `ng serve` with a proxy that
 * forwards `/api` to the live (read-only) production Function App, so pages
 * load real data without standing up Cosmos in CI. The QA agent adds specs
 * under `e2e/` per change; `smoke.spec.ts` is the always-on baseline.
 */
const PORT = 4200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start:e2e',
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env['CI'],
  },
});
