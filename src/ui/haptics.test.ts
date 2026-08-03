import { describe, expect, it, vi } from 'vitest';
import { pulseGameCollision, pulseHaptic } from './haptics';

describe('pulseHaptic', () => {
  it('uses short distinct cues for a target, refusal, detent and impact', () => {
    const vibrate = vi.fn(() => true);
    expect(pulseHaptic('target', true, { vibrate, reducedMotion: false })).toBe(true);
    expect(pulseHaptic('refusal', true, { vibrate, reducedMotion: false })).toBe(true);
    expect(pulseHaptic('detent', true, { vibrate, reducedMotion: false })).toBe(true);
    expect(pulseHaptic('impact', true, { vibrate, reducedMotion: false })).toBe(true);
    expect(vibrate).toHaveBeenNthCalledWith(1, 8);
    expect(vibrate).toHaveBeenNthCalledWith(2, [8, 28, 8]);
    expect(vibrate).toHaveBeenNthCalledWith(3, 5);
    expect(vibrate).toHaveBeenNthCalledWith(4, 12);
  });

  it('stays silent when disabled or reduced motion is requested', () => {
    const vibrate = vi.fn(() => true);
    expect(pulseHaptic('target', false, { vibrate, reducedMotion: false })).toBe(false);
    expect(pulseHaptic('refusal', true, { vibrate, reducedMotion: true })).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('degrades safely when the device refuses a cue', () => {
    expect(
      pulseHaptic('target', true, {
        vibrate: () => {
          throw new Error('not available');
        },
        reducedMotion: false,
      }),
    ).toBe(false);
  });

  it('pulses once for a life-losing game tick and ignores ordinary play', () => {
    const vibrate = vi.fn(() => true);
    const deps = { vibrate, reducedMotion: false };

    expect(pulseGameCollision(['catch-good', 'gate', 'star'], true, deps)).toBe(false);
    expect(pulseGameCollision(['catch-bad', 'game-over', 'hit'], true, deps)).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(12);
  });

  it('keeps game impacts optional and reduced-motion-safe', () => {
    const vibrate = vi.fn(() => true);

    expect(pulseGameCollision(['fall'], false, { vibrate, reducedMotion: false })).toBe(false);
    expect(pulseGameCollision(['hit'], true, { vibrate, reducedMotion: true })).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });
});
