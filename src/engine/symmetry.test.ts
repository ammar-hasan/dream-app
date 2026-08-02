import { describe, expect, it } from 'vitest';
import { mirrorOperations, reflectOperation } from './symmetry';
import type { ShapeOp, StrokeOp, TextOp } from './types';

const size = { width: 100, height: 60 };

const stroke: StrokeOp = {
  kind: 'stroke',
  id: 'op-1',
  tool: 'brush',
  points: [
    { x: 10, y: 10 },
    { x: 30, y: 20 },
  ],
  color: '#ff0000',
  size: 8,
  opacity: 1,
};

const rect: ShapeOp = {
  kind: 'shape',
  id: 'op-2',
  shape: 'rectangle',
  from: { x: 10, y: 10 },
  to: { x: 40, y: 30 },
  color: '#00ff00',
  size: 4,
  opacity: 1,
};

describe('reflectOperation', () => {
  it('mirrors stroke points across the vertical center axis', () => {
    const mirrored = reflectOperation(stroke, size, true, false) as StrokeOp;
    expect(mirrored.points).toEqual([
      { x: 90, y: 10 },
      { x: 70, y: 20 },
    ]);
  });

  it('mirrors stroke points across the horizontal center axis', () => {
    const mirrored = reflectOperation(stroke, size, false, true) as StrokeOp;
    expect(mirrored.points).toEqual([
      { x: 10, y: 50 },
      { x: 30, y: 40 },
    ]);
  });

  it('mirrors across both axes for the diagonal copy', () => {
    const mirrored = reflectOperation(stroke, size, true, true) as StrokeOp;
    expect(mirrored.points).toEqual([
      { x: 90, y: 50 },
      { x: 70, y: 40 },
    ]);
  });

  it('mirrors shape corners (rectangles normalize at render time)', () => {
    const mirrored = reflectOperation(rect, size, true, false) as ShapeOp;
    expect(mirrored.from).toEqual({ x: 90, y: 10 });
    expect(mirrored.to).toEqual({ x: 60, y: 30 });
  });

  it('gives the copy a fresh id and preserves style + pressure widths', () => {
    const pressured: StrokeOp = { ...stroke, widths: [0.5, 1] };
    const mirrored = reflectOperation(pressured, size, true, false) as StrokeOp;
    expect(mirrored.id).not.toBe(stroke.id);
    expect(mirrored.color).toBe('#ff0000');
    expect(mirrored.size).toBe(8);
    expect(mirrored.widths).toEqual([0.5, 1]);
  });

  it('mirrors eraser strokes like any other stroke', () => {
    const eraser: StrokeOp = { ...stroke, tool: 'eraser' };
    const mirrored = reflectOperation(eraser, size, true, false) as StrokeOp;
    expect(mirrored.tool).toBe('eraser');
    expect(mirrored.points[0]).toEqual({ x: 90, y: 10 });
  });
});

describe('mirrorOperations', () => {
  it('off returns just the original', () => {
    expect(mirrorOperations(stroke, 'off', size)).toEqual([stroke]);
  });

  it('vertical returns original + one copy', () => {
    const ops = mirrorOperations(stroke, 'vertical', size);
    expect(ops).toHaveLength(2);
    expect(ops[0]).toBe(stroke);
    expect((ops[1] as StrokeOp).points[0]).toEqual({ x: 90, y: 10 });
  });

  it('horizontal returns original + one copy', () => {
    const ops = mirrorOperations(stroke, 'horizontal', size);
    expect(ops).toHaveLength(2);
    expect((ops[1] as StrokeOp).points[0]).toEqual({ x: 10, y: 50 });
  });

  it('quad returns original + three copies forming a mandala', () => {
    const ops = mirrorOperations(stroke, 'quad', size) as StrokeOp[];
    expect(ops).toHaveLength(4);
    expect(ops[1].points[0]).toEqual({ x: 90, y: 10 });
    expect(ops[2].points[0]).toEqual({ x: 10, y: 50 });
    expect(ops[3].points[0]).toEqual({ x: 90, y: 50 });
    expect(new Set(ops.map((op) => op.id)).size).toBe(4);
  });

  it('shapes mirror too', () => {
    const ops = mirrorOperations(rect, 'quad', size);
    expect(ops).toHaveLength(4);
  });

  it('unsupported kinds (text) are never mirrored', () => {
    const text: TextOp = {
      kind: 'text',
      id: 'op-3',
      position: { x: 5, y: 5 },
      text: 'hi',
      fontSize: 20,
      fontFamily: 'sans-serif',
      color: '#000000',
      opacity: 1,
    };
    expect(mirrorOperations(text, 'quad', size)).toEqual([text]);
  });
});
