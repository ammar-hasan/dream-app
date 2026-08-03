/** Unit tests for the Flappy Dream core — pure state transitions, seeded RNG. */

import { describe, expect, it } from 'vitest';
import { COUNTDOWN_MS, gameRng } from '../core';
import {
  createGame,
  FLAPPY_DEFAULT_SETTINGS,
  FLAPPY_KID_SETTINGS,
  gapHeightAt,
  gateWidthAt,
  scrollSpeedAt,
  startRun,
  tick,
  type FlappyState,
} from './flappy';

const IDLE = { flap: false };
const FLAP = { flap: true };

function playing(settings = FLAPPY_DEFAULT_SETTINGS): FlappyState {
  // Skip the countdown: straight into the action for most tests.
  return { ...createGame(800, 600, settings), phase: 'playing', spawnInMs: 700 };
}

describe('createGame / startRun', () => {
  it('starts ready, hero left-of-center, shields from the lives knob', () => {
    const s = createGame(800, 600, FLAPPY_DEFAULT_SETTINGS);
    expect(s.phase).toBe('ready');
    expect(s.heroX).toBe(Math.round(800 * 0.28));
    expect(s.heroY).toBe(300);
    expect(s.score).toBe(0);
    expect(s.shields).toBe(FLAPPY_DEFAULT_SETTINGS.lives); // one hit = over
    expect(FLAPPY_KID_SETTINGS.lives).toBe(3); // kid mode: three gentle shields
  });

  it('countdown leads to playing with a beat before the first gate', () => {
    let s = createGame(800, 600, FLAPPY_DEFAULT_SETTINGS);
    s = startRun(s);
    expect(s.phase).toBe('countdown');
    expect(s.events).toContain('start');
    s = tick(s, IDLE, COUNTDOWN_MS, gameRng(1));
    expect(s.phase).toBe('playing');
    expect(s.events).toContain('go');
    expect(s.spawnInMs).toBeGreaterThan(0);
  });
});

describe('flight physics', () => {
  it('gravity pulls the hero down; a flap lifts it', () => {
    let s = playing();
    s = tick(s, IDLE, 200, gameRng(1));
    expect(s.heroY).toBeGreaterThan(300);
    expect(s.vy).toBeGreaterThan(0);
    const falling = s;
    s = tick(s, FLAP, 50, gameRng(1));
    expect(s.vy).toBeLessThan(falling.vy);
    expect(s.events).toContain('flap');
  });

  it('the ceiling is a soft stop, not a crash', () => {
    let s = { ...playing(), heroY: 40, vy: -2000 };
    s = tick(s, IDLE, 100, gameRng(1));
    expect(s.heroY).toBe(s.heroSize / 2);
    expect(s.vy).toBeGreaterThanOrEqual(0);
    expect(s.phase).toBe('playing');
  });

  it('the floor is a hit; one shield means game over', () => {
    let s = { ...playing(), heroY: 590, vy: 500 };
    s = tick(s, IDLE, 100, gameRng(1));
    expect(s.phase).toBe('over');
    expect(s.events).toContain('game-over');
  });
});

describe('gates, scoring and collisions', () => {
  it('spawns gates on the right that scroll left; the same seed spawns the same gaps', () => {
    const run = () => {
      let s = playing();
      const rng = gameRng(7);
      // Flap regularly so the hero survives past the first spawn (~0.7s).
      for (let i = 0; i < 60; i += 1) s = tick(s, i % 5 === 0 ? FLAP : IDLE, 50, rng);
      return s.gates;
    };
    const a = run();
    const b = run();
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
    expect(a[0].x).toBeLessThan(800);
  });

  it('threading a gate scores +1 with a pop and an event', () => {
    let s = playing();
    const gateW = gateWidthAt(600);
    const r = (s.heroSize / 2) * 0.42;
    // Just ahead of the "passed" threshold, gap centered on the hero.
    s = {
      ...s,
      spawnInMs: 999_999,
      gates: [{ id: 99, x: s.heroX - r - gateW + 5, gapY: s.heroY, gapH: 220, passed: false }],
    };
    s = tick(s, IDLE, 50, gameRng(1));
    expect(s.score).toBe(1);
    expect(s.events).toContain('gate');
    expect(s.pops[0]?.text).toBe('+1');
    expect(s.gates[0]?.passed).toBe(true);
  });

  it('clipping a gate ends a shieldless run', () => {
    let s = playing(); // adult default: one shield
    s = {
      ...s,
      spawnInMs: 999_999,
      gates: [{ id: 99, x: s.heroX - 10, gapY: 80, gapH: 60, passed: false }],
    };
    s = tick(s, IDLE, 50, gameRng(1));
    expect(s.phase).toBe('over');
    expect(s.shields).toBe(0);
    expect(s.events).toContain('game-over');
  });

  it('a shielded hit costs one shield and starts a mercy window (no double jeopardy)', () => {
    let s = playing({ ...FLAPPY_DEFAULT_SETTINGS, lives: 3 });
    const gate = { id: 99, x: s.heroX - 10, gapY: 80, gapH: 60, passed: false };
    s = { ...s, spawnInMs: 999_999, gates: [gate] };
    s = tick(s, IDLE, 50, gameRng(1));
    expect(s.phase).toBe('playing');
    expect(s.shields).toBe(2);
    expect(s.invincibleMs).toBeGreaterThan(0);
    expect(s.events).toContain('hit');
    expect(s.shakeMs).toBeGreaterThan(0);
    // Still overlapping, but the mercy window absorbs the second hit.
    s = tick(s, IDLE, 50, gameRng(1));
    expect(s.shields).toBe(2);
    expect(s.phase).toBe('playing');
  });

  it('gates that scroll off the left are culled', () => {
    let s = playing();
    s = {
      ...s,
      spawnInMs: 999_999,
      gates: [{ id: 99, x: -100, gapY: 300, gapH: 200, passed: true }],
    };
    s = tick(s, IDLE, 50, gameRng(1));
    expect(s.gates).toHaveLength(0);
  });
});

describe('difficulty ramp and determinism', () => {
  it('scroll speed grows with play time, capped at 1.8x', () => {
    expect(scrollSpeedAt(FLAPPY_DEFAULT_SETTINGS, 0, 480)).toBe(FLAPPY_DEFAULT_SETTINGS.fallSpeed);
    expect(scrollSpeedAt(FLAPPY_DEFAULT_SETTINGS, 55_000, 480)).toBeCloseTo(
      FLAPPY_DEFAULT_SETTINGS.fallSpeed * 1.5,
      0,
    );
    expect(scrollSpeedAt(FLAPPY_DEFAULT_SETTINGS, 1_000_000, 480)).toBe(
      FLAPPY_DEFAULT_SETTINGS.fallSpeed * 1.8,
    );
  });

  it('the gap tightens over a long run but keeps a floor', () => {
    const open = gapHeightAt(480, 0);
    const late = gapHeightAt(480, 120_000);
    const forever = gapHeightAt(480, 100_000_000);
    expect(late).toBeLessThan(open);
    expect(forever).toBeCloseTo(open * 0.62, 0);
  });

  it('seeded determinism: identical runs tick for tick', () => {
    const run = (seed: number) => {
      let s = startRun(createGame(800, 600, FLAPPY_DEFAULT_SETTINGS));
      const rng = gameRng(seed);
      for (let i = 0; i < 200; i += 1) s = tick(s, { flap: i % 5 === 0 }, 33, rng);
      return s;
    };
    expect(run(42)).toEqual(run(42));
  });
});
