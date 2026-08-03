/**
 * Unit tests for the Maze Runner core: seeded generation, the solvability
 * invariant (BFS over 50 seeds), grid-locked movement and the win path.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_GAME_SETTINGS, gameRng } from '../core';
import {
  createGame,
  generateMaze,
  mazeSizeFor,
  mazeSolvable,
  nextLevel,
  passageOpen,
  startRun,
  tick,
  WALL_E,
  WALL_N,
  WALL_S,
  WALL_W,
  type MazeGrid,
  type MazeInput,
  type MazeState,
} from './maze';

const IDLE: MazeInput = { left: false, right: false, up: false, down: false };

function playing(maze?: MazeState): MazeState {
  return { ...(maze ?? createGame(800, 600, DEFAULT_GAME_SETTINGS, false, gameRng(3))), phase: 'playing' };
}

/** BFS path from start to exit as a direction sequence (test driver). */
function solvePath(maze: MazeGrid): ('up' | 'down' | 'left' | 'right')[] {
  const { cols, rows, walls } = maze;
  const start = 0;
  const exit = cols * rows - 1;
  const parent = new Int32Array(cols * rows).fill(-1);
  const parentDir = new Int32Array(cols * rows).fill(-1); // WALL_* bit used to enter
  const queue = [start];
  parent[start] = start;
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head];
    if (cur === exit) break;
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    const steps: [number, number][] = [];
    if (cy > 0) steps.push([cur - cols, WALL_N]);
    if (cx < cols - 1) steps.push([cur + 1, WALL_E]);
    if (cy < rows - 1) steps.push([cur + cols, WALL_S]);
    if (cx > 0) steps.push([cur - 1, WALL_W]);
    for (const [neighbor, bit] of steps) {
      if (parent[neighbor] === -1 && (walls[cur] & bit) === 0) {
        parent[neighbor] = cur;
        parentDir[neighbor] = bit;
        queue.push(neighbor);
      }
    }
  }
  const dirs: ('up' | 'down' | 'left' | 'right')[] = [];
  for (let cur = exit; cur !== start; cur = parent[cur]) {
    const bit = parentDir[cur];
    dirs.unshift(bit === WALL_N ? 'up' : bit === WALL_S ? 'down' : bit === WALL_E ? 'right' : 'left');
  }
  return dirs;
}

/** One grid step: hold the direction until the glide starts, then idle till arrival. */
function stepOnce(s: MazeState, dir: 'up' | 'down' | 'left' | 'right'): MazeState {
  const input: MazeInput = {
    left: dir === 'left',
    right: dir === 'right',
    up: dir === 'up',
    down: dir === 'down',
  };
  let guard = 0;
  while (!s.moving && guard < 500) {
    s = tick(s, input, 16);
    guard += 1;
  }
  while (s.moving && guard < 1000) {
    s = tick(s, IDLE, 16);
    guard += 1;
  }
  return s;
}

describe('generateMaze', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = generateMaze(8, 6, gameRng(7));
    const b = generateMaze(8, 6, gameRng(7));
    const c = generateMaze(8, 6, gameRng(8));
    expect(Array.from(a.walls)).toEqual(Array.from(b.walls));
    expect(Array.from(a.walls)).not.toEqual(Array.from(c.walls));
  });

  it('is solvable from start to exit across 50 seeds and sizes', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const cols = 4 + (seed % 9);
      const rows = 3 + (seed % 7);
      const maze = generateMaze(cols, rows, gameRng(seed * 1000 + 17));
      expect(mazeSolvable(maze)).toBe(true);
    }
  });

  it('is a perfect maze: every cell reachable, passages always mutual', () => {
    const maze = generateMaze(10, 8, gameRng(99));
    // Full connectivity: BFS from the start reaches every cell.
    const { cols, rows, walls } = maze;
    const seen = new Uint8Array(cols * rows);
    const queue = [0];
    seen[0] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const cur = queue[head];
      const cx = cur % cols;
      const cy = Math.floor(cur / cols);
      const steps: [number, number, number][] = [];
      if (cy > 0) steps.push([cur - cols, WALL_N, WALL_S]);
      if (cx < cols - 1) steps.push([cur + 1, WALL_E, WALL_W]);
      if (cy < rows - 1) steps.push([cur + cols, WALL_S, WALL_N]);
      if (cx > 0) steps.push([cur - 1, WALL_W, WALL_E]);
      for (const [neighbor, bit] of steps) {
        if (!seen[neighbor] && (walls[cur] & bit) === 0) {
          seen[neighbor] = 1;
          queue.push(neighbor);
        }
      }
    }
    expect(queue).toHaveLength(cols * rows);
    // Mutuality: an open passage is open from both sides.
    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        const i = cy * cols + cx;
        if (cx < cols - 1) {
          expect(!!(walls[i] & WALL_E)).toBe(!!(walls[i + 1] & WALL_W));
        }
        if (cy < rows - 1) {
          expect(!!(walls[i] & WALL_S)).toBe(!!(walls[i + cols] & WALL_N));
        }
      }
    }
  });
});

