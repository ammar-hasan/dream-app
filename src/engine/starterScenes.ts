/**
 * Starter scenes — coloring-book outline art ("Sunny garden", "Night sky",
 * "Under the sea") generated procedurally from engine operations: black
 * outlines only, ready for kids to color in with the brush or fill bucket.
 * No assets, no randomness: same document size → same scene. The scenes are
 * inserted as a new layer by the store, so they behave like anything the
 * user drew (selectable, undoable, exportable).
 */

import { genId } from './document';
import { arcPoints } from './stamps';
import type { Color, Operation, Point, ShapeOp, StrokeOp } from './types';

export const SCENE_IDS = ['garden', 'night', 'sea'] as const;
export type SceneId = (typeof SCENE_IDS)[number];

const INK = '#1f2937';

// --- Outline builders (no fills — this is a coloring book) -------------------

function ring(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  size: number,
  color: Color = INK,
): ShapeOp {
  return {
    kind: 'shape',
    id: genId('op'),
    shape: 'ellipse',
    from: { x: cx - rx, y: cy - ry },
    to: { x: cx + rx, y: cy + ry },
    size,
    color,
    opacity: 1,
  };
}

function rect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
  color: Color = INK,
): ShapeOp {
  return {
    kind: 'shape',
    id: genId('op'),
    shape: 'rectangle',
    from: { x: x1, y: y1 },
    to: { x: x2, y: y2 },
    size,
    color,
    opacity: 1,
  };
}

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
  color: Color = INK,
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

function path(points: Point[], size: number, color: Color = INK): StrokeOp {
  return { kind: 'stroke', id: genId('op'), tool: 'brush', points, size, color, opacity: 1 };
}

/** Gentle horizontal wave across the canvas. */
function wave(y: number, width: number, amplitude: number, bumps: number, size: number): StrokeOp {
  const points: Point[] = [];
  const steps = bumps * 8;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width;
    points.push({ x, y: y + Math.sin((i / 8) * Math.PI) * amplitude });
  }
  return path(points, size);
}

/** Wavy vertical strand (seaweed, grass). */
function strand(
  x: number,
  yTop: number,
  yBottom: number,
  amplitude: number,
  size: number,
): StrokeOp {
  const points: Point[] = [];
  const steps = 16;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({ x: x + Math.sin(t * Math.PI * 2.5) * amplitude, y: yTop + t * (yBottom - yTop) });
  }
  return path(points, size);
}

/** One coloring-book flower: stem, leaf, petal rings around a center ring. */
function flower(cx: number, baseY: number, h: number, size: number): Operation[] {
  const headY = baseY - h;
  const r = h * 0.32;
  const ops: Operation[] = [
    line(cx, headY + r * 0.5, cx, baseY, size),
    path(arcPoints(cx + r * 0.7, baseY - h * 0.3, r * 0.7, r * 0.4, Math.PI, Math.PI * 2, 8), size),
  ];
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    ops.push(ring(cx + Math.cos(a) * r, headY + Math.sin(a) * r, r * 0.55, r * 0.55, size));
  }
  ops.push(ring(cx, headY, r * 0.5, r * 0.5, size));
  return ops;
}

