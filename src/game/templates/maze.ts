/**
 * Play mode: the "Maze Runner" template. A seeded perfect maze (recursive
 * backtracker — every cell reachable, exactly one path between any two
 * cells) is drawn under the hero; the player steers cell-to-cell with
 * arrows/WASD or a swipe until the exit. No lives, no losing — calm and
 * curious. Reaching the exit wins, and the next maze grows a level bigger.
 */

import type { GameSettings } from '../../engine/types';
import {
  COUNTDOWN_MS,
  DEFAULT_GAME_SETTINGS,
  KID_GAME_SETTINGS,
  clampGameSettings,
  gameRng,
  type GamePhase,
  type Rng,
} from '../core';
import type { GameTemplate, GameTemplateMeta } from '../template';

/** Wall bits per cell; a set bit means "wall on that side". */
export const WALL_N = 1;
export const WALL_E = 2;
export const WALL_S = 4;
export const WALL_W = 8;

export interface MazeGrid {
  cols: number;
  rows: number;
  /** walls[y * cols + x] as a WALL_* bitmask. */
  walls: Uint8Array;
}

/**
 * Generate a perfect maze with the recursive backtracker (iterative form).
 * Pure: same dimensions + same seeded RNG → same maze, always solvable.
 */
export function generateMaze(cols: number, rows: number, rng: Rng): MazeGrid {
  const walls = new Uint8Array(cols * rows).fill(WALL_N | WALL_E | WALL_S | WALL_W);
  const visited = new Uint8Array(cols * rows);
  const stack = [0];
  visited[0] = 1;
  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    // [neighbor index, wall to knock on this cell, wall to knock on the neighbor]
    const options: [number, number, number][] = [];
    if (cy > 0 && !visited[cur - cols]) options.push([cur - cols, WALL_N, WALL_S]);
    if (cx < cols - 1 && !visited[cur + 1]) options.push([cur + 1, WALL_E, WALL_W]);
    if (cy < rows - 1 && !visited[cur + cols]) options.push([cur + cols, WALL_S, WALL_N]);
    if (cx > 0 && !visited[cur - 1]) options.push([cur - 1, WALL_W, WALL_E]);
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [neighbor, bit, opposite] = options[Math.floor(rng() * options.length)];
    walls[cur] &= ~bit;
    walls[neighbor] &= ~opposite;
    visited[neighbor] = 1;
    stack.push(neighbor);
  }
  return { cols, rows, walls };
}

/** True when a wall is open between a cell and its neighbor in direction `bit`. */
export function passageOpen(maze: MazeGrid, index: number, bit: number): boolean {
  return (maze.walls[index] & bit) === 0;
}

/** BFS from start to exit — the solvability invariant, exercised by tests. */
export function mazeSolvable(maze: MazeGrid, start = 0, exit = maze.cols * maze.rows - 1): boolean {
  const { cols, rows, walls } = maze;
  const seen = new Uint8Array(cols * rows);
  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head];
    if (cur === exit) return true;
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    const steps: [number, number][] = [];
    if (cy > 0) steps.push([cur - cols, WALL_N]);
    if (cx < cols - 1) steps.push([cur + 1, WALL_E]);
    if (cy < rows - 1) steps.push([cur + cols, WALL_S]);
    if (cx > 0) steps.push([cur - 1, WALL_W]);
    for (const [neighbor, bit] of steps) {
      if (!seen[neighbor] && (walls[cur] & bit) === 0) {
        seen[neighbor] = 1;
        queue.push(neighbor);
      }
    }
  }
  return false;
}

/** Maze dimensions per level — kids get smaller, calmer mazes. */
export function mazeSizeFor(level: number, kid: boolean): { cols: number; rows: number } {
  const growth = Math.max(0, level - 1);
  if (kid) {
    return { cols: Math.min(5 + growth, 9), rows: Math.min(4 + Math.floor(growth / 2), 7) };
  }
  return { cols: Math.min(8 + growth * 2, 16), rows: Math.min(6 + growth, 12) };
}

export type MazeEvent = 'start' | 'count' | 'go' | 'win';

export interface MazeInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface MazeState {
  phase: GamePhase;
  width: number;
  height: number;
  /** Clamped settings this run was started with (the maze ignores the knobs). */
  settings: GameSettings;
  level: number;
  maze: MazeGrid;
  /** Board geometry in document pixels: square cells, centered with a margin. */
  cell: number;
  originX: number;
  originY: number;
  /** Hero cell + smooth pixel position (center-based) for the glide. */
  heroCX: number;
  heroCY: number;
  heroX: number;
  heroY: number;
  targetCX: number;
  targetCY: number;
  moving: boolean;
  /** Cells per second while gliding. */
  moveSpeed: number;
  exitCX: number;
  exitCY: number;
  /** Milliseconds spent in 'playing' — the time attack on the win card. */
  elapsedMs: number;
  countdownMs: number;
  won: boolean;
  solveMs: number;
  /** Events fired during the latest tick; the UI consumes them per frame. */
  events: MazeEvent[];
}

const BOARD_MARGIN = 24;

