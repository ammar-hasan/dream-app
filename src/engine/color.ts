/** Color helpers. Colors in the engine are normalized '#rrggbb' hex strings. */

import type { Color } from './types';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Normalize '#abc' / '#aabbcc' (any case, with or without '#') to '#rrggbb'.
 * Returns null when the input is not a valid hex color.
 */
export function normalizeHex(input: string): Color | null {
  const s = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return (
      '#' +
      s
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
  return null;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input) !== null;
}

/** Parse a hex color to RGBA channels (a = 255). Returns null when invalid. */
export function hexToRgba(hex: Color): Rgba | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const n = parseInt(normalized.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, a: 255 };
}

export function rgbaToHex(r: number, g: number, b: number): Color {
  const to = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** CSS color string for canvas styles, with an opacity multiplier (0..1). */
export function cssColor(hex: Color, opacity = 1): string {
  const rgba = hexToRgba(hex) ?? { r: 0, g: 0, b: 0, a: 255 };
  const alpha = Math.min(1, Math.max(0, opacity));
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`;
}

/** Built-in palette shown in the tool options panel. */
export const PALETTE: Color[] = [
  '#000000',
  '#6b7280',
  '#9ca3af',
  '#ffffff',
  '#7c2d12',
  '#b45309',
  '#dc2626',
  '#f97316',
  '#facc15',
  '#16a34a',
  '#0d9488',
  '#2563eb',
  '#4f46e5',
  '#9333ea',
  '#db2777',
  '#f9a8d4',
];
