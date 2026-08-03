/**
 * Generative fill / inpainting helpers shared by the AI panel and the BYOK
 * provider. Pure pixel functions — no DOM, no network — so the mask contract
 * is fully unit-testable.
 *
 * The mask follows the OpenAI Images API convention: **transparent pixels
 * are the area the model regenerates, opaque pixels are kept.**
 */

import { blitRegion, extractRegion, type PixelBuffer } from '../engine/filters';
import type { Rect } from '../engine/types';

/**
 * The one-tap "Erase this" prompt: remove whatever the mask covers and
 * fill the gap with the surrounding background. Used verbatim as the
 * inpainting prompt so tests (and the spec) pin the exact wording.
 */
export const ERASE_PROMPT =
  'Remove the object in the masked area and fill the space naturally with the surrounding background.';

/**
 * Build the edit mask for an inpainting request: an opaque image the size
 * of `image` with `region` made transparent (= regenerate). No region means
 * the whole image is fair game. The region is clamped to the image bounds.
 */
export function buildEditMask(image: PixelBuffer, region?: Rect | null): PixelBuffer {
  const { width, height } = image;
  const data = new Uint8ClampedArray(width * height * 4);
  // Opaque everywhere (color is irrelevant — only the alpha channel is read).
  data.fill(255);

  const x0 = region ? Math.max(0, Math.floor(region.x)) : 0;
  const y0 = region ? Math.max(0, Math.floor(region.y)) : 0;
  const x1 = region ? Math.min(width, Math.ceil(region.x + region.width)) : width;
  const y1 = region ? Math.min(height, Math.ceil(region.y + region.height)) : height;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      data[(y * width + x) * 4 + 3] = 0; // transparent = regenerate this pixel
    }
  }
  return { data, width, height };
}

/**
 * Keep every source pixel outside the requested edit region, even if a
 * remote model changes more than its guidance mask. No region accepts the
 * whole returned image.
 */
export function mergeEditResult(
  source: PixelBuffer,
  edited: PixelBuffer,
  region?: Rect | null,
): PixelBuffer {
  if (!region) return edited;
  const merged: PixelBuffer = {
    data: new Uint8ClampedArray(source.data),
    width: source.width,
    height: source.height,
  };
  return blitRegion(merged, extractRegion(edited, region), region.x, region.y);
}
