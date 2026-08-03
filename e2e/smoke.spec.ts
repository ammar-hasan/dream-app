import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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

test('connected OpenAI-compatible image generation paints returned PNG pixels', async ({
  page,
}) => {
  const purplePng =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAAUSURBVAiZY6yxevufgYGBgYkBCgAn5wKm8Nhy+QAAAABJRU5ErkJggg==';
  await page.route('**/images/generations', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'gpt-image-2',
      size: '1088x816',
      quality: 'low',
    });
    expect(body).not.toHaveProperty('response_format');
    await route.fulfill({ status: 200, json: { data: [{ b64_json: purplePng }] } });
  });

  await bootApp(page);
  const before = await nonWhitePixels(page);
  await page.getByRole('button', { name: 'AI helper', exact: true }).click();
  const panel = page.locator('.ai-panel');
  await panel.getByRole('button', { name: /Settings:/ }).click();
  await panel.locator('.ai-settings-body select').selectOption('openai-compatible');
  await panel.getByLabel('Base URL').fill('https://api.openai.com/v1');
  await panel.getByLabel('Model', { exact: true }).fill('gpt-4o-mini');
  await panel.getByLabel('Image model').fill('gpt-image-2');
  await panel.getByLabel('API key').fill('sk-e2e-not-a-secret');
  await panel.getByLabel('This AI can also paint images').check();
  await panel.getByRole('button', { name: 'Save' }).click();

  await panel.getByLabel('What should I paint?').fill('a purple moon');
  await panel.getByRole('button', { name: 'Make it!' }).click();
  await expect(panel).toContainText('Ta-da!');
  await expect(page.locator('.layer-list > li')).toHaveCount(2);
  await expect.poll(() => nonWhitePixels(page)).toBeGreaterThan(before + 10_000);
});

test('local real-code export embeds raster images instead of placeholder boxes', async ({
  page,
}) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'AI helper', exact: true }).click();
  const panel = page.locator('.ai-panel');
  await panel.getByLabel('What should I paint?').fill('a purple moon');
  await panel.getByRole('button', { name: 'Make it!' }).click();
  await expect(panel).toContainText('Ta-da!');
  await panel.getByRole('button', { name: 'Close AI helper' }).click();

  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('button', { name: 'Real code (AI) (.html)' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export' })
    .getByRole('button', { name: 'Export' })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const html = await readFile(path!, 'utf8');
  expect(html).toContain('<img class="shape" src="data:image/png;base64,');
  expect(html).not.toContain('structure-only image description');
});

test('a game description prepares Dream Jumper offline', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('tab', { name: 'Play' }).click();
  await page
    .getByLabel('Describe your game')
    .fill('Run and jump across platforms to reach the flag, nice and easy');
  await page.getByRole('button', { name: 'Make game' }).click();
  await expect(page.getByRole('button', { name: 'Dream Jumper' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('status')).toHaveText('Dream Jumper is ready — press Play!');
  await expect(page.getByRole('button', { name: 'Play!' })).toBeVisible();
});

test('slide settings reach Presenter view with notes', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Add frame' }).click();
  await page.getByRole('button', { name: 'Slide settings' }).click();

  const dialog = page.getByRole('dialog', { name: 'Slide settings' });
  await dialog.getByLabel('Transition into this slide').selectOption('fade');
  await dialog.getByLabel('Advance automatically').check();
  await dialog.getByLabel('Seconds on this slide').fill('4');
  await dialog.getByLabel('Speaker notes').pressSequentially('Ask everyone what they notice.');
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('button', { name: 'Frame 1' }).click();
  await page.getByRole('button', { name: 'Slide settings' }).click();
  const firstDialog = page.getByRole('dialog', { name: 'Slide settings' });
  await firstDialog.getByLabel('Advance automatically').check();
  await firstDialog.getByLabel('Seconds on this slide').fill('1');
  await firstDialog.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('tab', { name: 'Present' }).click();
  await page.getByRole('button', { name: 'Auto' }).click();
  await expect(page.locator('.present-counter')).toHaveText('2 / 2', { timeout: 2000 });
  await page.getByRole('button', { name: 'Presenter' }).click();

  const presenter = page.locator('.presenter-panel');
  await expect(presenter).toContainText('Ask everyone what they notice.');
  await expect(presenter).toContainText('Advances in 4 seconds');
  await expect(presenter).toContainText('End of deck');
});

test('MP4 export appears only when native recording is supported', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  const supported = await page.evaluate(
    () => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4'),
  );
  await expect(page.getByRole('button', { name: 'MP4 video' })).toHaveCount(supported ? 1 : 0);
});

test('social video export saves synchronized captions as one undoable edit', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Add frame' }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('button', { name: 'WebM video' }).click();
  await page.getByRole('button', { name: 'Vertical 9:16' }).click();

  await page.getByLabel('Frame 1 of 2').fill('First message');
  await page.getByRole('button', { name: 'Next frame' }).click();
  await page.getByLabel('Frame 2 of 2').fill('Second message');

  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export' })
    .getByRole('button', { name: 'Export' })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Untitled-vertical.webm');
  await expect(page.locator('.timeline-frame-caption')).toHaveCount(2);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.timeline-frame-caption')).toHaveCount(0);
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
