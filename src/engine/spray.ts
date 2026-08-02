/**
 * Spray (airbrush) support: a tiny seeded PRNG and the deterministic dot
 * layout for a spray stroke. The seed travels on the stroke op, so every
 * redraw — viewport, export, thumbnail — paints the exact same mist.
 */

import { lerp } from './geometry';
import type { StrokeOp } from './types';

export const DEFAULT_SPRAY_DENSITY = 40;

/** mulberry32: small deterministic PRNG — same seed, same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SprayDot {
  x: number;
  y: number;
  /** Square dot edge in document pixels. */
  size: number;
}

type SpraySource = Pick<StrokeOp, 'points' | 'size'> & Partial<Pick<StrokeOp, 'seed' | 'density'>>;

/**
 * Dot layout for a spray stroke: dots are scattered along the polyline,
 * uniformly within `size / 2` of the path, in a fixed order driven by the
 * stroke's seed. Density (1..100) controls dots per path step.
 */
export function sprayDots(op: SpraySource): SprayDot[] {
  if (op.points.length === 0) return [];
  const rng = mulberry32(op.seed ?? 1);
  const radius = op.size / 2;
  const dotSize = Math.max(1, Math.round(op.size / 8));
  const density = Math.min(100, Math.max(1, op.density ?? DEFAULT_SPRAY_DENSITY));
  const dotsPerStep = Math.max(1, Math.round(density / 8));
  const dots: SprayDot[] = [];
  const scatter = (cx: number, cy: number) => {
    for (let i = 0; i < dotsPerStep; i += 1) {
      const angle = rng() * Math.PI * 2;
      // sqrt for a uniform distribution over the disc.
      const r = Math.sqrt(rng()) * radius;
      dots.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, size: dotSize });
    }
  };
  if (op.points.length === 1) {
    scatter(op.points[0].x, op.points[0].y);
    return dots;
  }
  for (let i = 1; i < op.points.length; i += 1) {
    const a = op.points[i - 1];
    const b = op.points[i];
    const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 3));
    for (let s = 0; s <= steps; s += 1) {
      scatter(lerp(a.x, b.x, s / steps), lerp(a.y, b.y, s / steps));
    }
  }
  return dots;
}
