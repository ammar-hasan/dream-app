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

test('the first drawing offers one direct, undo-safe path into editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const target = window as Window & { __dreamHaptics?: Array<number | number[]> };
    target.__dreamHaptics = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        target.__dreamHaptics?.push(pattern);
        return true;
      },
    });
  });
  await bootApp(page);
  const before = await nonWhitePixels(page);
  await drawStroke(page);

  const invitation = page.locator('.edit-invite');
  await expect(invitation).toContainText('Want to move or change that?');
  await expect(invitation.getByRole('button', { name: 'Select it' })).toHaveCSS(
    'min-height',
    '44px',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
  await expect(page.getByRole('tab', { name: 'Draw' })).toHaveAttribute('aria-selected', 'true');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await invitation.getByRole('button', { name: 'Select it' }).click();
  await expect(page.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Design' })).toBeFocused();
  await expect(page.locator('.design-panel')).toContainText('1 object selected');
  await expect(invitation).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as Window & { __dreamHaptics?: Array<number | number[]> }).__dreamHaptics,
    ),
  ).toEqual([8]);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => nonWhitePixels(page)).toBeLessThan(before + 100);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: 'Draw' }).click();
  await drawStroke(page);
  await expect(invitation).toHaveCount(0);
});

test('finding Design independently suppresses the beginner edit invitation', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('tab', { name: 'Draw' }).click();
  await drawStroke(page);
  await expect(page.locator('.edit-invite')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('dream:edit-hint-seen'))).toBe('1');
});

test('brush presets expose their complete editable settings', async ({ page }) => {
  await bootApp(page);
  const marker = page.getByRole('button', { name: 'Soft marker' });
  await marker.click();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.tool-options')).toContainText('18px');
  await expect(page.locator('.tool-options')).toContainText('55%');

  await page.locator('.tool-options input[type="range"]').first().fill('19');
  await expect(marker).toHaveAttribute('aria-pressed', 'false');
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

test('canvas pointers preview the object and explain direct-manipulation state', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const target = window as Window & { __dreamHaptics?: Array<number | number[]> };
    target.__dreamHaptics = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        target.__dreamHaptics?.push(pattern);
        return true;
      },
    });
  });
  await bootApp(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await drawStroke(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('button', { name: 'Select', exact: true }).click();

  const canvas = page.locator('.viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport canvas has no box');
  const accentPixels = () =>
    canvas.evaluate((element) => {
      const context = (element as HTMLCanvasElement).getContext('2d');
      if (!context) return 0;
      const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index]! < 200 && pixels[index + 1]! < 200 && pixels[index + 2]! > 235) {
          count += 1;
        }
      }
      return count;
    });

  await page.mouse.move(box.x + box.width - 20, box.y + 20);
  await expect(canvas).toHaveCSS('cursor', 'default');
  const beforeHover = await accentPixels();

  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(center.x, center.y);
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await expect.poll(accentPixels).toBeGreaterThan(beforeHover + 50);

  await page.mouse.click(center.x, center.y);
  await expect(page.locator('.design-panel')).toContainText('1 object selected');
  const northWest = { x: center.x - 124, y: center.y - 4 };
  await page.mouse.move(northWest.x, northWest.y);
  await expect(canvas).toHaveCSS('cursor', 'nwse-resize');
  await page.mouse.move(center.x, center.y - 26);
  await expect(canvas).toHaveCSS('cursor', /url\(/);
  await page.mouse.down();
  await page.keyboard.down('Shift');
  await page.mouse.move(center.x + 30, center.y - 20);
  await page.mouse.move(center.x + 30, center.y);
  await page.mouse.move(center.x + 31, center.y + 1);
  await expect(page.getByRole('status')).toHaveText('90° · 15° snap');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __dreamHaptics?: Array<number | number[]> }).__dreamHaptics,
      ),
    )
    .toEqual([5]);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('.rotation-feedback')).toHaveCount(0);

  await page.getByRole('button', { name: 'Pan', exact: true }).click();
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await expect(canvas).toHaveCSS('cursor', 'grabbing');
  await page.mouse.up();
  await expect(canvas).toHaveCSS('cursor', 'grab');

  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  await expect(canvas).toHaveCSS('cursor', 'zoom-in');
  await page.keyboard.down('Alt');
  await page.mouse.move(center.x + 1, center.y);
  await expect(canvas).toHaveCSS('cursor', 'zoom-out');
  await page.keyboard.up('Alt');
});

