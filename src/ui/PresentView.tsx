/**
 * Present mode: frames become slides — OR, flipped to "App", an interactive
 * prototype where only the hotspots are tappable and arrows do nothing
 * (it's an app, not a slideshow). Full-viewport rendering, Esc exits.
 * Hotspot transitions are CSS opacity/transform on the canvas only.
 */

import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { presentationFrames } from '../engine/animation';
import { hotspotAt, hotspotTargetIndex } from '../engine/hotspots';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument, Hotspot, SlideTransition } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useT } from './i18n';
import { MuteIcon, SoundIcon } from './icons';
import { playNarration } from './narration';

const PresenterConsole = lazy(async () => {
  const module = await import('./PresenterConsole');
  return { default: module.PresenterConsole };
});

const ADVANCE_KEYS = new Set(['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter']);
const BACK_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);
const FX_MS = 220;

function preparePresenterWindow(popup: Window, title: string) {
  const popupDocument = popup.document;
  popupDocument.documentElement.lang = document.documentElement.lang;
  popupDocument.documentElement.dir = document.documentElement.dir;
  for (const attribute of ['data-theme', 'data-comfort']) {
    const value = document.documentElement.getAttribute(attribute);
    if (value === null) popupDocument.documentElement.removeAttribute(attribute);
    else popupDocument.documentElement.setAttribute(attribute, value);
  }
  popupDocument.head.replaceChildren();
  const meta = popupDocument.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1';
  popupDocument.head.append(meta);
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    popupDocument.head.append(node.cloneNode(true));
  });
  popupDocument.title = title;
  popupDocument.body.replaceChildren();
  popupDocument.body.className = 'presenter-window-body';
}

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
  const [autoAdvance, setAutoAdvance] = useState(false);
  const presenterWindowRef = useRef<Window | null>(null);
  const [presenterWindow, setPresenterWindow] = useState<Window | null>(null);
  const [presenterBlocked, setPresenterBlocked] = useState(false);
  const [presenterStartedAt, setPresenterStartedAt] = useState(0);
  const [slideStartedAt, setSlideStartedAt] = useState(Date.now());
  const [presenterClock, setPresenterClock] = useState(Date.now());
  /** 'out' fades/slides away before the swap, 'in' settles back. */
  const [fx, setFx] = useState<{ kind: 'fade' | 'slide'; phase: 'out' | 'in' } | null>(null);
  const transitionTimers = useRef<number[]>([]);
  const transitioning = useRef(false);

  const app = presentStyle === 'app';
  const frames = presentationFrames(doc);
  const index = Math.min(presentIndex, frames.length - 1);
  const frame = doc.frames?.[index];
  const narration = doc.narration;
  const narrationMuted = useDreamStore((s) => s.narrationMuted);
  const presenterOpen = presenterWindow !== null && !presenterWindow.closed;

  const clearTransitionTimers = useCallback(() => {
    transitionTimers.current.forEach((timer) => window.clearTimeout(timer));
    transitionTimers.current = [];
    transitioning.current = false;
  }, []);

  useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  const transitionTo = useCallback((target: number, transition: SlideTransition) => {
    if (transitioning.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (transition === 'none' || reduced) {
      useDreamStore.getState().presentGoTo(target);
      return;
    }
    transitioning.current = true;
    setFx({ kind: transition, phase: 'out' });
    transitionTimers.current.push(
      window.setTimeout(() => {
        useDreamStore.getState().presentGoTo(target);
        setFx({ kind: transition, phase: 'in' });
        transitionTimers.current.push(
          window.setTimeout(() => {
            setFx(null);
            transitioning.current = false;
          }, FX_MS),
        );
      }, FX_MS),
    );
  }, []);

  const navigateTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(target, frames.length - 1));
      if (clamped === index) return;
      transitionTo(clamped, doc.frames?.[clamped]?.presentation?.transition ?? 'none');
    },
    [doc.frames, frames.length, index, transitionTo],
  );

  const closePresenter = useCallback(() => {
    const popup = presenterWindowRef.current;
    presenterWindowRef.current = null;
    setPresenterWindow(null);
    if (popup && !popup.closed) popup.close();
  }, []);

  const exit = useCallback(() => {
    const store = useDreamStore.getState();
    store.setMode(store.lastEditMode);
  }, []);

  const openPresenter = () => {
    const existing = presenterWindowRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    const popup = window.open('', 'dream-presenter', 'popup,width=520,height=720');
    if (!popup) {
      setPresenterBlocked(true);
      return;
    }
    preparePresenterWindow(popup, t('present.presenterTitle'));
    const now = Date.now();
    presenterWindowRef.current = popup;
    setPresenterWindow(popup);
    setPresenterBlocked(false);
    setPresenterStartedAt(now);
    setSlideStartedAt(now);
    setPresenterClock(now);
    popup.focus();
  };

  useEffect(
    () => () => {
      const popup = presenterWindowRef.current;
      presenterWindowRef.current = null;
      if (popup && !popup.closed) popup.close();
    },
    [],
  );

  useEffect(() => {
    if (!presenterWindow) return;
    const timer = window.setInterval(() => {
      if (presenterWindow.closed) {
        presenterWindowRef.current = null;
        setPresenterWindow(null);
        return;
      }
      setPresenterClock(Date.now());
    }, 250);
    return () => window.clearInterval(timer);
  }, [presenterWindow]);

  useEffect(() => {
    if (presenterOpen) setSlideStartedAt(Date.now());
  }, [index, presenterOpen]);

  useEffect(() => {
    if (app && presenterOpen) closePresenter();
  }, [app, closePresenter, presenterOpen]);

  useEffect(() => {
    if (!presenterWindow || presenterWindow.closed) return;
    const onPresenterKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exit();
      } else if (ADVANCE_KEYS.has(event.key)) {
        event.preventDefault();
        navigateTo(index + 1);
      } else if (BACK_KEYS.has(event.key)) {
        event.preventDefault();
        navigateTo(index - 1);
      }
    };
    presenterWindow.addEventListener('keydown', onPresenterKeyDown);
    return () => presenterWindow.removeEventListener('keydown', onPresenterKeyDown);
  }, [exit, index, navigateTo, presenterWindow]);

  // Narration: the take plays once from the start of the presentation
  // (unmuted only); leaving Present — or muting — stops it.
  useEffect(() => {
    if (!narration || narrationMuted) return;
    const playback = playNarration(narration);
    return () => playback.stop();
  }, [narration, narrationMuted]);

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
        navigateTo(store.presentIndex + 1);
      } else if (BACK_KEYS.has(e.key)) {
        e.preventDefault();
        navigateTo(store.presentIndex - 1);
      }
    };
    const onResize = () => forceRedraw();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [navigateTo]);

  // Auto mode respects each slide's own duration. An untimed slide pauses
  // the deck, so a presenter can mix self-running and spoken sections.
  useEffect(() => {
    const duration = frame?.presentation?.durationMs;
    if (app || !autoAdvance || duration === undefined || index >= frames.length - 1) return;
    const timer = window.setTimeout(() => navigateTo(index + 1), duration);
    return () => window.clearTimeout(timer);
  }, [app, autoAdvance, frame?.presentation?.durationMs, frames.length, index, navigateTo]);

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
    transitionTo(target, hotspot.transition);
  };

  const onClick = (e: React.MouseEvent) => {
    if (!app) {
      navigateTo(index + 1);
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

  const presenterRemainingMs =
    frame?.presentation?.durationMs === undefined
      ? undefined
      : Math.min(
          frame.presentation.durationMs,
          Math.max(0, frame.presentation.durationMs - (presenterClock - slideStartedAt)),
        );

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
        {!app && (
          <>
            <button
              type="button"
              className={`btn${autoAdvance ? ' primary' : ''}`}
              aria-pressed={autoAdvance}
              onClick={(e) => {
                e.stopPropagation();
                setAutoAdvance(!autoAdvance);
              }}
            >
              {t('present.auto')}
            </button>
            <button
              type="button"
              className={`btn${presenterOpen ? ' primary' : ''}`}
              aria-pressed={presenterOpen}
              onClick={(e) => {
                e.stopPropagation();
                if (presenterOpen) closePresenter();
                else openPresenter();
              }}
            >
              {t('present.presenter')}
            </button>
          </>
        )}
      </div>

      {presenterBlocked && (
        <p className="presenter-notice" role="alert" onClick={(event) => event.stopPropagation()}>
          {t('present.presenterBlocked')}
        </p>
      )}

      {!app &&
        presenterOpen &&
        presenterWindow &&
        createPortal(
          <Suspense
            fallback={
              <p className="presenter-console-loading" role="status">
                {t('present.loading')}
              </p>
            }
          >
            <PresenterConsole
              doc={doc}
              frames={frames}
              index={index}
              autoAdvance={autoAdvance}
              elapsedMs={presenterClock - presenterStartedAt}
              remainingMs={presenterRemainingMs}
              onPrevious={() => navigateTo(index - 1)}
              onNext={() => navigateTo(index + 1)}
              onToggleAuto={() => setAutoAdvance((current) => !current)}
              onFocusAudience={() => window.focus()}
              onExit={exit}
              onClose={closePresenter}
            />
          </Suspense>,
          presenterWindow.document.body,
        )}

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

      {narration && (
        <button
          type="button"
          className="btn icon-btn present-narration"
          aria-pressed={!narrationMuted}
          aria-label={`${t('narration.present')}: ${narrationMuted ? t('narration.unmute') : t('narration.mute')}`}
          onClick={(e) => {
            e.stopPropagation();
            useDreamStore.getState().setNarrationMuted(!narrationMuted);
          }}
        >
          {narrationMuted ? <MuteIcon /> : <SoundIcon />}
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
