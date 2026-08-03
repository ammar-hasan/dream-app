/**
 * Play mode: the Maze Runner view. A seeded maze is drawn under the hero;
 * arrows/WASD or a swipe glide the hero cell-to-cell to the glowing exit.
 * No lives, no losing — calm and curious. The rules live in the pure core
 * (`game/templates/maze.ts`); this view is only sprites, the rAF loop and
 * the juice — the maze walls, the pulsing exit star and the win card.
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { DreamDocument } from '../engine/types';
import { gameRng, type GamePhase } from '../game/core';
import { templateSettings } from '../game/templates';
import {
  createGame,
  nextLevel,
  startRun,
  tick,
  WALL_E,
  WALL_S,
  type MazeEvent,
  type MazeGrid,
  type MazeState,
} from '../game/templates/maze';
import { drawDefaultGood, drawDefaultHero } from '../game/defaults';
import type { GameSound } from '../game/sounds';
import { readHighScore, useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import {
  backgroundCanvas,
  PlayReadyOverlay,
  PlayTopbar,
  spriteCanvas,
  usePlaySounds,
} from './playShared';
import { useT } from './i18n';
import { PlayIcon } from './icons';

const HERO_SPRITE = 120;
const SWIPE_THRESHOLD = 18; // px of drag before a direction is chosen

const SOUNDS: Record<MazeEvent, GameSound> = {
  start: 'start',
  count: 'count',
  go: 'go',
  win: 'maze-win',
};

interface Cast {
  hero: HTMLCanvasElement;
  background: HTMLCanvasElement;
}

function buildCast(doc: DreamDocument): Cast {
  const cast = doc.game?.cast ?? {};
  return {
    hero: spriteCanvas(doc, cast.hero, drawDefaultHero, HERO_SPRITE),
    background: backgroundCanvas(doc, [cast.hero]),
  };
}

/** The maze walls as an offscreen bitmap, rebuilt only when the maze changes. */
function wallsCanvas(state: MazeState): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = state.width;
  canvas.height = state.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const { maze, cell, originX, originY } = state;
  const pass = (width: number, style: string) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let cy = 0; cy < maze.rows; cy += 1) {
      for (let cx = 0; cx < maze.cols; cx += 1) {
        const walls = maze.walls[cy * maze.cols + cx];
        const x0 = originX + cx * cell;
        const y0 = originY + cy * cell;
        if (cy === 0) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + cell, y0);
        }
        if (cx === 0) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y0 + cell);
        }
        if (walls & WALL_S) {
          ctx.moveTo(x0, y0 + cell);
          ctx.lineTo(x0 + cell, y0 + cell);
        }
        if (walls & WALL_E) {
          ctx.moveTo(x0 + cell, y0);
          ctx.lineTo(x0 + cell, y0 + cell);
        }
      }
    }
    ctx.stroke();
  };
  pass(Math.max(4, cell * 0.16), 'rgba(248, 250, 252, 0.75)'); // light halo
  pass(Math.max(2, cell * 0.08), 'rgba(16, 19, 26, 0.85)'); // dark core
  return canvas;
}

