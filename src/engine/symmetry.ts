/**
 * Mirror / symmetry mode. A pure derivation: given a drawn op, produce its
 * reflected copies across the canvas center axes (vertical, horizontal, or
 * both = quad). Mirrored ops are REAL ops — committed together with the
 * original in ONE undoable command, so a single undo removes the whole
 * symmetric gesture. The document model is unchanged.
 */

import { genId } from './document';
import type { Operation, Point, Size, ToolId } from './types';

export type SymmetryMode = 'off' | 'vertical' | 'horizontal' | 'quad';

/** Tools whose committed ops can be mirrored (strokes and shapes). */
export const SYMMETRY_TOOLS: readonly ToolId[] = [
  'brush',
  'pencil',
  'eraser',
  'spray',
  'line',
  'rectangle',
  'ellipse',
];

function mirrorX(p: Point, width: number): Point {
  return { x: width - p.x, y: p.y };
}

function mirrorY(p: Point, height: number): Point {
  return { x: p.x, y: height - p.y };
}

/** Reflect an op across the vertical (flipX) and/or horizontal center axis. */
export function reflectOperation(
  op: Operation,
  size: Size,
  flipX: boolean,
  flipY: boolean,
): Operation {
  const reflect = (p: Point): Point => {
    let q = p;
    if (flipX) q = mirrorX(q, size.width);
    if (flipY) q = mirrorY(q, size.height);
    return q;
  };
  switch (op.kind) {
    case 'stroke':
      return { ...op, id: genId('op'), points: op.points.map(reflect) };
    case 'shape':
      return { ...op, id: genId('op'), from: reflect(op.from), to: reflect(op.to) };
    default:
      return op;
  }
}

/**
 * The op plus its mirrored copies for `mode` — 'off' and unsupported kinds
 * (text, fill, image) return just the original. Order: original, then the
 * vertical copy, the horizontal copy, and the diagonal copy for quad.
 */
export function mirrorOperations(op: Operation, mode: SymmetryMode, size: Size): Operation[] {
  if (mode === 'off' || (op.kind !== 'stroke' && op.kind !== 'shape')) return [op];
  const ops: Operation[] = [op];
  if (mode === 'vertical' || mode === 'quad') ops.push(reflectOperation(op, size, true, false));
  if (mode === 'horizontal' || mode === 'quad') ops.push(reflectOperation(op, size, false, true));
  if (mode === 'quad') ops.push(reflectOperation(op, size, true, true));
  return ops;
}
