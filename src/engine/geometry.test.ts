import { describe, expect, it } from 'vitest';
import {
  boundingRect,
  clamp,
  constrainEnd,
  distance,
  lerp,
  normalizeRect,
  pointInPolygon,
  pointInRect,
} from './geometry';

describe('clamp', () => {
  it('bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('distance', () => {
  it('measures euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe('lerp', () => {
  it('interpolates', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 20, 0)).toBe(10);
  });
});

describe('normalizeRect', () => {
  it('is order-independent', () => {
    const a = normalizeRect({ x: 10, y: 10 }, { x: 0, y: 5 });
    const b = normalizeRect({ x: 0, y: 5 }, { x: 10, y: 10 });
    expect(a).toEqual({ x: 0, y: 5, width: 10, height: 5 });
    expect(a).toEqual(b);
  });
});

describe('pointInRect', () => {
  const rect = { x: 0, y: 0, width: 10, height: 10 };
  it('includes edges', () => {
    expect(pointInRect({ x: 0, y: 0 }, rect)).toBe(true);
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true);
  });
  it('excludes outside points', () => {
    expect(pointInRect({ x: 11, y: 5 }, rect)).toBe(false);
    expect(pointInRect({ x: -1, y: 5 }, rect)).toBe(false);
  });
});

describe('constrainEnd', () => {
  it('snaps lines to 45° angles', () => {
    const end = constrainEnd({ x: 0, y: 0 }, { x: 10, y: 1 }, 'line');
    expect(end.y).toBeCloseTo(0, 6);
    expect(end.x).toBeCloseTo(Math.hypot(10, 1), 6);
  });

  it('snaps near-vertical lines to vertical', () => {
    const end = constrainEnd({ x: 5, y: 5 }, { x: 6, y: 25 }, 'line');
    expect(end.x).toBeCloseTo(5, 6);
  });

  it('forces square shapes while preserving direction', () => {
    const end = constrainEnd({ x: 0, y: 0 }, { x: 10, y: -4 }, 'shape');
    expect(end).toEqual({ x: 10, y: -10 });
  });
});

describe('boundingRect', () => {
  it('returns null for empty input', () => {
    expect(boundingRect([])).toBeNull();
  });

  it('spans all points', () => {
    expect(
      boundingRect([
        { x: 5, y: 5 },
        { x: -2, y: 8 },
        { x: 10, y: 1 },
      ]),
    ).toEqual({ x: -2, y: 1, width: 12, height: 7 });
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('finds points inside a square and rejects points outside', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: 5, y: -1 }, square)).toBe(false);
  });

  it('handles a concave polygon', () => {
    // U-shape opening upward: (5, 2) is inside the bowl's wall area,
    // (5, 5) sits in the hollow and must read as outside.
    const u = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 7, y: 10 },
      { x: 7, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 1, y: 5 }, u)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 5 }, u)).toBe(false);
  });

  it('needs at least three vertices', () => {
    expect(
      pointInPolygon({ x: 1, y: 1 }, [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe(false);
    expect(pointInPolygon({ x: 1, y: 1 }, [])).toBe(false);
  });

  it('works with an unclosed loop (implicit closing edge)', () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ];
    expect(pointInPolygon({ x: 5, y: 3 }, triangle)).toBe(true);
    expect(pointInPolygon({ x: 0, y: 9 }, triangle)).toBe(false);
  });
});
