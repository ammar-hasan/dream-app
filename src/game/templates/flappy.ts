/**
 * Play mode: the "Flappy Dream" template. The hero drawing flies through a
 * side-scrolling sky: tap/click/Space flaps, gravity pulls down, and gates
 * scroll in from the right. +1 for every gate threaded; a grown-up's run
 * ends on the first hit, while kids fly with three gentle shields. Tense and
 * rhythmic — pure and seeded like every template.
 */

import type { GameSettings } from '../../engine/types';
import {
  COUNTDOWN_MS,
  POP_MS,
  SHAKE_MS,
  clampGameSettings,
  type GamePhase,
  type Rng,
  type ScorePop,
} from '../core';
import type { GameTemplate, GameTemplateMeta } from '../template';

export interface FlappyGate {
  id: number;
  /** Left edge in document pixels; gates scroll right → left. */
  x: number;
  /** Vertical center of the gap. */
  gapY: number;
  /** Gap height in document pixels. */
  gapH: number;
  /** Set once the hero is through — a gate scores exactly once. */
  passed: boolean;
}

export type FlappyEvent = 'start' | 'count' | 'go' | 'flap' | 'gate' | 'hit' | 'game-over';

export interface FlappyState {
  phase: GamePhase;
  width: number;
  height: number;
  /** Clamped settings this run was started with. */
  settings: GameSettings;
  heroX: number;
  heroY: number;
  heroSize: number;
  /** Vertical velocity in px/s (negative = rising). */
  vy: number;
  gates: FlappyGate[];
  pops: ScorePop[];
  score: number;
  /** Hits the hero can still take; the kid defaults start with 3 shields. */
  shields: number;
  /** Milliseconds spent in 'playing' — drives the difficulty ramp. */
  elapsedMs: number;
  countdownMs: number;
  /** Milliseconds until the next gate spawns (phase 'playing'). */
  spawnInMs: number;
  /** Mercy window after a shielded hit — no double jeopardy. */
  invincibleMs: number;
  /** >0 while the hit screen shake plays out. */
  shakeMs: number;
  nextId: number;
  /** Events fired during the latest tick; the UI consumes them per frame. */
  events: FlappyEvent[];
}

/** Edge-triggered flap: the view sets it on tap/key-down, the tick consumes it. */
export interface FlappyInput {
  flap: boolean;
}

/** Adults: one hit and the run is over (raise the shields slider for mercy). */
export const FLAPPY_DEFAULT_SETTINGS: GameSettings = {
  fallSpeed: 170,
  spawnInterval: 1.35,
  lives: 1,
};

/** Little Dreamer: slower sky, wider spacing, three gentle "oops" shields. */
export const FLAPPY_KID_SETTINGS: GameSettings = {
  fallSpeed: 120,
  spawnInterval: 1.8,
  lives: 3,
};

const GRAVITY = 1500; // px/s² on a 480px-tall stage (scaled by stageScale)
const FLAP_VY = -430;
const INVINCIBLE_MS = 1500;
const HERO_RADIUS_FACTOR = 0.42; // forgiving hitbox: smaller than the sprite

/** Physics scale: the constants are tuned for a 480px-tall stage. */
function stageScale(height: number): number {
  return height / 480;
}

/** Fresh state for a run; press start → countdown → playing. */
export function createGame(width: number, height: number, settings: GameSettings): FlappyState {
  const clamped = clampGameSettings(settings);
  const heroSize = Math.round(Math.min(72, Math.max(40, 56 * stageScale(height))));
  return {
    phase: 'ready',
    width,
    height,
    settings: clamped,
    heroX: Math.round(width * 0.28),
    heroY: Math.round(height / 2),
    heroSize,
    vy: 0,
    gates: [],
    pops: [],
    score: 0,
    shields: clamped.lives,
    elapsedMs: 0,
    countdownMs: COUNTDOWN_MS,
    spawnInMs: 0,
    invincibleMs: 0,
    shakeMs: 0,
    nextId: 1,
    events: [],
  };
}

/** Press start: ready → countdown. A no-op in any other phase. */
export function startRun(state: FlappyState): FlappyState {
  if (state.phase !== 'ready') return state;
  return { ...state, phase: 'countdown', countdownMs: COUNTDOWN_MS, events: ['start'] };
}

/** Difficulty ramp: scroll speed grows +80% over ~110s of play. */
export function scrollSpeedAt(base: GameSettings, elapsedMs: number, height: number): number {
  return base.fallSpeed * stageScale(height) * Math.min(1.8, 1 + elapsedMs / 110_000);
}

export function gateWidthAt(height: number): number {
  return Math.max(48, Math.round(72 * stageScale(height)));
}

/** Gap height: roomy at first, tightening over a long run (floor ~62%). */
export function gapHeightAt(height: number, elapsedMs: number): number {
  const base = 175 * stageScale(height);
  return Math.max(base * 0.62, base * (1 - elapsedMs / 240_000));
}

function spawnIntervalAt(base: GameSettings, elapsedMs: number): number {
  return base.spawnInterval * Math.max(0.65, 1 - elapsedMs / 180_000);
}

/** Circle hero vs. the two solid bands of a gate (above/below the gap). */
function heroHitsGate(
  heroX: number,
  heroY: number,
  r: number,
  gate: FlappyGate,
  gateW: number,
): boolean {
  if (heroX + r < gate.x || heroX - r > gate.x + gateW) return false;
  return heroY - r < gate.gapY - gate.gapH / 2 || heroY + r > gate.gapY + gate.gapH / 2;
}

