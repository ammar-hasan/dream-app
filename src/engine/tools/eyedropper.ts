/** Eyedropper: sample a color from a raster buffer. */

import { rgbaToHex } from '../color';
import type { Color, Point } from '../types';
import { readPixel, type RasterSource } from './types';

/** Hex color of the pixel at `point`, or null when outside the raster. */
export function pickColor(raster: RasterSource, point: Point): Color | null {
  const pixel = readPixel(raster.data, raster.width, raster.height, point.x, point.y);
  if (!pixel) return null;
  return rgbaToHex(pixel.r, pixel.g, pixel.b);
}
