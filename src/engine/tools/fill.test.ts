import { describe, expect, it } from 'vitest';
import { createFillOperation, floodFill } from './fill';
import { DEFAULT_SETTINGS } from './types';

/** Build a raster buffer; `paint` sets pixels as [x, y, r, g, b, a]. */
function makeRaster(
  width: number,
  height: number,
  fill: [number, number, number, number] = [0, 0, 0, 0],
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data.set(fill, i * 4);
  }
  const set = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    data.set([r, g, b, a], (y * width + x) * 4);
  };
  return { data, width, height, set };
}

const RED = { r: 255, g: 0, b: 0 };

describe('floodFill', () => {
  it('fills an empty canvas entirely', () => {
    const r = makeRaster(4, 4);
    const patch = floodFill(r.data, r.width, r.height, 1, 1, RED);
    expect(patch).not.toBeNull();
    expect(patch).toMatchObject({ x: 0, y: 0, width: 4, height: 4 });
    expect(patch!.data).toHaveLength(4 * 4 * 4);
    expect([...patch!.data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
  });

  it('stops at borders and returns a tight bounding patch', () => {
    const r = makeRaster(5, 5, [255, 255, 255, 255]);
    // Black ring around the edge.
    for (let i = 0; i < 5; i += 1) {
      r.set(i, 0, 0, 0, 0);
      r.set(i, 4, 0, 0, 0);
      r.set(0, i, 0, 0, 0);
      r.set(4, i, 0, 0, 0);
    }
    const patch = floodFill(r.data, r.width, r.height, 2, 2, RED);
    expect(patch).toMatchObject({ x: 1, y: 1, width: 3, height: 3 });
    expect(patch!.data).toHaveLength(3 * 3 * 4);
    for (let i = 0; i < 9; i += 1) {
      expect([...patch!.data.slice(i * 4, i * 4 + 4)]).toEqual([255, 0, 0, 255]);
    }
  });

  it('returns null when the start pixel already is the fill color', () => {
    const r = makeRaster(3, 3, [255, 0, 0, 255]);
    expect(floodFill(r.data, r.width, r.height, 1, 1, RED)).toBeNull();
  });

  it('returns null outside the canvas', () => {
    const r = makeRaster(3, 3);
    expect(floodFill(r.data, r.width, r.height, -1, 0, RED)).toBeNull();
    expect(floodFill(r.data, r.width, r.height, 0, 3, RED)).toBeNull();
  });

  it('respects tolerance when matching the target color', () => {
    const r = makeRaster(2, 1, [250, 250, 250, 255]);
    // Exact matching: near-white does not match pure white target... start IS 250.
    // Clicking a 250-gray pixel filling red: whole row matches itself, fills both pixels.
    const exact = floodFill(r.data, r.width, r.height, 0, 0, RED, 0);
    expect(exact).toMatchObject({ width: 2, height: 1 });
    // A pixel outside tolerance is a border: make right pixel darker.
    r.set(1, 0, 100, 100, 100);
    const blocked = floodFill(r.data, r.width, r.height, 0, 0, RED, 0);
    expect(blocked).toMatchObject({ x: 0, y: 0, width: 1, height: 1 });
    // With generous tolerance the darker pixel is included.
    const tolerant = floodFill(r.data, r.width, r.height, 0, 0, RED, 160);
    expect(tolerant).toMatchObject({ width: 2, height: 1 });
  });

  it('fills fractional click coordinates via their pixel', () => {
    const r = makeRaster(3, 3);
    const patch = floodFill(r.data, r.width, r.height, 1.7, 1.2, RED);
    expect(patch).toMatchObject({ x: 0, y: 0, width: 3, height: 3 });
  });
});

describe('createFillOperation', () => {
  it('builds a fill op from settings and a raster', () => {
    const r = makeRaster(4, 4);
    const op = createFillOperation({ x: 2, y: 2 }, { ...DEFAULT_SETTINGS, color: '#00ff00' }, r);
    expect(op).not.toBeNull();
    expect(op!.kind).toBe('fill');
    expect(op!.color).toBe('#00ff00');
    expect([...op!.patch.data.slice(0, 4)]).toEqual([0, 255, 0, 255]);
  });

  it('returns null for an invalid color', () => {
    const r = makeRaster(4, 4);
    expect(
      createFillOperation({ x: 0, y: 0 }, { ...DEFAULT_SETTINGS, color: 'not-a-color' }, r),
    ).toBeNull();
  });
});
