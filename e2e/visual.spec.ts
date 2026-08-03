import { expect, test } from '@playwright/test';
import { bootApp } from './helpers';

/**
 * Visual baseline: one full-page screenshot of the welcome state. This is a
 * CSS-regression guard, not a pixel-perfect contract — thresholds are
 * deliberately generous (cross-platform font anti-aliasing alone accounts
 * for a few percent of pixels). If a legitimate UI change breaks it,
 * regenerate with `npx playwright test --update-snapshots`.
 */
test('welcome state matches the visual baseline', async ({ page }) => {
  await bootApp(page);
  const toolbar = page.locator('.toolbar');
  const settings = page.getByRole('button', { name: 'Settings' });
  await expect(settings).toBeVisible();
  const [settingsBox, viewportWidth, scrollLeft] = await Promise.all([
    settings.boundingBox(),
    page.evaluate(() => window.innerWidth),
    toolbar.evaluate((element) => element.scrollLeft),
  ]);
  expect(scrollLeft).toBe(0);
  expect(settingsBox && settingsBox.x + settingsBox.width <= viewportWidth).toBe(true);
  await expect(page).toHaveScreenshot('welcome.png', {
    fullPage: true,
    animations: 'disabled',
    threshold: 0.3,
    maxDiffPixelRatio: 0.05,
  });
});
