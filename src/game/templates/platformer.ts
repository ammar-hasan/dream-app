/**
 * Play mode: Dream Jumper. Run and jump across a short, seeded side-scrolling
 * course, collect stars, and reach the flag. Platforms are generated with
 * bounded gaps and height changes so the level stays approachable.
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

export interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformerStar {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export type PlatformerEvent =
  'start' | 'count' | 'go' | 'jump' | 'star' | 'fall' | 'win' | 'game-over';

export interface PlatformerState {
  phase: GamePhase;
  width: number;
  height: number;
  worldWidth: number;
  settings: GameSettings;
  heroX: number;
  heroY: number;
  heroSize: number;
  vx: number;
  vy: number;
  onGround: boolean;
  spawnX: number;
  spawnY: number;
  platforms: Platform[];
  stars: PlatformerStar[];
  goalX: number;
  goalY: number;
  score: number;
  lives: number;
  won: boolean;
  elapsedMs: number;
  countdownMs: number;
  shakeMs: number;
  pops: ScorePop[];
  nextId: number;
  events: PlatformerEvent[];
}

export interface PlatformerInput {
  left: boolean;
  right: boolean;
  /** Edge-triggered; consumed by one tick. */
  jump: boolean;
}

export const PLATFORMER_DEFAULT_SETTINGS: GameSettings = {
  fallSpeed: 230,
  spawnInterval: 1.1,
  lives: 3,
};

export const PLATFORMER_KID_SETTINGS: GameSettings = {
  fallSpeed: 170,
  spawnInterval: 1.6,
  lives: 5,
};

const GRAVITY = 1650;
const JUMP_VELOCITY = -610;