test('selection snapping gives one visible and tactile detent per guide', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & { __dreamHaptics?: Array<number | number[]> };
    target.__dreamHaptics = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        target.__dreamHaptics?.push(pattern);
        return true;
      },
    });
  });
  await bootApp(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await drawStroke(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('button', { name: 'Select', exact: true }).click();

  const canvas = page.locator('.viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport canvas has no box');
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(center.x, center.y);

  await page.mouse.move(center.x, center.y);
  const pointerX = Number((await page.locator('.status-pointer').textContent())?.split(',')[0]);
  const documentWidth = Number(
    (await page.locator('.status-item').nth(1).textContent())?.split('×')[0],
  );
  const centerGuideDelta = documentWidth / 2 - pointerX;
  await page.mouse.down();
  await page.mouse.move(center.x + centerGuideDelta, center.y);
  await page.mouse.move(center.x + centerGuideDelta + 1, center.y);
  await expect(page.locator('.snap-feedback')).toHaveText('Snapped');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __dreamHaptics?: Array<number | number[]> }).__dreamHaptics,
      ),
    )
    .toEqual([5]);

  await page.mouse.up();
  await expect(page.locator('.snap-feedback')).toHaveCount(0);
});

test('canvas drag targets distinguish components, images and invalid content', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & { __dreamHaptics?: Array<number | number[]> };
    target.__dreamHaptics = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        target.__dreamHaptics?.push(pattern);
        return true;
      },
    });
  });
  await bootApp(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const viewport = page.locator('.viewport');
  const dispatchDrag = (kind: 'component' | 'image' | 'invalid') =>
    viewport.evaluate((element, dragKind) => {
      const transfer = new DataTransfer();
      if (dragKind === 'component') {
        transfer.setData('application/x-dream-component', 'component-test');
      } else if (dragKind === 'image') {
        transfer.items.add(new File(['pixel'], 'pixel.png', { type: 'image/png' }));
      } else {
        transfer.setData('text/plain', 'not supported');
      }
      element.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
    }, kind);

  await dispatchDrag('component');
  await expect(viewport).toHaveAttribute('data-drop-state', 'component');
  await expect(viewport.getByRole('status')).toHaveText('Release to place this component');

  await dispatchDrag('image');
  await expect(viewport).toHaveAttribute('data-drop-state', 'image');
  await expect(viewport.getByRole('status')).toHaveText('Release to import this image');

  await dispatchDrag('invalid');
  await expect(viewport).toHaveAttribute('data-drop-state', 'invalid');
  await expect(viewport.getByRole('status')).toHaveText('Drop an image or a Dream component here');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __dreamHaptics?: Array<number | number[]> }).__dreamHaptics,
      ),
    )
    .toEqual([8, 8, [8, 28, 8]]);

  await viewport.evaluate((element) => {
    element.dispatchEvent(new DragEvent('dragleave', { bubbles: true, relatedTarget: null }));
  });
  await expect(viewport).not.toHaveAttribute('data-drop-state');

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const haptics = page.getByRole('checkbox', { name: /Touch feedback/ });
  await haptics.uncheck();
  await dispatchDrag('component');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __dreamHaptics?: Array<number | number[]> }).__dreamHaptics,
      ),
    )
    .toEqual([8, 8, [8, 28, 8]]);

  await viewport.evaluate((element) => {
    element.dispatchEvent(new DragEvent('dragleave', { bubbles: true, relatedTarget: null }));
  });
  await haptics.check();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await dispatchDrag('invalid');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __dreamHaptics?: Array<number | number[]> }).__dreamHaptics,
      ),
    )
    .toEqual([8, 8, [8, 28, 8]]);
});

test('component drags preview the named copy at its exact canvas scale', async ({ page }) => {
  await bootApp(page);
  const canvas = page.locator('canvas.viewport-canvas');
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  const source = {
    x: canvasBox!.x + canvasBox!.width / 2,
    y: canvasBox!.y + canvasBox!.height / 2,
  };
  await page.mouse.move(source.x - 28, source.y);
  await page.mouse.down();
  await page.mouse.move(source.x + 28, source.y, { steps: 8 });
  await page.mouse.up();

  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page.mouse.click(source.x, source.y);
  await page.getByRole('button', { name: 'Create component from selection' }).click();
  const components = page.getByLabel('Components');
  await components.getByPlaceholder('Component name').fill('Button chip');
  await components.getByRole('button', { name: 'Save', exact: true }).click();

  const card = page.locator('.component-card').filter({ hasText: 'Button chip' });
  await expect(card).toBeVisible();
  const cardBox = await card.boundingBox();
  expect(cardBox).not.toBeNull();
  const before = await nonWhitePixels(page);
  const target = { x: canvasBox!.x + canvasBox!.width * 0.67, y: source.y + 70 };
  await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });

  await expect(page.locator('.viewport').getByRole('status')).toHaveText(
    'Release to place Button chip',
  );
  await expect.poll(() => nonWhitePixels(page)).toBeGreaterThan(before);
  await page.mouse.up();

  await expect(page.locator('.layer-list > li')).toHaveCount(2);
  await expect(page.locator('.layer-list')).toContainText('Button chip');

  const insert = components.getByRole('button', {
    name: 'Insert Button chip at canvas center',
  });
  await insert.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.layer-list > li')).toHaveCount(3);
});

