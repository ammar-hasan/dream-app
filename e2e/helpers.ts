import { expect, type Page } from '@playwright/test';

/**
 * Boot the app to a fully interactive state: the splash has unmounted and
 * the welcome card is on the canvas. Each test gets a fresh browser context
 * from Playwright, so localStorage/IndexedDB start empty.
 */
export async function bootApp(page: Page) {
  // Reduced motion makes the run deterministic: all app animation is
  // transform/opacity-only and disabled under prefers-reduced-motion.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.splash')).toHaveCount(0);
  await expect(page.locator('.hint-card')).toBeVisible();
}

/**
 * Count of non-white pixels on the main viewport canvas — a robust proxy for
 * "something is drawn" that avoids screenshot flake. The blank document is
 * pure white; the page shadow/border add a constant amount of non-white
 * pixels, so comparisons are always before/after within one test.
 */
export async function nonWhitePixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.viewport-canvas');
    if (!canvas) throw new Error('viewport canvas not found');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) count += 1;
    }
    return count;
  });
}

/** Drag a short brush stroke across the middle of the canvas. */
export async function drawStroke(page: Page) {
  const canvas = page.locator('.viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport canvas has no box');
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width / 2 - 120;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  await page.mouse.move(x0 + 240, y, { steps: 12 });
  await page.mouse.up();
}
