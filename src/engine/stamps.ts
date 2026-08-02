/**
 * Stamps — cute, chunky, multi-color vector doodles (star, heart, smiley…)
 * built entirely from engine operations: filled ellipses, thick round-capped
 * strokes and lines. No assets, no randomness — the slightly imperfect,
 * hand-drawn feel comes from deliberately asymmetric constants, so every
 * stamp is deterministic and unit-testable like the rest of the engine.
 *
 * All ops of one stamp share a groupId, so Design mode selects and moves the
 * whole doodle as a single unit. Placement commits the ops as ONE undoable
 * command (see the store's placeStamp).
 */

import { genId } from './document';
import type { Color, Operation, Point, ShapeOp, StrokeOp } from './types';

export const STAMP_IDS = [
  'star',
  'heart',
  'smiley',
  'flower',
  'sun',
  'moon',
  'cloud',
  'tree',
  'fish',
  'butterfly',
  'cat',
  'rocket',
] as const;

export type StampId = (typeof STAMP_IDS)[number];

export const STAMP_SIZES = { small: 48, medium: 96, large: 160 } as const;
export type StampSize = keyof typeof STAMP_SIZES;

const INK = '#1f2937';

// --- Tiny op builders -------------------------------------------------------

function filled(cx: number, cy: number, rx: number, ry: number, color: Color): ShapeOp {
  return {
    kind: 'shape',
    id: genId('op'),
    shape: 'ellipse',
    from: { x: cx - rx, y: cy - ry },
    to: { x: cx + rx, y: cy + ry },
    size: 1,
    color,
    opacity: 1,
    fill: true,
  };
}

function filledRect(x1: number, y1: number, x2: number, y2: number, color: Color): ShapeOp {
  return {
    kind: 'shape',
    id: genId('op'),
    shape: 'rectangle',
    from: { x: x1, y: y1 },
    to: { x: x2, y: y2 },
    size: 1,
    color,
    opacity: 1,
    fill: true,
  };
}

function strokeLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Color,
  size: number,
): ShapeOp {
  return {
    kind: 'shape',
    id: genId('op'),
    shape: 'line',
    from: { x: x1, y: y1 },
    to: { x: x2, y: y2 },
    size,
    color,
    opacity: 1,
  };
}

function path(points: Point[], color: Color, size: number): StrokeOp {
  return { kind: 'stroke', id: genId('op'), tool: 'brush', points, size, color, opacity: 1 };
}

/** Sample an arc (angles in radians) as a polyline for a stroked path. */
export function arcPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  steps = 14,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = from + ((to - from) * i) / steps;
    points.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return points;
}

/** Closed five-point star outline (first point repeated at the end). */
function starPoints(cx: number, cy: number, outer: number, innerRatio = 0.45): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : outer * innerRatio;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  points.push(points[0]);
  return points;
}

/** Closed plump heart outline, scaled to `radius`. */
function heartPoints(cx: number, cy: number, radius: number): Point[] {
  const k = radius / 16;
  const points: Point[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = (i / 24) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    points.push({ x: cx + x * k, y: cy - y * k });
  }
  return points;
}

/** The shared face: two dot eyes, a smile arc and rosy cheeks. */
function face(
  ops: Operation[],
  cx: number,
  cy: number,
  r: number,
  opts?: { smile?: boolean; cheeks?: boolean; eyeColor?: Color },
): void {
  const ink = opts?.eyeColor ?? INK;
  ops.push(filled(cx - r * 0.34, cy - r * 0.14, r * 0.1, r * 0.1, ink));
  ops.push(filled(cx + r * 0.32, cy - r * 0.18, r * 0.1, r * 0.1, ink));
  if (opts?.smile !== false) {
    ops.push(
      path(
        arcPoints(cx, cy + r * 0.08, r * 0.42, r * 0.36, Math.PI * 0.18, Math.PI * 0.82),
        ink,
        Math.max(2, r * 0.12),
      ),
    );
  }
  if (opts?.cheeks !== false) {
    ops.push(filled(cx - r * 0.5, cy + r * 0.16, r * 0.11, r * 0.08, '#fda4af'));
    ops.push(filled(cx + r * 0.48, cy + r * 0.14, r * 0.11, r * 0.08, '#fda4af'));
  }
}

// --- The stamps --------------------------------------------------------------
// Each builder receives the center and radius (half the stamp size) and
// returns ops that stay inside a size×size box around the center.

function starStamp(cx: number, cy: number, r: number): Operation[] {
  const ops: Operation[] = [path(starPoints(cx, cy, r * 0.92), '#eab308', Math.max(3, r * 0.22))];
  face(ops, cx, cy + r * 0.08, r * 0.52, { eyeColor: '#78350f' });
  return ops;
}

