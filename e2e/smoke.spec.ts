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

test('tabular science data becomes a grouped scalable plot in one undo', async ({ page }) => {
  await bootApp(page);
  const before = await nonWhitePixels(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('button', { name: 'Plot data…' }).click();
  const plot = page.getByRole('dialog', { name: 'Create data plot' });
  await expect(plot).toContainText('4 rows · 1 series ready');
  await plot.getByLabel('Figure title').fill('Reaction rate');
  await plot.getByRole('button', { name: 'Insert plot' }).click();

  await expect(page.locator('.layer-list > li')).toHaveCount(2);
  await expect(page.locator('.layer-list')).toContainText('Data plot');
  await expect.poll(() => nonWhitePixels(page)).toBeGreaterThan(before + 2_000);

  await page.getByRole('button', { name: 'Export' }).click();
  const exportDialog = page.getByRole('dialog', { name: 'Export' });
  await exportDialog.getByRole('button', { name: 'SVG' }).click();
  const downloadPromise = page.waitForEvent('download');
  await exportDialog.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const svg = await readFile(path!, 'utf8');
  expect(svg).toContain('Reaction rate');
  expect(svg).toContain('<ellipse');

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.layer-list > li')).toHaveCount(1);
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

test('a reviewed story becomes painted animation frames and one undo removes the batch', async ({
  page,
}) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Story/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Make a story' });
  await dialog
    .getByLabel('What happens in your story?')
    .fill('Moon wakes up, then Fox waves hello');
  await dialog.getByRole('button', { name: 'Plan my frames' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Frame 1' })).toHaveValue('Moon wakes up');
  await expect(dialog.getByRole('textbox', { name: 'Frame 2' })).toHaveValue('Fox waves hello');
  await expect(page.locator('.timeline-bar')).toHaveCount(0);

  await dialog.getByRole('textbox', { name: 'Frame 2' }).fill('Fox smiles and waves');
  await dialog.getByRole('button', { name: 'Make animation' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.timeline-frame:not(.timeline-add)')).toHaveCount(2);
  await expect(page.locator('.timeline-frame-caption')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.locator('.hint-card')).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.timeline-bar')).toHaveCount(0);
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

test('a share link opens the viewer-only prototype without private project data', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          (window as unknown as { copiedDreamLink: string }).copiedDreamLink = value;
          return Promise.resolve();
        },
      },
    });
  });
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Add frame' }).click();
  await page.getByRole('button', { name: 'Slide settings' }).click();
  const slide = page.getByRole('dialog', { name: 'Slide settings' });
  await slide.getByLabel('Speaker notes').fill('Private launch reminder.');
  await slide.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('button', { name: 'Share app link' }).click();
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByText('Share link copied — send it to anyone.')).toBeVisible();
  const link = await page.getByLabel('Share link').inputValue();
  expect(link).toContain('#dream-share=v1.');

  const viewer = await page.context().newPage();
  await viewer.goto(link);
  await expect(viewer.locator('main#stage')).toHaveAttribute('aria-label', 'Untitled');
  await expect(viewer.getByText('Made with Dream')).toBeVisible();
  await expect(viewer.getByText('Private launch reminder.')).toHaveCount(0);
  await expect(viewer.locator('.toolbar')).toHaveCount(0);
});

test('a damaged share link falls back to Dream without executing it', async ({ page }) => {
  await page.goto('/#dream-share=v1.r.bm90LWpzb24');
  await expect(page.locator('.splash')).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('damaged or unsafe');
  await expect(page.locator('.hint-card')).toBeVisible();
  await expect(page).not.toHaveURL(/dream-share/);
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
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Presenter' }).click();
  const presenterPage = await popupPromise;

  const presenter = presenterPage.locator('.presenter-console');
  await expect(presenter).toContainText('Ask everyone what they notice.');
  await expect(presenter).toContainText('Advances in 4 seconds');
  await expect(presenter).toContainText('End of deck');
  await expect(presenter.locator('.presenter-preview-canvas')).toHaveCount(1);
  await expect(presenterPage.getByRole('button', { name: 'Show audience window' })).toBeVisible();
  await expect(page.getByText('Ask everyone what they notice.')).toHaveCount(0);

  await presenterPage.getByRole('button', { name: 'Auto' }).click();
  await presenterPage.getByRole('button', { name: 'Previous slide' }).click();
  await expect(page.locator('.present-counter')).toHaveText('1 / 2');
  await expect(presenter).toContainText('Current slide 1');
  await expect(presenter.locator('.presenter-preview-canvas')).toHaveCount(2);
});

