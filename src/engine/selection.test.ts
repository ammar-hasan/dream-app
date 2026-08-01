import { describe, expect, it } from 'vitest';
import {
  alignOps,
  angleBetween,
  bringForward,
  computeSnap,
  createComponentFromOps,
  deleteOps,
  distanceToSegment,
  distributeOps,
  duplicateOps,
  expandSelectionWithGroups,
  groupOps,
  hitTestOperation,
  hitTestOperations,
  instantiateComponent,
  marqueeSelect,
  rotateOperation,
  rotateOperation90,
  scaleOperationAbout,
  selectionBounds,
  selectionUnionBounds,
  sendBackward,
  supportsFreeRotation,
  ungroupOps,
  unionBounds,
} from './selection';
import type { FillOp, ImageOp, Operation, ShapeOp, StrokeOp, TextOp } from './types';

const stroke = (over: Partial<StrokeOp> = {}): StrokeOp => ({
  kind: 'stroke',
  id: 's1',
  tool: 'brush',
  color: '#000000',
  opacity: 1,
  size: 4,
  points: [
    { x: 10, y: 10 },
    { x: 50, y: 10 },
  ],
  ...over,
});

const shape = (over: Partial<ShapeOp> = {}): ShapeOp => ({
  kind: 'shape',
  id: 'r1',
  shape: 'rectangle',
  color: '#000000',
  opacity: 1,
  size: 2,
  from: { x: 20, y: 20 },
  to: { x: 60, y: 40 },
  ...over,
});

const text = (over: Partial<TextOp> = {}): TextOp => ({
  kind: 'text',
  id: 't1',
  color: '#000000',
  opacity: 1,
  position: { x: 100, y: 100 },
  text: 'hi',
  fontSize: 20,
  fontFamily: 'sans-serif',
  ...over,
});

const fill = (over: Partial<FillOp> = {}): FillOp => ({
  kind: 'fill',
  id: 'f1',
  color: '#ff0000',
  opacity: 1,
  origin: { x: 5, y: 5 },
  patch: { x: 0, y: 0, width: 10, height: 10, data: new Uint8ClampedArray(400) },
  ...over,
});

const image = (over: Partial<ImageOp> = {}): ImageOp => ({
  kind: 'image',
  id: 'i1',
  color: '#000000',
  opacity: 1,
  scale: 2,
  patch: { x: 200, y: 200, width: 10, height: 10, data: new Uint8ClampedArray(400) },
  ...over,
});

describe('selectionBounds', () => {
  it('inflates strokes by half the stroke width', () => {
    expect(selectionBounds(stroke())).toEqual({ x: 8, y: 8, width: 44, height: 4 });
  });

  it('normalizes shape corners', () => {
    expect(selectionBounds(shape({ from: { x: 60, y: 40 }, to: { x: 20, y: 20 } }))).toEqual({
      x: 19,
      y: 19,
      width: 42,
      height: 22,
    });
  });

  it('estimates text bounds from length and font size', () => {
    const b = selectionBounds(text({ text: 'hello', fontSize: 10 }));
    expect(b).toEqual({ x: 100, y: 100, width: 30, height: 12 });
  });

  it('uses the scaled patch box for images', () => {
    expect(selectionBounds(image())).toEqual({ x: 200, y: 200, width: 20, height: 20 });
  });

  it('unions bounds', () => {
    expect(
      unionBounds([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 5, width: 10, height: 10 },
      ]),
    ).toEqual({ x: 0, y: 0, width: 30, height: 15 });
    expect(unionBounds([])).toBeNull();
  });
});

