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

test('slide settings and Presenter view have no serious automated violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Slide settings' }).click();
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('tab', { name: 'Present' }).click();
  await page.getByRole('button', { name: 'Presenter' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});

test('social-video caption controls have no serious automated violations', async ({ page }) => {
  await bootApp(page);
  await page.getByRole('button', { name: /^Animate/ }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('button', { name: 'WebM video' }).click();
  expect(await seriousViolations(page)).toEqual([]);
});
