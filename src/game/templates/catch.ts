/**
 * Play mode: the "Catch!" template — the original game, unchanged. Things
 * fall from the top, the player slides the hero left/right to catch the good
 * ones (+1 point) and dodge the bad ones (-1 life). `tick` is the heart:
 * state in, state out, with the events that happened during the step (the UI
 * turns those into pops, shakes and bleeps).
 */

import type { GameSettings } from '../../engine/types';
import {
  COUNTDOWN_MS,
  DEFAULT_GAME_SETTINGS,
  KID_GAME_SETTINGS,
  POP_MS,
  SHAKE_MS,
  clampGameSettings,
  type GamePhase,
  type Rng,
  type ScorePop,
} from '../core';
import type { GameTemplate, GameTemplateMeta } from '../template';

export interface FallingThing {
  id: number;
  kind: 'good' | 'bad';
  /** Center x in document pixels. */
  x: number;
  /** Center y in document pixels. */
  y: number;
  /** Sprite box size (square) in document pixels. */
  size: number;
  /** Fall speed multiplier for this thing (some drift faster). */
  speedFactor: number;
}

export type GameEvent = 'start' | 'count' | 'go' | 'catch-good' | 'catch-bad' | 'game-over';

export interface GameState {
  phase: GamePhase;
  width: number;
  height: number;
  /** Clamped settings this run was started with. */
  settings: GameSettings;
  /** Hero center x, clamped inside the arena. */
  heroX: number;
  heroY: number;
  heroWidth: number;
  heroHeight: number;
  things: FallingThing[];
  pops: ScorePop[];
  score: number;
  lives: number;
  /** Milliseconds spent in 'playing' — drives the difficulty ramp. */
  elapsedMs: number;
  /** Milliseconds left in the countdown (phase 'countdown'). */
  countdownMs: number;
  /** Milliseconds until the next spawn (phase 'playing'). */
  spawnInMs: number;
  /** >0 while the bad-catch screen shake plays out. */
  shakeMs: number;
  nextId: number;
  /** Events fired during the latest tick; the UI consumes them per frame. */
  events: GameEvent[];
}

export interface GameInput {
  left: boolean;
  right: boolean;
  /**
   * Direct hero x from a touch/mouse drag (document pixels). When present it
   * wins over the arrows — a finger is a joystick.
   */
  pointerX?: number | null;
}

const HERO_SPEED = 460; // px/s while an arrow is held
const BAD_CHANCE = 0.25;
const THING_SIZE = 56;
const HERO_MARGIN = 28; // hero hovers this far above the floor

/** Fresh state for a run; press start → countdown → playing. */
export function createGame(width: number, height: number, settings: GameSettings): GameState {
  const clamped = clampGameSettings(settings);
  const heroWidth = Math.min(120, Math.max(64, Math.round(width * 0.14)));
  return {
    phase: 'ready',
    width,
    height,
    settings: clamped,
    heroX: width / 2,
    heroY: height - HERO_MARGIN - 30,
    heroWidth,
    heroHeight: Math.round(heroWidth * 0.55),
    things: [],
    pops: [],
    score: 0,
    lives: clamped.lives,
    elapsedMs: 0,
    countdownMs: COUNTDOWN_MS,
    spawnInMs: 0,
    shakeMs: 0,
    nextId: 1,
    events: [],
  };
}

/** Press start: ready → countdown. A no-op in any other phase. */
export function startRun(state: GameState): GameState {
  if (state.phase !== 'ready') return state;
  return { ...state, phase: 'countdown', countdownMs: COUNTDOWN_MS, events: ['start'] };
}

/** Difficulty ramp: +100% speed over ~75s of play, spawning up to 2x busier. */
export function fallSpeedAt(base: GameSettings, elapsedMs: number): number {
  return base.fallSpeed * Math.min(2, 1 + elapsedMs / 75_000);
}

function spawnIntervalAt(base: GameSettings, elapsedMs: number): number {
  return base.spawnInterval * Math.max(0.5, 1 - elapsedMs / 120_000);
}

function clampHeroX(state: GameState, x: number): number {
  const half = state.heroWidth / 2;
  return Math.min(state.width - half, Math.max(half, x));
}

/**
 * Advance the game by `dtMs`. Pure: same (state, input, dt, rng) in → same
 * state out. Events accumulate on the returned state for the UI to consume.
 */