test('blocked Presenter popup never exposes private notes on the audience stage', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Slide settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Slide settings' });
  await dialog.getByLabel('Speaker notes').fill('Private reminder for me only.');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('tab', { name: 'Present' }).click();
  await page.getByRole('button', { name: 'Presenter' }).click();

  await expect(page.getByRole('alert')).toContainText('Allow pop-ups for Dream');
  await expect(page.getByText('Private reminder for me only.')).toHaveCount(0);
  await expect(page.locator('.present-counter')).toHaveText('1 / 1');
});

test('phone timeline keeps frames visible while focusing one task at a time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Add frame' }).click();

  const tasks = page.getByRole('group', { name: 'Timeline tools' });
  await expect(tasks).toBeVisible();
  await expect(tasks.getByRole('button', { name: 'App' })).toBeVisible();
  const [taskBox, viewportWidth] = await Promise.all([
    tasks.boundingBox(),
    page.evaluate(() => window.innerWidth),
  ]);
  expect(taskBox && taskBox.x >= 0 && taskBox.x + taskBox.width <= viewportWidth).toBe(true);
  await expect(page.getByRole('button', { name: 'Frame 1' })).toBeVisible();
  await expect(page.getByLabel('Frames per second')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Slide settings' })).toBeHidden();

  await tasks.getByRole('button', { name: 'Slides' }).click();
  await expect(page.getByRole('button', { name: 'Slide settings' })).toBeVisible();
  await expect(page.getByLabel('Frames per second')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Duplicate this frame' })).toBeVisible();

  await tasks.getByRole('button', { name: 'App' }).click();
  const appAction = page.getByRole('button', { name: /Link your frames/ });
  await expect(appAction).toBeVisible();
  await appAction.click();
  await expect(page.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
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

test('scientific connectors and labels export as real scalable SVG', async ({ page }) => {
  await bootApp(page);

  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await page.getByRole('combobox', { name: 'Line ends' }).selectOption('double-arrow');
  await drawStroke(page);

  await page.getByRole('button', { name: 'Text', exact: true }).click();
  const canvas = page.locator('.viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport canvas has no box');
  await page.mouse.click(box.x + box.width / 2 - 50, box.y + box.height / 2 + 60);
  const input = page.getByRole('textbox', { name: 'Text input' });
  await expect(input).toBeVisible();
  await input.fill('H2O');
  await input.press('Home');
  await input.press('ArrowRight');
  await input.press('Shift+ArrowRight');
  await page.getByRole('button', { name: '₂' }).click();
  await expect(input).toHaveValue('H₂O');
  await input.press('Enter');

  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await dialog.getByRole('button', { name: 'SVG' }).click();
  await expect(dialog).toContainText('Scalable shapes, strokes, connectors and text');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Untitled.svg');
  const path = await download.path();
  expect(path).not.toBeNull();
  const svg = await readFile(path!, 'utf8');
  expect(svg).toContain('<svg');
  expect(svg).toContain('<path d=');
  expect(svg).toContain('H₂O');

  await page.getByRole('button', { name: 'Eraser', exact: true }).click();
  await drawStroke(page);
  await page.getByRole('button', { name: 'Export' }).click();
  const fallback = page.getByRole('dialog', { name: 'Export' });
  await fallback.getByRole('button', { name: 'SVG' }).click();
  await expect(fallback).toContainText('use PNG to keep exactly what you see');
  await expect(fallback.getByRole('button', { name: 'Export' })).toBeDisabled();
  await fallback.getByRole('button', { name: 'PNG' }).click();
  await expect(fallback.getByRole('button', { name: 'Export' })).toBeEnabled();
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
  const trim = page.getByRole('group', { name: 'Trim video' });
  await trim.getByLabel('Start frame').selectOption({ label: 'Frame 2' });
  await expect(trim.getByLabel('End frame')).toHaveValue('1');
  await expect(page.getByText(/about 0\.2 seconds of video/)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Export' })
    .getByRole('button', { name: 'Export' })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Untitled-vertical.webm');
  await expect(page.getByRole('button', { name: 'Frame 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Frame 2' })).toBeVisible();
  await expect(page.locator('.timeline-frame-caption')).toHaveCount(2);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.timeline-frame-caption')).toHaveCount(0);
});

test('kid mode swaps in the big rail and back', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Little Dreamer mode' }).click();
  await expect(page.locator('.tool-rail.kid-rail')).toBeVisible();
  await expect(page.locator('.kid-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tell a story!' })).toBeVisible();
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

test('Persian RTL includes a real calligraphy drawing path', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-popover select').selectOption('fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await expect(page.locator('.app-title').first()).toHaveText('Dream');
  await expect(page.locator('.settings-popover')).toBeInViewport();

  const nib = page.getByRole('combobox', { name: 'نوک قلم‌مو' });
  await nib.selectOption('calligraphy');
  await expect(nib).toHaveValue('calligraphy');
  const before = await nonWhitePixels(page);
  await drawStroke(page);
  expect(await nonWhitePixels(page)).toBeGreaterThan(before + 100);
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