/** Four-point sparkle star outline. */
function sparkle(cx: number, cy: number, r: number, size: number): Operation[] {
  const pts: Point[] = [];
  for (let i = 0; i < 8; i += 1) {
    const rr = i % 2 === 0 ? r : r * 0.35;
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  pts.push(pts[0]);
  return [path(pts, size)];
}

// --- The scenes ----------------------------------------------------------------

function sunnyGarden(w: number, h: number, size: number): Operation[] {
  const u = Math.min(w, h); // unit for proportional sizing
  const groundY = h * 0.82;
  const ops: Operation[] = [];

  // Sun with rays in the top corner.
  const sunX = w * 0.82;
  const sunY = h * 0.18;
  const sunR = u * 0.09;
  ops.push(ring(sunX, sunY, sunR, sunR, size));
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    ops.push(
      line(
        sunX + Math.cos(a) * sunR * 1.35,
        sunY + Math.sin(a) * sunR * 1.35,
        sunX + Math.cos(a) * sunR * 1.8,
        sunY + Math.sin(a) * sunR * 1.8,
        size,
      ),
    );
  }

  // Two overlapping-ring clouds.
  for (const [cloudX, cloudY, cr] of [
    [w * 0.25, h * 0.16, u * 0.05],
    [w * 0.52, h * 0.1, u * 0.04],
  ] as const) {
    ops.push(ring(cloudX - cr, cloudY + cr * 0.3, cr, cr * 0.8, size));
    ops.push(ring(cloudX + cr * 0.2, cloudY - cr * 0.2, cr * 1.2, cr, size));
    ops.push(ring(cloudX + cr * 1.3, cloudY + cr * 0.3, cr * 0.9, cr * 0.7, size));
  }

  // Rolling ground and grass tufts.
  ops.push(wave(groundY, w, u * 0.015, 4, size));
  for (let i = 0; i < 9; i += 1) {
    const x = w * 0.06 + i * w * 0.11;
    const gh = u * 0.035;
    ops.push(line(x, groundY + u * 0.02, x - gh * 0.4, groundY - gh, size));
    ops.push(line(x, groundY + u * 0.02, x + gh * 0.4, groundY - gh * 1.1, size));
  }

  // A row of flowers to color in.
  ops.push(...flower(w * 0.18, groundY, u * 0.16, size));
  ops.push(...flower(w * 0.42, groundY + u * 0.01, u * 0.2, size));
  ops.push(...flower(w * 0.66, groundY, u * 0.14, size));

  // A butterfly: two wing rings each side and a body line.
  const bx = w * 0.55;
  const by = h * 0.38;
  const br = u * 0.045;
  ops.push(ring(bx - br, by - br * 0.4, br, br * 0.9, size));
  ops.push(ring(bx + br, by - br * 0.4, br, br * 0.9, size));
  ops.push(ring(bx - br * 0.8, by + br * 0.9, br * 0.7, br * 0.6, size));
  ops.push(ring(bx + br * 0.8, by + br * 0.9, br * 0.7, br * 0.6, size));
  ops.push(line(bx, by - br * 1.2, bx, by + br * 1.4, size));

  return ops;
}

function nightSky(w: number, h: number, size: number): Operation[] {
  const u = Math.min(w, h);
  const groundY = h * 0.84;
  const ops: Operation[] = [];

  // Crescent moon: outer arc out, inner arc back, closed.
  const mx = w * 0.78;
  const my = h * 0.2;
  const mr = u * 0.1;
  const crescent = [
    ...arcPoints(mx, my, mr, mr, Math.PI * 0.4, Math.PI * 1.6),
    ...arcPoints(mx + mr * 0.45, my, mr * 0.75, mr * 0.75, Math.PI * 1.55, Math.PI * 0.45),
  ];
  ops.push(path(crescent, size));

  // Sparkle stars scattered across the sky.
  const stars: [number, number, number][] = [
    [0.12, 0.14, 0.028],
    [0.3, 0.08, 0.02],
    [0.45, 0.2, 0.026],
    [0.6, 0.1, 0.018],
    [0.22, 0.32, 0.018],
    [0.55, 0.34, 0.02],
    [0.92, 0.42, 0.02],
  ];
  for (const [fx, fy, fr] of stars) ops.push(...sparkle(w * fx, h * fy, u * fr, size));

  // A little house with a roof, door and window.
  const hx = w * 0.16;
  const hw = u * 0.2;
  const hh = u * 0.16;
  ops.push(rect(hx, groundY - hh, hx + hw, groundY, size));
  ops.push(line(hx - hw * 0.08, groundY - hh, hx + hw / 2, groundY - hh - u * 0.1, size));
  ops.push(line(hx + hw / 2, groundY - hh - u * 0.1, hx + hw * 1.08, groundY - hh, size));
  ops.push(rect(hx + hw * 0.38, groundY - hh * 0.5, hx + hw * 0.62, groundY, size));
  ops.push(rect(hx + hw * 0.12, groundY - hh * 0.8, hx + hw * 0.32, groundY - hh * 0.5, size));
  ops.push(line(hx + hw * 0.22, groundY - hh * 0.8, hx + hw * 0.22, groundY - hh * 0.5, size));
  ops.push(line(hx + hw * 0.12, groundY - hh * 0.65, hx + hw * 0.32, groundY - hh * 0.65, size));

  // A pine tree: three stacked Vs and a trunk.
  const tx = w * 0.58;
  const tw = u * 0.12;
  for (let i = 0; i < 3; i += 1) {
    const vy = groundY - u * 0.06 - i * u * 0.07;
    const vw = tw * (1 - i * 0.25);
    ops.push(line(tx - vw, vy, tx, vy - u * 0.08, size));
    ops.push(line(tx, vy - u * 0.08, tx + vw, vy, size));
  }
  ops.push(line(tx, groundY - u * 0.06, tx, groundY, size));

  // Ground with a sleepy hill.
  ops.push(wave(groundY, w, u * 0.012, 3, size));

  return ops;
}