test('tooltips escape the scrolling toolbar and tool rail', async ({ page }) => {
  await bootApp(page);

  const ai = page.getByRole('button', { name: 'AI helper', exact: true });
  await ai.hover();
  await expect
    .poll(() =>
      ai.evaluate((element) => {
        const tip = getComputedStyle(element, '::after');
        return [tip.content, tip.opacity, tip.position, tip.getPropertyValue('position-area')];
      }),
    )
    .toEqual(['"AI helper (A)"', '1', 'fixed', 'bottom']);

  const brush = page.getByRole('button', { name: 'Brush', exact: true });
  await brush.hover();
  await expect
    .poll(() =>
      brush.evaluate((element) => {
        const tip = getComputedStyle(element, '::after');
        return [tip.content, tip.opacity, tip.position, tip.getPropertyValue('position-area')];
      }),
    )
    .toEqual(['"Brush (B)"', '1', 'fixed', 'center end']);

  const addLayer = page.getByRole('button', { name: 'Add layer' });
  await addLayer.hover();
  await expect
    .poll(() =>
      addLayer.evaluate((element) => {
        const tip = getComputedStyle(element, '::after');
        return [tip.content, tip.opacity, tip.position, tip.getPropertyValue('position-area')];
      }),
    )
    .toEqual(['"Add layer"', '1', 'fixed', 'center start']);

  await page.getByRole('button', { name: 'Animate' }).click();
  const addFrame = page.getByRole('button', { name: 'Add frame' });
  await addFrame.hover();
  await expect
    .poll(() =>
      addFrame.evaluate((element) => {
        const tip = getComputedStyle(element, '::after');
        return [tip.content, tip.opacity, tip.position, tip.getPropertyValue('position-area')];
      }),
    )
    .toEqual(['"Add frame"', '1', 'fixed', 'top']);
  await expect(page.locator('[title]')).toHaveCount(0);
});

test('AI Edit explains whole-layer edits and takes the user straight to selection', async ({
  page,
}) => {
  await bootApp(page);
  await drawStroke(page);
  await page.getByRole('button', { name: 'AI helper', exact: true }).click();
  const panel = page.locator('.ai-panel');
  await panel.getByRole('tab', { name: 'Edit' }).click();
  await expect(panel).toContainText('Nothing is selected — Edit changes the whole active layer.');

  await panel.getByRole('button', { name: 'Select a part' }).click();
  await expect(page.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  const canvas = page.locator('.viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport canvas has no box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(panel.getByRole('checkbox', { name: 'Selected part only' })).toBeEnabled();
  await expect(panel.getByRole('checkbox', { name: 'Selected part only' })).toBeChecked();
  await expect(panel.getByRole('button', { name: 'Select a part' })).toHaveCount(0);
});

test('voice stays visible without recognition and explains the fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'SpeechRecognition', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, 'webkitSpeechRecognition', {
      configurable: true,
      value: undefined,
    });
  });
  await bootApp(page);
  const voice = page.getByRole('button', { name: 'Voice commands' });
  await voice.click();
  const conversation = page.getByRole('dialog', { name: 'Talk to Dream' });
  await expect(conversation).toBeVisible();
  await expect(conversation.getByRole('textbox', { name: 'Say it or type it' })).toBeFocused();
  await expect(conversation.getByRole('status')).toContainText(
    'Voice commands are not available in this browser.',
  );

  await conversation.getByRole('textbox', { name: 'Say it or type it' }).fill('undo');
  await conversation.getByRole('button', { name: 'Do it' }).click();
  await expect(conversation).toContainText('I heard');
  await expect(conversation).toContainText('undo');
  await expect(conversation.getByRole('status')).toHaveText('Nothing to undo.');

  await page.keyboard.press('Escape');
  await expect(conversation).toBeHidden();
  await expect(voice).toBeFocused();
});

