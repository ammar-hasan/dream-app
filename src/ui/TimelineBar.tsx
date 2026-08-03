/**
 * Timeline bar: the flipbook. Shown only when the document has animation
 * enabled (the "Animate" toggle in the toolbar). Big frame thumbnails, one
 * obvious play button, no jargon — everything here says "frames".
 *
 * Keyboard: while focus is anywhere inside the bar, Space = play/pause
 * (everywhere else Space stays hold-to-pan — see useKeyboardShortcuts).
 */

import { memo, useEffect, useRef, useState } from 'react';
import { animationSettingsOf, MAX_FPS, MIN_FPS } from '../engine/animation';
import { hasHotspots } from '../engine/hotspots';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument, Frame } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { PauseIcon, PlayIcon, PlusIcon } from './icons';
import { NarrationControls } from './NarrationControls';
import { useT } from './i18n';

const THUMB_HEIGHT = 56;

/** One frame in the strip: a live-rendered thumbnail. */
const FrameThumbnail = memo(
  function FrameThumbnail({
    doc,
    frame,
    active,
    playingHere,
    index,
    onSelect,
  }: {
    doc: DreamDocument;
    frame: Frame;
    active: boolean;
    playingHere: boolean;
    index: number;
    onSelect: () => void;
  }) {
    const t = useT();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const width = Math.max(24, Math.round((doc.width / doc.height) * THUMB_HEIGHT));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(THUMB_HEIGHT * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform((width * dpr) / doc.width, 0, 0, (THUMB_HEIGHT * dpr) / doc.height, 0, 0);
      renderDocument({ ...doc, layers: frame.layers }, ctx);
    }, [doc, frame, width]);

    return (
      <button
        type="button"
        className={`timeline-frame${active ? ' active' : ''}${playingHere ? ' playing' : ''}`}
        title={t('timeline.frame', { n: index + 1 })}
        aria-label={t('timeline.frame', { n: index + 1 })}
        aria-pressed={active}
        onClick={onSelect}
      >
        <canvas ref={canvasRef} style={{ width, height: THUMB_HEIGHT }} />
        <span className="timeline-frame-number">{index + 1}</span>
      </button>
    );
  },
  // Memoized on frame content: edits to one frame never re-render the other
  // thumbnails. onSelect is keyed by frame.id (stable per component), so it
  // is deliberately excluded from the comparison.
  (prev, next) =>
    prev.frame.layers === next.frame.layers &&
    prev.active === next.active &&
    prev.playingHere === next.playingHere &&
    prev.index === next.index &&
    prev.doc.width === next.doc.width &&
    prev.doc.height === next.doc.height &&
    prev.doc.background === next.doc.background,
);

