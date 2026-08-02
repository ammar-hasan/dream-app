/**
 * Magic wand. Click a pixel: the contiguous region of similar color on the
 * active layer's raster becomes a floating selection — a RasterPatch of the
 * region's ORIGINAL pixels (alpha 0 outside the region), lifted out of the
 * layer. The layer bakes to a single image op when the region is moved or
 * deleted (the same destructive-bake model as filters and fills), so every
 * outcome is one undoable command. Pure functions — unit-testable in Node.
 */

import type { Point, RasterPatch } from '../types';
import { floodPixels } from './fill';
import type { RasterSource } from './types';

export const DEFAULT_WAND_TOLERANCE = 32;

/**
 * Pixel mask (1 = inside the region) for a wand click with `tolerance`
 * (per-channel, alpha included); null when the click is out of bounds.
 */
export function wandMask(
  raster: RasterSource,
  point: Point,
  tolerance: number = DEFAULT_WAND_TOLERANCE,
): Uint8Array | null {
  const region = floodPixels(raster.data, raster.width, raster.height, point.x, point.y, tolerance);
  if (!region) return null;
  const mask = new Uint8Array(raster.width * raster.height);
  for (const pixel of region.pixels) mask[pixel] = 1;
  return mask;
}

/**
 * Extract the masked pixels (original colors) as a bounding-box patch;
 * pixels outside the mask are fully transparent. Null when the mask is empty.
 */
export function extractPatch(raster: RasterSource, mask: Uint8Array): RasterPatch | null {
  let minX = raster.width;
  let minY = raster.height;
  let maxX = -1;
  let maxY = -1;
  for (let p = 0; p < mask.length; p += 1) {
    if (!mask[p]) continue;
    const x = p % raster.width;
    const y = Math.floor(p / raster.width);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0) return null;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!mask[y * raster.width + x]) continue;
      const si = (y * raster.width + x) * 4;
      const di = ((y - minY) * width + (x - minX)) * 4;
      data[di] = raster.data[si];
      data[di + 1] = raster.data[si + 1];
      data[di + 2] = raster.data[si + 2];
      data[di + 3] = raster.data[si + 3];
    }
  }
  return { x: minX, y: minY, width, height, data };
}

/** Copy of `raster` with the masked pixels erased (fully transparent). */
export function eraseMask(raster: RasterSource, mask: Uint8Array): RasterSource {
  const data = new Uint8ClampedArray(raster.data);
  for (let p = 0; p < mask.length; p += 1) {
    if (mask[p]) data.fill(0, p * 4, p * 4 + 4);
  }
  return { data, width: raster.width, height: raster.height };
}

/**
 * Composite a patch over a same-size buffer at an offset (source-over),
 * clipping at the edges. Returns a new buffer; `base` is untouched.
 */
export function stampPatch(
  base: RasterSource,
  patch: RasterPatch,
  dx: number,
  dy: number,
): RasterSource {
  const data = new Uint8ClampedArray(base.data);
  for (let y = 0; y < patch.height; y += 1) {
    const by = patch.y + dy + y;
    if (by < 0 || by >= base.height) continue;
    for (let x = 0; x < patch.width; x += 1) {
      const bx = patch.x + dx + x;
      if (bx < 0 || bx >= base.width) continue;
      const si = (y * patch.width + x) * 4;
      const sa = patch.data[si + 3];
      if (sa === 0) continue;
      const di = (by * base.width + bx) * 4;
      if (sa === 255) {
        data[di] = patch.data[si];
        data[di + 1] = patch.data[si + 1];
        data[di + 2] = patch.data[si + 2];
        data[di + 3] = 255;
      } else {
        const a = sa / 255;
        data[di] = Math.round(patch.data[si] * a + data[di] * (1 - a));
        data[di + 1] = Math.round(patch.data[si + 1] * a + data[di + 1] * (1 - a));
        data[di + 2] = Math.round(patch.data[si + 2] * a + data[di + 2] * (1 - a));
        data[di + 3] = Math.min(255, Math.round(sa + data[di + 3] * (1 - a)));
      }
    }
  }
  return { data, width: base.width, height: base.height };
}
