/** Color helpers. Colors in the engine are normalized '#rrggbb' hex strings. */

import type { Color, ProjectColor } from './types';

export const MAX_PROJECT_COLORS = 24;
export const MAX_PROJECT_COLOR_NAME = 40;

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

/** Sanitize portable named colors while preserving order and valid ids. */
export function normalizeProjectColors(value: unknown): ProjectColor[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const colors: ProjectColor[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const color = typeof record.value === 'string' ? normalizeHex(record.value) : null;
    if (!id || seen.has(id) || !name || !color) continue;
    seen.add(id);
    colors.push({ id, name: name.slice(0, MAX_PROJECT_COLOR_NAME), value: color });
    if (colors.length === MAX_PROJECT_COLORS) break;
  }
  return colors;
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

/** WCAG contrast ratio between two opaque sRGB colors (1..21), or null if invalid. */
export function contrastRatio(foreground: Color, background: Color): number | null {
  const foregroundRgba = hexToRgba(foreground);
  const backgroundRgba = hexToRgba(background);
  if (!foregroundRgba || !backgroundRgba) return null;
  const luminance = ({ r, g, b }: Rgba) => {
    const linear = (channel: number) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };
  const lighter = Math.max(luminance(foregroundRgba), luminance(backgroundRgba));
  const darker = Math.min(luminance(foregroundRgba), luminance(backgroundRgba));
  return (lighter + 0.05) / (darker + 0.05);
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
