/** Sparse, optional tactile cues for interactions that already have visual feedback. */

export type HapticCue = 'target' | 'refusal';

interface HapticDeps {
  vibrate?: (pattern: number | number[]) => boolean;
  reducedMotion?: boolean;
}

const PATTERNS: Record<HapticCue, number | number[]> = {
  target: 8,
  refusal: [8, 28, 8],
};

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