test('a spoken story request opens a planned storyboard', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecognition {
      lang = '';
      interimResults = false;
      continuous = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        setTimeout(() => {
          const result = {
            isFinal: false,
            0: { transcript: 'make a story about a moon adventure' },
          };
          this.onresult?.({ resultIndex: 0, results: { 0: result, length: 1 } });
        }, 80);
        setTimeout(() => {
          this.onend?.();
        }, 160);
      }

      stop() {
        this.onend?.();
      }
    }
    Object.defineProperty(globalThis, 'SpeechRecognition', {
      configurable: true,
      value: FakeRecognition,
    });
    Object.defineProperty(globalThis, 'webkitSpeechRecognition', {
      configurable: true,
      value: FakeRecognition,
    });
  });
  await bootApp(page);
  await page.getByRole('button', { name: 'Voice commands' }).click();
  const conversation = page.getByRole('dialog', { name: 'Talk to Dream' });
  await expect(conversation).toBeVisible();
  await expect(conversation).toContainText('Listening now…');
  await expect(conversation.locator('.voice-wave')).toBeVisible();
  await expect(conversation.locator('.voice-transcript')).toContainText(
    'make a story about a moon adventure',
  );
  const dialog = page.getByRole('dialog', { name: 'Make a story' });
  await expect(dialog).toBeVisible();
  await expect(conversation).toBeHidden();
  await expect(dialog.getByRole('textbox', { name: 'Frame 1' })).toBeVisible();
  await expect(dialog).toContainText(/moon/i);
});

