/**
 * Play-mode sprite helpers: turn a rasterized layer into a tight sprite by
 * cropping to its non-transparent content. Pure pixel math — the DOM canvas
 * dance that produces the buffer lives in ui/ (`rasterize.ts`).
 */

import type { PixelBuffer } from '../engine/filters';
import type { Rect } from '../engine/types';

/** Alpha threshold above which a pixel counts as content. */
const ALPHA_THRESHOLD = 8;

/** Bounding box of the non-transparent pixels, or null for an empty buffer. */
export function contentBounds(buffer: PixelBuffer): Rect | null {
  let minX = buffer.width;
  let minY = buffer.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      if (buffer.data[(y * buffer.width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Copy a rectangle out of a buffer into a new, tightly-sized one. */
export function cropBuffer(buffer: PixelBuffer, rect: Rect): PixelBuffer {
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const srcY = Math.round(rect.y) + y;
    if (srcY < 0 || srcY >= buffer.height) continue;
    const srcRow = (srcY * buffer.width + Math.round(rect.x)) * 4;
    const dstRow = y * width * 4;
    data.set(buffer.data.subarray(srcRow, srcRow + width * 4), dstRow);
  }
  return { data, width, height };
}
