/**
 * Per-layer effect stack helpers. Effects are non-destructive, ordered and
 * toggleable; the renderer applies them after adjustments/mask and before
 * layer blending. The first (and currently only) effect type is a drop shadow.
 */

import { normalizeHex } from './color';
import type { DropShadowParams, LayerEffect } from './types';

export const SHADOW_RADIUS_RANGE = [0, 40] as const;
export const SHADOW_OFFSET_RANGE = [-40, 40] as const;

export const DEFAULT_SHADOW: DropShadowParams = {
  color: '#000000',
  opacity: 0.45,
  radius: 8,
  offsetX: 0,
  offsetY: 4,
};

/** Clamp a shadow param set to its valid ranges, filling gaps with defaults. */
export function normalizeShadow(value: unknown): DropShadowParams {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const color = typeof source.color === 'string' ? normalizeHex(source.color) : null;
  const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
    const n = typeof v === 'number' ? v : Number.NaN;
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    color: color ?? DEFAULT_SHADOW.color,
    opacity: clamp(source.opacity, 0, 1, DEFAULT_SHADOW.opacity),
    radius: clamp(
      source.radius,
      SHADOW_RADIUS_RANGE[0],
      SHADOW_RADIUS_RANGE[1],
      DEFAULT_SHADOW.radius,
    ),
    offsetX: clamp(
      source.offsetX,
      SHADOW_OFFSET_RANGE[0],
      SHADOW_OFFSET_RANGE[1],
      DEFAULT_SHADOW.offsetX,
    ),
    offsetY: clamp(
      source.offsetY,
      SHADOW_OFFSET_RANGE[0],
      SHADOW_OFFSET_RANGE[1],
      DEFAULT_SHADOW.offsetY,
    ),
  };
}

/** Recover a bounded, ordered effect stack from optional portable data. */
export function normalizeEffects(value: unknown): LayerEffect[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const effects: LayerEffect[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    if (record.type !== 'shadow') continue;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    effects.push({
      id,
      type: 'shadow',
      enabled: record.enabled !== false,
      params: normalizeShadow(record.params),
    });
  }
  return effects;
}

/** True when a layer has at least one enabled effect that should paint. */
export function hasActiveEffect(effects: LayerEffect[] | undefined): boolean {
  return !!effects && effects.some((effect) => effect.enabled);
}
