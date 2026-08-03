/** Unit tests for the Catch! game core — pure state transitions, seeded RNG. */

import { describe, expect, it } from 'vitest';
import {
  clampGameSettings,
  COUNTDOWN_MS,
  DEFAULT_GAME_SETTINGS,
  gameRng,
  gameSetupOf,
  KID_GAME_SETTINGS,
} from '../core';
import { createGame, fallSpeedAt, startRun, tick, type GameState } from './catch';
import { createDocument } from '../../engine/document';

const IDLE = { left: false, right: false };

function playing(): GameState {
  // Skip the countdown: straight into the action for most tests.
  return { ...createGame(800, 600, DEFAULT_GAME_SETTINGS), phase: 'playing', spawnInMs: 300 };
}

function tickFor(state: GameState, ms: number, step = 50): GameState {
  let s = state;
  const rng = gameRng(7);
  for (let t = 0; t < ms; t += step) s = tick(s, IDLE, step, rng);
  return s;
}

describe('createGame / setup', () => {
  it('starts ready, centered, with full lives', () => {
    const s = createGame(800, 600, DEFAULT_GAME_SETTINGS);
    expect(s.phase).toBe('ready');
    expect(s.heroX).toBe(400);
    expect(s.score).toBe(0);
    expect(s.lives).toBe(3);
  });

  it('gameSetupOf fills defaults for old saves and keeps stored values', () => {
    const doc = createDocument({ width: 100, height: 100 });
    expect(gameSetupOf(doc).settings).toEqual(DEFAULT_GAME_SETTINGS);
    expect(gameSetupOf(doc).cast).toEqual({});
    const withGame = {
      ...doc,
      game: { cast: { hero: 'layer-1' }, settings: { fallSpeed: 200, spawnInterval: 1, lives: 4 } },
    };
    expect(gameSetupOf(withGame).cast.hero).toBe('layer-1');
    expect(gameSetupOf(withGame).settings.lives).toBe(4);
  });

  it('clampGameSettings keeps knobs inside their ranges', () => {
    expect(clampGameSettings({ fallSpeed: 5, spawnInterval: 0.01, lives: 99 })).toEqual({
      fallSpeed: 60,
      spawnInterval: 0.4,
      lives: 9,
    });
    expect(KID_GAME_SETTINGS.lives).toBe(5);
    expect(KID_GAME_SETTINGS.fallSpeed).toBeLessThan(DEFAULT_GAME_SETTINGS.fallSpeed);
  });
});

describe('startRun / countdown', () => {
  it('moves ready → countdown with a start event, then to playing', () => {
    let s = createGame(800, 600, DEFAULT_GAME_SETTINGS);
    s = startRun(s);
    expect(s.phase).toBe('countdown');
    expect(s.events).toContain('start');
    s = tick(s, IDLE, COUNTDOWN_MS / 2, gameRng(1));
    expect(s.phase).toBe('countdown');
    s = tick(s, IDLE, COUNTDOWN_MS, gameRng(1));
    expect(s.phase).toBe('playing');
    expect(s.events).toContain('go');
  });

  it('startRun is a no-op outside ready', () => {
    const s = playing();
    expect(startRun(s)).toBe(s);
  });
});

describe('hero movement', () => {
  it('slides with arrows and clamps inside the arena', () => {
    let s = playing();
    s = tick(s, { left: true, right: false }, 100, gameRng(1));
    expect(s.heroX).toBeLessThan(400);
    s = tick(s, { left: false, right: true }, 200, gameRng(1));
    expect(s.heroX).toBeGreaterThan(300);
    for (let i = 0; i < 50; i += 1) s = tick(s, { left: true, right: false }, 100, gameRng(1));
    expect(s.heroX).toBe(s.heroWidth / 2);
  });

  it('a dragged finger wins over arrows', () => {
    let s = playing();
    s = tick(s, { left: true, right: false, pointerX: 600 }, 50, gameRng(1));
    expect(s.heroX).toBe(600);
    s = tick(s, { left: false, right: false, pointerX: -50 }, 50, gameRng(1));
    expect(s.heroX).toBe(s.heroWidth / 2);
  });
});

