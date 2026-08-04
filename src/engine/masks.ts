/** Pure helpers for Dream's non-destructive layer-opacity masks. */

import type { LayerMask, LayerMaskStroke, Point } from './types';

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function finitePoint(value: unknown): Point | null {
  const point = record(value);
  return point && Number.isFinite(point.x) && Number.isFinite(point.y)
    ? { x: point.x as number, y: point.y as number }
    : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeStroke(value: unknown): LayerMaskStroke | null {
  const stroke = record(value);
  if (!stroke || !Array.isArray(stroke.points)) return null;
  const points = stroke.points.map(finitePoint).filter((point): point is Point => point !== null);
  if (points.length === 0) return null;
  const size = typeof stroke.size === 'number' && Number.isFinite(stroke.size) ? stroke.size : 1;
  const opacity =
    typeof stroke.opacity === 'number' && Number.isFinite(stroke.opacity) ? stroke.opacity : 1;
  const normalized: LayerMaskStroke = {
    id: typeof stroke.id === 'string' && stroke.id ? stroke.id : 'mask-stroke',
    mode: stroke.mode === 'reveal' ? 'reveal' : 'hide',
    points,
    size: clamp(size, 0.5, 8192),
    opacity: clamp(opacity, 0, 1),
  };
  if (
    Array.isArray(stroke.widths) &&
    stroke.widths.length === points.length &&
    stroke.widths.every((width) => typeof width === 'number' && Number.isFinite(width))
  ) {
    normalized.widths = stroke.widths.map((width) => clamp(width as number, 0.1, 1));
  }
  return normalized;
}

/** Add a fully revealing, enabled mask. */
export function createLayerMask(): LayerMask {
  return { enabled: true, strokes: [] };
}

/** Sanitize portable mask data; absent/non-object input means no mask. */
export function normalizeLayerMask(value: unknown): LayerMask | undefined {
  const mask = record(value);
  if (!mask) return undefined;
  const strokes = Array.isArray(mask.strokes)
    ? mask.strokes
        .map(normalizeStroke)
        .filter((stroke): stroke is LayerMaskStroke => stroke !== null)
    : [];
  return { enabled: mask.enabled !== false, strokes };
}
