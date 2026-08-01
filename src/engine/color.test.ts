import { describe, expect, it } from 'vitest';
import { cssColor, hexToRgba, isValidHex, normalizeHex, PALETTE, rgbaToHex } from './color';

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
