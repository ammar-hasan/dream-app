/**
 * Design-mode selection engine: hit-testing, marquee, transforms (move /
 * uniform scale / rotate), snapping, alignment, grouping and components.
 *
 * Pure functions over operations — no DOM, fully unit-testable. Text bounds
 * are ESTIMATED (the engine has no font metrics): width ≈ length × size ×
 * 0.6, height ≈ size × 1.2. Good enough for hit-testing and selection boxes.
 *
 * Rotation model: strokes, line shapes and text anchors rotate freely around
 * the selection centroid. Rectangle/ellipse shapes and raster ops (fill,
 * image) cannot be represented at arbitrary angles, so selections containing
 * them rotate in 90° steps (re-using the slice-2 quarter-turn transforms).
 */

import { genId } from './document';
import { distance, normalizeRect, pointInPolygon, pointInRect } from './geometry';
import { resizeBufferNearest, transformOperation, translateOperation } from './transform';
import type {
  Component,
  Layer,
  Operation,
  Point,
  Rect,
  ShapeOp,
  Size,
  StrokeOp,
  TextOp,
} from './types';

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

/** Estimated rendered bounds of a text op (see module note). */
export function estimateTextBounds(op: TextOp): Rect {
  return {
    x: op.position.x,
    y: op.position.y,
    width: Math.max(1, op.text.length * op.fontSize * 0.6),
    height: op.fontSize * 1.2,
  };
}

function inflate(rect: Rect, amount: number): Rect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

/**
 * Bounds used for selection boxes, hit-testing and snapping. Unlike
 * `operationBounds` (transform.ts) this includes stroke width and an
 * estimated text box.
 */
export function selectionBounds(op: Operation): Rect {
  switch (op.kind) {
    case 'stroke': {
      const xs = op.points.map((p) => p.x);
      const ys = op.points.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return inflate(
        { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
        op.size / 2,
      );
    }
    case 'shape':
      return inflate(normalizeRect(op.from, op.to), op.size / 2);
    case 'text':
      return estimateTextBounds(op);
    case 'fill':
      return { x: op.patch.x, y: op.patch.y, width: op.patch.width, height: op.patch.height };
    case 'image':
      return {
        x: op.patch.x,
        y: op.patch.y,
        width: op.patch.width * op.scale,
        height: op.patch.height * op.scale,
      };
  }
}

export function unionBounds(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((r) => r.x + r.width)) - x,
    height: Math.max(...rects.map((r) => r.y + r.height)) - y,
  };
}

/** Combined selection bounds of the ops with the given ids; null when none. */
export function selectionUnionBounds(ops: Operation[], ids: string[]): Rect | null {
  const wanted = new Set(ids);
  return unionBounds(ops.filter((op) => wanted.has(op.id)).map(selectionBounds));
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
  );
}

// ---------------------------------------------------------------------------
// Hit-testing
// ---------------------------------------------------------------------------

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function hitStroke(op: StrokeOp, point: Point, tolerance: number): boolean {
  const reach = op.size / 2 + tolerance;
  if (op.points.length === 1) return distance(point, op.points[0]) <= reach;
  return op.points.some((p, i) => i > 0 && distanceToSegment(point, op.points[i - 1], p) <= reach);
}

