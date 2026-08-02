/**
 * Generate the PWA PNG icons from the vector Dream mark — no image
 * dependencies: Playwright's chromium rasterizes the SVG for us.
 *
 *   npm run icons
 *
 * Outputs (referenced by public/manifest.webmanifest):
 *   public/icons/icon-192.png           192×192, transparent
 *   public/icons/icon-512.png           512×512, transparent
 *   public/icons/icon-maskable-512.png  512×512, brand tile, mark in safe zone
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const SVG_PATH = new URL('../public/favicon.svg', import.meta.url);
const OUT_DIR = new URL('../public/icons/', import.meta.url);

/** Maskable safe zone: the mark stays within the central 80% of the tile. */
const MASKABLE_MARK = 410;
const MASKABLE_SIZE = 512;
const MASKABLE_BG = '#6d7cff';

const svg = await readFile(SVG_PATH, 'utf8');
const sized = (size) => svg.replace('<svg', `<svg width="${size}" height="${size}"`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const render = async (size, body, omitBackground) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;width:${size}px;height:${size}px}svg{display:block}</style>${body}`,
    );
    return page.screenshot({ omitBackground });
  };

  await mkdir(OUT_DIR, { recursive: true });

  for (const size of [192, 512]) {
    const png = await render(size, sized(size), true);
    await writeFile(new URL(`icon-${size}.png`, OUT_DIR), png);
    console.log(`wrote public/icons/icon-${size}.png`);
  }

  const maskableBody = `<div style="width:${MASKABLE_SIZE}px;height:${MASKABLE_SIZE}px;background:${MASKABLE_BG};display:flex;align-items:center;justify-content:center">${sized(MASKABLE_MARK)}</div>`;
  const maskable = await render(MASKABLE_SIZE, maskableBody, false);
  await writeFile(new URL('icon-maskable-512.png', OUT_DIR), maskable);
  console.log('wrote public/icons/icon-maskable-512.png');
} finally {
  await browser.close();
}
