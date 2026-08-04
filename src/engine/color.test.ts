import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  cssColor,
  hexToRgba,
  isValidHex,
  MAX_PROJECT_COLORS,
  normalizeHex,
  normalizeProjectColors,
  PALETTE,
  resolveOpColor,
  rgbaToHex,
} from './color';
import type { Operation, ProjectColor } from './types';

describe('normalizeHex', () => {
  it('expands shorthand and lowercases', () => {
    expect(normalizeHex('#AbC')).toBe('#aabbcc');
    expect(normalizeHex('abc')).toBe('#aabbcc');
  });

  it('accepts full hex with or without #', () => {
    expect(normalizeHex('#FF8000')).toBe('#ff8000');
    expect(normalizeHex('ff8000')).toBe('#ff8000');
  });

  it('rejects invalid input', () => {
    expect(normalizeHex('#ab')).toBeNull();
    expect(normalizeHex('#abcd')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('#gggggg')).toBeNull();
  });
});

describe('isValidHex', () => {
  it('matches normalizeHex', () => {
    expect(isValidHex('#123abc')).toBe(true);
    expect(isValidHex('#12345')).toBe(false);
  });
});

describe('normalizeProjectColors', () => {
  it('normalizes values and drops malformed or duplicate entries', () => {
    expect(
      normalizeProjectColors([
        { id: ' brand ', name: ' Ink ', value: '#ABC' },
        { id: 'brand', name: 'Duplicate', value: '#ffffff' },
        { id: 'bad', name: '', value: '#ffffff' },
        { id: 'bad-color', name: 'Bad', value: 'red' },
      ]),
    ).toEqual([{ id: 'brand', name: 'Ink', value: '#aabbcc' }]);
  });

  it('caps the portable list', () => {
    const colors = Array.from({ length: MAX_PROJECT_COLORS + 5 }, (_, index) => ({
      id: `color-${index}`,
      name: `Color ${index}`,
      value: '#123456',
    }));
    expect(normalizeProjectColors(colors)).toHaveLength(MAX_PROJECT_COLORS);
  });
});

describe('hexToRgba', () => {
  it('parses channels', () => {
    expect(hexToRgba('#ff8000')).toEqual({ r: 255, g: 128, b: 0, a: 255 });
    expect(hexToRgba('#000000')).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  it('returns null for invalid colors', () => {
    expect(hexToRgba('nope')).toBeNull();
  });
});

describe('rgbaToHex', () => {
  it('round-trips with hexToRgba', () => {
    expect(rgbaToHex(255, 128, 0)).toBe('#ff8000');
  });

  it('clamps out-of-range channels', () => {
    expect(rgbaToHex(300, -5, 12.6)).toBe('#ff000d');
  });
});

describe('contrastRatio', () => {
  it('matches the opaque sRGB contrast extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#123456', '#123456')).toBe(1);
  });

  it('is order-independent and rejects invalid colors', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.478, 3);
    expect(contrastRatio('#ffffff', '#777777')).toBeCloseTo(4.478, 3);
    expect(contrastRatio('red', '#ffffff')).toBeNull();
  });
});

describe('cssColor', () => {
  it('produces an rgba() string with opacity', () => {
    expect(cssColor('#ff0000')).toBe('rgba(255, 0, 0, 1)');
    expect(cssColor('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('clamps opacity and survives invalid hex', () => {
    expect(cssColor('#ff0000', 2)).toBe('rgba(255, 0, 0, 1)');
    expect(cssColor('not-a-color')).toBe('rgba(0, 0, 0, 1)');
  });
});

describe('PALETTE', () => {
  it('contains only valid normalized hex colors', () => {
    for (const color of PALETTE) {
      expect(normalizeHex(color)).toBe(color);
    }
  });
});

describe('resolveOpColor', () => {
  const colors: ProjectColor[] = [
    { id: 'ink', name: 'Ink', value: '#111111' },
    { id: 'brand', name: 'Brand', value: '#2563eb' },
  ];
  const stroke = {
    id: 's',
    kind: 'stroke',
    tool: 'brush',
    color: '#000000',
    opacity: 1,
    points: [],
    size: 4,
  } as Operation;
  const linked: Operation = { ...stroke, id: 's2', colorRef: 'brand', color: '#2563eb' };
  const stale: Operation = { ...stroke, id: 's3', colorRef: 'gone', color: '#ff0000' };

  it('returns the linked swatch value while the ref is live', () => {
    expect(resolveOpColor(linked, colors)).toBe('#2563eb');
  });

  it('tracks a swatch edit without touching the op', () => {
    const edited = [{ ...colors[1], value: '#ff8800' }];
    expect(resolveOpColor(linked, edited)).toBe('#ff8800');
    expect((linked as { color: string }).color).toBe('#2563eb');
  });

  it('falls back to the literal color when the ref is stale', () => {
    expect(resolveOpColor(stale, colors)).toBe('#ff0000');
  });

  it('falls back to the literal color when nothing is linked', () => {
    expect(resolveOpColor(stroke, colors)).toBe('#000000');
    expect(resolveOpColor(stroke, [])).toBe('#000000');
  });
});