describe('spawning, falling and catching', () => {
  it('spawns things over time; the same seed spawns the same things', () => {
    const a = tickFor(playing(), 3000);
    const b = tickFor(playing(), 3000);
    expect(a.things.length).toBeGreaterThan(0);
    expect(a.things).toEqual(b.things);
  });

  it('things fall at the base speed and vanish past the floor without penalty', () => {
    let s = playing();
    s = {
      ...s,
      things: [{ id: 99, kind: 'good', x: 700, y: 0, size: 56, speedFactor: 1 }],
      spawnInMs: 999_999,
    };
    s = tick(s, IDLE, 1000, gameRng(1));
    // 1s of play is already on the difficulty ramp.
    expect(s.things[0].y).toBeCloseTo(fallSpeedAt(DEFAULT_GAME_SETTINGS, 1000), 0);
    s = { ...s, things: [{ id: 98, kind: 'bad', x: 700, y: 610, size: 56, speedFactor: 1 }] };
    s = tick(s, IDLE, 500, gameRng(1));
    expect(s.things).toHaveLength(0);
    expect(s.score).toBe(0);
    expect(s.lives).toBe(3);
  });

  it('catching a good thing scores +1 with a pop and an event', () => {
    let s = playing();
    // Drop a good thing right onto the hero (center, just above the hero band).
    s = {
      ...s,
      heroX: 400,
      things: [{ id: 99, kind: 'good', x: 400, y: s.heroY - 40, size: 56, speedFactor: 1 }],
      spawnInMs: 999_999,
    };
    s = tick(s, IDLE, 100, gameRng(1));
    expect(s.score).toBe(1);
    expect(s.lives).toBe(3);
    expect(s.things).toHaveLength(0);
    expect(s.events).toContain('catch-good');
    expect(s.pops[0]?.text).toBe('+1');
  });

  it('catching a bad thing costs a life and shakes; zero lives ends the run', () => {
    let s = { ...playing(), lives: 1 };
    s = {
      ...s,
      heroX: 400,
      things: [{ id: 99, kind: 'bad', x: 400, y: s.heroY - 40, size: 56, speedFactor: 1 }],
      spawnInMs: 999_999,
    };
    s = tick(s, IDLE, 100, gameRng(1));
    expect(s.lives).toBe(0);
    expect(s.phase).toBe('over');
    expect(s.shakeMs).toBeGreaterThan(0);
    expect(s.events).toEqual(expect.arrayContaining(['catch-bad', 'game-over']));
    expect(s.things).toHaveLength(0);
  });

  it('pops age out', () => {
    let s = playing();
    s = { ...s, pops: [{ id: 1, x: 100, y: 100, text: '+1', ageMs: 0 }] };
    s = tick(s, IDLE, 900, gameRng(1));
    expect(s.pops).toHaveLength(0);
  });
});

describe('difficulty ramp', () => {
  it('fall speed grows with play time, capped at 2x', () => {
    expect(fallSpeedAt(DEFAULT_GAME_SETTINGS, 0)).toBe(DEFAULT_GAME_SETTINGS.fallSpeed);
    expect(fallSpeedAt(DEFAULT_GAME_SETTINGS, 37_500)).toBeCloseTo(
      DEFAULT_GAME_SETTINGS.fallSpeed * 1.5,
      0,
    );
    expect(fallSpeedAt(DEFAULT_GAME_SETTINGS, 1_000_000)).toBe(DEFAULT_GAME_SETTINGS.fallSpeed * 2);
  });

  it('seeded determinism: identical runs tick for tick', () => {
    const run = (seed: number) => {
      let s = startRun(createGame(800, 600, DEFAULT_GAME_SETTINGS));
      const rng = gameRng(seed);
      for (let i = 0; i < 200; i += 1) s = tick(s, { left: i % 3 === 0, right: false }, 33, rng);
      return s;
    };
    expect(run(42)).toEqual(run(42));
  });
});