function scaleFor(height: number): number {
  return Math.max(0.6, height / 480);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface PlatformerLevel {
  worldWidth: number;
  platforms: Platform[];
  stars: PlatformerStar[];
  goalX: number;
  goalY: number;
}

/** A deterministic, always-jumpable left-to-right course. */
export function generateLevel(width: number, height: number, rng: Rng): PlatformerLevel {
  const scale = scaleFor(height);
  const worldWidth = Math.round(Math.max(width * 2.35, width + 760 * scale));
  const groundY = height - Math.max(36, Math.round(48 * scale));
  const platforms: Platform[] = [];
  const stars: PlatformerStar[] = [];
  let nextId = 1;

  const startWidth = Math.max(180 * scale, width * 0.42);
  platforms.push({
    id: nextId++,
    x: 0,
    y: groundY,
    width: startWidth,
    height: height - groundY,
  });

  let x = startWidth;
  let previousY = groundY;
  const finishWidth = Math.max(190, 220 * scale);
  const finishX = worldWidth - finishWidth;
  while (x < finishX - 150 * scale) {
    const gap = (48 + rng() * 44) * scale;
    const platformWidth = (125 + rng() * 105) * scale;
    const rise = (rng() - 0.48) * 72 * scale;
    const y = clamp(previousY + rise, height * 0.42, groundY);
    x += gap;
    const widthHere = Math.min(platformWidth, finishX - x - 32 * scale);
    if (widthHere < 72 * scale) break;
    const platform: Platform = {
      id: nextId++,
      x,
      y,
      width: widthHere,
      height: Math.max(20, 24 * scale),
    };
    platforms.push(platform);
    stars.push({
      id: nextId++,
      x: platform.x + platform.width / 2,
      y: platform.y - 28 * scale,
      collected: false,
    });
    x += platform.width;
    previousY = y;
  }

  const last = platforms[platforms.length - 1];
  const finalX = Math.min(finishX, last.x + last.width + 90 * scale);
  const finalY = Math.min(groundY, previousY + 38 * scale);
  platforms.push({
    id: nextId++,
    x: finalX,
    y: finalY,
    width: worldWidth - finalX,
    height: finalY === groundY ? height - groundY : Math.max(20, 24 * scale),
  });
  return {
    worldWidth,
    platforms,
    stars,
    goalX: worldWidth - 56 * scale,
    goalY: finalY,
  };
}

export function createGame(
  width: number,
  height: number,
  settings: GameSettings,
  _kid = false,
  rng: Rng = () => 0.5,
): PlatformerState {
  const clamped = clampGameSettings(settings);
  const heroSize = Math.round(clamp(46 * scaleFor(height), 34, 68));
  const level = generateLevel(width, height, rng);
  const spawnX = Math.max(heroSize, 42 * scaleFor(height));
  const spawnY = level.platforms[0].y - heroSize / 2;
  return {
    phase: 'ready',
    width,
    height,
    worldWidth: level.worldWidth,
    settings: clamped,
    heroX: spawnX,
    heroY: spawnY,
    heroSize,
    vx: 0,
    vy: 0,
    onGround: true,
    spawnX,
    spawnY,
    platforms: level.platforms,
    stars: level.stars,
    goalX: level.goalX,
    goalY: level.goalY,
    score: 0,
    lives: clamped.lives,
    won: false,
    elapsedMs: 0,
    countdownMs: COUNTDOWN_MS,
    shakeMs: 0,
    pops: [],
    nextId: 10_000,
    events: [],
  };
}

export function startRun(state: PlatformerState): PlatformerState {
  if (state.phase !== 'ready') return state;
  return { ...state, phase: 'countdown', countdownMs: COUNTDOWN_MS, events: ['start'] };
}

function overlapsHorizontally(x: number, half: number, platform: Platform): boolean {
  return x + half > platform.x && x - half < platform.x + platform.width;
}

export function tick(
  state: PlatformerState,
  input: PlatformerInput,
  dtMs: number,
  _rng: Rng,
): PlatformerState {
  const dt = dtMs;
  const next: PlatformerState = {
    ...state,
    platforms: state.platforms,
    stars: state.stars,
    pops: state.pops,
    events: [],
  };

  if (state.phase === 'countdown') {
    const before = Math.ceil(state.countdownMs / 800);
    next.countdownMs = state.countdownMs - dt;
    const after = Math.ceil(next.countdownMs / 800);
    if (after < before && after > 0) next.events.push('count');
    if (next.countdownMs <= 0) {
      next.phase = 'playing';
      next.events.push('go');
    }
    return next;
  }
  if (state.phase !== 'playing') return next;

  const seconds = dt / 1000;
  const scale = scaleFor(state.height);
  const half = state.heroSize / 2;
  const direction = Number(input.right) - Number(input.left);
  next.elapsedMs = state.elapsedMs + dt;
  next.shakeMs = Math.max(0, state.shakeMs - dt);
  next.vx = direction * state.settings.fallSpeed * scale;
  next.heroX = clamp(state.heroX + next.vx * seconds, half, state.worldWidth - half);

  let vy = state.vy;
  if (input.jump && state.onGround) {
    vy = JUMP_VELOCITY * scale;
    next.onGround = false;
    next.events.push('jump');
  }
  vy += GRAVITY * scale * seconds;
  next.vy = vy;
  next.heroY = state.heroY + vy * seconds;
  if (next.heroY < half) {
    next.heroY = half;
    next.vy = Math.max(0, next.vy);
  }

  // Platforms are forgiving one-way surfaces: land from above, pass through
  // from below, and never get snagged on a side wall.
  next.onGround = false;
  if (next.vy >= 0) {
    const previousBottom = state.heroY + half;
    const nextBottom = next.heroY + half;
    let landing: Platform | null = null;
    for (const platform of state.platforms) {
      if (!overlapsHorizontally(next.heroX, half * 0.72, platform)) continue;
      if (previousBottom > platform.y + 2 || nextBottom < platform.y) continue;
      if (!landing || platform.y < landing.y) landing = platform;
    }
    if (landing) {
      next.heroY = landing.y - half;
      next.vy = 0;
      next.onGround = true;
    }
  }

  const collected: PlatformerStar[] = [];
  let starsChanged = false;
  for (const star of state.stars) {
    if (
      !star.collected &&
      Math.abs(next.heroX - star.x) < half + 18 * scale &&
      Math.abs(next.heroY - star.y) < half + 18 * scale
    ) {
      starsChanged = true;
      next.score += 1;
      next.events.push('star');
      next.pops = [...next.pops, { id: next.nextId, x: star.x, y: star.y, text: '+1', ageMs: 0 }];
      next.nextId += 1;
      collected.push({ ...star, collected: true });
    } else {
      collected.push(star);
    }
  }
  if (starsChanged) next.stars = collected;

  if (
    next.heroX + half >= state.goalX &&
    next.heroY + half >= state.goalY - 100 * scale &&
    next.heroY - half <= state.goalY
  ) {
    next.phase = 'over';
    next.won = true;
    next.events.push('win');
  } else if (next.heroY - half > state.height) {
    next.lives -= 1;
    next.shakeMs = SHAKE_MS;
    if (next.lives <= 0) {
      next.lives = 0;
      next.phase = 'over';
      next.events.push('game-over');
    } else {
      next.heroX = state.spawnX;
      next.heroY = state.spawnY;
      next.vx = 0;
      next.vy = 0;
      next.onGround = true;
      next.events.push('fall');
    }
  }

  next.pops = next.pops
    .map((pop) => ({ ...pop, ageMs: pop.ageMs + dt }))
    .filter((pop) => pop.ageMs < POP_MS);
  return next;
}

export const platformerMeta: GameTemplateMeta = {
  id: 'platformer',
  nameKey: 'play.namePlatformer',
  hintKey: 'play.hintPlatformer',
  roles: [
    { role: 'hero', labelKey: 'play.heroPlatformer', nameKey: 'play.roleHero' },
    { role: 'good', labelKey: 'play.collectible', nameKey: 'play.roleGood' },
    { role: 'obstacle', labelKey: 'play.platforms', nameKey: 'play.rolePlatform' },
    { role: 'background', labelKey: 'play.background' },
  ],
  sliders: [
    { setting: 'fallSpeed', labelKey: 'play.runSpeed' },
    { setting: 'lives', labelKey: 'play.lives' },
  ],
  defaultSettings: PLATFORMER_DEFAULT_SETTINGS,
  kidSettings: PLATFORMER_KID_SETTINGS,
};

export const platformerTemplate: GameTemplate<PlatformerState, PlatformerInput> = {
  ...platformerMeta,
  createGame,
  startRun,
  tick,
};