describe('distanceToSegment', () => {
  it('measures perpendicular distance and clamps to endpoints', () => {
    expect(distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(distanceToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
  });

  it('handles zero-length segments', () => {
    expect(distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });
});

describe('hitTestOperation', () => {
  it('hits a stroke near its path, respecting width and tolerance', () => {
    expect(hitTestOperation(stroke(), { x: 30, y: 12 })).toBe(true); // on the line
    expect(hitTestOperation(stroke(), { x: 30, y: 15 })).toBe(false); // 5 away > size/2
    expect(hitTestOperation(stroke(), { x: 30, y: 15 }, 4)).toBe(true); // tolerance covers it
    expect(hitTestOperation(stroke(), { x: 30, y: 30 }, 4)).toBe(false);
  });

  it('hits a single-point stroke as a dot', () => {
    const dot = stroke({ points: [{ x: 10, y: 10 }] });
    expect(hitTestOperation(dot, { x: 11, y: 11 })).toBe(true);
    expect(hitTestOperation(dot, { x: 20, y: 20 })).toBe(false);
  });

  it('hits a line shape near the segment only', () => {
    const line = shape({ shape: 'line', from: { x: 0, y: 0 }, to: { x: 100, y: 0 } });
    expect(hitTestOperation(line, { x: 50, y: 1 })).toBe(true);
    expect(hitTestOperation(line, { x: 50, y: 20 })).toBe(false);
  });

  it('hits a rectangle anywhere inside its box', () => {
    expect(hitTestOperation(shape(), { x: 40, y: 30 })).toBe(true);
    expect(hitTestOperation(shape(), { x: 5, y: 5 })).toBe(false);
  });

  it('hits an ellipse inside but not in its bbox corners', () => {
    const ellipse = shape({ shape: 'ellipse', from: { x: 0, y: 0 }, to: { x: 100, y: 50 } });
    expect(hitTestOperation(ellipse, { x: 50, y: 25 })).toBe(true); // center
    expect(hitTestOperation(ellipse, { x: 2, y: 2 })).toBe(false); // bbox corner, outside
  });

  it('hits text within its estimated box', () => {
    expect(hitTestOperation(text(), { x: 105, y: 105 })).toBe(true);
    expect(hitTestOperation(text(), { x: 500, y: 500 })).toBe(false);
  });

  it('hits fill and image patches within their boxes', () => {
    expect(hitTestOperation(fill(), { x: 5, y: 5 })).toBe(true);
    expect(hitTestOperation(fill(), { x: 50, y: 50 })).toBe(false);
    expect(hitTestOperation(image(), { x: 210, y: 210 })).toBe(true);
    expect(hitTestOperation(image(), { x: 100, y: 100 })).toBe(false);
  });

  it('hitTestOperations returns the topmost hit', () => {
    const bottom = shape({ id: 'bottom' });
    const top = shape({ id: 'top' });
    const ops: Operation[] = [bottom, top];
    expect(hitTestOperations(ops, { x: 40, y: 30 })?.id).toBe('top');
    expect(hitTestOperations(ops, { x: 500, y: 500 })).toBeNull();
  });
});

describe('marqueeSelect', () => {
  it('selects every op intersecting the rect', () => {
    const ops: Operation[] = [stroke(), shape(), text()];
    const hits = marqueeSelect(ops, { x: 0, y: 0, width: 45, height: 45 });
    expect(hits.map((op) => op.id)).toEqual(['s1', 'r1']);
  });

  it('returns nothing for an empty area', () => {
    expect(marqueeSelect([stroke()], { x: 300, y: 300, width: 10, height: 10 })).toHaveLength(0);
  });
});

describe('groups', () => {
  it('groupOps assigns and ungroupOps removes the groupId', () => {
    const ops: Operation[] = [stroke(), shape({ id: 'r2' })];
    const grouped = groupOps(ops, ['s1', 'r2'], 'g1');
    expect(grouped.every((op) => op.groupId === 'g1')).toBe(true);
    const ungrouped = ungroupOps(grouped, ['s1']);
    expect(ungrouped[0].groupId).toBeUndefined();
    expect(ungrouped[1].groupId).toBe('g1');
  });

  it('expands a selection to all group mates', () => {
    const ops: Operation[] = [
      stroke({ id: 'a', groupId: 'g1' }),
      shape({ id: 'b', groupId: 'g1' }),
      text({ id: 'c' }),
    ];
    expect(expandSelectionWithGroups(ops, ['a'])).toEqual(['a', 'b']);
    expect(expandSelectionWithGroups(ops, ['c'])).toEqual(['c']);
  });
});

describe('scaleOperationAbout', () => {
  const anchor = { x: 0, y: 0 };

  it('scales stroke geometry and width', () => {
    const out = scaleOperationAbout(stroke(), anchor, 2) as StrokeOp;
    expect(out.points).toEqual([
      { x: 20, y: 20 },
      { x: 100, y: 20 },
    ]);
    expect(out.size).toBe(8);
  });

  it('scales shapes about an anchor away from the origin', () => {
    const out = scaleOperationAbout(shape(), { x: 20, y: 20 }, 2) as ShapeOp;
    expect(out.from).toEqual({ x: 20, y: 20 });
    expect(out.to).toEqual({ x: 100, y: 60 });
  });

  it('scales text position and font size', () => {
    const out = scaleOperationAbout(text(), { x: 100, y: 100 }, 0.5) as TextOp;
    expect(out.position).toEqual({ x: 100, y: 100 });
    expect(out.fontSize).toBe(10);
  });

  it('scales images via the render scale, keeping pixels', () => {
    const out = scaleOperationAbout(image(), { x: 200, y: 200 }, 2) as ImageOp;
    expect(out.scale).toBe(4);
    expect(out.patch).toMatchObject({ x: 200, y: 200, width: 10, height: 10 });
  });

  it('resamples fill patches', () => {
    const out = scaleOperationAbout(fill(), anchor, 2) as FillOp;
    expect(out.patch).toMatchObject({ x: 0, y: 0, width: 20, height: 20 });
    expect(out.patch.data.length).toBe(20 * 20 * 4);
  });

  it('clamps degenerate factors', () => {
    const out = scaleOperationAbout(stroke(), anchor, 0) as StrokeOp;
    expect(out.size).toBeGreaterThan(0);
  });
});

describe('rotation', () => {
  const center = { x: 0, y: 0 };

  it('rotates strokes by arbitrary angles', () => {
    const out = rotateOperation(
      stroke({ points: [{ x: 10, y: 0 }] }),
      center,
      Math.PI / 2,
    ) as StrokeOp;
    expect(out.points[0].x).toBeCloseTo(0);
    expect(out.points[0].y).toBeCloseTo(10);
  });

  it('rotates line shapes but leaves rectangles unchanged', () => {
    const line = shape({ shape: 'line', from: { x: 10, y: 0 }, to: { x: 20, y: 0 } });
    const rotatedLine = rotateOperation(line, center, Math.PI / 2) as ShapeOp;
    expect(rotatedLine.from.y).toBeCloseTo(10);
    expect(rotateOperation(shape(), center, 0.3)).toEqual(shape());
  });

  it('rotates the text anchor, not the glyphs', () => {
    const out = rotateOperation(text({ position: { x: 10, y: 0 } }), center, Math.PI) as TextOp;
    expect(out.position.x).toBeCloseTo(-10);
    expect(out.position.y).toBeCloseTo(0);
  });

  it('rotateOperation90 re-bakes raster patches in quarter turns', () => {
    const out = rotateOperation90(
      fill({ patch: { ...fill().patch, x: 10, y: 0 } }),
      center,
      1,
    ) as FillOp;
    // A 10×10 patch at (10, 0) rotated 90° CW around the origin lands at (-10, 10).
    expect(out.patch).toMatchObject({ x: -10, y: 10, width: 10, height: 10 });
    // Four turns return to the start.
    const full = rotateOperation90(
      fill({ patch: { ...fill().patch, x: 10, y: 0 } }),
      center,
      4,
    ) as FillOp;
    expect(full.patch).toMatchObject({ x: 10, y: 0 });
  });

  it('supportsFreeRotation gates the arbitrary-angle path', () => {
    expect(supportsFreeRotation(stroke())).toBe(true);
    expect(supportsFreeRotation(text())).toBe(true);
    expect(supportsFreeRotation(shape({ shape: 'line' }))).toBe(true);
    expect(supportsFreeRotation(shape())).toBe(false);
    expect(supportsFreeRotation(fill())).toBe(false);
    expect(supportsFreeRotation(image())).toBe(false);
  });

  it('angleBetween measures the signed drag angle', () => {
    expect(angleBetween(center, { x: 10, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2);
  });
});

describe('computeSnap', () => {
  const doc = { width: 100, height: 100 };
  const moving = { x: 40, y: 40, width: 10, height: 10 };

  it('snaps to the canvas center', () => {
    // Rect center at 44 + 5 = 49, one pixel off the 50 center line.
    const result = computeSnap({ x: 39, y: 39, width: 10, height: 10 }, [], doc, 5);
    expect(result.dx).toBe(1);
    expect(result.guides.some((g) => g.axis === 'x' && g.position === 50)).toBe(true);
  });

  it('snaps to canvas edges', () => {
    const result = computeSnap({ ...moving, x: 2 }, [], doc, 5);
    expect(result.dx).toBe(-2);
  });

  it('snaps to other objects and picks the closest candidate', () => {
    const big = { width: 200, height: 200 };
    const target = { x: 60, y: 60, width: 20, height: 20 };
    // Moving right edge at 54 vs target left at 60: 6 away, no snap.
    expect(computeSnap({ ...moving, x: 44 }, [target], big, 5).dx).toBe(0);
    // Moving right edge at 56: 4 away from the target's left edge.
    const result = computeSnap({ ...moving, x: 46 }, [target], big, 5);
    expect(result.dx).toBe(4);
  });

  it('reports no guides when nothing is within threshold', () => {
    const far = computeSnap({ x: 20, y: 20, width: 5, height: 5 }, [], doc, 2);
    expect(far.guides).toHaveLength(0);
  });
});

describe('reorder / delete / duplicate', () => {
  const ops: Operation[] = [
    stroke({ id: 'a' }),
    shape({ id: 'b' }),
    text({ id: 'c' }),
    fill({ id: 'd' }),
  ];

  it('bringForward swaps with the next unselected op', () => {
    expect(bringForward(ops, ['b']).map((op) => op.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(bringForward(ops, ['d']).map((op) => op.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sendBackward swaps with the previous unselected op', () => {
    expect(sendBackward(ops, ['c']).map((op) => op.id)).toEqual(['a', 'c', 'b', 'd']);
    expect(sendBackward(ops, ['a']).map((op) => op.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps a multi-selection block together when moving', () => {
    expect(bringForward(ops, ['b', 'c']).map((op) => op.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(sendBackward(ops, ['b', 'c']).map((op) => op.id)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('deleteOps removes the selected ids', () => {
    expect(deleteOps(ops, ['a', 'd']).map((op) => op.id)).toEqual(['b', 'c']);
  });

  it('duplicateOps clones with fresh ids, offset and remapped groups', () => {
    const grouped = groupOps(ops, ['a', 'b'], 'g1');
    const { ops: out, cloneIds } = duplicateOps(grouped, ['a', 'b'], { x: 10, y: 5 });
    expect(out).toHaveLength(6);
    expect(cloneIds).toHaveLength(2);
    expect(cloneIds).not.toContain('a');
    const cloneA = out.find((op) => op.id === cloneIds[0]) as StrokeOp;
    expect(cloneA.points[0]).toEqual({ x: 20, y: 15 });
    // The clones share a NEW group id, distinct from the original.
    const cloneB = out.find((op) => op.id === cloneIds[1]);
    expect(cloneA.groupId).toBeDefined();
    expect(cloneA.groupId).toBe(cloneB?.groupId);
    expect(cloneA.groupId).not.toBe('g1');
  });
});

describe('align & distribute', () => {
  const ops: Operation[] = [
    shape({ id: 'a', from: { x: 0, y: 0 }, to: { x: 10, y: 10 } }),
    shape({ id: 'b', from: { x: 40, y: 20 }, to: { x: 50, y: 30 } }),
    shape({ id: 'c', from: { x: 90, y: 50 }, to: { x: 100, y: 60 } }),
  ];

  it('aligns left edges to the union left', () => {
    const out = alignOps(ops, ['a', 'b', 'c'], 'left');
    const xs = out.map((op) => selectionBounds(op).x);
    expect(xs).toEqual([xs[0], xs[0], xs[0]]);
  });

  it('aligns horizontal centers', () => {
    const out = alignOps(ops, ['a', 'b'], 'center');
    const centers = out.slice(0, 2).map((op) => {
      const b = selectionBounds(op);
      return b.x + b.width / 2;
    });
    expect(centers[0]).toBeCloseTo(centers[1]);
  });

  it('aligns bottom edges', () => {
    const out = alignOps(ops, ['a', 'b', 'c'], 'bottom');
    const bottoms = out.map((op) => {
      const b = selectionBounds(op);
      return b.y + b.height;
    });
    expect(bottoms[0]).toBeCloseTo(bottoms[2]);
  });

  it('distributes centers evenly, keeping the outer ops fixed', () => {
    const out = distributeOps(ops, ['a', 'b', 'c'], 'horizontal');
    const centers = out.map((op) => {
      const b = selectionBounds(op);
      return b.x + b.width / 2;
    });
    expect(centers[0]).toBeCloseTo(5);
    expect(centers[2]).toBeCloseTo(95);
    expect(centers[1]).toBeCloseTo(50);
  });

  it('distribution is a no-op below three ops', () => {
    expect(distributeOps(ops, ['a', 'b'], 'horizontal')).toBe(ops);
  });
});

describe('components', () => {
  it('normalizes ops to the origin and strips group ids', () => {
    const ops = groupOps(
      [stroke({ id: 'a', points: [{ x: 10, y: 12 }] }), shape({ id: 'b' })],
      ['a', 'b'],
      'g1',
    );
    const component = createComponentFromOps('Button', ops);
    expect(component.name).toBe('Button');
    expect(component.operations[0].groupId).toBeUndefined();
    // Top-left of the union bounds becomes (0, 0).
    const union = selectionUnionBounds(component.operations, ['a', 'b']);
    expect(union?.x).toBe(0);
    expect(union?.y).toBe(0);
    expect(component.width).toBeGreaterThan(0);
  });

  it('instantiates fresh, offset copies grouped as one unit', () => {
    const component = createComponentFromOps('Pair', [stroke({ id: 'a' }), shape({ id: 'b' })]);
    const instance = instantiateComponent(component, { x: 100, y: 50 });
    expect(instance).toHaveLength(2);
    expect(instance.map((op) => op.id)).not.toContain('a');
    expect(instance[0].groupId).toBeDefined();
    expect(instance[0].groupId).toBe(instance[1].groupId);
    const b = selectionBounds(instance[0]);
    expect(b.x).toBeGreaterThanOrEqual(100);
    expect(b.y).toBeGreaterThanOrEqual(50);
  });

  it('single-op instances get no group', () => {
    const component = createComponentFromOps('One', [stroke({ id: 'a' })]);
    expect(instantiateComponent(component, { x: 0, y: 0 })[0].groupId).toBeUndefined();
  });
});
