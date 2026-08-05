import { describe, expect, it } from 'vitest';
import { mapAnchors, pathBounds, samplePath } from './paths';
import type { PathAnchor, PathOp } from './types';

const A = (x: number, y: number, handleOut?: { x: number; y: number }): PathAnchor => ({
  point: { x, y },
  ...(handleOut ? { handleOut } : {}),
});

function path(anchors: PathAnchor[], closed = false): PathOp {
  return { id: 'p', kind: 'path', color: '#000000', opacity: 1, anchors, closed, size: 4 };
}

describe('samplePath', () => {
  it('returns nothing for an empty anchor list', () => {
    expect(samplePath([], false)).toEqual([]);
  });

  it('walks a straight polyline through corner anchors', () => {
    const pts = samplePath([A(0, 0), A(10, 0), A(10, 10)], false);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts.at(-1)).toEqual({ x: 10, y: 10 });
    expect(pts.length).toBeGreaterThan(3);
  });

  it('closes back to the first anchor when closed', () => {
    const pts = samplePath([A(0, 0), A(10, 0), A(5, 8)], true);
    expect(pts.at(-1)).toEqual({ x: 0, y: 0 });
  });
});

describe('pathBounds', () => {
  it('measures the tight bounds including the stroke width', () => {
    const bounds = pathBounds(path([A(0, 0), A(20, 0), A(20, 16)]), 4);
    expect(bounds.x).toBe(-2);
    expect(bounds.y).toBe(-2);
    expect(bounds.width).toBe(24);
    expect(bounds.height).toBeCloseTo(20, 5);
  });

  it('is a zero rect for an empty path', () => {
    expect(pathBounds(path([], false), 4)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe('mapAnchors', () => {
  it('transforms every anchor point and handle through the function', () => {
    const anchors = [
      { point: { x: 1, y: 2 }, handleOut: { x: 3, y: 4 } },
      { point: { x: 5, y: 6 }, handleIn: { x: 4, y: 5 }, handleOut: { x: 6, y: 7 } },
    ];
    const moved = mapAnchors(anchors, (p) => ({ x: p.x + 10, y: p.y + 10 }));
    expect(moved).toEqual([
      { point: { x: 11, y: 12 }, handleOut: { x: 13, y: 14 } },
      { point: { x: 15, y: 16 }, handleIn: { x: 14, y: 15 }, handleOut: { x: 16, y: 17 } },
    ]);
  });

  it('drops handles that were absent on the source anchor', () => {
    const [only] = mapAnchors([A(0, 0)], (p) => ({ x: p.x, y: p.y }));
    expect(only).toEqual({ point: { x: 0, y: 0 } });
    expect('handleIn' in (only as PathAnchor)).toBe(false);
  });
});