function hitShape(op: ShapeOp, point: Point, tolerance: number): boolean {
  if (op.shape === 'line') {
    return distanceToSegment(point, op.from, op.to) <= op.size / 2 + tolerance;
  }
  if (op.shape === 'ellipse') {
    // Normalized distance from center; <= 1 is inside the ellipse.
    const rx = Math.abs(op.to.x - op.from.x) / 2 + op.size / 2 + tolerance;
    const ry = Math.abs(op.to.y - op.from.y) / 2 + op.size / 2 + tolerance;
    if (rx === 0 || ry === 0) return false;
    const cx = (op.from.x + op.to.x) / 2;
    const cy = (op.from.y + op.to.y) / 2;
    const nx = (point.x - cx) / rx;
    const ny = (point.y - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }
  return pointInRect(point, inflate(normalizeRect(op.from, op.to), op.size / 2 + tolerance));
}

/** Point hit-test for a single operation. `tolerance` is in document pixels. */
export function hitTestOperation(op: Operation, point: Point, tolerance = 0): boolean {
  switch (op.kind) {
    case 'stroke':
      return hitStroke(op, point, tolerance);
    case 'shape':
      return hitShape(op, point, tolerance);
    case 'text':
      return pointInRect(point, inflate(estimateTextBounds(op), tolerance));
    case 'fill':
    case 'image':
      return pointInRect(point, inflate(selectionBounds(op), tolerance));
  }
}

/** Topmost op under the point (ops are painted bottom-to-top); null if none. */
export function hitTestOperations(ops: Operation[], point: Point, tolerance = 0): Operation | null {
  for (let i = ops.length - 1; i >= 0; i -= 1) {
    if (hitTestOperation(ops[i], point, tolerance)) return ops[i];
  }
  return null;
}

/** Ops whose selection bounds intersect the marquee rect (paint order). */
export function marqueeSelect(ops: Operation[], rect: Rect): Operation[] {
  return ops.filter((op) => rectsIntersect(selectionBounds(op), rect));
}

/**
 * Lasso (freehand) selection: ops whose selection-bounds CENTER falls inside
 * the polygon. Center-based keeps big background ops from being swallowed by
 * a loop drawn around something small inside them.
 */
export function lassoSelect(ops: Operation[], polygon: Point[]): Operation[] {
  if (polygon.length < 3) return [];
  return ops.filter((op) => {
    const b = selectionBounds(op);
    return pointInPolygon({ x: b.x + b.width / 2, y: b.y + b.height / 2 }, polygon);
  });
}

// ---------------------------------------------------------------------------
// Groups (groupId metadata on ops, scoped to their layer)
// ---------------------------------------------------------------------------

/** Expand ids to include every op sharing a groupId with a selected op. */
export function expandSelectionWithGroups(ops: Operation[], ids: string[]): string[] {
  const wanted = new Set(ids);
  const groups = new Set(
    ops.filter((op) => wanted.has(op.id) && op.groupId).map((op) => op.groupId as string),
  );
  if (groups.size === 0) return ids;
  return ops
    .filter((op) => wanted.has(op.id) || (op.groupId !== undefined && groups.has(op.groupId)))
    .map((op) => op.id);
}

/** Assign `groupId` to the ops with the given ids (paint order preserved). */
export function groupOps(ops: Operation[], ids: string[], groupId: string): Operation[] {
  const wanted = new Set(ids);
  return ops.map((op) => (wanted.has(op.id) ? { ...op, groupId } : op));
}

/** Remove grouping from the ops with the given ids. */
export function ungroupOps(ops: Operation[], ids: string[]): Operation[] {
  const wanted = new Set(ids);
  return ops.map((op) => {
    if (!wanted.has(op.id) || op.groupId === undefined) return op;
    const copy = { ...op };
    delete copy.groupId;
    return copy;
  });
}

// ---------------------------------------------------------------------------
// Transforms of individual ops
// ---------------------------------------------------------------------------

function scalePoint(p: Point, anchor: Point, factor: number): Point {
  return { x: anchor.x + (p.x - anchor.x) * factor, y: anchor.y + (p.y - anchor.y) * factor };
}

/**
 * Uniformly scale an op about `anchor`. Strokes/shapes scale their geometry
 * and stroke width, text scales its font size, images their render scale,
 * fills are resampled (nearest) like document resize.
 */
export function scaleOperationAbout(op: Operation, anchor: Point, factor: number): Operation {
  const f = Math.max(0.05, factor);
  switch (op.kind) {
    case 'stroke':
      return {
        ...op,
        points: op.points.map((p) => scalePoint(p, anchor, f)),
        size: Math.max(0.5, op.size * f),
      };
    case 'shape':
      return {
        ...op,
        from: scalePoint(op.from, anchor, f),
        to: scalePoint(op.to, anchor, f),
        size: Math.max(0.5, op.size * f),
      };
    case 'text':
      return {
        ...op,
        position: scalePoint(op.position, anchor, f),
        fontSize: Math.max(4, op.fontSize * f),
      };
    case 'image': {
      const topLeft = scalePoint({ x: op.patch.x, y: op.patch.y }, anchor, f);
      return {
        ...op,
        scale: op.scale * f,
        patch: { ...op.patch, x: Math.round(topLeft.x), y: Math.round(topLeft.y) },
      };
    }
    case 'fill': {
      const topLeft = scalePoint({ x: op.patch.x, y: op.patch.y }, anchor, f);
      const resized = resizeBufferNearest(op.patch, op.patch.width * f, op.patch.height * f);
      return {
        ...op,
        patch: { ...resized, x: Math.round(topLeft.x), y: Math.round(topLeft.y) },
      };
    }
  }
}

function rotatePoint(p: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

/** True for ops that can rotate by an arbitrary angle (see module note). */
export function supportsFreeRotation(op: Operation): boolean {
  return op.kind === 'stroke' || op.kind === 'text' || (op.kind === 'shape' && op.shape === 'line');
}

/**
 * Rotate an op by `angle` radians about `center`. Only valid for ops where
 * `supportsFreeRotation` is true; other ops are returned unchanged (callers
 * snap those selections to 90° steps via `rotateOperation90`).
 */
export function rotateOperation(op: Operation, center: Point, angle: number): Operation {
  switch (op.kind) {
    case 'stroke':
      return { ...op, points: op.points.map((p) => rotatePoint(p, center, angle)) };
    case 'shape':
      if (op.shape !== 'line') return op;
      return {
        ...op,
        from: rotatePoint(op.from, center, angle),
        to: rotatePoint(op.to, center, angle),
      };
    case 'text':
      // The anchor rotates with the content; glyphs stay upright.
      return { ...op, position: rotatePoint(op.position, center, angle) };
    default:
      return op;
  }
}

/** Rotate an op about `center` in 90° steps (negative = counter-clockwise). */
export function rotateOperation90(op: Operation, center: Point, turns: number): Operation {
  const normalized = ((turns % 4) + 4) % 4;
  let out = op;
  for (let i = 0; i < normalized; i += 1) {
    out = transformOperation(out, center.x, center.y, 'rotate-cw');
  }
  return out;
}

/** Signed angle from `from` to `to` around `center`, in radians. */
export function angleBetween(center: Point, from: Point, to: Point): number {
  return (
    Math.atan2(to.y - center.y, to.x - center.x) - Math.atan2(from.y - center.y, from.x - center.x)
  );
}

// ---------------------------------------------------------------------------
// Snapping
// ---------------------------------------------------------------------------

/** A snap guide line to render while dragging (document coordinates). */
export interface SnapGuide {
  axis: 'x' | 'y';
  /** The line position (x for vertical lines, y for horizontal). */
  position: number;
  /** Segment extent along the line. */
  from: number;
  to: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

/**
 * Snap a moving rect to the canvas (edges + center) and to other objects'
 * edges/centers. Returns the correction delta and the guides to show.
 * `threshold` is in document pixels; pick the closest candidate per axis.
 */
export function computeSnap(
  moving: Rect,
  targets: Rect[],
  docSize: Size,
  threshold: number,
): SnapResult {
  const xLines = [0, docSize.width / 2, docSize.width];
  const yLines = [0, docSize.height / 2, docSize.height];
  for (const t of targets) {
    xLines.push(t.x, t.x + t.width / 2, t.x + t.width);
    yLines.push(t.y, t.y + t.height / 2, t.y + t.height);
  }
  const xEdges = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const yEdges = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];

  let dx = 0;
  let dy = 0;
  let guideX: number | null = null;
  let guideY: number | null = null;
  let bestX = threshold;
  let bestY = threshold;
  for (const line of xLines) {
    for (const edge of xEdges) {
      const delta = line - edge;
      if (Math.abs(delta) <= bestX) {
        bestX = Math.abs(delta);
        dx = delta;
        guideX = line;
      }
    }
  }
  for (const line of yLines) {
    for (const edge of yEdges) {
      const delta = line - edge;
      if (Math.abs(delta) <= bestY) {
        bestY = Math.abs(delta);
        dy = delta;
        guideY = line;
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (guideX !== null) {
    const ys = [
      moving.y,
      moving.y + moving.height,
      ...targets.flatMap((t) => [t.y, t.y + t.height]),
    ];
    guides.push({ axis: 'x', position: guideX, from: Math.min(...ys), to: Math.max(...ys) });
  }
  if (guideY !== null) {
    const xs = [moving.x, moving.x + moving.width, ...targets.flatMap((t) => [t.x, t.x + t.width])];
    guides.push({ axis: 'y', position: guideY, from: Math.min(...xs), to: Math.max(...xs) });
  }
  return { dx, dy, guides };
}

// ---------------------------------------------------------------------------
// Reorder / duplicate / delete within a layer
// ---------------------------------------------------------------------------

/** Move the selected ops one step toward the top of the paint order. */
export function bringForward(ops: Operation[], ids: string[]): Operation[] {
  const wanted = new Set(ids);
  const out = ops.slice();
  for (let i = out.length - 2; i >= 0; i -= 1) {
    if (wanted.has(out[i].id) && !wanted.has(out[i + 1].id)) {
      [out[i], out[i + 1]] = [out[i + 1], out[i]];
    }
  }
  return out;
}

/** Move the selected ops one step toward the bottom of the paint order. */
export function sendBackward(ops: Operation[], ids: string[]): Operation[] {
  const wanted = new Set(ids);
  const out = ops.slice();
  for (let i = 1; i < out.length; i += 1) {
    if (wanted.has(out[i].id) && !wanted.has(out[i - 1].id)) {
      [out[i], out[i - 1]] = [out[i - 1], out[i]];
    }
  }
  return out;
}

export function deleteOps(ops: Operation[], ids: string[]): Operation[] {
  const wanted = new Set(ids);
  return ops.filter((op) => !wanted.has(op.id));
}

/**
 * Append copies of the selected ops (fresh ids, fresh group ids, offset by
 * `delta`) and return the new array plus the clone ids for re-selection.
 */
export function duplicateOps(
  ops: Operation[],
  ids: string[],
  delta: Point,
): { ops: Operation[]; cloneIds: string[] } {
  const wanted = new Set(ids);
  const groupMap = new Map<string, string>();
  const clones: Operation[] = [];
  for (const op of ops) {
    if (!wanted.has(op.id)) continue;
    let groupId = op.groupId;
    if (groupId !== undefined) {
      if (!groupMap.has(groupId)) groupMap.set(groupId, genId('group'));
      groupId = groupMap.get(groupId);
    }
    clones.push(translateOperation({ ...op, id: genId('op'), groupId }, delta.x, delta.y));
  }
  return { ops: [...ops, ...clones], cloneIds: clones.map((op) => op.id) };
}

// ---------------------------------------------------------------------------
// Alignment & distribution (multi-select)
// ---------------------------------------------------------------------------

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

function alignDelta(bounds: Rect, union: Rect, mode: AlignMode): Point {
  switch (mode) {
    case 'left':
      return { x: union.x - bounds.x, y: 0 };
    case 'center':
      return { x: union.x + union.width / 2 - (bounds.x + bounds.width / 2), y: 0 };
    case 'right':
      return { x: union.x + union.width - (bounds.x + bounds.width), y: 0 };
    case 'top':
      return { x: 0, y: union.y - bounds.y };
    case 'middle':
      return { x: 0, y: union.y + union.height / 2 - (bounds.y + bounds.height / 2) };
    case 'bottom':
      return { x: 0, y: union.y + union.height - (bounds.y + bounds.height) };
  }
}

/** Align the selected ops within their union bounds; returns the new array. */
export function alignOps(ops: Operation[], ids: string[], mode: AlignMode): Operation[] {
  const union = selectionUnionBounds(ops, ids);
  if (!union) return ops;
  const wanted = new Set(ids);
  return ops.map((op) => {
    if (!wanted.has(op.id)) return op;
    const d = alignDelta(selectionBounds(op), union, mode);
    return translateOperation(op, d.x, d.y);
  });
}

/**
 * Distribute the selected ops (≥3) with equal center spacing along `axis`;
 * the outermost ops stay fixed. Returns the new array.
 */
export function distributeOps(
  ops: Operation[],
  ids: string[],
  axis: 'horizontal' | 'vertical',
): Operation[] {
  const wanted = new Set(ids);
  const selected = ops.filter((op) => wanted.has(op.id));
  if (selected.length < 3) return ops;
  const centerOf = (op: Operation) => {
    const b = selectionBounds(op);
    return axis === 'horizontal' ? b.x + b.width / 2 : b.y + b.height / 2;
  };
  const sorted = selected.slice().sort((a, b) => centerOf(a) - centerOf(b));
  const first = centerOf(sorted[0]);
  const last = centerOf(sorted[sorted.length - 1]);
  const step = (last - first) / (sorted.length - 1);
  const deltaById = new Map<string, number>();
  sorted.forEach((op, i) => deltaById.set(op.id, first + step * i - centerOf(op)));
  return ops.map((op) => {
    const d = deltaById.get(op.id);
    if (d === undefined) return op;
    return axis === 'horizontal' ? translateOperation(op, d, 0) : translateOperation(op, 0, d);
  });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/**
 * Build a library component from ops: coordinates are normalized so the
 * content's top-left is (0, 0) and group ids are stripped (instances get a
 * fresh shared group instead).
 */
export function createComponentFromOps(
  name: string,
  ops: Operation[],
  id = genId('component'),
): Component {
  const union = unionBounds(ops.map(selectionBounds)) ?? { x: 0, y: 0, width: 1, height: 1 };
  const operations = ops.map((op) => {
    const moved = translateOperation(op, -Math.round(union.x), -Math.round(union.y));
    const copy = { ...moved };
    delete copy.groupId;
    return copy;
  });
  const now = Date.now();
  return {
    id,
    name,
    operations,
    width: Math.max(1, Math.round(union.width)),
    height: Math.max(1, Math.round(union.height)),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Materialize a component as ops placed at `at` (top-left, document pixels).
 * Clones get fresh ids and — when there are several — a shared group id so
 * the instance moves as one unit.
 */
export function instantiateComponent(component: Component, at: Point): Operation[] {
  const groupId = component.operations.length > 1 ? genId('group') : undefined;
  return component.operations.map((op) =>
    translateOperation({ ...op, id: genId('op'), groupId }, Math.round(at.x), Math.round(at.y)),
  );
}

// ---------------------------------------------------------------------------
// Selection helpers over layers
// ---------------------------------------------------------------------------

/** Ops of `layer` selected by id, in paint order. */
export function selectedOps(layer: Layer, ids: string[]): Operation[] {
  const wanted = new Set(ids);
  return layer.operations.filter((op) => wanted.has(op.id));
}

/** Bounds of every op NOT in `ids` (snap targets). */
export function snapTargets(ops: Operation[], ids: string[]): Rect[] {
  const wanted = new Set(ids);
  return ops.filter((op) => !wanted.has(op.id)).map(selectionBounds);
}
