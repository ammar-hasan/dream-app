/**
 * Play-mode sounds: tiny procedural WebAudio bleeps — an oscillator, a gain
 * envelope, no assets. Feature-detected like ai/say.ts: browsers without
 * WebAudio get `isGameSoundSupported() === false` and every bleep is a
 * silent no-op. The AudioContext is injectable so tests can drive a fake.
 */

interface OscillatorLike {
  type: string;
  frequency: { value: number };
  connect(node: unknown): void;
  start(when?: number): void;
  stop(when?: number): void;
}

interface GainLike {
  gain: { value: number; exponentialRampToValueAtTime(value: number, when: number): void };
  connect(node: unknown): void;
}

export interface AudioContextLike {
  currentTime: number;
  destination: unknown;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  /** Browsers suspend audio until a user gesture; real contexts can resume. */
  resume?(): void;
}

export type GameSound =
  | 'start'
  | 'count'
  | 'go'
  | 'catch-good'
  | 'catch-bad'
  | 'game-over'
  | 'flap'
  | 'gate'
  | 'maze-win';

/** [frequency Hz, duration s, wave] per sound — bright for good, low for bad. */
const RECIPES: Record<GameSound, [number, number, string]> = {
  start: [523, 0.12, 'triangle'],
  count: [440, 0.08, 'sine'],
  go: [784, 0.18, 'triangle'],
  'catch-good': [880, 0.12, 'sine'],
  'catch-bad': [160, 0.25, 'sawtooth'],
  'game-over': [220, 0.5, 'triangle'],
  flap: [620, 0.07, 'square'],
  gate: [990, 0.14, 'sine'],
  'maze-win': [660, 0.45, 'triangle'],
};

type AudioContextCtor = new () => AudioContextLike;

function resolveAudioContextCtor(): AudioContextCtor | null {
  const g = globalThis as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

export function isGameSoundSupported(): boolean {
  return resolveAudioContextCtor() !== null;
}

export interface GameSounds {
  play(sound: GameSound): void;
  /** Browsers suspend audio until a user gesture — call on start. */
  resume(): void;
}

/**
 * Create the bleeper around an AudioContext (built from the global when not
 * provided). Returns null where WebAudio is unavailable; callers stay silent.
 */
export function createGameSounds(context?: AudioContextLike | null): GameSounds | null {
  let ctx = context ?? null;
  if (!ctx) {
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  const audio = ctx;

  const play = (sound: GameSound) => {
    const [frequency, duration, type] = RECIPES[sound];
    try {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      const now = audio.currentTime;
      gain.gain.value = 0.12;
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // audio glitches should never break a kid's game
    }
  };

  return {
    play,
    resume: () => {
      // Call at gesture time (the big play button) so sound is unlocked.
      try {
        audio.resume?.();
      } catch {
        // suspended forever — the game stays silent, which is fine
      }
    },
  };
}