test('voice resolves natural “it” actions to the visible selection', async ({ page }) => {
  await page.addInitScript(() => {
    let request = 0;
    const transcripts = [
      'make it red',
      'make it bigger',
      'move it',
      'right',
      'again',
      'center it',
      'put it at the top',
      'duplicate it',
      'delete it',
    ];
    class FakeRecognition {
      lang = '';
      interimResults = false;
      continuous = false;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        setTimeout(() => {
          const result = { isFinal: true, 0: { transcript: transcripts[request++] ?? '' } };
          this.onresult?.({ resultIndex: 0, results: { 0: result, length: 1 } });
          this.onend?.();
        }, 0);
      }

      stop() {
        this.onend?.();
      }
    }
    Object.defineProperty(globalThis, 'SpeechRecognition', {
      configurable: true,
      value: FakeRecognition,
    });
    Object.defineProperty(globalThis, 'webkitSpeechRecognition', {
      configurable: true,
      value: FakeRecognition,
    });
  });

  await bootApp(page);
  await page.keyboard.press('r');
  const canvas = page.locator('.viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounds');
  const from = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.4 };
  const to = { x: box.x + box.width * 0.55, y: box.y + box.height * 0.55 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();

  await page.getByRole('tab', { name: 'Design' }).click();
  await page.keyboard.press('v');
  await page.mouse.click((from.x + to.x) / 2, (from.y + to.y) / 2);
  const before = await nonWhitePixels(page);

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText('Made the selected part red.');
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const context = (element as HTMLCanvasElement).getContext('2d');
        if (!context) return 0;
        const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data;
        let red = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index]! > 200 && pixels[index + 1]! < 120 && pixels[index + 2]! < 120)
            red += 1;
        }
        return red;
      }),
    )
    .toBeGreaterThan(100);

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText('Made the selected part bigger.');
  await expect.poll(() => nonWhitePixels(page)).toBeGreaterThan(before);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => nonWhitePixels(page)).toBeLessThanOrEqual(before);

  const redCenter = () =>
    canvas.evaluate((element) => {
      const context = (element as HTMLCanvasElement).getContext('2d');
      if (!context) return 0;
      const { width, height } = context.canvas;
      const pixels = context.getImageData(0, 0, width, height).data;
      let totalX = 0;
      let count = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          if (pixels[index]! > 200 && pixels[index + 1]! < 120 && pixels[index + 2]! < 120) {
            totalX += x;
            count += 1;
          }
        }
      }
      return count === 0 ? 0 : totalX / count;
    });
  const beforeMove = await redCenter();

  await page.getByRole('button', { name: 'Voice commands' }).click();
  const conversation = page.getByRole('dialog', { name: 'Talk to Dream' });
  await expect(conversation.getByRole('status')).toContainText(
    'Which way — left, right, up or down?',
  );
  await expect(
    conversation.getByRole('group', { name: 'Which way — left, right, up or down?' }),
  ).toBeVisible();
  expect(await redCenter()).toBeCloseTo(beforeMove, 0);

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText('Moved the selected part right.');
  await expect(conversation.getByRole('button', { name: 'Right' })).toHaveCount(0);
  await expect.poll(() => redCenter()).toBeGreaterThan(beforeMove + 5);
  const afterFirstMove = await redCenter();

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText('Moved the selected part right.');
  await expect.poll(() => redCenter()).toBeGreaterThan(afterFirstMove + 5);

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText('Centered the selected part.');

  const redTop = () =>
    canvas.evaluate((element) => {
      const context = (element as HTMLCanvasElement).getContext('2d');
      if (!context) return 0;
      const { width, height } = context.canvas;
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          if (pixels[index]! > 200 && pixels[index + 1]! < 120 && pixels[index + 2]! < 120)
            return y;
        }
      }
      return height;
    });
  const beforePlacement = await redTop();

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText('Placed the selected part at the top edge.');
  await expect.poll(() => redTop()).toBeLessThan(beforePlacement - 20);

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText('Made a copy of the selected part.');
  const withCopy = await nonWhitePixels(page);
  expect(withCopy).toBeGreaterThan(before);

  await page.getByRole('button', { name: 'Voice commands' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Deleted the selected part. Say undo if you need it back.',
  );
  await expect.poll(() => nonWhitePixels(page)).toBeLessThan(withCopy);
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

test('story painting names its current moment and cancels without late frames', async ({
  page,
}) => {
  const purplePng =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAAUSURBVAiZY6yxevufgYGBgYkBCgAn5wKm8Nhy+QAAAABJRU5ErkJggg==';
  let requests = 0;
  await page.route('**/images/generations', async (route) => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, json: { data: [{ b64_json: purplePng }] } }).catch(() => {});
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      'dream:ai-config',
      JSON.stringify({
        activeId: 'openai-compatible',
        providers: {
          'openai-compatible': {
            baseUrl: 'https://api.openai.com/v1',
            model: 'gpt-4o-mini',
            imageModel: 'gpt-image-2',
            supportsImages: true,
          },
        },
      }),
    );
    sessionStorage.setItem('dream:ai-key:openai-compatible', 'e2e-placeholder-key');
  });

  await bootApp(page);
  await page.getByRole('button', { name: /^Story/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Make a story' });
  await dialog
    .getByLabel('What happens in your story?')
    .fill('Moon wakes up, then Fox waves hello');
  await dialog.getByRole('button', { name: 'Plan my frames' }).click();
  await dialog.getByRole('button', { name: 'Make animation' }).click();

  await expect(dialog.getByRole('progressbar', { name: 'Painting frame 1 of 2…' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expect(dialog.locator('.storyboard-progress-copy')).toContainText('Moon wakes up');
  await expect(
    dialog.getByRole('textbox', { name: 'Frame 1', exact: true }).locator('xpath=..'),
  ).toHaveClass(/is-current/);
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(dialog).toContainText('Stopped. Nothing was changed.');
  await page.waitForTimeout(800);
  expect(requests).toBe(1);
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
  const providerSelect = panel.locator('.ai-settings-body select');
  await providerSelect.selectOption('openai-compatible');
  await expect(providerSelect).toHaveValue('openai-compatible');
  await panel.getByLabel('What should I paint?').fill('a purple moon');
  await expect(panel.getByRole('button', { name: 'Make it!' })).toBeDisabled();
  await expect(panel).toContainText('Finish setting up your own AI');
  await panel.getByLabel('Base URL').fill('https://api.openai.com/v1');
  await panel.getByLabel('Model', { exact: true }).fill('gpt-4o-mini');
  await panel.getByLabel('Image model').fill('gpt-image-2');
  await panel.getByLabel('API key').fill('sk-e2e-not-a-secret');
  await panel.getByLabel('This AI can also paint images').check();
  await panel.getByRole('button', { name: 'Save' }).click();

  await providerSelect.selectOption('mock');
  await providerSelect.selectOption('openai-compatible');
  await expect(providerSelect).toHaveValue('openai-compatible');
  await expect(panel.getByRole('button', { name: 'Make it!' })).toBeEnabled();

  await panel.getByRole('button', { name: 'Make it!' }).click();
  await expect(panel).toContainText('Ta-da!');
  await expect(page.locator('.layer-list > li')).toHaveCount(2);
  await expect.poll(() => nonWhitePixels(page)).toBeGreaterThan(before + 10_000);
});

test('provider connection progress can be cancelled without accepting a late hello', async ({
  page,
}) => {
  await page.route('**/chat/completions', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route
      .fulfill({ status: 200, json: { choices: [{ message: { content: 'hello' } }] } })
      .catch(() => {});
  });

  await bootApp(page);
  await page.getByRole('button', { name: 'AI helper', exact: true }).click();
  const panel = page.locator('.ai-panel');
  await panel.getByRole('button', { name: /Settings:/ }).click();
  await panel.locator('.ai-settings-body select').selectOption('openai-compatible');
  await panel.getByLabel('Base URL').fill('https://api.openai.com/v1');
  await panel.getByLabel('Model', { exact: true }).fill('gpt-4o-mini');
  await panel.getByLabel('API key').fill('sk-e2e-not-a-secret');

  await panel.getByRole('button', { name: 'Test connection' }).click();
  await expect(panel.getByRole('progressbar', { name: 'Contacting your AI…' })).toBeVisible();
  await panel.getByRole('button', { name: 'Cancel' }).click();

  await expect(panel.getByRole('progressbar')).toHaveCount(0);
  await expect(panel).toContainText('Stopped testing. Your settings were not changed.');
  await page.waitForTimeout(800);
  await expect(panel).not.toContainText('It works! Your AI said hello back.');
});

test('connected AI progress can be cancelled without applying a late picture', async ({ page }) => {
  const purplePng =
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAAUSURBVAiZY6yxevufgYGBgYkBCgAn5wKm8Nhy+QAAAABJRU5ErkJggg==';
  await page.route('**/images/generations', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, json: { data: [{ b64_json: purplePng }] } }).catch(() => {});
  });

  await bootApp(page);
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
  await panel.getByLabel('What should I paint?').fill('a purple dinosaur');

  const layerCount = await page.locator('.layer-list > li').count();
  await panel.getByRole('button', { name: 'Make it!' }).click();
  await expect(panel.getByRole('progressbar', { name: 'Sending your request…' })).toBeVisible();
  await panel.getByRole('button', { name: 'Cancel' }).click();

  await expect(panel.getByRole('progressbar')).toHaveCount(0);
  await expect(panel).toContainText('Stopped. Nothing was changed.');
  await page.waitForTimeout(800);
  await expect(page.locator('.layer-list > li')).toHaveCount(layerCount);
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

test('real-code generation can be cancelled without downloading a late reply', async ({ page }) => {
  await page.route('**/chat/completions', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route
      .fulfill({
        status: 200,
        json: {
          choices: [{ message: { content: '<!doctype html><html><body>late app</body></html>' } }],
        },
      })
      .catch(() => {});
  });
  let downloaded = false;
  page.on('download', () => {
    downloaded = true;
  });

  await bootApp(page);
  await page.getByRole('button', { name: 'AI helper', exact: true }).click();
  const panel = page.locator('.ai-panel');
  await panel.getByRole('button', { name: /Settings:/ }).click();
  await panel.locator('.ai-settings-body select').selectOption('openai-compatible');
  await panel.getByLabel('Base URL').fill('https://api.openai.com/v1');
  await panel.getByLabel('Model', { exact: true }).fill('gpt-4o-mini');
  await panel.getByLabel('API key').fill('sk-e2e-not-a-secret');
  await panel.getByRole('button', { name: 'Save' }).click();
  await panel.getByRole('button', { name: 'Close AI helper' }).click();

  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await dialog.getByRole('button', { name: 'Real code (AI) (.html)' }).click();
  await dialog.getByRole('button', { name: 'Export' }).click();
  await expect(
    dialog.getByRole('progressbar', { name: 'Your AI is writing the app…' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(dialog).toContainText('Stopped. No code file was downloaded.');
  await page.waitForTimeout(800);
  expect(downloaded).toBe(false);
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

test('a life-losing game collision has one synchronized tactile impact', async ({ page }) => {
  await page.addInitScript(() => {
    // This seed makes Catch!'s first falling thing bad and centered over the hero.
    Math.random = () => 35 / 2 ** 31;
    const target = window as Window & { __dreamHaptics?: Array<number | number[]> };
    target.__dreamHaptics = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        target.__dreamHaptics?.push(pattern);
        return true;
      },
    });
  });
  await bootApp(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('tab', { name: 'Play' }).click();
  await page.getByRole('button', { name: 'Play!' }).click();

  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as Window & { __dreamHaptics?: Array<number | number[]> }).__dreamHaptics,
        ),
      { timeout: 10_000 },
    )
    .toEqual([12]);
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

test('phone toolbar keeps creation, recovery and workspaces visible without scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootApp(page);

  const toolbar = page.locator('.phone-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Story' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'AI helper' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Voice commands' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Settings' })).toBeVisible();
  const more = toolbar.getByRole('button', { name: 'More actions' });
  await expect(more).toBeVisible();
  await expect(toolbar.getByRole('tab', { name: 'Draw' })).toBeVisible();
  await expect(toolbar.getByRole('tab', { name: 'Design' })).toBeVisible();
  await expect(toolbar.getByRole('tab', { name: 'Play' })).toBeVisible();
  await expect(toolbar.getByRole('tab', { name: 'Present' })).toBeVisible();

  const metrics = await toolbar.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    scrollLeft: element.scrollLeft,
  }));
  expect(metrics.scrollLeft).toBe(0);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  await expect(toolbar.getByRole('button', { name: 'New' })).toHaveCount(0);

  await more.click();
  const actions = toolbar.getByRole('group', { name: 'More actions' });
  await expect(actions).toBeVisible();
  for (const name of [
    'New',
    'Open',
    'Save',
    'Import',
    'Resize',
    'Export',
    'Animate',
    'Redo',
    'Little Dreamer mode',
  ]) {
    await expect(actions.getByRole('button', { name })).toBeVisible();
  }
  const [actionsBox, viewportWidth] = await Promise.all([
    actions.boundingBox(),
    page.evaluate(() => window.innerWidth),
  ]);
  expect(actionsBox && actionsBox.x >= 0 && actionsBox.x + actionsBox.width <= viewportWidth).toBe(
    true,
  );

  await page.keyboard.press('Escape');
  await expect(actions).toHaveCount(0);
  await expect(more).toBeFocused();

  await more.click();
  await actions.getByRole('button', { name: 'Export' }).click();
  await expect(actions).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Export' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Export' })
    .getByRole('button', { name: 'Cancel' })
    .click();

  await toolbar.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-item:has-text("Comfort mode") input').check();
  const minimumPrimarySize = await page
    .locator('.phone-toolbar-primary .btn')
    .evaluateAll((buttons) =>
      Math.min(
        ...buttons.map((button) => {
          const box = button.getBoundingClientRect();
          return Math.min(box.width, box.height);
        }),
      ),
    );
  expect(minimumPrimarySize).toBeGreaterThanOrEqual(44);
  await page.locator('.settings-popover select').selectOption('ar');
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  const rtlMore = toolbar.getByRole('button', { name: 'إجراءات أخرى' });
  await rtlMore.click();
  const rtlActions = toolbar.getByRole('group', { name: 'إجراءات أخرى' });
  const rtlActionsBox = await rtlActions.boundingBox();
  expect(
    rtlActionsBox && rtlActionsBox.x >= 0 && rtlActionsBox.x + rtlActionsBox.width <= viewportWidth,
  ).toBe(true);
});