export function TimelineBar() {
  const t = useT();
  const doc = useDreamStore((s) => s.doc);
  const playing = useDreamStore((s) => s.playing);
  const playbackFrame = useDreamStore((s) => s.playbackFrame);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const [collapsed, setCollapsed] = useState(false);

  if (!doc.frames) return null;

  const settings = animationSettingsOf(doc);
  const frames = doc.frames;
  const store = useDreamStore.getState();
  // App-mode discovery: with 2+ screens and no links yet, nudge grown-ups
  // toward the Link tool. Kid mode skips it — Play is the kid path.
  const showAppHint = !kidMode && frames.length >= 2 && !hasHotspots(doc);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Space = play/pause while the timeline has focus (the global handler
    // skips Space-pan inside .timeline-bar). Range inputs keep their keys.
    if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      store.togglePlay();
    }
  };

  return (
    <div
      className={`timeline-bar${collapsed ? ' collapsed' : ''}`}
      tabIndex={0}
      role="group"
      aria-label={t('timeline.frames')}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="btn icon-btn timeline-collapse"
        aria-label={collapsed ? t('timeline.showFrames') : t('timeline.hideFrames')}
        title={collapsed ? t('timeline.showFrames') : t('timeline.hideFrames')}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? '▴' : '▾'}
      </button>

      {!collapsed && (
        <>
          <button
            type="button"
            className="btn icon-btn timeline-play"
            aria-label={playing ? t('timeline.pause') : t('timeline.play')}
            title={playing ? t('timeline.pause') : t('timeline.play')}
            onClick={() => store.togglePlay()}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <NarrationControls />

          <div className="timeline-frames">
            {frames.map((frame, i) => (
              <FrameThumbnail
                key={frame.id}
                doc={doc}
                frame={frame}
                index={i}
                active={frame.id === doc.activeFrameId}
                playingHere={playing && playbackFrame === i}
                onSelect={() => store.selectFrame(frame.id)}
              />
            ))}
            <button
              type="button"
              className="timeline-frame timeline-add"
              aria-label={t('timeline.addFrame')}
              title={t('timeline.addFrame')}
              onClick={() => store.addFrame()}
            >
              <PlusIcon />
            </button>
          </div>

          {showAppHint && (
            <button
              type="button"
              className="timeline-app-hint"
              onClick={() => {
                store.setMode('design');
                useDreamStore.getState().setTool('link');
              }}
            >
              {t('timeline.appHint')}
            </button>
          )}

          <div className="timeline-controls">
            <button
              type="button"
              className="btn"
              title={t('timeline.duplicateFrame')}
              aria-label={t('timeline.duplicateFrame')}
              onClick={() => store.duplicateFrame()}
            >
              ⧉
            </button>
            <button
              type="button"
              className="btn"
              title={t('timeline.moveLeft')}
              aria-label={t('timeline.moveLeft')}
              disabled={activeIndex(frames, doc.activeFrameId) === 0}
              onClick={() =>
                store.moveFrame(doc.activeFrameId ?? '', activeIndex(frames, doc.activeFrameId) - 1)
              }
            >
              ←
            </button>
            <button
              type="button"
              className="btn"
              title={t('timeline.moveRight')}
              aria-label={t('timeline.moveRight')}
              disabled={activeIndex(frames, doc.activeFrameId) === frames.length - 1}
              onClick={() =>
                store.moveFrame(doc.activeFrameId ?? '', activeIndex(frames, doc.activeFrameId) + 1)
              }
            >
              →
            </button>
            <button
              type="button"
              className="btn"
              title={t('timeline.deleteFrame')}
              aria-label={t('timeline.deleteFrame')}
              disabled={frames.length <= 1}
              onClick={() => store.deleteFrame(doc.activeFrameId ?? '')}
            >
              ✕
            </button>

            <label className="timeline-fps" title={t('timeline.fps')}>
              <input
                type="range"
                min={MIN_FPS}
                max={MAX_FPS}
                value={settings.fps}
                onChange={(e) => store.setAnimation({ fps: Number(e.target.value) })}
                aria-label={t('timeline.fps')}
              />
              <span>{settings.fps} fps</span>
            </label>

            <button
              type="button"
              className={`btn${settings.loop ? ' primary' : ''}`}
              title={t('timeline.loopTitle')}
              aria-pressed={settings.loop}
              onClick={() => store.setAnimation({ loop: !settings.loop })}
            >
              {t('timeline.loop')}
            </button>
            <button
              type="button"
              className={`btn${settings.onionSkin ? ' primary' : ''}`}
              title={t('timeline.onionTitle')}
              aria-pressed={settings.onionSkin}
              onClick={() => store.setAnimation({ onionSkin: !settings.onionSkin })}
            >
              {t('timeline.onion')}
            </button>
            {settings.onionSkin && (
              <>
                <input
                  type="range"
                  min={5}
                  max={80}
                  value={Math.round(settings.onionOpacity * 100)}
                  onChange={(e) =>
                    store.setAnimation({ onionOpacity: Number(e.target.value) / 100 })
                  }
                  aria-label={t('timeline.onionOpacity')}
                  title={t('timeline.onionOpacity')}
                />
                <button
                  type="button"
                  className={`btn${settings.onionNext ? ' primary' : ''}`}
                  title={t('timeline.onionNextTitle')}
                  aria-pressed={settings.onionNext}
                  onClick={() => store.setAnimation({ onionNext: !settings.onionNext })}
                >
                  {t('timeline.onionNext')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function activeIndex(frames: Frame[], activeId: string | undefined): number {
  const index = frames.findIndex((f) => f.id === activeId);
  return index === -1 ? 0 : index;
}