function heartStamp(cx: number, cy: number, r: number): Operation[] {
  const ops: Operation[] = [
    path(heartPoints(cx, cy, r * 0.95), '#ec4899', Math.max(3, r * 0.24)),
    filled(cx - r * 0.38, cy - r * 0.3, r * 0.12, r * 0.09, '#fbcfe8'),
  ];
  face(ops, cx, cy - r * 0.02, r * 0.4, { cheeks: false, eyeColor: '#9d174d' });
  return ops;
}

function smileyStamp(cx: number, cy: number, r: number): Operation[] {
  const ops: Operation[] = [filled(cx, cy, r * 0.92, r * 0.9, '#facc15')];
  face(ops, cx, cy, r * 0.66, { eyeColor: '#78350f' });
  return ops;
}

function flowerStamp(cx: number, cy: number, r: number): Operation[] {
  const headY = cy - r * 0.3;
  const ops: Operation[] = [
    strokeLine(cx, headY + r * 0.3, cx - r * 0.1, cy + r * 0.95, '#16a34a', Math.max(2, r * 0.1)),
    filled(cx + r * 0.2, cy + r * 0.52, r * 0.2, r * 0.1, '#22c55e'),
  ];
  // Petals: five plump circles around the head, one slightly bigger (charm).
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const pr = i === 2 ? r * 0.28 : r * 0.24;
    ops.push(
      filled(cx + Math.cos(a) * r * 0.42, headY + Math.sin(a) * r * 0.42, pr, pr, '#f472b6'),
    );
  }
  ops.push(filled(cx, headY, r * 0.26, r * 0.26, '#facc15'));
  face(ops, cx, headY, r * 0.22, { cheeks: false, eyeColor: '#78350f' });
  return ops;
}

function sunStamp(cx: number, cy: number, r: number): Operation[] {
  const ops: Operation[] = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4 + Math.PI / 16;
    ops.push(
      strokeLine(
        cx + Math.cos(a) * r * 0.66,
        cy + Math.sin(a) * r * 0.66,
        cx + Math.cos(a) * r * 0.92,
        cy + Math.sin(a) * r * 0.92,
        '#f59e0b',
        Math.max(2, r * 0.09),
      ),
    );
  }
  ops.push(filled(cx, cy, r * 0.58, r * 0.58, '#fbbf24'));
  face(ops, cx, cy, r * 0.42, { eyeColor: '#78350f' });
  return ops;
}

function moonStamp(cx: number, cy: number, r: number): Operation[] {
  // A thick arc stroke with round caps reads as a plump crescent.
  const ops: Operation[] = [
    path(
      arcPoints(cx, cy, r * 0.58, r * 0.58, Math.PI * 0.32, Math.PI * 1.68),
      '#fde047',
      Math.max(4, r * 0.52),
    ),
    // Sleepy closed eye and a bashful cheek.
    path(
      arcPoints(cx - r * 0.28, cy - r * 0.14, r * 0.12, r * 0.1, Math.PI * 0.15, Math.PI * 0.85, 8),
      INK,
      Math.max(2, r * 0.06),
    ),
    filled(cx - r * 0.34, cy + r * 0.16, r * 0.1, r * 0.07, '#fda4af'),
    // A little star friend: two crossing strokes.
    strokeLine(
      cx + r * 0.62,
      cy - r * 0.62,
      cx + r * 0.62,
      cy - r * 0.34,
      '#fbbf24',
      Math.max(2, r * 0.06),
    ),
    strokeLine(
      cx + r * 0.48,
      cy - r * 0.48,
      cx + r * 0.76,
      cy - r * 0.48,
      '#fbbf24',
      Math.max(2, r * 0.06),
    ),
  ];
  return ops;
}

function cloudStamp(cx: number, cy: number, r: number): Operation[] {
  const ops: Operation[] = [
    filledRect(cx - r * 0.68, cy + r * 0.02, cx + r * 0.72, cy + r * 0.42, '#bae6fd'),
    filled(cx - r * 0.38, cy + r * 0.05, r * 0.4, r * 0.34, '#bae6fd'),
    filled(cx + r * 0.02, cy - r * 0.16, r * 0.46, r * 0.4, '#e0f2fe'),
    filled(cx + r * 0.44, cy + r * 0.08, r * 0.34, r * 0.28, '#bae6fd'),
  ];
  face(ops, cx + r * 0.02, cy + r * 0.06, r * 0.34);
  return ops;
}

