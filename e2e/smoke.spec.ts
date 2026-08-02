import { expect, test } from '@playwright/test';
import { bootApp, drawStroke, nonWhitePixels } from './helpers';

test('boots to the welcome state with a rendering canvas', async ({ page }) => {
  await bootApp(page);
  await expect(page.locator('.hint-card')).toContainText('Pick a brush and start dreaming');
  await expect(page.locator('.viewport-canvas')).toBeVisible();
  // The blank document (white page) is actually painted, not just mounted.
  expect(await nonWhitePixels(page)).toBeGreaterThan(0);
});

test('a brush stroke paints pixels onto the canvas', async ({ page }) => {
  await bootApp(page);
  const before = await nonWhitePixels(page);
  await drawStroke(page);
  const after = await nonWhitePixels(page);
  expect(after).toBeGreaterThan(before + 100);
  // Drawing dismisses the welcome card.
  await expect(page.locator('.hint-card')).toHaveCount(0);
});

test('undo removes the stroke', async ({ page }) => {
  await bootApp(page);
  const before = await nonWhitePixels(page);
  await drawStroke(page);
  const drawn = await nonWhitePixels(page);
  expect(drawn).toBeGreaterThan(before + 100);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  // Re-render happens on requestAnimationFrame — poll instead of reading
  // pixels in the same tick (headless CI may lag a frame).
  // Rasterization isn't bit-exact across draws/platforms — after undo the
  // count must land far closer to the blank canvas than to the drawn one.
  await expect
    .poll(() => nonWhitePixels(page), { timeout: 3000 })
    .toBeLessThan(before + (drawn - before) * 0.25);
});

test('switching to Design mode reveals the design panels', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  await expect(page.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.design-panel')).toBeVisible();
  await expect(page.locator('.components-panel')).toBeVisible();
});

test('Dream AI generates a new layer from a prompt', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'AI helper', exact: true }).click();
  const panel = page.locator('.ai-panel');
  await expect(panel).toBeVisible();
  await panel.getByLabel('What should I paint?').fill('a sleepy fox under a starry sky');
  const layerCount = await page.locator('.layer-list > li').count();
  await panel.getByRole('button', { name: 'Make it!' }).click();
  await expect(panel).toContainText('Ta-da!');
  await expect(page.locator('.layer-list > li')).toHaveCount(layerCount + 1);
});

test('kid mode swaps in the big rail and back', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Little Dreamer mode' }).click();
  await expect(page.locator('.tool-rail.kid-rail')).toBeVisible();
  await expect(page.locator('.kid-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Little Dreamer mode' }).click();
  await expect(page.locator('.tool-rail.kid-rail')).toHaveCount(0);
  await expect(page.locator('.tool-rail')).toBeVisible();
});

test('switching to Arabic mirrors the shell (RTL)', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-popover select').selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('.app-title').first()).toHaveText('حُلم');
});

test('the dark theme toggle flips data-theme', async ({ page }) => {
  await bootApp(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-item', { hasText: 'Dark mode' }).locator('input').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.settings-item', { hasText: 'Dark mode' }).locator('input').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
