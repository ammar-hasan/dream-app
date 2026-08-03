import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { bootApp } from './helpers';

async function seriousViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    .map((violation) => ({
      id: violation.id,
      help: violation.help,
      targets: violation.nodes.map((node) => ({
        selector: node.target.join(' '),
        summary: node.failureSummary,
      })),
    }));
}

test('core creation modes have no serious automated accessibility violations', async ({ page }) => {
  await bootApp(page);
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('tab', { name: 'Design' }).click();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('tab', { name: 'Play' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});

test('data plot creation has no serious automated accessibility violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('button', { name: 'Plot data…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create data plot' });
  await expect(dialog.getByRole('button', { name: 'Insert plot' })).toBeEnabled();
  expect(await seriousViolations(page)).toEqual([]);
});

test('slide settings and Presenter view have no serious automated violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Slide settings' }).click();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('tab', { name: 'Present' }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Presenter' }).click();
  const presenterPage = await popupPromise;
  expect(await seriousViolations(page)).toEqual([]);
  expect(await seriousViolations(presenterPage)).toEqual([]);
});

test('social-video caption controls have no serious automated violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('button', { name: 'WebM video' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Export' }).getByRole('button', { name: 'Export' }),
  ).toBeInViewport();
  expect(await seriousViolations(page)).toEqual([]);
});

test('share-link export has no serious automated violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('button', { name: 'Share app link' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});

test('voice-first storyboard planning has no serious automated violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Story/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Make a story' });
  expect(await seriousViolations(page)).toEqual([]);
  await dialog
    .getByLabel('What happens in your story?')
    .fill('Moon wakes up, then Fox waves hello');
  await dialog.getByRole('button', { name: 'Plan my frames' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});

test('phone timeline task views have no serious automated violations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();

  const tasks = page.getByRole('group', { name: 'Timeline tools' });
  expect(await seriousViolations(page)).toEqual([]);
  await tasks.getByRole('button', { name: 'Slides' }).click();
  expect(await seriousViolations(page)).toEqual([]);
  await tasks.getByRole('button', { name: 'App' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});

test('Persian calligraphy controls have no serious automated violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('.settings-popover select').selectOption('fa');
  await page.getByRole('combobox', { name: 'نوک قلم‌مو' }).selectOption('calligraphy');
  expect(await seriousViolations(page)).toEqual([]);
});

test('scientific text and SVG export controls have no serious automated violations', async ({
  page,
}) => {
  await bootApp(page);
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  const canvas = page.locator('.viewport-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('viewport canvas has no box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('group', { name: 'Science symbols' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('textbox', { name: 'Text input' }).press('Escape');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('dialog', { name: 'Export' }).getByRole('button', { name: 'SVG' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});