/**
 * Advance the game by `dtMs`. Pure: same (state, input, dt, rng) in → same
 * state out. Events accumulate on the returned state for the UI to consume.
 */
export function tick(
  state: FlappyState,
  input: FlappyInput,
  dtMs: number,
  rng: Rng,
): FlappyState {
  const dt = dtMs;
  const next: FlappyState = { ...state, gates: state.gates, pops: state.pops, events: [] };

  if (state.phase === 'countdown') {
    const before = Math.ceil(state.countdownMs / 800);
    next.countdownMs = state.countdownMs - dt;
    const after = Math.ceil(next.countdownMs / 800);
    if (after < before && after > 0) next.events.push('count');
    if (next.countdownMs <= 0) {
      next.phase = 'playing';
      next.spawnInMs = 700; // a beat to settle before the first gate
      next.events.push('go');
    }
    return next;
  }

  if (state.phase !== 'playing') return next;

  const s = stageScale(state.height);
  next.elapsedMs = state.elapsedMs + dt;
  next.shakeMs = Math.max(0, state.shakeMs - dt);
  next.invincibleMs = Math.max(0, state.invincibleMs - dt);

  // Flap (edge-triggered) then gravity: the heartbeat of the game.
  let vy = input.flap ? FLAP_VY * s : state.vy;
  if (input.flap) next.events.push('flap');
  vy += GRAVITY * s * (dt / 1000);
  next.vy = vy;
  next.heroY = state.heroY + vy * (dt / 1000);
  const r = (state.heroSize / 2) * HERO_RADIUS_FACTOR;
  const spriteR = state.heroSize / 2;
  if (next.heroY < spriteR) {
    // The ceiling is a soft stop, not a crash.
    next.heroY = spriteR;
    next.vy = Math.max(0, next.vy);
  }

  // Gates spawn on the right; gap position comes from the seeded RNG.
  next.spawnInMs = state.spawnInMs - dt;
  if (next.spawnInMs <= 0) {
    next.spawnInMs += spawnIntervalAt(state.settings, next.elapsedMs) * 1000;
    next.gates = [
      ...next.gates,
      {
        id: next.nextId,
        x: state.width + 10,
        gapY: state.height * (0.25 + rng() * 0.5),
        gapH: gapHeightAt(state.height, next.elapsedMs),
        passed: false,
      },
    ];
    next.nextId += 1;
  }

  // Scroll, score, collide, cull.
  const speed = scrollSpeedAt(state.settings, next.elapsedMs, state.height);
  const gateW = gateWidthAt(state.height);
  let hit = false;
  const flying: FlappyGate[] = [];
  for (const gate of next.gates) {
    const x = gate.x - speed * (dt / 1000);
    let passed = gate.passed;
    if (!passed && x + gateW < state.heroX - r) {
      passed = true;
      next.score += 1;
      next.events.push('gate');
      next.pops = [
        ...next.pops,
        { id: next.nextId, x: state.heroX, y: gate.gapY, text: '+1', ageMs: 0 },
      ];
      next.nextId += 1;
    }
    if (heroHitsGate(next.heroX, next.heroY, r, { ...gate, x }, gateW)) hit = true;
    if (x + gateW > -20) flying.push({ ...gate, x, passed });
  }
  next.gates = flying;

  if (next.heroY + spriteR >= state.height) {
    next.heroY = state.height - spriteR;
    hit = true;
  }

  if (hit && state.invincibleMs <= 0) {
    next.shields -= 1;
    next.shakeMs = SHAKE_MS;
    next.pops = [
      ...next.pops,
      { id: next.nextId, x: state.heroX, y: next.heroY - spriteR, text: '-1', ageMs: 0 },
    ];
    next.nextId += 1;
    if (next.shields <= 0) {
      next.shields = 0;
      next.phase = 'over';
      next.events.push('game-over');
    } else {
      next.invincibleMs = INVINCIBLE_MS;
      next.events.push('hit');
    }
  }

  next.pops = next.pops
    .map((pop) => ({ ...pop, ageMs: pop.ageMs + dt }))
    .filter((pop) => pop.ageMs < POP_MS);

  return next;
}

/** Picker/casting metadata for the template registry. */
export const flappyMeta: GameTemplateMeta = {
  id: 'flappy',
  nameKey: 'play.nameFlappy',
  hintKey: 'play.hintFlappy',
  roles: [
    { role: 'hero', labelKey: 'play.heroFlappy', nameKey: 'play.roleHero' },
    { role: 'obstacle', labelKey: 'play.obstacle', nameKey: 'play.roleObstacle' },
    { role: 'background', labelKey: 'play.background' },
  ],
  sliders: [
    { setting: 'fallSpeed', labelKey: 'play.flySpeed' },
    { setting: 'spawnInterval', labelKey: 'play.gateRate' },
    { setting: 'lives', labelKey: 'play.shields' },
  ],
  defaultSettings: FLAPPY_DEFAULT_SETTINGS,
  kidSettings: FLAPPY_KID_SETTINGS,
};

/** Flappy Dream as a self-contained template module. */
export const flappyTemplate: GameTemplate<FlappyState, FlappyInput> = {
  ...flappyMeta,
  createGame,
  startRun,
  tick,
};
