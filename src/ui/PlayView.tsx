/**
 * Play mode dispatcher: the document's chosen template picks the game view —
 * Catch! (this file), Flappy Dream, Maze Runner or Dream Jumper. The rules live in the
 * pure cores (`game/templates/`); the views are only sprites (cast layers
 * rasterized once per run and cropped to their content), the rAF loop and
 * the juice — countdown, score pops, a gentle shake and tiny WebAudio bleeps.
 *
 * Catch!: things fall from the top; the hero — the user's own cast layer, or
 * a smiley stand-in — slides left/right to catch the good ones (+1) and
 * dodge the bad ones (−1 life). Arrows, touch-drag and big on-screen arrows
 * (kid mode) all steer.
 */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { DreamDocument } from '../engine/types';
import { gameRng, POP_MS, SHAKE_MS, type GamePhase } from '../game/core';
import { templateOf, templateSettings } from '../game/templates';
import {
  createGame,
  startRun,
  tick,
  type GameEvent,
  type GameState,
} from '../game/templates/catch';
import { drawDefaultBad, drawDefaultGood, drawDefaultHero } from '../game/defaults';
import type { GameSound } from '../game/sounds';
import { readHighScore, useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { FlappyView } from './FlappyView';
import { MazeView } from './MazeView';
import { PlatformerView } from './PlatformerView';
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
const THING_SPRITE = 64;

const SOUNDS: Record<GameEvent, GameSound> = {
  start: 'start',
  count: 'count',
  go: 'go',
  'catch-good': 'catch-good',
  'catch-bad': 'catch-bad',
  'game-over': 'game-over',
};

interface Cast {
  hero: HTMLCanvasElement;
  good: HTMLCanvasElement;
  bad: HTMLCanvasElement;
  background: HTMLCanvasElement;
}

function buildCast(doc: DreamDocument): Cast {
  const cast = doc.game?.cast ?? {};
  return {
    hero: spriteCanvas(doc, cast.hero, drawDefaultHero, HERO_SPRITE),
    good: spriteCanvas(doc, cast.good, drawDefaultGood, THING_SPRITE),
    bad: spriteCanvas(doc, cast.bad, drawDefaultBad, THING_SPRITE),
    background: backgroundCanvas(doc, [cast.hero, cast.good, cast.bad]),
  };
}

/** The template dispatcher — App mounts this for Play mode. */
export function PlayView() {
  const doc = useDreamStore((s) => s.doc);
  const template = templateOf(doc);
  if (template.id === 'flappy') return <FlappyView />;
  if (template.id === 'maze') return <MazeView />;
  if (template.id === 'platformer') return <PlatformerView />;
  return <CatchView />;
}

function CatchView() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const gameRunning = useDreamStore((s) => s.gameRunning);
  const kidMode = useUiPrefs((s) => s.kidMode);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(
    createGame(doc.width, doc.height, templateSettings(doc, kidMode)),
  );
  const castRef = useRef<Cast | null>(null);
  const inputRef = useRef({ left: false, right: false, pointerX: null as number | null });
  const { muted, setMuted, unlock, playEvents } = usePlaySounds(kidMode);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [finalScore, setFinalScore] = useState<{
    score: number;
    best: number;
    record: boolean;
  } | null>(null);

  const settings = templateSettings(doc, kidMode);

  /** Begin a fresh run: rebuild the cast from the CURRENT drawing, then 3…2…1. */
  const begin = () => {
    castRef.current = buildCast(useDreamStore.getState().doc);
    const fresh = startRun(createGame(doc.width, doc.height, settings));
    unlock();
    playEvents(fresh.events, SOUNDS);
    stateRef.current = fresh;
    setFinalScore(null);
    setPhase(fresh.phase);
  };

  const endRun = () => {
    stateRef.current = createGame(doc.width, doc.height, settings);
    setPhase('ready');
    setFinalScore(null);
  };

  // The store's gameRunning flag is the cross-component trigger (voice
  // "play my game", "stop"); the local overlay buttons go through it too.
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
      const after = tick(before, inputRef.current, dt, gameRng(Math.random() * 2 ** 31));
      if (after !== before) {
        playEvents(after.events, SOUNDS);
        stateRef.current = after;
        if (after.phase === 'over') {
          const store = useDreamStore.getState();
          const record = store.recordHighScore(after.score);
          setFinalScore({
            score: after.score,
            best: readHighScore(store.doc.id),
            record,
          });
          setPhase('over');
          store.stopGame();
          return; // stop the loop; the overlay takes over
        }
        // Countdown → playing (re-arms this effect, which is fine — the
        // state ref carries the run across).
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

  // Keyboard steering, live only mid-run so arrows never fight the editor.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        inputRef.current.left = down;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        inputRef.current.right = down;
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
    };
  }, [phase]);

  /** Paint the whole frame: backdrop, things, hero, pops, HUD, countdown. */
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

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width / doc.width, height / doc.height) * 0.94;
    ctx.translate((width - doc.width * scale) / 2, (height - doc.height * scale) / 2);
    ctx.scale(scale, scale);

    // The bad-catch shake: a little tremor that fades with shakeMs.
    if (state.shakeMs > 0) {
      const power = (state.shakeMs / SHAKE_MS) * 6;
      ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
    }

    ctx.drawImage(cast.background, 0, 0, doc.width, doc.height);

    for (const thing of state.things) {
      const sprite = thing.kind === 'good' ? cast.good : cast.bad;
      ctx.drawImage(
        sprite,
        thing.x - thing.size / 2,
        thing.y - thing.size / 2,
        thing.size,
        thing.size,
      );
    }

    // Hero: the cast drawing scaled to the catcher's width, aspect kept.
    const heroH = (state.heroWidth * cast.hero.height) / Math.max(1, cast.hero.width);
    ctx.drawImage(
      cast.hero,
      state.heroX - state.heroWidth / 2,
      state.heroY + state.heroHeight / 2 - heroH,
      state.heroWidth,
      heroH,
    );

    // Score pops float up and fade.
    for (const pop of state.pops) {
      const life = pop.ageMs / POP_MS;
      ctx.globalAlpha = 1 - life;
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = pop.text.startsWith('+') ? '#22c55e' : '#ef4444';
      ctx.fillText(pop.text, pop.x, pop.y - life * 44);
      ctx.globalAlpha = 1;
    }

    // HUD: score on a dark chip (readable over any drawing), lives as hearts.
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const scoreText = t('play.score', { score: state.score });
    const chipWidth = ctx.measureText(scoreText).width + 24;
    ctx.fillStyle = 'rgba(16, 19, 26, 0.55)';
    ctx.fillRect(10, 8, chipWidth, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(scoreText, 22, 15);
    for (let i = 0; i < state.lives; i += 1) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(doc.width - 30 - i * 30, 28, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.phase === 'countdown') {
      const n = Math.max(1, Math.ceil(state.countdownMs / 800));
      // A soft dark disc keeps the numeral readable over any drawing.
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

  /** Finger steering: convert a pointer event to document x. */
  const steerWith = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / doc.width, rect.height / doc.height) * 0.94;
    const originX = (rect.width - doc.width * scale) / 2;
    inputRef.current.pointerX = (e.clientX - rect.left - originX) / scale;
  };

  const stopSteering = () => {
    inputRef.current.pointerX = null;
  };

  return (
    <div className={`play-view${kidMode ? ' kid-play' : ''}`}>
      <canvas
        ref={canvasRef}
        className="play-canvas"
        onPointerDown={steerWith}
        onPointerMove={(e) => {
          if (e.buttons > 0) steerWith(e);
        }}
        onPointerUp={stopSteering}
        onPointerLeave={stopSteering}
      />

      <PlayTopbar muted={muted} onToggleMute={() => setMuted((m) => !m)} kidMode={kidMode} />

      {phase === 'ready' && <PlayReadyOverlay kidMode={kidMode} hintKey="play.hint" />}

      {phase === 'over' && finalScore && (
        <div className="play-overlay">
          <div className="play-over-card" role="alert">
            <h2 className="play-over-title">{t('play.gameOver')}</h2>
            <p className="play-over-score">{t('play.score', { score: finalScore.score })}</p>
            <p className="play-over-best">
              {t('play.best', { score: finalScore.best })}
              {finalScore.record && <span className="play-record"> {t('play.newBest')}</span>}
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
        <div className="play-arrows">
          <button
            type="button"
            className="btn play-arrow"
            aria-label={t('play.moveLeft')}
            onPointerDown={() => (inputRef.current.left = true)}
            onPointerUp={() => (inputRef.current.left = false)}
            onPointerLeave={() => (inputRef.current.left = false)}
          >
            ◀
          </button>
          <button
            type="button"
            className="btn play-arrow"
            aria-label={t('play.moveRight')}
            onPointerDown={() => (inputRef.current.right = true)}
            onPointerUp={() => (inputRef.current.right = false)}
            onPointerLeave={() => (inputRef.current.right = false)}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
