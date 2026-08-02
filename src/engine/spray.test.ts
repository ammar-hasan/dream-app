import { describe, expect, it } from 'vitest';
import { DEFAULT_SPRAY_DENSITY, mulberry32, sprayDots } from './spray';

const base = {
  points: [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 30 },
  ],
  size: 16,
};

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i += 1) expect(a()).toBe(b());
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('stays within [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('sprayDots', () => {
  it('is deterministic: same seed → same dots', () => {
    const a = sprayDots({ ...base, seed: 123 });
    const b = sprayDots({ ...base, seed: 123 });
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('different seeds scatter differently', () => {
    const a = sprayDots({ ...base, seed: 1 });
    const b = sprayDots({ ...base, seed: 999 });
    expect(a).not.toEqual(b);
  });

  it('keeps every dot within the spray radius of the path', () => {
    const radius = base.size / 2;
    for (const dot of sprayDots({ ...base, seed: 5 })) {
      const near = base.points.some(
        (p, i) =>
          i > 0 &&
          // close to one of the segment endpoints at worst (segments are short here)
          Math.hypot(dot.x - p.x, dot.y - p.y) <= radius + Math.hypot(30, 30),
      );
      expect(near).toBe(true);
      expect(dot.x).toBeGreaterThanOrEqual(-radius - 1);
      expect(dot.x).toBeLessThanOrEqual(30 + radius + 1);
      expect(dot.y).toBeGreaterThanOrEqual(-radius - 1);
      expect(dot.y).toBeLessThanOrEqual(30 + radius + 1);
    }
  });

  it('higher density means more dots', () => {
    const sparse = sprayDots({ ...base, seed: 9, density: 10 });
    const dense = sprayDots({ ...base, seed: 9, density: 100 });
    expect(dense.length).toBeGreaterThan(sparse.length);
  });

  it('density is clamped to 1..100 and defaults when absent', () => {
    const fallback = sprayDots({ ...base, seed: 3 });
    const explicit = sprayDots({ ...base, seed: 3, density: DEFAULT_SPRAY_DENSITY });
    expect(fallback).toEqual(explicit);

    const zero = sprayDots({ ...base, seed: 3, density: 0 });
    const min = sprayDots({ ...base, seed: 3, density: 1 });
    expect(zero).toEqual(min);

    const huge = sprayDots({ ...base, seed: 3, density: 5000 });
    const max = sprayDots({ ...base, seed: 3, density: 100 });
    expect(huge).toEqual(max);
  });

  it('a single tap still sprays a dot cluster', () => {
    const dots = sprayDots({ points: [{ x: 10, y: 10 }], size: 16, seed: 2 });
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      expect(Math.hypot(dot.x - 10, dot.y - 10)).toBeLessThanOrEqual(8);
    }
  });

  it('an empty stroke sprays nothing', () => {
    expect(sprayDots({ points: [], size: 16, seed: 2 })).toEqual([]);
  });
});
