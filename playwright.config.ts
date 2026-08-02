import { defineConfig, devices } from '@playwright/test';

/**
 * E2E harness. Runs against `vite preview` of the production build (the
 * webServer command builds first, so tests always exercise what CI ships).
 * Chromium is the required project; WebKit/Firefox are opt-in via
 * `DREAM_E2E_ALL_BROWSERS=1` for occasional cross-browser spot checks.
 */
export default defineConfig({
  testDir: './e2e',
  // One shared snapshot across platforms (the alternative — per-OS baselines —
  // means snapshots generated on macOS never match Linux CI at all).
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{-projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'html',
  use: {
    baseURL: 'http://localhost:4173',
    // Deterministic visuals: bootApp() emulates reduced motion so the app
    // disables all animation (`use.reducedMotion` is not in this Playwright
    // version's typed options).
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.env.DREAM_E2E_ALL_BROWSERS
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