export function tick(state: GameState, input: GameInput, dtMs: number, rng: Rng): GameState {
  const dt = dtMs;
  const next: GameState = { ...state, things: state.things, pops: state.pops, events: [] };

  if (state.phase === 'countdown') {
    const before = Math.ceil(state.countdownMs / 800);
    next.countdownMs = state.countdownMs - dt;
    const after = Math.ceil(next.countdownMs / 800);
    if (after < before && after > 0) next.events.push('count');
    if (next.countdownMs <= 0) {
      next.phase = 'playing';
      next.spawnInMs = 300; // first thing drops almost immediately — instant delight
      next.events.push('go');
    }
    return next;
  }

  if (state.phase !== 'playing') return next;

  next.elapsedMs = state.elapsedMs + dt;
  next.shakeMs = Math.max(0, state.shakeMs - dt);

  // Hero movement: a dragged finger wins; otherwise arrows slide at HERO_SPEED.
  if (input.pointerX != null && !Number.isNaN(input.pointerX)) {
    next.heroX = clampHeroX(next, input.pointerX);
  } else {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) next.heroX = clampHeroX(next, state.heroX + dir * HERO_SPEED * (dt / 1000));
  }

  // Spawning: x and kind come from the injected RNG (seeded → deterministic).
  next.spawnInMs = state.spawnInMs - dt;
  if (next.spawnInMs <= 0) {
    next.spawnInMs += spawnIntervalAt(state.settings, next.elapsedMs) * 1000;
    const size = THING_SIZE;
    next.things = [
      ...next.things,
      {
        id: next.nextId,
        kind: rng() < BAD_CHANCE ? 'bad' : 'good',
        x: size / 2 + rng() * (state.width - size),
        y: -size / 2,
        size,
        speedFactor: 0.85 + rng() * 0.4,
      },
    ];
    next.nextId += 1;
  }

  // Falling + catching. Circle-ish overlap: close enough horizontally AND
  // the thing reaches the hero's band vertically.
  const speed = fallSpeedAt(state.settings, next.elapsedMs);
  const heroTop = state.heroY - state.heroHeight / 2;
  const heroBottom = state.heroY + state.heroHeight / 2;
  const caught: FallingThing[] = [];
  const falling: FallingThing[] = [];
  for (const thing of next.things) {
    const y = thing.y + speed * thing.speedFactor * (dt / 1000);
    const reachX = Math.abs(thing.x - next.heroX) < (state.heroWidth + thing.size) / 2 - 8;
    const reachY = y + thing.size / 2 >= heroTop && y - thing.size / 2 <= heroBottom;
    if (reachX && reachY) caught.push({ ...thing, y });
    else if (y - thing.size / 2 < state.height) falling.push({ ...thing, y });
    // things that fall past the floor simply vanish — no penalty for a miss
  }
  next.things = falling;

  for (const thing of caught) {
    if (thing.kind === 'good') {
      next.score += 1;
      next.events.push('catch-good');
      next.pops = [...next.pops, { id: next.nextId, x: thing.x, y: heroTop, text: '+1', ageMs: 0 }];
      next.nextId += 1;
    } else {
      next.lives -= 1;
      next.shakeMs = SHAKE_MS;
      next.events.push('catch-bad');
      next.pops = [...next.pops, { id: next.nextId, x: thing.x, y: heroTop, text: '-1', ageMs: 0 }];
      next.nextId += 1;
    }
  }

  next.pops = next.pops
    .map((pop) => ({ ...pop, ageMs: pop.ageMs + dt }))
    .filter((pop) => pop.ageMs < POP_MS);

  if (next.lives <= 0) {
    next.lives = 0;
    next.phase = 'over';
    next.things = [];
    next.events.push('game-over');
  }

  return next;
}

/** Picker/casting metadata for the template registry. */
export const catchMeta: GameTemplateMeta = {
  id: 'catch',
  nameKey: 'play.nameCatch',
  hintKey: 'play.hint',
  roles: [
    { role: 'hero', labelKey: 'play.hero', nameKey: 'play.roleHero' },
    { role: 'good', labelKey: 'play.good', nameKey: 'play.roleGood' },
    { role: 'bad', labelKey: 'play.bad', nameKey: 'play.roleBad' },
    { role: 'background', labelKey: 'play.background' },
  ],
  sliders: [
    { setting: 'fallSpeed', labelKey: 'play.fallSpeed' },
    { setting: 'spawnInterval', labelKey: 'play.spawnRate' },
    { setting: 'lives', labelKey: 'play.lives' },
  ],
  defaultSettings: DEFAULT_GAME_SETTINGS,
  kidSettings: KID_GAME_SETTINGS,
};

/** Catch! as a self-contained template module. */
export const catchTemplate: GameTemplate<GameState, GameInput> = {
  ...catchMeta,
  createGame,
  startRun,
  tick,
};
