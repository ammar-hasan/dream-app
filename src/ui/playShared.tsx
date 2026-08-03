/**
 * Play mode: shared chrome and sprite helpers for the game views
 * (PlayView, FlappyView, MazeView). Every template gets the same stage:
 * the backdrop canvas, cast sprites cropped to their content, the top bar
 * (mute + exit), the ready overlay and the run-sounds hook. The game rules
 * stay in the pure cores (`game/templates/`); this file is only DOM juice.
 */

import { useRef, useState } from 'react';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument, Layer } from '../engine/types';
import { gameSetupOf } from '../game/core';
import { contentBounds, cropBuffer } from '../game/sprites';
import { createGameSounds, type GameSound, type GameSounds } from '../game/sounds';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';
import { GamepadIcon, MuteIcon, PlayIcon, SoundIcon } from './icons';
import { rasterizeLayer } from './rasterize';

/** The cast layer's drawing cropped tight, or the procedural stand-in. */
export function spriteCanvas(
  doc: DreamDocument,
  layerId: string | undefined,
  fallback: (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => void,
  box: number,
): HTMLCanvasElement {
  const layer = doc.layers.find((l) => l.id === layerId && l.visible);
  if (layer) {
    const raster = rasterizeLayer(layer, doc.width, doc.height);
    const bounds = raster && contentBounds(raster);
    if (raster && bounds) {
      const cropped = cropBuffer(raster, bounds);
      const canvas = document.createElement('canvas');
      canvas.width = cropped.width;
      canvas.height = cropped.height;
      canvas
        .getContext('2d')
        ?.putImageData(new ImageData(cropped.data, cropped.width, cropped.height), 0, 0);
      return canvas;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = box;
  canvas.height = box;
  const ctx = canvas.getContext('2d');
  if (ctx) fallback(ctx, box / 2, box / 2, box * 0.9);
  return canvas;
}

/** Backdrop: the cast background layer alone, or the doc minus game pieces. */
export function backgroundCanvas(
  doc: DreamDocument,
  castLayerIds: (string | undefined)[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = doc.width;
  canvas.height = doc.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const setup = gameSetupOf(doc);
  const backgroundId = setup.cast.background;
  const pieces = new Set(castLayerIds.filter((id): id is string => !!id));
  renderDocument(doc, ctx, {
    layerFilter: (layer: Layer) =>
      backgroundId ? layer.id === backgroundId : !pieces.has(layer.id),
  });
  return canvas;
}

/** Run sounds: shared mute state + event → bleep plumbing. */
export function usePlaySounds(kidMode: boolean) {
  const soundsRef = useRef<GameSounds | null>(null);
  const [muted, setMuted] = useState(!kidMode); // sounds on for kids, off for adults

  /** Call at gesture time (the big play button) so sound is unlocked. */
  const unlock = () => {
    soundsRef.current ??= createGameSounds();
    soundsRef.current?.resume();
  };

  const playEvents = (events: string[], map: Record<string, GameSound>) => {
    if (muted) return;
    for (const event of events) {
      const sound = map[event];
      if (sound) soundsRef.current?.play(sound);
    }
  };

  return { muted, setMuted, unlock, playEvents };
}

/** Leave Play mode for wherever the user was editing. */
export function exitPlay() {
  const store = useDreamStore.getState();
  store.stopGame();
  store.setMode(store.lastEditMode);
}

/** Mute toggle + back-to-drawing, top of every game stage. */
export function PlayTopbar({
  muted,
  onToggleMute,
  kidMode,
}: {
  muted: boolean;
  onToggleMute: () => void;
  kidMode: boolean;
}) {
  const t = useT();
  return (
    <div className="play-topbar">
      <button
        type="button"
        className="btn icon-btn"
        aria-label={muted ? t('play.soundOn') : t('play.soundOff')}
        data-tooltip={kidMode ? undefined : muted ? t('play.soundOn') : t('play.soundOff')}
        onClick={onToggleMute}
      >
        {muted ? <MuteIcon /> : <SoundIcon />}
      </button>
      <button type="button" className="btn play-exit" onClick={exitPlay}>
        {t('play.exit')}
      </button>
    </div>
  );
}

/** The pre-run overlay: a one-line hint (adults) and the big play button. */
export function PlayReadyOverlay({ kidMode, hintKey }: { kidMode: boolean; hintKey: string }) {
  const t = useT();
  return (
    <div className="play-overlay">
      {!kidMode && <p className="play-hint">{t(hintKey)}</p>}
      <button
        type="button"
        className="btn primary play-big-btn"
        aria-label={t('play.start')}
        onClick={() => useDreamStore.getState().startGame()}
      >
        {kidMode ? <GamepadIcon /> : <PlayIcon />}
        <span>{kidMode ? t('kid.playGame') : t('play.start')}</span>
      </button>
    </div>
  );
}