function stateForMaze(
  width: number,
  height: number,
  settings: GameSettings,
  level: number,
  kid: boolean,
  maze: MazeGrid,
): MazeState {
  const cell = Math.max(
    12,
    Math.floor(
      Math.min((width - BOARD_MARGIN * 2) / maze.cols, (height - BOARD_MARGIN * 2) / maze.rows),
    ),
  );
  const originX = Math.round((width - cell * maze.cols) / 2);
  const originY = Math.round((height - cell * maze.rows) / 2);
  return {
    phase: 'ready',
    width,
    height,
    settings,
    level,
    maze,
    cell,
    originX,
    originY,
    heroCX: 0,
    heroCY: 0,
    heroX: originX + cell / 2,
    heroY: originY + cell / 2,
    targetCX: 0,
    targetCY: 0,
    moving: false,
    moveSpeed: kid ? 5.5 : 7,
    exitCX: maze.cols - 1,
    exitCY: maze.rows - 1,
    elapsedMs: 0,
    countdownMs: COUNTDOWN_MS,
    won: false,
    solveMs: 0,
    events: [],
  };
}

/** Fresh state for a run at level 1; the seeded RNG builds the maze. */
export function createGame(
  width: number,
  height: number,
  settings: GameSettings,
  kid = false,
  rng: Rng = gameRng(1),
): MazeState {
  const clamped = clampGameSettings(settings);
  const { cols, rows } = mazeSizeFor(1, kid);
  return stateForMaze(width, height, clamped, 1, kid, generateMaze(cols, rows, rng));
}

/** The win reward: a fresh, bigger maze one level up, ready to start. */
export function nextLevel(state: MazeState, kid: boolean, rng: Rng): MazeState {
  const level = state.level + 1;
  const { cols, rows } = mazeSizeFor(level, kid);
  return stateForMaze(
    state.width,
    state.height,
    state.settings,
    level,
    kid,
    generateMaze(cols, rows, rng),
  );
}

/** Press start: ready → countdown. A no-op in any other phase. */
export function startRun(state: MazeState): MazeState {
  if (state.phase !== 'ready') return state;
  return { ...state, phase: 'countdown', countdownMs: COUNTDOWN_MS, events: ['start'] };
}

const DIRS = [
  { key: 'up', bit: WALL_N, dx: 0, dy: -1 },
  { key: 'down', bit: WALL_S, dx: 0, dy: 1 },
  { key: 'left', bit: WALL_W, dx: -1, dy: 0 },
  { key: 'right', bit: WALL_E, dx: 1, dy: 0 },
] as const;

/**
 * Advance the game by `dtMs`. Pure: same (state, input, dt) in → same state
 * out (no RNG after creation — the maze is fixed for the run).
 */
export function tick(state: MazeState, input: MazeInput, dtMs: number): MazeState {
  const dt = dtMs;
  const next: MazeState = { ...state, events: [] };

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

  next.elapsedMs = state.elapsedMs + dt;

  // Glide toward the target cell, snapping on arrival.
  if (state.moving) {
    const targetX = state.originX + state.targetCX * state.cell + state.cell / 2;
    const targetY = state.originY + state.targetCY * state.cell + state.cell / 2;
    const step = state.moveSpeed * state.cell * (dt / 1000);
    const dx = targetX - state.heroX;
    const dy = targetY - state.heroY;
    if (Math.abs(dx) <= step && Math.abs(dy) <= step) {
      next.heroX = targetX;
      next.heroY = targetY;
      next.heroCX = state.targetCX;
      next.heroCY = state.targetCY;
      next.moving = false;
    } else {
      next.heroX = state.heroX + Math.sign(dx) * Math.min(step, Math.abs(dx));
      next.heroY = state.heroY + Math.sign(dy) * Math.min(step, Math.abs(dy));
    }
  }

  // Centered in a cell: a held direction starts the next glide when the
  // passage is open. Walls simply swallow the press — no bump, no penalty.
  if (!next.moving) {
    const index = next.heroCY * state.maze.cols + next.heroCX;
    for (const dir of DIRS) {
      if (!input[dir.key]) continue;
      if (!passageOpen(state.maze, index, dir.bit)) continue;
      next.targetCX = next.heroCX + dir.dx;
      next.targetCY = next.heroCY + dir.dy;
      next.moving = true;
      break;
    }
  }

  // Win: standing on the exit cell, glide finished.
  if (!next.moving && next.heroCX === state.exitCX && next.heroCY === state.exitCY) {
    next.phase = 'over';
    next.won = true;
    next.solveMs = next.elapsedMs;
    next.events.push('win');
  }

  return next;
}

/** Picker/casting metadata for the template registry. */
export const mazeMeta: GameTemplateMeta = {
  id: 'maze',
  nameKey: 'play.nameMaze',
  hintKey: 'play.hintMaze',
  roles: [
    { role: 'hero', labelKey: 'play.heroMaze', nameKey: 'play.roleHero' },
    { role: 'background', labelKey: 'play.background' },
  ],
  sliders: [],
  defaultSettings: DEFAULT_GAME_SETTINGS,
  kidSettings: KID_GAME_SETTINGS,
};

/** Maze Runner as a self-contained template module. */
export const mazeTemplate: GameTemplate<MazeState, MazeInput> = {
  ...mazeMeta,
  createGame,
  startRun,
  tick,
};
