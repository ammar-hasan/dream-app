/**
 * Flood fill (bucket). Pure scanline implementation over a packed RGBA
 * buffer; returns the filled region as a bounding-box RasterPatch so the
 * operation stays small and serializable.
 */

import { hexToRgba } from '../color';
import { genId } from '../document';
import type { FillOp, Point, RasterPatch, ToolSettings } from '../types';
import type { RasterSource } from './types';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const DEFAULT_FILL_TOLERANCE = 0;

export interface FloodRegion {
  /** Pixel indices (y * width + x) of the contiguous matching region. */
  pixels: number[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Shared scanline flood traversal: the contiguous region around
 * (startX, startY) whose pixels match the start pixel within `tolerance`
 * (per-channel, alpha included). Returns null when the start is out of
 * bounds. Used by the fill bucket and the magic wand.
 */
export function floodPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number,
): FloodRegion | null {
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return null;

  const at = (x: number, y: number) => (y * width + x) * 4;
  const si = at(x0, y0);
  const tr = data[si];
  const tg = data[si + 1];
  const tb = data[si + 2];
  const ta = data[si + 3];

  const matchesTarget = (i: number) =>
    Math.abs(data[i] - tr) <= tolerance &&
    Math.abs(data[i + 1] - tg) <= tolerance &&
    Math.abs(data[i + 2] - tb) <= tolerance &&
    Math.abs(data[i + 3] - ta) <= tolerance;

  const visited = new Uint8Array(width * height);
  const filled: number[] = []; // pixel indices (not byte offsets)
  const stack: [number, number][] = [[x0, y0]];
  let minX = x0;
  let maxX = x0;
  let minY = y0;
  let maxY = y0;

  while (stack.length > 0) {
    const [sx, sy] = stack.pop() as [number, number];
    let x = sx;
    while (x >= 0 && !visited[sy * width + x] && matchesTarget(at(x, sy))) x -= 1;
    x += 1;
    let spanUp = false;
    let spanDown = false;
    while (x < width && !visited[sy * width + x] && matchesTarget(at(x, sy))) {
      visited[sy * width + x] = 1;
      filled.push(sy * width + x);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;

      if (sy > 0) {
        const open = !visited[(sy - 1) * width + x] && matchesTarget(at(x, sy - 1));
        if (open && !spanUp) {
          stack.push([x, sy - 1]);
          spanUp = true;
        } else if (!open) {
          spanUp = false;
        }
      }
      if (sy < height - 1) {
        const open = !visited[(sy + 1) * width + x] && matchesTarget(at(x, sy + 1));
        if (open && !spanDown) {
          stack.push([x, sy + 1]);
          spanDown = true;
        } else if (!open) {
          spanDown = false;
        }
      }
      x += 1;
    }
  }

  if (filled.length === 0) return null;
  return { pixels: filled, minX, minY, maxX, maxY };
}

/**
 * Fill the contiguous region around (startX, startY) whose pixels match the
 * start pixel within `tolerance` (per-channel, alpha included).
 * Returns null when the start is out of bounds or already the fill color.
 */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  color: Rgb,
  tolerance: number = DEFAULT_FILL_TOLERANCE,
): RasterPatch | null {
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return null;

  // Nothing to do when the region already is the fill color.
  const si = (y0 * width + x0) * 4;
  if (
    Math.abs(data[si] - color.r) <= tolerance &&
    Math.abs(data[si + 1] - color.g) <= tolerance &&
    Math.abs(data[si + 2] - color.b) <= tolerance &&
    data[si + 3] === 255
  ) {
    return null;
  }

  const region = floodPixels(data, width, height, startX, startY, tolerance);
  if (!region) return null;
  const { pixels, minX, minY, maxX, maxY } = region;

  const patchWidth = maxX - minX + 1;
  const patchHeight = maxY - minY + 1;
  const patch = new Uint8ClampedArray(patchWidth * patchHeight * 4);
  for (const pixel of pixels) {
    const px = pixel % width;
    const py = Math.floor(pixel / width);
    const o = ((py - minY) * patchWidth + (px - minX)) * 4;
    patch[o] = color.r;
    patch[o + 1] = color.g;
    patch[o + 2] = color.b;
    patch[o + 3] = 255;
  }
  return { x: minX, y: minY, width: patchWidth, height: patchHeight, data: patch };
}

/**
 * Build the fill operation for a click at `point` on the given layer raster.
 * Returns null when there is nothing to fill.
 */
export function createFillOperation(
  point: Point,
  settings: ToolSettings,
  raster: RasterSource,
  tolerance: number = DEFAULT_FILL_TOLERANCE,
): FillOp | null {
  const rgba = hexToRgba(settings.color);
  if (!rgba) return null;
  const patch = floodFill(
    raster.data,
    raster.width,
    raster.height,
    point.x,
    point.y,
    rgba,
    tolerance,
  );
  if (!patch) return null;
  return {
    kind: 'fill',
    id: genId('op'),
    origin: { ...point },
    color: settings.color,
    opacity: settings.opacity,
    patch,
  };
}