test('phone editing dock keeps selection, every tool and every panel one task away', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootApp(page);

  const dock = page.locator('.phone-tool-dock');
  for (const name of ['Brush', 'Pencil', 'Eraser', 'Text', 'Controls', 'All tools']) {
    await expect(dock.getByRole('button', { name })).toBeVisible();
  }
  const dockMetrics = await dock.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dockMetrics.scrollWidth).toBeLessThanOrEqual(dockMetrics.clientWidth);

  const allToolsButton = dock.getByRole('button', { name: 'All tools' });
  await allToolsButton.click();
  const allTools = dock.getByRole('group', { name: 'All tools' });
  await expect(allTools).toBeVisible();
  await expect(allTools.getByRole('button')).toHaveCount(16);
  await allTools.getByRole('button', { name: 'Spray' }).click();
  await expect(allTools).toHaveCount(0);
  await expect(dock.getByRole('button', { name: 'Spray' })).toHaveAttribute('aria-pressed', 'true');
  await drawStroke(page);

  const controlsButton = dock.getByRole('button', { name: 'Controls' });
  await controlsButton.click();
  let controls = page.getByRole('dialog', { name: 'Controls' });
  await expect(controls.getByRole('region', { name: 'Options' })).toBeVisible();
  await expect(controls.getByRole('region', { name: 'Adjust' })).toBeVisible();
  await expect(controls.getByRole('region', { name: 'Layers' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(controls).toHaveCount(0);
  await expect(controlsButton).toBeFocused();

  await page.getByRole('tab', { name: 'Design' }).click();
  const select = dock.getByRole('button', { name: 'Select' });
  await expect(select).toBeVisible();
  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page
    .getByRole('group', { name: 'More actions' })
    .getByRole('button', { name: 'Animate' })
    .click();
  await dock.getByRole('button', { name: 'Controls' }).click();
  controls = page.getByRole('dialog', { name: 'Controls' });
  for (const name of ['Design', 'Links', 'Components', 'Options', 'Adjust', 'Layers']) {
    await expect(controls.getByRole('region', { name })).toBeVisible();
  }
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'AI helper' }).click();
  controls = page.getByRole('dialog', { name: 'Controls' });
  await expect(controls.getByRole('region', { name: 'AI helper' })).toBeVisible();
});

