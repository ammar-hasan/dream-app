/** Tests for the play-mode sounds: feature detection + the bleep recipe. */

import { afterEach, describe, expect, it } from 'vitest';
import { createGameSounds, isGameSoundSupported, type AudioContextLike } from './sounds';

interface FakeCall {
  type: string;
  frequency: number;
  started: boolean;
  stopped: boolean;
}

function fakeAudioContext(): AudioContextLike & { oscillators: FakeCall[]; resumed: boolean } {
  const oscillators: FakeCall[] = [];
  return {
    currentTime: 1.5,
    destination: {},
    oscillators,
    resumed: false,
    createOscillator: () => {
      const call: FakeCall = { type: '', frequency: 0, started: false, stopped: false };
      oscillators.push(call);
      return {
        get type() {
          return call.type;
        },
        set type(t: string) {
          call.type = t;
        },
        frequency: {
          set value(f: number) {
            call.frequency = f;
          },
        },
        connect: () => undefined,
        start: () => {
          call.started = true;
        },
        stop: () => {
          call.stopped = true;
        },
      };
    },
    createGain: () => ({
      gain: { value: 0, exponentialRampToValueAtTime: () => undefined },
      connect: () => undefined,
    }),
    resume() {
      this.resumed = true;
    },
  };
}

afterEach(() => {
  delete (globalThis as { AudioContext?: unknown }).AudioContext;
});

describe('feature detection', () => {
  it('is unsupported without WebAudio and createGameSounds returns null', () => {
    expect(isGameSoundSupported()).toBe(false);
    expect(createGameSounds()).toBeNull();
  });

  it('is supported when AudioContext exists and builds a real bleeper', () => {
    (globalThis as { AudioContext?: unknown }).AudioContext = class {
      constructor() {
        return fakeAudioContext();
      }
    };
    expect(isGameSoundSupported()).toBe(true);
    expect(createGameSounds()).not.toBeNull();
  });
});

describe('bleeps', () => {
  it('plays an oscillator per sound with the recipe frequency', () => {
    const audio = fakeAudioContext();
    const sounds = createGameSounds(audio)!;
    sounds.play('catch-good');
    sounds.play('catch-bad');
    expect(audio.oscillators).toHaveLength(2);
    expect(audio.oscillators[0].frequency).toBe(880);
    expect(audio.oscillators[0].started).toBe(true);
    expect(audio.oscillators[0].stopped).toBe(true);
    expect(audio.oscillators[1].frequency).toBe(160);
    expect(audio.oscillators[1].type).toBe('sawtooth');
  });

  it('resume() unlocks the context at gesture time', () => {
    const audio = fakeAudioContext();
    createGameSounds(audio)!.resume();
    expect(audio.resumed).toBe(true);
  });
});
