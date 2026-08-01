/** Geometry helpers shared by tools and the renderer. Pure functions only. */

import type { Point, Rect } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Axis-aligned rect spanning two corner points (order-independent). */
export function normalizeRect(from: Point, to: Point): Rect {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  };
}

export function pointInRect(p: Point, rect: Rect): boolean {
  return (
    p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height
  );
}

/**
 * Shift-constrain an in-progress shape drag.
 * - 'line': snap the angle to the nearest 45°.
 * - 'shape': force equal width/height (square / circle), preserving direction.
 */
export function constrainEnd(from: Point, to: Point, mode: 'line' | 'shape'): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (mode === 'line') {
    const length = Math.hypot(dx, dy);
    const snapped = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    return { x: from.x + Math.cos(snapped) * length, y: from.y + Math.sin(snapped) * length };
  }
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: from.x + Math.sign(dx) * side, y: from.y + Math.sign(dy) * side };
}

/** Smallest rect containing all points; null for an empty list. */
export function boundingRect(points: Point[]): Rect | null {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
