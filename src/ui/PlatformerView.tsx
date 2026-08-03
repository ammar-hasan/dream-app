/** Dream Jumper view: canvas/sprites/input around the pure platformer core. */

import { useEffect, useRef, useState } from 'react';
import type { DreamDocument } from '../engine/types';
import { gameRng, POP_MS, SHAKE_MS, type GamePhase } from '../game/core';
import { drawDefaultGood, drawDefaultHero, drawDefaultPlatform } from '../game/defaults';
import type { GameSound } from '../game/sounds';
import { templateSettings } from '../game/templates';
import {
  createGame,
  startRun,
  tick,
  type PlatformerEvent,
  type PlatformerState,
} from '../game/templates/platformer';
import { readHighScore, useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { PlayIcon } from './icons';
import { useT } from './i18n';
import {
  backgroundCanvas,
  PlayReadyOverlay,
  PlayTopbar,
  spriteCanvas,
  usePlaySounds,
} from './playShared';

const HERO_SPRITE = 120;
const STAR_SPRITE = 64;
const PLATFORM_SPRITE = 96;

const SOUNDS: Record<PlatformerEvent, GameSound> = {
  start: 'start',
  count: 'count',
  go: 'go',
  jump: 'flap',
  star: 'catch-good',
  fall: 'catch-bad',
  win: 'maze-win',
  'game-over': 'game-over',
};

interface Cast {
  hero: HTMLCanvasElement;
  star: HTMLCanvasElement;
  platform: HTMLCanvasElement;
  background: HTMLCanvasElement;
}

function buildCast(doc: DreamDocument): Cast {
  const cast = doc.game?.cast ?? {};
  return {
    hero: spriteCanvas(doc, cast.hero, drawDefaultHero, HERO_SPRITE),
    star: spriteCanvas(doc, cast.good, drawDefaultGood, STAR_SPRITE),
    platform: spriteCanvas(doc, cast.obstacle, drawDefaultPlatform, PLATFORM_SPRITE),
    background: backgroundCanvas(doc, [cast.hero, cast.good, cast.obstacle]),
  };
}

export function PlatformerView() {
  const t = useT();
  const doc = useDreamStore((state) => state.doc);
  const gameRunning = useDreamStore((state) => state.gameRunning);
  const kidMode = useUiPrefs((state) => state.kidMode);
  const settings = templateSettings(doc, kidMode);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<PlatformerState>(
    createGame(doc.width, doc.height, settings, kidMode, gameRng(1)),
  );
  const castRef = useRef<Cast | null>(null);
  const inputRef = useRef({ left: false, right: false, jump: false });
  const { muted, setMuted, unlock, playEvents } = usePlaySounds(kidMode);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [final, setFinal] = useState<{
    won: boolean;
    score: number;
    best: number;
    record: boolean;
  } | null>(null);

  const freshGame = (seed: number) =>
    createGame(doc.width, doc.height, settings, kidMode, gameRng(seed));

  const begin = () => {
    castRef.current = buildCast(useDreamStore.getState().doc);
    const fresh = startRun(freshGame(Date.now() & 0x7fffffff));
    unlock();
    playEvents(fresh.events, SOUNDS);
    stateRef.current = fresh;
    setFinal(null);
    setPhase(fresh.phase);
  };

  const endRun = () => {
    stateRef.current = freshGame(1);
    inputRef.current = { left: false, right: false, jump: false };
    setPhase('ready');
    setFinal(null);
  };

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

  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const before = stateRef.current;
      const after = tick(before, inputRef.current, dt, gameRng(1));
      inputRef.current.jump = false;
      playEvents(after.events, SOUNDS);
      stateRef.current = after;
      if (after.phase === 'over') {
        const store = useDreamStore.getState();
        const record = store.recordHighScore(after.score);
        setFinal({
          won: after.won,
          score: after.score,
          best: readHighScore(store.doc.id),
          record,
        });
        setPhase('over');
        store.stopGame();
        return;
      }
      if (after.phase !== before.phase) setPhase(after.phase);
      draw();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, muted]);

  useEffect(() => {
    if (phase === 'ready') draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, doc]);

  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    const key = (event: KeyboardEvent, down: boolean) => {
      const value = event.key.toLowerCase();
      if (event.key === 'ArrowLeft' || value === 'a') inputRef.current.left = down;
      else if (event.key === 'ArrowRight' || value === 'd') inputRef.current.right = down;
      else if (event.key === ' ' || event.key === 'ArrowUp' || value === 'w') {
        if (down && !event.repeat) inputRef.current.jump = true;
      } else return;
      event.preventDefault();
    };
    const down = (event: KeyboardEvent) => key(event, true);
    const up = (event: KeyboardEvent) => key(event, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [phase]);

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
    const scale = Math.min(width / doc.width, height / doc.height) * 0.94;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, width, height);
    ctx.translate((width - doc.width * scale) / 2, (height - doc.height * scale) / 2);
    ctx.scale(scale, scale);

    if (state.shakeMs > 0) {
      const power = (state.shakeMs / SHAKE_MS) * 6;
      ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
    }

    ctx.drawImage(cast.background, 0, 0, doc.width, doc.height);
    const cameraX = Math.min(
      Math.max(0, state.heroX - doc.width * 0.35),
      Math.max(0, state.worldWidth - doc.width),
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, doc.width, doc.height);
    ctx.clip();
    ctx.translate(-cameraX, 0);

    for (const platform of state.platforms) {
      ctx.drawImage(cast.platform, platform.x, platform.y, platform.width, platform.height);
    }
    for (const star of state.stars) {
      if (star.collected) continue;
      const size = state.heroSize * 0.72;
      ctx.drawImage(cast.star, star.x - size / 2, star.y - size / 2, size, size);
    }

    // Finish flag: intentionally procedural, always recognizable regardless
    // of the cast artwork.
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(state.goalX, state.goalY);
    ctx.lineTo(state.goalX, state.goalY - 86);
    ctx.stroke();
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(state.goalX, state.goalY - 84);
    ctx.lineTo(state.goalX + 54, state.goalY - 68);
    ctx.lineTo(state.goalX, state.goalY - 50);
    ctx.fill();

    const heroHeight = (state.heroSize * cast.hero.height) / Math.max(1, cast.hero.width);
    ctx.drawImage(
      cast.hero,
      state.heroX - state.heroSize / 2,
      state.heroY - heroHeight / 2,
      state.heroSize,
      heroHeight,
    );

    for (const pop of state.pops) {
      const life = pop.ageMs / POP_MS;
      ctx.globalAlpha = 1 - life;
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#22c55e';
      ctx.fillText(pop.text, pop.x, pop.y - life * 44);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const scoreText = t('play.score', { score: state.score });
    ctx.fillStyle = 'rgba(16, 19, 26, 0.55)';
    ctx.fillRect(10, 8, ctx.measureText(scoreText).width + 24, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(scoreText, 22, 15);
    for (let i = 0; i < state.lives; i += 1) {
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(doc.width - 30 - i * 30, 28, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
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

  const hold = (direction: 'left' | 'right', value: boolean) => {
    inputRef.current[direction] = value;
  };

  return (
    <div className={`play-view${kidMode ? ' kid-play' : ''}`}>
      <canvas
        ref={canvasRef}
        className="play-canvas"
        onPointerDown={() => {
          inputRef.current.jump = true;
        }}
      />
      <PlayTopbar
        muted={muted}
        onToggleMute={() => setMuted((value) => !value)}
        kidMode={kidMode}
      />

      {phase === 'ready' && <PlayReadyOverlay kidMode={kidMode} hintKey="play.hintPlatformer" />}

      {phase === 'over' && final && (
        <div className="play-overlay">
          <div className="play-over-card" role="alert">
            <h2 className="play-over-title">{t(final.won ? 'play.youWin' : 'play.gameOver')}</h2>
            <p className="play-over-score">{t('play.score', { score: final.score })}</p>
            <p className="play-over-best">
              {t('play.best', { score: final.best })}
              {final.record && <span className="play-record"> {t('play.newBest')}</span>}
            </p>
            <button
              type="button"
              className="btn primary play-big-btn"
              onClick={() => useDreamStore.getState().startGame()}
            >
              <PlayIcon />
              <span>{t('play.again')}</span>
            </button>
          </div>
        </div>
      )}

      {kidMode && phase === 'playing' && (
        <div className="play-arrows platformer-controls">
          <button
            type="button"
            className="btn play-arrow"
            aria-label={t('play.moveLeft')}
            onPointerDown={() => hold('left', true)}
            onPointerUp={() => hold('left', false)}
            onPointerLeave={() => hold('left', false)}
          >
            ◀
          </button>
          <button
            type="button"
            className="btn play-arrow play-jump-btn"
            aria-label={t('play.jump')}
            onPointerDown={() => {
              inputRef.current.jump = true;
            }}
          >
            {t('play.jump')}
          </button>
          <button
            type="button"
            className="btn play-arrow"
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
