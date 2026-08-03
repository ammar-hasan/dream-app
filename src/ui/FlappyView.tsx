/**
 * Play mode: the Flappy Dream view. The hero drawing flies; tap/click/Space
 * flaps, gravity pulls down, gates scroll in from the right. The rules live
 * in the pure core (`game/templates/flappy.ts`); this view is only sprites,
 * the rAF loop and the juice — tilt, gate pops, shield blinks and bleeps.
 */

import { useEffect, useRef, useState } from 'react';
import type { DreamDocument } from '../engine/types';
import { gameRng, POP_MS, SHAKE_MS, type GamePhase } from '../game/core';
import { templateSettings } from '../game/templates';
import {
  createGame,
  gateWidthAt,
  startRun,
  tick,
  type FlappyEvent,
  type FlappyState,
} from '../game/templates/flappy';
import { drawDefaultGate, drawDefaultHero } from '../game/defaults';
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
const GATE_SPRITE = 96;

const SOUNDS: Record<FlappyEvent, GameSound> = {
  start: 'start',
  count: 'count',
  go: 'go',
  flap: 'flap',
  gate: 'gate',
  hit: 'catch-bad',
  'game-over': 'game-over',
};

interface Cast {
  hero: HTMLCanvasElement;
  gate: HTMLCanvasElement;
  background: HTMLCanvasElement;
}

function buildCast(doc: DreamDocument): Cast {
  const cast = doc.game?.cast ?? {};
  return {
    hero: spriteCanvas(doc, cast.hero, drawDefaultHero, HERO_SPRITE),
    gate: spriteCanvas(doc, cast.obstacle, drawDefaultGate, GATE_SPRITE),
    background: backgroundCanvas(doc, [cast.hero, cast.obstacle]),
  };
}

export function FlappyView() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const gameRunning = useDreamStore((s) => s.gameRunning);
  const kidMode = useUiPrefs((s) => s.kidMode);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<FlappyState>(
    createGame(doc.width, doc.height, templateSettings(doc, kidMode)),
  );
  const castRef = useRef<Cast | null>(null);
  const flapRef = useRef(false);
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
  // "play flappy", "stop"); the local overlay buttons go through it too.
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
      const after = tick(before, { flap: flapRef.current }, dt, gameRng(Math.random() * 2 ** 31));
      flapRef.current = false; // edge-triggered: consumed by this tick
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

  // Space / ArrowUp / W flap, live only mid-run so keys never fight the editor.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        flapRef.current = true;
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [phase]);

  /** Paint the whole frame: backdrop, gates, hero, pops, HUD, countdown. */
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

    // The hit shake: a little tremor that fades with shakeMs.
    if (state.shakeMs > 0) {
      const power = (state.shakeMs / SHAKE_MS) * 6;
      ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
    }

    ctx.drawImage(cast.background, 0, 0, doc.width, doc.height);

    // Gates: the cast obstacle stretched over the two solid bands.
    const gateW = gateWidthAt(doc.height);
    for (const gate of state.gates) {
      const gapTop = gate.gapY - gate.gapH / 2;
      const gapBottom = gate.gapY + gate.gapH / 2;
      ctx.drawImage(cast.gate, gate.x, 0, gateW, gapTop);
      ctx.drawImage(cast.gate, gate.x, gapBottom, gateW, doc.height - gapBottom);
    }

    // Hero: tilted by its vertical velocity; blinks during the mercy window.
    const tilt = Math.max(-0.45, Math.min(0.6, state.vy / 900));
    const blink = state.invincibleMs > 0 && Math.floor(state.invincibleMs / 120) % 2 === 0;
    ctx.save();
    ctx.translate(state.heroX, state.heroY);
    ctx.rotate(tilt);
    ctx.globalAlpha = blink ? 0.4 : 1;
    const heroH = (state.heroSize * cast.hero.height) / Math.max(1, cast.hero.width);
    ctx.drawImage(cast.hero, -state.heroSize / 2, -heroH / 2, state.heroSize, heroH);
    ctx.restore();

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

    // HUD: score on a dark chip, shields as hearts.
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const scoreText = t('play.score', { score: state.score });
    const chipWidth = ctx.measureText(scoreText).width + 24;
    ctx.fillStyle = 'rgba(16, 19, 26, 0.55)';
    ctx.fillRect(10, 8, chipWidth, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(scoreText, 22, 15);
    for (let i = 0; i < state.shields; i += 1) {
      ctx.fillStyle = '#38bdf8';
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

  return (
    <div className={`play-view${kidMode ? ' kid-play' : ''}`}>
      <canvas
        ref={canvasRef}
        className="play-canvas"
        onPointerDown={() => {
          flapRef.current = true;
        }}
      />

      <PlayTopbar muted={muted} onToggleMute={() => setMuted((m) => !m)} kidMode={kidMode} />

      {phase === 'ready' && <PlayReadyOverlay kidMode={kidMode} hintKey="play.hintFlappy" />}

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
        <button
          type="button"
          className="btn play-flap-btn"
          aria-label={t('play.flap')}
          onPointerDown={() => {
            flapRef.current = true;
          }}
        >
          {t('play.flap')}
        </button>
      )}
    </div>
  );
}
