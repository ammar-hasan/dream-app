/**
 * Tool contract.
 *
 * A drawing tool is a tiny pure state machine: `begin` creates a draft state
 * on pointer down, `update` mutates it on pointer move, `preview` exposes the
 * in-progress operation for live rendering, and `commit` produces the final
 * operation recorded in history. No DOM, no canvas — fully unit-testable.
 */

import { genId } from '../document';
import type { Color, Operation, Point, ToolId, ToolSettings } from '../types';

export interface PointerSample {
  point: Point;
  shiftKey: boolean;
  /** Stylus pressure 0..1 (pen only); undefined for mouse/touch. */
  pressure?: number;
}

export interface DrawingTool<TState> {
  id: ToolId;
  begin(sample: PointerSample, settings: ToolSettings): TState;
  update(state: TState, sample: PointerSample, settings: ToolSettings): void;
  /** In-progress operation for live preview; null when nothing to show. */
  preview(state: TState, settings: ToolSettings): Operation | null;
  /** Final operation to record; null when the gesture produced nothing. */
  commit(state: TState, settings: ToolSettings): Operation | null;
}

export function makeOpId(): string {
  return genId('op');
}

export const DEFAULT_SETTINGS: ToolSettings = {
  color: '#1f2937',
  size: 8,
  brushStyle: 'round',
  lineStyle: 'plain',
  opacity: 1,
  fontSize: 24,
  fontFamily: 'system-ui, sans-serif',
  fillShapes: false,
  density: 40,
};

export const DEFAULT_TEXT_FONT = DEFAULT_SETTINGS.fontFamily;

/** Read an RGBA pixel out of a packed buffer; null when out of bounds. */
export function readPixel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): { r: number; g: number; b: number; a: number } | null {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return null;
  const i = (py * width + px) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

/** Raster view of a layer used by raster tools (fill, eyedropper). */
export interface RasterSource {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type { Color, Point };
