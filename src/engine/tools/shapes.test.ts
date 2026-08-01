import { describe, expect, it } from 'vitest';
import { ellipseTool, lineTool, rectangleTool } from './shapes';
import { DEFAULT_SETTINGS } from './types';
import type { ShapeOp } from '../types';

const settings = { ...DEFAULT_SETTINGS, color: '#0000ff', size: 3 };

function drag(
  tool: typeof lineTool,
  from: { x: number; y: number },
  to: { x: number; y: number },
  shiftKey = false,
): ShapeOp | null {
  const state = tool.begin({ point: from, shiftKey: false }, settings);
  tool.update(state, { point: to, shiftKey }, settings);
  return tool.commit(state, settings) as ShapeOp | null;
}

describe('shape tools', () => {
  it('line commit spans from pointer down to pointer up', () => {
    const op = drag(lineTool, { x: 1, y: 2 }, { x: 8, y: 9 });
    expect(op).toMatchObject({
      kind: 'shape',
      shape: 'line',
      from: { x: 1, y: 2 },
      to: { x: 8, y: 9 },
    });
    expect(op?.color).toBe('#0000ff');
    expect(op?.size).toBe(3);
  });

  it('shift constrains a line to 45° angles', () => {
    const op = drag(lineTool, { x: 0, y: 0 }, { x: 10, y: 1 }, true);
    expect(op?.to.y).toBeCloseTo(0, 6);
  });

  it('shift constrains a rectangle to a square', () => {
    const op = drag(rectangleTool, { x: 0, y: 0 }, { x: 10, y: 4 }, true);
    expect(op?.to).toEqual({ x: 10, y: 10 });
  });

  it('shift constrains an ellipse to a circle (negative direction kept)', () => {
    const op = drag(ellipseTool, { x: 10, y: 10 }, { x: 2, y: 8 }, true);
    expect(op?.to).toEqual({ x: 2, y: 2 });
  });

  it('without shift the drag end is used verbatim', () => {
    const op = drag(rectangleTool, { x: 0, y: 0 }, { x: 10, y: 4 });
    expect(op?.to).toEqual({ x: 10, y: 4 });
  });

  it('a zero-size drag commits nothing', () => {
    const op = drag(lineTool, { x: 5, y: 5 }, { x: 5, y: 5 });
    expect(op).toBeNull();
  });

  it('preview reflects the latest pointer position', () => {
    const state = ellipseTool.begin({ point: { x: 0, y: 0 }, shiftKey: false }, settings);
    ellipseTool.update(state, { point: { x: 6, y: 6 }, shiftKey: false }, settings);
    const preview = ellipseTool.preview(state, settings) as ShapeOp;
    expect(preview.to).toEqual({ x: 6, y: 6 });
  });
});
