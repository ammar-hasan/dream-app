/**
 * Cubic Bezier path helpers: sample a path to a polyline (for hit-testing and
 * bounds) and apply per-anchor transforms. Pure vector math — no DOM.
 */

import type { PathAnchor, PathOp, Point, Rect } from './types';

/**
 * Sample one cubic Bezier segment into `steps` points (excluding the start,
 * including the end). `c1`/`c2` are the absolute control-point positions.
 */
function sampleCubic(
  from: Point,
  c1: Point,
  c2: Point,
  to: Point,
  steps: number,
  out: Point[],
): void {
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * from.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * to.x;
    const y =
      mt * mt * mt * from.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * to.y;
    out.push({ x, y });
  }
}

/** Absolute control-point position for a segment's outgoing/incoming handle. */
function handleOut(anchor: PathAnchor): Point {
  return anchor.handleOut ?? anchor.point;
}
function handleIn(anchor: PathAnchor): Point {
  return anchor.handleIn ?? anchor.point;
}

/**
 * Flatten a path to a polyline. Each segment is sampled proportional to its
 * approximated length so curves stay smooth without over-sampling straight
 * runs. `minSteps`/`maxSteps` bound per-segment resolution.
 */
export function samplePath(
  anchors: readonly PathAnchor[],
  closed: boolean,
  out: Point[] = [],
  minSteps = 2,
  maxSteps = 48,
): Point[] {
  if (anchors.length === 0) return out;
  out.push({ ...anchors[0]!.point });
  const segments = closed ? anchors.length : anchors.length - 1;
  for (let i = 0; i < segments; i += 1) {
    const a = anchors[i]!;
    const b = anchors[(i + 1) % anchors.length]!;
    const c1 = handleOut(a);
    const c2 = handleIn(b);
    // Approximate the segment length by the control polygon: cheap and good
    // enough to scale sampling with curvature.
    const polygon =
      Math.hypot(c1.x - a.point.x, c1.y - a.point.y) +
      Math.hypot(c2.x - c1.x, c2.y - c1.y) +
      Math.hypot(b.point.x - c2.x, b.point.y - c2.y);
    const steps = Math.min(maxSteps, Math.max(minSteps, Math.ceil(polygon / 4)));
    sampleCubic(a.point, c1, c2, b.point, steps, out);
  }
  return out;
}

/** Tight axis-aligned bounds of a stroked path (half-size padding around pts). */
export function pathBounds(op: PathOp, strokeWidth: number): Rect {
  const pts = samplePath(op.anchors, op.closed);
  if (pts.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = strokeWidth / 2;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + 2 * pad,
    height: maxY - minY + pad * 2,
  };
}

/**
 * Apply a point transform to every anchor point and Bezier handle on a path.
 * Used by move/scale/rotate so a path transforms as one editable unit — the
 * control handles ride along so curves stay editable after the transform.
 */
export function mapAnchors(anchors: readonly PathAnchor[], fn: (p: Point) => Point): PathAnchor[] {
  return anchors.map((anchor) => ({
    point: fn(anchor.point),
    ...(anchor.handleIn ? { handleIn: fn(anchor.handleIn) } : {}),
    ...(anchor.handleOut ? { handleOut: fn(anchor.handleOut) } : {}),
  }));
}