function treeStamp(cx: number, cy: number, r: number): Operation[] {
  return [
    filledRect(cx - r * 0.1, cy + r * 0.3, cx + r * 0.12, cy + r * 0.95, '#b45309'),
    filled(cx, cy - r * 0.2, r * 0.55, r * 0.5, '#22c55e'),
    filled(cx - r * 0.4, cy + r * 0.1, r * 0.36, r * 0.32, '#16a34a'),
    filled(cx + r * 0.4, cy + r * 0.08, r * 0.38, r * 0.34, '#22c55e'),
    filled(cx - r * 0.22, cy - r * 0.3, r * 0.09, r * 0.09, '#ef4444'),
    filled(cx + r * 0.26, cy - r * 0.12, r * 0.09, r * 0.09, '#ef4444'),
    filled(cx + r * 0.02, cy + r * 0.12, r * 0.09, r * 0.09, '#ef4444'),
  ];
}

function fishStamp(cx: number, cy: number, r: number): Operation[] {
  return [
    // Tail: two thick strokes fanning out behind the body.
    strokeLine(cx + r * 0.42, cy, cx + r * 0.86, cy - r * 0.34, '#f97316', Math.max(3, r * 0.18)),
    strokeLine(cx + r * 0.42, cy, cx + r * 0.88, cy + r * 0.3, '#f97316', Math.max(3, r * 0.18)),
    filled(cx - r * 0.05, cy, r * 0.58, r * 0.4, '#fb923c'),
    // Dorsal fin.
    filled(cx - r * 0.02, cy - r * 0.42, r * 0.2, r * 0.12, '#f97316'),
    // Eye with a white shine, a smile and a bubble.
    filled(cx - r * 0.34, cy - r * 0.1, r * 0.13, r * 0.13, '#ffffff'),
    filled(cx - r * 0.36, cy - r * 0.1, r * 0.07, r * 0.07, INK),
    path(
      arcPoints(cx - r * 0.48, cy + r * 0.08, r * 0.14, r * 0.12, Math.PI * 0.15, Math.PI * 0.8, 8),
      '#9a3412',
      Math.max(2, r * 0.05),
    ),
    path(
      arcPoints(cx - r * 0.72, cy - r * 0.52, r * 0.1, r * 0.1, 0, Math.PI * 2),
      '#7dd3fc',
      Math.max(2, r * 0.05),
    ),
  ];
}

function butterflyStamp(cx: number, cy: number, r: number): Operation[] {
  return [
    filled(cx - r * 0.38, cy - r * 0.24, r * 0.34, r * 0.3, '#c084fc'),
    filled(cx + r * 0.38, cy - r * 0.24, r * 0.34, r * 0.3, '#c084fc'),
    filled(cx - r * 0.3, cy + r * 0.28, r * 0.25, r * 0.22, '#f0abfc'),
    filled(cx + r * 0.3, cy + r * 0.28, r * 0.25, r * 0.22, '#f0abfc'),
    filled(cx - r * 0.4, cy - r * 0.26, r * 0.08, r * 0.08, '#fdf4ff'),
    filled(cx + r * 0.36, cy - r * 0.22, r * 0.08, r * 0.08, '#fdf4ff'),
    filled(cx, cy + r * 0.04, r * 0.1, r * 0.44, '#581c87'),
    filled(cx, cy - r * 0.52, r * 0.13, r * 0.13, '#581c87'),
    // Antennae with curly tips.
    path(
      arcPoints(
        cx - r * 0.18,
        cy - r * 0.78,
        r * 0.18,
        r * 0.24,
        Math.PI * 0.35,
        Math.PI * 1.25,
        8,
      ),
      '#581c87',
      Math.max(1.5, r * 0.04),
    ),
    path(
      arcPoints(
        cx + r * 0.18,
        cy - r * 0.78,
        r * 0.18,
        r * 0.24,
        Math.PI * -0.25,
        Math.PI * 0.65,
        8,
      ),
      '#581c87',
      Math.max(1.5, r * 0.04),
    ),
  ];
}

