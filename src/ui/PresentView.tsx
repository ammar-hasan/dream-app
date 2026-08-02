/**
 * Present mode: frames become slides — OR, flipped to "App", an interactive
 * prototype where only the hotspots are tappable and arrows do nothing
 * (it's an app, not a slideshow). Full-viewport rendering, Esc exits.
 * Hotspot transitions are CSS opacity/transform on the canvas only.
 */

import { useEffect, useReducer, useRef, useState } from 'react';
import { presentationFrames } from '../engine/animation';
import { hotspotAt, hotspotTargetIndex } from '../engine/hotspots';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument, Hotspot } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';

const ADVANCE_KEYS = new Set(['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter']);
const BACK_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);
const FX_MS = 220;

/** Fit transform shared by the renderer and pointer hit-testing. */
function stageTransform(viewWidth: number, viewHeight: number, doc: DreamDocument) {
  const scale = Math.min(viewWidth / doc.width, viewHeight / doc.height) * 0.94;
  return {
    scale,
    ox: (viewWidth - doc.width * scale) / 2,
    oy: (viewHeight - doc.height * scale) / 2,
  };
}

export function PresentView() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const presentIndex = useDreamStore((s) => s.presentIndex);
  const presentStyle = useDreamStore((s) => s.presentStyle);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, forceRedraw] = useReducer((x: number) => x + 1, 0);
  const [hovered, setHovered] = useState<string | null>(null);
  /** 'out' fades/slides away before the swap, 'in' settles back. */
  const [fx, setFx] = useState<{ kind: 'fade' | 'slide'; phase: 'out' | 'in' } | null>(null);

  const app = presentStyle === 'app';
  const frames = presentationFrames(doc);
  const index = Math.min(presentIndex, frames.length - 1);
  const frame = doc.frames?.[index];

  const exit = () => {
    const store = useDreamStore.getState();
    store.setMode(store.lastEditMode);
  };

  // Redraw on every render (doc/index/hover changes) — same pattern as the editor.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#10131a';
    ctx.fillRect(0, 0, width, height);

    const slide = frames[index];
    if (!slide) return;
    const { scale, ox, oy } = stageTransform(width, height, doc);
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    renderDocument({ ...doc, layers: slide.layers }, ctx);

    // App preview: the hovered hotspot glows — the only affordance the
    // prototype adds over the user's own screens.
    if (app && frame && hovered) {
      const hotspot = frame.hotspots?.find((h) => h.id === hovered);
      if (hotspot) {
        ctx.fillStyle = 'rgba(109, 124, 255, 0.16)';
        ctx.fillRect(hotspot.rect.x, hotspot.rect.y, hotspot.rect.width, hotspot.rect.height);
        ctx.strokeStyle = 'rgba(109, 124, 255, 0.65)';
        ctx.lineWidth = 1.5 / scale;
        ctx.setLineDash([5 / scale, 4 / scale]);
        ctx.strokeRect(hotspot.rect.x, hotspot.rect.y, hotspot.rect.width, hotspot.rect.height);
        ctx.setLineDash([]);
      }
    }
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useDreamStore.getState();
      if (e.key === 'Escape') {
        e.preventDefault();
        store.setMode(store.lastEditMode);
        return;
      }
      // An app is not a slideshow: arrows/Space never advance screens.
      if (store.presentStyle === 'app') return;
      if (ADVANCE_KEYS.has(e.key)) {
        e.preventDefault();
        store.presentNext();
      } else if (BACK_KEYS.has(e.key)) {
        e.preventDefault();
        store.presentPrev();
      }
    };
    const onResize = () => forceRedraw();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /** Client point → document-space point on the current screen. */
  const toDocPoint = (clientX: number, clientY: number) => {
    const { scale, ox, oy } = stageTransform(window.innerWidth, window.innerHeight, doc);
    return { x: (clientX - ox) / scale, y: (clientY - oy) / scale };
  };

  /** Tap a hotspot: jump to its screen (broken targets are ignored). */
  const follow = (hotspot: Hotspot) => {
    const store = useDreamStore.getState();
    const target = hotspotTargetIndex(store.doc, hotspot);
    if (target === -1 || target === index) return;
    if (hotspot.transition === 'none') {
      store.presentGoTo(target);
      return;
    }
    setFx({ kind: hotspot.transition === 'slide' ? 'slide' : 'fade', phase: 'out' });
    window.setTimeout(() => {
      store.presentGoTo(target);
      setFx({ kind: hotspot.transition === 'slide' ? 'slide' : 'fade', phase: 'in' });
      window.setTimeout(() => setFx(null), FX_MS);
    }, FX_MS);
  };

  const onClick = (e: React.MouseEvent) => {
    if (!app) {
      useDreamStore.getState().presentNext();
      return;
    }
    if (!frame) return;
    const hotspot = hotspotAt(frame, toDocPoint(e.clientX, e.clientY));
    if (hotspot) follow(hotspot);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!app || !frame) return;
    const hotspot = hotspotAt(frame, toDocPoint(e.clientX, e.clientY));
    setHovered(hotspot?.id ?? null);
  };

  return (
    <div
      className="present-view"
      onClick={onClick}
      onPointerMove={onPointerMove}
      style={app ? { cursor: hovered ? 'pointer' : 'default' } : undefined}
    >
      <canvas
        ref={canvasRef}
        className={`present-canvas${fx ? ` fx-${fx.kind}-${fx.phase}` : ''}`}
      />

      <div className="present-style" role="group" aria-label={t('present.style')}>
        <button
          type="button"
          className={`btn${app ? '' : ' primary'}`}
          aria-pressed={!app}
          onClick={(e) => {
            e.stopPropagation();
            useDreamStore.getState().setPresentStyle('slides');
          }}
        >
          {t('present.slides')}
        </button>
        <button
          type="button"
          className={`btn${app ? ' primary' : ''}`}
          aria-pressed={app}
          onClick={(e) => {
            e.stopPropagation();
            useDreamStore.getState().setPresentStyle('app');
          }}
        >
          {t('present.app')}
        </button>
      </div>

      {!app && (
        <div className="present-counter" aria-live="polite">
          {index + 1} / {frames.length}
        </div>
      )}

      {app && (
        <button
          type="button"
          className="btn present-restart"
          onClick={(e) => {
            e.stopPropagation();
            useDreamStore.getState().presentRestart();
          }}
        >
          {t('present.restart')}
        </button>
      )}

      <button
        type="button"
        className="btn present-exit"
        onClick={(e) => {
          e.stopPropagation();
          exit();
        }}
      >
        {t('present.exit')}
      </button>
    </div>
  );
}