describe('mazeSizeFor', () => {
  it('grows with the level and stays smaller for kids', () => {
    const adult1 = mazeSizeFor(1, false);
    const adult3 = mazeSizeFor(3, false);
    const kid1 = mazeSizeFor(1, true);
    expect(adult3.cols).toBeGreaterThan(adult1.cols);
    expect(kid1.cols).toBeLessThan(adult1.cols);
    expect(kid1.rows).toBeLessThan(adult1.rows);
    // Caps hold far into the game.
    expect(mazeSizeFor(99, false).cols).toBeLessThanOrEqual(16);
    expect(mazeSizeFor(99, true).cols).toBeLessThanOrEqual(9);
  });
});

describe('createGame / startRun / nextLevel', () => {
  it('starts ready at the top-left cell, exit at the bottom-right, board inside the doc', () => {
    const s = createGame(800, 600, DEFAULT_GAME_SETTINGS, false, gameRng(3));
    expect(s.phase).toBe('ready');
    expect(s.level).toBe(1);
    expect([s.heroCX, s.heroCY]).toEqual([0, 0]);
    expect([s.exitCX, s.exitCY]).toEqual([s.maze.cols - 1, s.maze.rows - 1]);
    expect(s.originX).toBeGreaterThan(0);
    expect(s.originX + s.maze.cols * s.cell).toBeLessThan(800);
    expect(s.originY + s.maze.rows * s.cell).toBeLessThan(600);
  });

  it('countdown leads to playing', () => {
    let s = startRun(createGame(800, 600, DEFAULT_GAME_SETTINGS, false, gameRng(3)));
    expect(s.phase).toBe('countdown');
    s = tick(s, IDLE, 3000);
    expect(s.phase).toBe('playing');
    expect(s.events).toContain('go');
  });

  it('nextLevel starts a bigger maze at level +1, ready to play and solvable', () => {
    const s = createGame(800, 600, DEFAULT_GAME_SETTINGS, false, gameRng(3));
    const next = nextLevel(s, false, gameRng(4));
    expect(next.level).toBe(2);
    expect(next.phase).toBe('ready');
    expect(next.maze.cols).toBeGreaterThan(s.maze.cols);
    expect([next.heroCX, next.heroCY]).toEqual([0, 0]);
    expect(mazeSolvable(next.maze)).toBe(true);
  });
});

describe('movement', () => {
  it('a closed wall swallows the press — the hero stays put', () => {
    // Cell (0,0) always has north and west walls.
    let s = playing();
    expect(passageOpen(s.maze, 0, WALL_N)).toBe(false);
    s = tick(s, { ...IDLE, up: true }, 100);
    expect(s.moving).toBe(false);
    expect([s.heroCX, s.heroCY]).toEqual([0, 0]);
    s = tick(s, { ...IDLE, left: true }, 100);
    expect(s.moving).toBe(false);
  });

  it('an open passage starts a glide that lands on the next cell center', () => {
    let s = playing();
    // Find an open direction from the start cell.
    const dir = passageOpen(s.maze, 0, WALL_E) ? 'right' : 'down';
    const from = [s.heroCX, s.heroCY];
    s = stepOnce(s, dir);
    const moved = Math.abs(s.heroCX - from[0]) + Math.abs(s.heroCY - from[1]);
    expect(moved).toBe(1);
    expect(s.heroX).toBe(s.originX + s.heroCX * s.cell + s.cell / 2);
    expect(s.heroY).toBe(s.originY + s.heroCY * s.cell + s.cell / 2);
  });

  it('following the BFS path reaches the exit and wins with a time', () => {
    let s = playing();
    const path = solvePath(s.maze);
    expect(path.length).toBeGreaterThan(0);
    for (const dir of path) s = stepOnce(s, dir);
    expect([s.heroCX, s.heroCY]).toEqual([s.exitCX, s.exitCY]);
    expect(s.phase).toBe('over');
    expect(s.won).toBe(true);
    expect(s.solveMs).toBeGreaterThan(0);
    expect(s.events).toContain('win');
  });

  it('tick is pure: same state and input, same result', () => {
    const s = playing();
    const a = tick(s, { ...IDLE, right: true }, 33);
    const b = tick(s, { ...IDLE, right: true }, 33);
    expect(a).toEqual(b);
  });
});
