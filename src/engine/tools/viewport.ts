/** Pan and zoom math for the viewport. Pure and framework-free. */

import { clamp } from '../geometry';
import type { Point } from '../types';

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 8;

/** Discrete zoom ladder used by +/- keys, buttons and the zoom tool. */
export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 1, 1.5, 2, 3, 4, 6, 8];

export function clampZoom(zoom: number): number {
  return clamp(zoom, ZOOM_MIN, ZOOM_MAX);
}

export function nextZoomIn(zoom: number): number {
  for (const step of ZOOM_STEPS) if (step > zoom + 1e-9) return step;
  return ZOOM_MAX;
}

export function nextZoomOut(zoom: number): number {
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i -= 1) {
    if (ZOOM_STEPS[i] < zoom - 1e-9) return ZOOM_STEPS[i];
  }
  return ZOOM_MIN;
}

/** Translate the viewport offset by a screen-space delta. */
export function panBy(offset: Point, dx: number, dy: number): Point {
  return { x: offset.x + dx, y: offset.y + dy };
}

/**
 * Change zoom while keeping the document point under `focal` (screen space)
 * stationary — this is what makes wheel/pinch zoom feel anchored.
 */
export function zoomAtPoint(offset: Point, fromZoom: number, toZoom: number, focal: Point): Point {
  const scale = toZoom / fromZoom;
  return {
    x: focal.x - (focal.x - offset.x) * scale,
    y: focal.y - (focal.y - offset.y) * scale,
  };
}