export function MazeView() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const gameRunning = useDreamStore((s) => s.gameRunning);
  const kidMode = useUiPrefs((s) => s.kidMode);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MazeState>(
    createGame(doc.width, doc.height, templateSettings(doc, kidMode), kidMode),
  );
  const castRef = useRef<Cast | null>(null);
  const wallsRef = useRef<{ maze: MazeGrid; canvas: HTMLCanvasElement } | null>(null);
  const inputRef = useRef({ left: false, right: false, up: false, down: false });
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const { muted, setMuted, unlock, playEvents } = usePlaySounds(kidMode);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [win, setWin] = useState<{ seconds: number; level: number; best: number } | null>(null);

  const settings = templateSettings(doc, kidMode);

  /** Begin a fresh run: rebuild the cast from the CURRENT drawing, then 3…2…1. */
  const begin = () => {
    castRef.current = buildCast(useDreamStore.getState().doc);
    const fresh = startRun(
      createGame(doc.width, doc.height, settings, kidMode, gameRng(Math.random() * 2 ** 31)),
    );
    unlock();
    playEvents(fresh.events, SOUNDS);
    stateRef.current = fresh;
    setWin(null);
    setPhase(fresh.phase);
  };

  const endRun = () => {
    stateRef.current = createGame(doc.width, doc.height, settings, kidMode);
    setPhase('ready');
    setWin(null);
  };

  /** The win reward: a fresh, bigger maze one level up. */
  const advance = () => {
    const fresh = startRun(nextLevel(stateRef.current, kidMode, gameRng(Math.random() * 2 ** 31)));
    unlock();
    playEvents(fresh.events, SOUNDS);
    stateRef.current = fresh;
    setWin(null);
    setPhase(fresh.phase);
  };

  // The store's gameRunning flag is the cross-component trigger (voice
  // "play maze", "stop"); the local overlay buttons go through it too.
  useEffect(() => {
    if (gameRunning && (stateRef.current.phase === 'ready' || stateRef.current.phase === 'over')) {
      begin();
    } else if (
      !gameRunning &&
      (stateRef.current.phase === 'countdown' || stateRef.current.phase === 'playing')
    ) {
      endRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameRunning]);

  // The game loop: tick the pure core, then paint. Runs only mid-run.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 100); // tab-switch guard
      last = now;
      const before = stateRef.current;
      const after = tick(before, inputRef.current, dt);
      if (after !== before) {
        playEvents(after.events, SOUNDS);
        stateRef.current = after;
        if (after.phase === 'over') {
          const store = useDreamStore.getState();
          store.recordHighScore(after.level); // best = deepest maze reached
          setWin({
            seconds: Math.round(after.solveMs / 1000),
            level: after.level,
            best: readHighScore(store.doc.id),
          });
          setPhase('over');
          store.stopGame();
          return; // stop the loop; the overlay takes over
        }
        if (after.phase !== before.phase) setPhase(after.phase);
      }
      draw();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, muted]);

  // Static paint for the ready screen (and after leaving a run).
  useEffect(() => {
    if (phase === 'ready') draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, doc]);

  // Arrows + WASD steering, live only mid-run so keys never fight the editor.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    const KEYS: Record<string, keyof typeof inputRef.current> = {
      arrowleft: 'left',
      a: 'left',
      arrowright: 'right',
      d: 'right',
      arrowup: 'up',
      w: 'up',
      arrowdown: 'down',
      s: 'down',
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const dir = KEYS[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        inputRef.current[dir] = down;
      }
    };
    const keydown = onKey(true);
    const keyup = onKey(false);
    const input = inputRef.current;
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    return () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      input.left = false;
      input.right = false;
      input.up = false;
      input.down = false;
    };
  }, [phase]);

  /** Paint the whole frame: backdrop, maze, exit star, hero, HUD, countdown. */
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? window.innerWidth;
    const height = parent?.clientHeight ?? window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;
    const cast = castRef.current ?? (castRef.current = buildCast(doc));
    if (wallsRef.current?.maze !== state.maze) {
      wallsRef.current = { maze: state.maze, canvas: wallsCanvas(state) };
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width / doc.width, height / doc.height) * 0.94;
    ctx.translate((width - doc.width * scale) / 2, (height - doc.height * scale) / 2);
    ctx.scale(scale, scale);

    ctx.drawImage(cast.background, 0, 0, doc.width, doc.height);
    ctx.drawImage(wallsRef.current.canvas, 0, 0);

    // The exit: a gold star breathing gently.
    const exitX = state.originX + state.exitCX * state.cell + state.cell / 2;
    const exitY = state.originY + state.exitCY * state.cell + state.cell / 2;
    const pulse = 1 + Math.sin(performance.now() / 320) * 0.12;
    drawDefaultGood(ctx, exitX, exitY, state.cell * 0.7 * pulse);

    // Hero: the cast drawing gliding between cells.
    const heroSize = state.cell * 0.8;
    const heroH = (heroSize * cast.hero.height) / Math.max(1, cast.hero.width);
    ctx.drawImage(cast.hero, state.heroX - heroSize / 2, state.heroY - heroH / 2, heroSize, heroH);

    // HUD: level chip + a running timer while playing.
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const levelText = t('play.level', { level: state.level });
    const chipWidth = ctx.measureText(levelText).width + 24;
    ctx.fillStyle = 'rgba(16, 19, 26, 0.55)';
    ctx.fillRect(10, 8, chipWidth, 38);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(levelText, 22, 15);
    if (state.phase === 'playing') {
      const timeText = t('play.timer', { seconds: Math.floor(state.elapsedMs / 1000) });
      const timeWidth = ctx.measureText(timeText).width + 24;
      ctx.fillStyle = 'rgba(16, 19, 26, 0.55)';
      ctx.fillRect(doc.width - timeWidth - 10, 8, timeWidth, 38);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(timeText, doc.width - timeWidth + 2, 15);
    }

    if (state.phase === 'countdown') {
      const n = Math.max(1, Math.ceil(state.countdownMs / 800));
      ctx.fillStyle = 'rgba(16, 19, 26, 0.55)';
      ctx.beginPath();
      ctx.ellipse(doc.width / 2, doc.height / 2, 96, 96, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 120px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(String(n), doc.width / 2, doc.height / 2);
    }
  };

  /** Swipe steering: the first dominant drag direction is held until release. */
  const swipeStart = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    swipeRef.current = { x: e.clientX, y: e.clientY };
  };

  const swipeMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const start = swipeRef.current;
    if (!start || e.buttons === 0) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    const input = inputRef.current;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    if (Math.abs(dx) > Math.abs(dy)) input[dx > 0 ? 'right' : 'left'] = true;
    else input[dy > 0 ? 'down' : 'up'] = true;
  };

  const swipeEnd = () => {
    swipeRef.current = null;
    const input = inputRef.current;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
  };

  const hold = (dir: keyof typeof inputRef.current, down: boolean) => {
    inputRef.current[dir] = down;
  };

  return (
    <div className={`play-view${kidMode ? ' kid-play' : ''}`}>
      <canvas
        ref={canvasRef}
        className="play-canvas"
        onPointerDown={swipeStart}
        onPointerMove={swipeMove}
        onPointerUp={swipeEnd}
        onPointerLeave={swipeEnd}
      />

      <PlayTopbar muted={muted} onToggleMute={() => setMuted((m) => !m)} kidMode={kidMode} />

      {phase === 'ready' && <PlayReadyOverlay kidMode={kidMode} hintKey="play.hintMaze" />}

      {phase === 'over' && win && (
        <div className="play-overlay">
          <div className="play-over-card" role="alert">
            <h2 className="play-over-title">{t('play.youWin')}</h2>
            <p className="play-over-score">{t('play.mazeTime', { seconds: win.seconds })}</p>
            <p className="play-over-best">{t('play.best', { score: win.best })}</p>
            <button type="button" className="btn primary play-big-btn" onClick={advance}>
              <PlayIcon />
              <span>{t('play.nextMaze')}</span>
            </button>
          </div>
        </div>
      )}

      {kidMode && phase === 'playing' && (
        <div className="play-arrow-pad">
          <button
            type="button"
            className="btn play-arrow pad-up"
            aria-label={t('play.moveUp')}
            onPointerDown={() => hold('up', true)}
            onPointerUp={() => hold('up', false)}
            onPointerLeave={() => hold('up', false)}
          >
            ▲
          </button>
          <button
            type="button"
            className="btn play-arrow pad-left"
            aria-label={t('play.moveLeft')}
            onPointerDown={() => hold('left', true)}
            onPointerUp={() => hold('left', false)}
            onPointerLeave={() => hold('left', false)}
          >
            ◀
          </button>
          <button
            type="button"
            className="btn play-arrow pad-down"
            aria-label={t('play.moveDown')}
            onPointerDown={() => hold('down', true)}
            onPointerUp={() => hold('down', false)}
            onPointerLeave={() => hold('down', false)}
          >
            ▼
          </button>
          <button
            type="button"
            className="btn play-arrow pad-right"
            aria-label={t('play.moveRight')}
            onPointerDown={() => hold('right', true)}
            onPointerUp={() => hold('right', false)}
            onPointerLeave={() => hold('right', false)}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