test('phone timeline keeps frames visible while focusing one task at a time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootApp(page);
  await page.getByRole('button', { name: 'More actions' }).click();
  await page
    .getByRole('group', { name: 'More actions' })
    .getByRole('button', { name: 'Animate' })
    .click();
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

test('brand delivery downloads one truthful multi-size ZIP', async ({ page }) => {
  await bootApp(page);
  await drawStroke(page);
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await dialog.getByRole('button', { name: 'Brand pack (.zip)' }).click();
  await expect(dialog).toContainText('source-size, 1024 px and 512 px long-edge PNGs');
  await expect(dialog).toContainText('real scalable SVG');

  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Untitled-brand-pack.zip');
  const path = await download.path();
  expect(path).not.toBeNull();
  const zip = await readFile(path!);

  const entry = (name: string) => {
    const nameBytes = Buffer.from(name);
    const nameOffset = zip.indexOf(nameBytes);
    expect(nameOffset).toBeGreaterThanOrEqual(30);
    const headerOffset = nameOffset - 30;
    expect(zip.readUInt32LE(headerOffset)).toBe(0x04034b50);
    const size = zip.readUInt32LE(headerOffset + 18);
    const extraLength = zip.readUInt16LE(headerOffset + 28);
    const dataOffset = nameOffset + nameBytes.length + extraLength;
    return zip.subarray(dataOffset, dataOffset + size);
  };

  const source = entry('Untitled-source.png');
  const large = entry('Untitled-1024.png');
  const small = entry('Untitled-512.png');
  expect(source.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(source.readUInt32BE(16)).toBe(1024);
  expect(source.readUInt32BE(20)).toBe(768);
  expect(large.readUInt32BE(16)).toBe(1024);
  expect(large.readUInt32BE(20)).toBe(768);
  expect(small.readUInt32BE(16)).toBe(512);
  expect(small.readUInt32BE(20)).toBe(384);
  expect(entry('Untitled.svg').toString('utf8')).toContain('<svg');
  await expect(page.locator('.status-bar')).toContainText('1024 × 768');

  await page.getByRole('button', { name: 'Eraser', exact: true }).click();
  await drawStroke(page);
  await page.getByRole('button', { name: 'Export' }).click();
  const rasterDialog = page.getByRole('dialog', { name: 'Export' });
  await rasterDialog.getByRole('button', { name: 'Brand pack (.zip)' }).click();
  await expect(rasterDialog).toContainText('SVG is omitted');
  await expect(rasterDialog.getByRole('button', { name: 'Export' })).toBeEnabled();
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

test('video export can be cancelled without downloading a partial recording', async ({ page }) => {
  let downloads = 0;
  page.on('download', () => {
    downloads += 1;
  });
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  for (let frame = 0; frame < 7; frame += 1) {
    await page.getByRole('button', { name: 'Add frame' }).click();
  }
  await page.getByLabel('Frames per second').fill('1');
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await dialog.getByRole('button', { name: 'WebM video' }).click();
  await dialog.getByLabel('Frame 1 of 8').fill('Keep this caption');
  await dialog.getByRole('button', { name: 'Export' }).click();

  await expect(dialog.getByRole('progressbar', { name: /Recording/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();

  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(dialog).toContainText('Stopped. No video file was downloaded.');
  await expect(dialog.getByLabel('Frame 1 of 8')).toHaveValue('Keep this caption');

  await dialog.getByRole('button', { name: 'Export' }).click();
  await expect(dialog.getByRole('progressbar', { name: /Recording/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('progressbar')).toHaveCount(0);
  await expect(dialog).toContainText('Stopped. No video file was downloaded.');
  await page.waitForTimeout(1_500);
  expect(downloads).toBe(0);
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

test('Simplified Chinese is complete, LTR and reaches the science workflow', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-popover select').selectOption('zh');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
  await expect(page.getByRole('tab', { name: '设计' })).toBeVisible();
  await page.getByRole('tab', { name: '设计' }).click();
  await page.getByRole('button', { name: '绘制数据…' }).click();
  const plot = page.getByRole('dialog', { name: '创建数据图表' });
  await expect(plot).toContainText('4 行 · 1 条序列已就绪');
  await expect(plot.getByRole('button', { name: '插入图表' })).toBeEnabled();
});

test('Brazilian Portuguese reaches portable project and real-code delivery', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-popover select').selectOption('pt');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await page.getByRole('button', { name: 'Animar' }).click();
  await page.getByRole('button', { name: 'Exportar' }).click();

  const dialog = page.getByRole('dialog', { name: 'Exportar' });
  await expect(dialog.getByRole('button', { name: 'Projeto Dream (.dream)' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Código real (IA) (.html)' })).toBeVisible();
});

test('Russian reaches the keyboard-first design workflow', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-popover select').selectOption('ru');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('button', { name: 'История' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Отменить', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Режим «Маленький мечтатель»' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Настройки' })).toBeInViewport();
  await page.getByRole('tab', { name: 'Дизайн' }).click();
  await expect(page.getByRole('heading', { name: 'Компоненты' })).toBeVisible();

  await page.keyboard.press('r');
  await expect(page.getByRole('button', { name: 'Прямоугольник' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('v');
  await expect(page.getByRole('button', { name: 'Выделение' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
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
