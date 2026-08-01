import { describe, expect, it } from 'vitest';
import { pickColor } from './eyedropper';
import { createTextOperation } from './text';
import {
  clampZoom,
  nextZoomIn,
  nextZoomOut,
  panBy,
  zoomAtPoint,
  ZOOM_MAX,
  ZOOM_MIN,
} from './viewport';
import { DEFAULT_SETTINGS } from './types';

describe('eyedropper pickColor', () => {
  const data = new Uint8ClampedArray([255, 128, 0, 255, 0, 0, 255, 255]); // 2x1
  const raster = { data, width: 2, height: 1 };

  it('reads the pixel color as hex', () => {
    expect(pickColor(raster, { x: 0, y: 0 })).toBe('#ff8000');
    expect(pickColor(raster, { x: 1, y: 0 })).toBe('#0000ff');
  });

  it('returns null outside the raster', () => {
    expect(pickColor(raster, { x: 5, y: 0 })).toBeNull();
    expect(pickColor(raster, { x: -1, y: 0 })).toBeNull();
  });
});

describe('createTextOperation', () => {
  const settings = { ...DEFAULT_SETTINGS, color: '#111111', fontSize: 32, fontFamily: 'cursive' };

  it('builds a text op with current settings', () => {
    const op = createTextOperation({ x: 10, y: 20 }, '  Dream big  ', settings);
    expect(op).toMatchObject({
      kind: 'text',
      position: { x: 10, y: 20 },
      text: 'Dream big',
      color: '#111111',
      fontSize: 32,
      fontFamily: 'cursive',
    });
  });

  it('returns null for empty text', () => {
    expect(createTextOperation({ x: 0, y: 0 }, '   ', settings)).toBeNull();
  });
});

describe('viewport math', () => {
  it('clamps zoom to the 25%–800% range', () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(100)).toBe(ZOOM_MAX);
    expect(clampZoom(1)).toBe(1);
  });

  it('steps zoom in and out along the ladder', () => {
    expect(nextZoomIn(1)).toBe(1.5);
    expect(nextZoomIn(ZOOM_MAX)).toBe(ZOOM_MAX);
    expect(nextZoomOut(1)).toBe(0.67);
    expect(nextZoomOut(ZOOM_MIN)).toBe(ZOOM_MIN);
  });

  it('pans the offset by a delta', () => {
    expect(panBy({ x: 10, y: 20 }, 5, -5)).toEqual({ x: 15, y: 15 });
  });

  it('zoomAtPoint keeps the focal point stationary in document space', () => {
    const offset = { x: 30, y: 40 };
    const focal = { x: 200, y: 150 };
    const from = 1;
    const to = 2;
    const docPoint = { x: (focal.x - offset.x) / from, y: (focal.y - offset.y) / from };
    const next = zoomAtPoint(offset, from, to, focal);
    expect((focal.x - next.x) / to).toBeCloseTo(docPoint.x, 6);
    expect((focal.y - next.y) / to).toBeCloseTo(docPoint.y, 6);
  });
});
