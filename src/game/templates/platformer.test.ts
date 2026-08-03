import { describe, expect, it } from 'vitest';
import { gameRng } from '../core';
import {
  PLATFORMER_DEFAULT_SETTINGS,
  createGame,
  generateLevel,
  startRun,
  tick,
  type PlatformerState,
} from './platformer';

const IDLE = { left: false, right: false, jump: false };

function playing(seed = 1): PlatformerState {
  const started = startRun(createGame(800, 480, PLATFORMER_DEFAULT_SETTINGS, false, gameRng(seed)));
  return tick(started, IDLE, 2400, gameRng(seed));
}

describe('Dream Jumper level', () => {
  it('is deterministic for a seed and changes across seeds', () => {
    expect(generateLevel(800, 480, gameRng(7))).toEqual(generateLevel(800, 480, gameRng(7)));
    expect(generateLevel(800, 480, gameRng(7))).not.toEqual(generateLevel(800, 480, gameRng(8)));
  });

  it('starts safely, ends on a ground platform and keeps gaps jumpable', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const level = generateLevel(800, 480, gameRng(seed));
      expect(level.platforms[0].x).toBe(0);
      expect(level.platforms.at(-1)?.x).toBeLessThan(level.goalX);
      for (let i = 1; i < level.platforms.length; i += 1) {
        const previous = level.platforms[i - 1];
        const current = level.platforms[i];
        expect(current.x - (previous.x + previous.width)).toBeLessThanOrEqual(100);
        expect(Math.abs(current.y - previous.y)).toBeLessThanOrEqual(40);
      }
    }
  });
});

describe('Dream Jumper core', () => {
  it('runs ready → countdown → playing', () => {
    const ready = createGame(800, 480, PLATFORMER_DEFAULT_SETTINGS);
    expect(ready.phase).toBe('ready');
    const countdown = startRun(ready);
    expect(countdown.phase).toBe('countdown');
    const game = tick(countdown, IDLE, 2400, gameRng(1));
    expect(game.phase).toBe('playing');
    expect(game.events).toContain('go');
  });

  it('moves and jumps only from a platform', () => {
    const state = playing();
    const jumped = tick(state, { left: false, right: true, jump: true }, 16, gameRng(1));
    expect(jumped.heroX).toBeGreaterThan(state.heroX);
    expect(jumped.heroY).toBeLessThan(state.heroY);
    expect(jumped.onGround).toBe(false);
    expect(jumped.events).toContain('jump');
    const midair = tick({ ...jumped, onGround: false }, { ...IDLE, jump: true }, 16, gameRng(1));
    expect(midair.events).not.toContain('jump');
  });

  it('collects each star once', () => {
    const state = playing();
    const star = state.stars[0];
    const touching = { ...state, heroX: star.x, heroY: star.y, onGround: false };
    const collected = tick(touching, IDLE, 0, gameRng(1));
    expect(collected.score).toBe(1);
    expect(collected.events).toContain('star');
    expect(tick(collected, IDLE, 0, gameRng(1)).score).toBe(1);
  });

  it('spends a life on a fall, respawns, and eventually ends the run', () => {
    const state = { ...playing(), lives: 2 };
    const fallen = tick({ ...state, heroY: state.height + state.heroSize }, IDLE, 0, gameRng(1));
    expect(fallen.lives).toBe(1);
    expect(fallen.heroX).toBe(state.spawnX);
    expect(fallen.events).toContain('fall');
    const over = tick({ ...fallen, heroY: fallen.height + fallen.heroSize }, IDLE, 0, gameRng(1));
    expect(over.phase).toBe('over');
    expect(over.events).toContain('game-over');
  });

  it('wins at the flag and keeps the collected score', () => {
    const state = { ...playing(), score: 3 };
    const won = tick(
      { ...state, heroX: state.goalX, heroY: state.goalY - state.heroSize / 2 },
      IDLE,
      0,
      gameRng(1),
    );
    expect(won.phase).toBe('over');
    expect(won.won).toBe(true);
    expect(won.score).toBe(3);
    expect(won.events).toContain('win');
  });
});