function catStamp(cx: number, cy: number, r: number): Operation[] {
  const headY = cy + r * 0.12;
  return [
    // Ears: thick V strokes tucked under the head circle.
    strokeLine(
      cx - r * 0.52,
      headY - r * 0.28,
      cx - r * 0.38,
      headY - r * 0.72,
      '#f59e0b',
      Math.max(3, r * 0.16),
    ),
    strokeLine(
      cx - r * 0.38,
      headY - r * 0.72,
      cx - r * 0.16,
      headY - r * 0.42,
      '#f59e0b',
      Math.max(3, r * 0.16),
    ),
    strokeLine(
      cx + r * 0.5,
      headY - r * 0.3,
      cx + r * 0.36,
      headY - r * 0.72,
      '#f59e0b',
      Math.max(3, r * 0.16),
    ),
    strokeLine(
      cx + r * 0.36,
      headY - r * 0.72,
      cx + r * 0.14,
      headY - r * 0.42,
      '#f59e0b',
      Math.max(3, r * 0.16),
    ),
    filled(cx, headY, r * 0.62, r * 0.58, '#fbbf24'),
    // Eyes, nose, a little "w" mouth and whiskers.
    filled(cx - r * 0.24, headY - r * 0.06, r * 0.09, r * 0.09, INK),
    filled(cx + r * 0.22, headY - r * 0.08, r * 0.09, r * 0.09, INK),
    filled(cx, headY + r * 0.16, r * 0.08, r * 0.06, '#f472b6'),
    path(
      arcPoints(
        cx - r * 0.09,
        headY + r * 0.22,
        r * 0.09,
        r * 0.08,
        Math.PI * 0.1,
        Math.PI * 0.9,
        6,
      ),
      '#92400e',
      Math.max(1.5, r * 0.04),
    ),
    path(
      arcPoints(
        cx + r * 0.09,
        headY + r * 0.22,
        r * 0.09,
        r * 0.08,
        Math.PI * 0.1,
        Math.PI * 0.9,
        6,
      ),
      '#92400e',
      Math.max(1.5, r * 0.04),
    ),
    strokeLine(
      cx - r * 0.3,
      headY + r * 0.12,
      cx - r * 0.6,
      headY + r * 0.06,
      '#92400e',
      Math.max(1.5, r * 0.04),
    ),
    strokeLine(
      cx - r * 0.3,
      headY + r * 0.22,
      cx - r * 0.62,
      headY + r * 0.26,
      '#92400e',
      Math.max(1.5, r * 0.04),
    ),
    strokeLine(
      cx + r * 0.3,
      headY + r * 0.12,
      cx + r * 0.6,
      headY + r * 0.06,
      '#92400e',
      Math.max(1.5, r * 0.04),
    ),
    strokeLine(
      cx + r * 0.3,
      headY + r * 0.22,
      cx + r * 0.62,
      headY + r * 0.26,
      '#92400e',
      Math.max(1.5, r * 0.04),
    ),
    filled(cx - r * 0.4, headY + r * 0.2, r * 0.09, r * 0.07, '#fda4af'),
    filled(cx + r * 0.38, headY + r * 0.2, r * 0.09, r * 0.07, '#fda4af'),
  ];
}

function rocketStamp(cx: number, cy: number, r: number): Operation[] {
  return [
    // Flame first (behind the body): orange plume with a yellow heart.
    filled(cx, cy + r * 0.66, r * 0.2, r * 0.28, '#f97316'),
    filled(cx, cy + r * 0.6, r * 0.11, r * 0.17, '#facc15'),
    // Fins, body, nose cone, window.
    filled(cx - r * 0.4, cy + r * 0.3, r * 0.15, r * 0.26, '#ef4444'),
    filled(cx + r * 0.4, cy + r * 0.3, r * 0.15, r * 0.26, '#ef4444'),
    filled(cx, cy - r * 0.06, r * 0.32, r * 0.55, '#e2e8f0'),
    filled(cx, cy - r * 0.6, r * 0.2, r * 0.18, '#ef4444'),
    filled(cx, cy - r * 0.18, r * 0.17, r * 0.17, '#3b82f6'),
    filled(cx, cy - r * 0.18, r * 0.11, r * 0.11, '#bae6fd'),
  ];
}

const BUILDERS: Record<StampId, (cx: number, cy: number, r: number) => Operation[]> = {
  star: starStamp,
  heart: heartStamp,
  smiley: smileyStamp,
  flower: flowerStamp,
  sun: sunStamp,
  moon: moonStamp,
  cloud: cloudStamp,
  tree: treeStamp,
  fish: fishStamp,
  butterfly: butterflyStamp,
  cat: catStamp,
  rocket: rocketStamp,
};

/**
 * Build a stamp as engine operations centered at `center`, sized to fit a
 * `size`×`size` box. All ops share one groupId so Design mode treats the
 * doodle as a single object. Deterministic: same inputs, same drawing.
 */
export function createStamp(id: StampId, center: Point, size: number): Operation[] {
  const ops = BUILDERS[id](center.x, center.y, size / 2);
  const groupId = genId('group');
  return ops.map((op) => ({ ...op, groupId }));
}
