/** Sparse, optional tactile cues for interactions that already have visual feedback. */

export type HapticCue = 'target' | 'refusal' | 'detent' | 'impact';

interface HapticDeps {
  vibrate?: (pattern: number | number[]) => boolean;
  reducedMotion?: boolean;
}

const PATTERNS: Record<HapticCue, number | number[]> = {
  target: 8,
  refusal: [8, 28, 8],
  detent: 5,
  impact: 12,
};

const GAME_COLLISIONS = new Set(['catch-bad', 'hit', 'fall']);

/** Ask capable hardware for one short cue; unsupported or sensitive setups stay silent. */
export function pulseHaptic(cue: HapticCue, enabled: boolean, deps: HapticDeps = {}): boolean {
  if (!enabled) return false;
  const reducedMotion =
    deps.reducedMotion ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return false;

  const vibrate =
    deps.vibrate ??
    (globalThis.navigator?.vibrate
      ? globalThis.navigator.vibrate.bind(globalThis.navigator)
      : undefined);
  if (!vibrate) return false;

  try {
    return vibrate(PATTERNS[cue]);
  } catch {
    return false;
  }
}

/** Reinforce one life-losing game tick, even when it also ends the run. */
export function pulseGameCollision(
  events: readonly string[],
  enabled: boolean,
  deps: HapticDeps = {},
): boolean {
  return events.some((event) => GAME_COLLISIONS.has(event))
    ? pulseHaptic('impact', enabled, deps)
    : false;
}
