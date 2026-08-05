import { describe, expect, it } from 'vitest';
import { DEFAULT_SHADOW, hasActiveEffect, normalizeEffects, normalizeShadow } from './effects';

describe('normalizeShadow', () => {
  it('fills missing fields with safe defaults', () => {
    expect(normalizeShadow({})).toEqual(DEFAULT_SHADOW);
    expect(normalizeShadow(null)).toEqual(DEFAULT_SHADOW);
  });

  it('clamps every field to its range and keeps a valid hex color', () => {
    expect(
      normalizeShadow({ color: '#ABC', opacity: 2, radius: 99, offsetX: -99, offsetY: 99 }),
    ).toEqual({
      color: '#aabbcc',
      opacity: 1,
      radius: 40,
      offsetX: -40,
      offsetY: 40,
    });
  });

  it('drops an invalid color back to the default', () => {
    expect(normalizeShadow({ color: 'red' }).color).toBe('#000000');
  });
});

describe('normalizeEffects', () => {
  it('returns an empty stack for non-array input', () => {
    expect(normalizeEffects(undefined)).toEqual([]);
    expect(normalizeEffects({})).toEqual([]);
  });

  it('keeps valid shadow effects in order, dropping junk and duplicate ids', () => {
    const effects = normalizeEffects([
      {
        id: 'a',
        type: 'shadow',
        enabled: true,
        params: { color: '#000000', opacity: 0.5, radius: 4 },
      },
      { id: 'a', type: 'shadow', enabled: true, params: {} },
      { id: 'b', type: 'glow', enabled: true, params: {} },
      { id: ' ', type: 'shadow', enabled: true, params: {} },
      { id: 'c', type: 'shadow', enabled: false, params: { opacity: 0, radius: 0 } },
    ]);
    expect(effects.map((e) => e.id)).toEqual(['a', 'c']);
    expect(effects[0].params).toEqual({ ...DEFAULT_SHADOW, opacity: 0.5, radius: 4 });
    expect(effects[1].enabled).toBe(false);
  });

  it('treats a missing enabled flag as on', () => {
    const [effect] = normalizeEffects([{ id: 'a', type: 'shadow', params: {} }]);
    expect(effect?.enabled).toBe(true);
  });
});

describe('hasActiveEffect', () => {
  it('is false for absent, empty, or all-disabled stacks', () => {
    expect(hasActiveEffect(undefined)).toBe(false);
    expect(hasActiveEffect([])).toBe(false);
    expect(
      hasActiveEffect([{ id: 'a', type: 'shadow', enabled: false, params: DEFAULT_SHADOW }]),
    ).toBe(false);
  });

  it('is true when at least one effect is enabled', () => {
    expect(
      hasActiveEffect([{ id: 'a', type: 'shadow', enabled: true, params: DEFAULT_SHADOW }]),
    ).toBe(true);
  });
});
