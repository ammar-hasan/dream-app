import { describe, expect, it, vi } from 'vitest';
import { pulseHaptic } from './haptics';

describe('pulseHaptic', () => {
  it('uses short distinct cues for a target, refusal and detent', () => {
    const vibrate = vi.fn(() => true);
    expect(pulseHaptic('target', true, { vibrate, reducedMotion: false })).toBe(true);
    expect(pulseHaptic('refusal', true, { vibrate, reducedMotion: false })).toBe(true);
    expect(pulseHaptic('detent', true, { vibrate, reducedMotion: false })).toBe(true);
    expect(vibrate).toHaveBeenNthCalledWith(1, 8);
    expect(vibrate).toHaveBeenNthCalledWith(2, [8, 28, 8]);
    expect(vibrate).toHaveBeenNthCalledWith(3, 5);
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
});