function underTheSea(w: number, h: number, size: number): Operation[] {
  const u = Math.min(w, h);
  const ops: Operation[] = [];

  // Waves along the top.
  ops.push(wave(h * 0.08, w, u * 0.02, 5, size));
  ops.push(wave(h * 0.16, w, u * 0.015, 4, size));

  // A big fish: body ring, tail triangle, eye, smile, fin.
  const fx = w * 0.35;
  const fy = h * 0.42;
  const fr = u * 0.11;
  ops.push(ring(fx, fy, fr, fr * 0.65, size));
  ops.push(line(fx + fr * 0.95, fy, fx + fr * 1.5, fy - fr * 0.55, size));
  ops.push(line(fx + fr * 1.5, fy - fr * 0.55, fx + fr * 1.5, fy + fr * 0.55, size));
  ops.push(line(fx + fr * 1.5, fy + fr * 0.55, fx + fr * 0.95, fy, size));
  ops.push(ring(fx - fr * 0.45, fy - fr * 0.12, fr * 0.12, fr * 0.12, size));
  ops.push(
    path(
      arcPoints(
        fx - fr * 0.6,
        fy + fr * 0.15,
        fr * 0.18,
        fr * 0.14,
        Math.PI * 0.15,
        Math.PI * 0.8,
        8,
      ),
      size,
    ),
  );
  ops.push(
    path(
      arcPoints(fx - fr * 0.05, fy - fr * 0.62, fr * 0.3, fr * 0.22, Math.PI, Math.PI * 2, 8),
      size,
    ),
  );

  // A small fish swimming the other way.
  const sx = w * 0.72;
  const sy = h * 0.58;
  const sr = u * 0.07;
  ops.push(ring(sx, sy, sr, sr * 0.6, size));
  ops.push(line(sx - sr * 0.95, sy, sx - sr * 1.45, sy - sr * 0.5, size));
  ops.push(line(sx - sr * 1.45, sy - sr * 0.5, sx - sr * 1.45, sy + sr * 0.5, size));
  ops.push(line(sx - sr * 1.45, sy + sr * 0.5, sx - sr * 0.95, sy, size));
  ops.push(ring(sx + sr * 0.4, sy - sr * 0.1, sr * 0.12, sr * 0.12, size));

  // Bubbles floating up.
  for (const [bx, by, br] of [
    [0.2, 0.3, 0.02],
    [0.16, 0.22, 0.014],
    [0.24, 0.18, 0.017],
    [0.82, 0.34, 0.018],
    [0.86, 0.26, 0.013],
  ] as const) {
    ops.push(ring(w * bx, h * by, u * br, u * br, size));
  }

  // Seaweed strands on the seabed.
  const bedY = h * 0.94;
  ops.push(strand(w * 0.1, h * 0.68, bedY, u * 0.02, size));
  ops.push(strand(w * 0.16, h * 0.76, bedY, u * 0.025, size));
  ops.push(strand(w * 0.9, h * 0.72, bedY, u * 0.02, size));

  // A starfish on the seabed (reuse the five-point outline).
  const stx = w * 0.5;
  const sty = h * 0.88;
  const str = u * 0.05;
  const pts: Point[] = [];
  for (let i = 0; i < 10; i += 1) {
    const rr = i % 2 === 0 ? str : str * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: stx + Math.cos(a) * rr, y: sty + Math.sin(a) * rr });
  }
  pts.push(pts[0]);
  ops.push(path(pts, size));

  // The seabed itself.
  ops.push(wave(bedY, w, u * 0.012, 4, size));

  return ops;
}

const SCENES: Record<SceneId, (w: number, h: number, size: number) => Operation[]> = {
  garden: sunnyGarden,
  night: nightSky,
  sea: underTheSea,
};

/**
 * Build a starter scene for a document of `width`×`height`: black outline
 * ops on the (white) canvas, all inside the document bounds. Deterministic.
 */
export function createStarterScene(id: SceneId, width: number, height: number): Operation[] {
  const size = Math.max(2, Math.min(width, height) / 220);
  return SCENES[id](width, height, size);
}
