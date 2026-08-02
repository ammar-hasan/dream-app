import { describe, expect, it } from 'vitest';
import { eraseMask, extractPatch, stampPatch, wandMask } from './wand';
import type { RasterSource } from './types';

/**
 * 8×6 fixture: a 3×3 red block at (2..4, 1..3) on a transparent canvas,
 * plus a single isolated red pixel at (7, 5).
 */
function makeFixture(): RasterSource {
  const width = 8;
  const height = 6;
  const data = new Uint8ClampedArray(width * height * 4);
  const paint = (x: number, y: number, r: number, g: number, b: number) => {
    const i = (y * width + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  for (let y = 1; y <= 3; y += 1) for (let x = 2; x <= 4; x += 1) paint(x, y, 255, 0, 0);
  paint(7, 5, 255, 0, 0);
  return { data, width, height };
}

describe('wandMask', () => {
  it('selects only the contiguous region around the click', () => {
    const raster = makeFixture();
    const mask = wandMask(raster, { x: 3, y: 2 }, 0);
    expect(mask).not.toBeNull();
    const count = mask!.reduce((n, v) => n + v, 0);
    expect(count).toBe(9); // the 3×3 block, not the isolated pixel
    expect(mask![5 * 8 + 7]).toBe(0);
  });

  it('tolerance 0 does not leak into a similar-but-different color', () => {
    const raster = makeFixture();
    // Neighbor the red block with a slightly different red.
    const i = (2 * 8 + 5) * 4;
    raster.data[i] = 250;
    raster.data[i + 3] = 255;
    const strict = wandMask(raster, { x: 3, y: 2 }, 0);
    expect(strict![2 * 8 + 5]).toBe(0);
    const loose = wandMask(raster, { x: 3, y: 2 }, 10);
    expect(loose![2 * 8 + 5]).toBe(1);
  });

  it('returns null for an out-of-bounds click', () => {
    expect(wandMask(makeFixture(), { x: -1, y: 0 }, 0)).toBeNull();
    expect(wandMask(makeFixture(), { x: 99, y: 0 }, 0)).toBeNull();
  });
});

describe('extractPatch', () => {
  it('extracts the region pixels into a bounding-box patch', () => {
    const raster = makeFixture();
    const mask = wandMask(raster, { x: 3, y: 2 }, 0)!;
    const patch = extractPatch(raster, mask)!;
    expect(patch).toMatchObject({ x: 2, y: 1, width: 3, height: 3 });
    // Every pixel is the original red.
    for (let p = 0; p < 9; p += 1) {
      expect(patch.data[p * 4]).toBe(255);
      expect(patch.data[p * 4 + 3]).toBe(255);
    }
  });

  it('leaves non-region pixels inside the bbox transparent', () => {
    // L-shape: pixels (0,0), (0,1), (1,1) of a 4×4 buffer.
    const width = 4;
    const data = new Uint8ClampedArray(width * width * 4);
    for (const [x, y] of [
      [0, 0],
      [0, 1],
      [1, 1],
    ]) {
      const i = (y * width + x) * 4;
      data[i] = 10;
      data[i + 3] = 255;
    }
    const raster = { data, width, height: width };
    const mask = wandMask(raster, { x: 0, y: 0 }, 0)!;
    const patch = extractPatch(raster, mask)!;
    expect(patch).toMatchObject({ x: 0, y: 0, width: 2, height: 2 });
    // (1,0) in patch space is outside the L → alpha 0.
    expect(patch.data[(0 * 2 + 1) * 4 + 3]).toBe(0);
    expect(patch.data[(1 * 2 + 0) * 4 + 3]).toBe(255);
  });
});

describe('eraseMask', () => {
  it('zeroes the region and leaves everything else untouched', () => {
    const raster = makeFixture();
    const mask = wandMask(raster, { x: 3, y: 2 }, 0)!;
    const erased = eraseMask(raster, mask);
    expect(erased.data[(2 * 8 + 3) * 4 + 3]).toBe(0); // block gone
    expect(erased.data[(5 * 8 + 7) * 4 + 3]).toBe(255); // isolated pixel stays
    // Original buffer is not mutated.
    expect(raster.data[(2 * 8 + 3) * 4 + 3]).toBe(255);
  });
});

describe('stampPatch', () => {
  it('re-inserts the patch at an offset (move semantics)', () => {
    const raster = makeFixture();
    const mask = wandMask(raster, { x: 3, y: 2 }, 0)!;
    const patch = extractPatch(raster, mask)!;
    const base = eraseMask(raster, mask);
    const moved = stampPatch(base, patch, -2, 2); // 3×3 red now at (0..2, 3..5)
    expect(moved.data[(3 * 8 + 0) * 4 + 3]).toBe(255);
    expect(moved.data[(5 * 8 + 2) * 4]).toBe(255);
    // Origin is empty again.
    expect(moved.data[(2 * 8 + 3) * 4 + 3]).toBe(0);
    // Untouched pixels survive.
    expect(moved.data[(5 * 8 + 7) * 4 + 3]).toBe(255);
  });

  it('clips cleanly at the canvas edges', () => {
    const raster = makeFixture();
    const mask = wandMask(raster, { x: 3, y: 2 }, 0)!;
    const patch = extractPatch(raster, mask)!;
    const base = eraseMask(raster, mask);
    const moved = stampPatch(base, patch, 20, 20); // entirely off-canvas
    expect(moved.data.every((v) => v === 0 || v === 255)).toBe(true);
    expect(moved.data[(5 * 8 + 7) * 4 + 3]).toBe(255);
    // Nothing else appeared.
    expect(moved.data[(3 * 8 + 0) * 4 + 3]).toBe(0);
  });
});

describe('stampPatch blending', () => {
  it('blends semi-transparent patch pixels over the base', () => {
    const base: RasterSource = {
      data: new Uint8ClampedArray([0, 0, 0, 255]),
      width: 1,
      height: 1,
    };
    const patch = {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 255, 255, 128]),
    };
    const out = stampPatch(base, patch, 0, 0);
    expect(out.data[0]).toBe(128); // white at ~50% over black
    expect(out.data[3]).toBe(255);
    expect(base.data[0]).toBe(0); // base untouched
  });
});
