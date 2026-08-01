/**
 * Timeline bar: the flipbook. Shown only when the document has animation
 * enabled (the "Animate" toggle in the toolbar). Big frame thumbnails, one
 * obvious play button, no jargon — everything here says "frames".
 *
 * Keyboard: while focus is anywhere inside the bar, Space = play/pause
 * (everywhere else Space stays hold-to-pan — see useKeyboardShortcuts).
 */

import { useEffect, useRef, useState } from 'react';
import { animationSettingsOf, MAX_FPS, MIN_FPS } from '../engine/animation';
import { renderDocument } from '../engine/renderer';
import type { DreamDocument, Frame } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { PauseIcon, PlayIcon, PlusIcon } from './icons';

const THUMB_HEIGHT = 56;

/** One frame in the strip: a live-rendered thumbnail. */
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
      title={`Frame ${index + 1}`}
      aria-label={`Frame ${index + 1}`}
      aria-pressed={active}
      onClick={onSelect}
    >
      <canvas ref={canvasRef} style={{ width, height: THUMB_HEIGHT }} />
      <span className="timeline-frame-number">{index + 1}</span>
    </button>
  );
}

export function TimelineBar() {
  const doc = useDreamStore((s) => s.doc);
  const playing = useDreamStore((s) => s.playing);
  const playbackFrame = useDreamStore((s) => s.playbackFrame);
  const [collapsed, setCollapsed] = useState(false);

  if (!doc.frames) return null;

  const settings = animationSettingsOf(doc);
  const frames = doc.frames;
  const store = useDreamStore.getState();

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
      aria-label="Frames"
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="btn icon-btn timeline-collapse"
        aria-label={collapsed ? 'Show frames' : 'Hide frames'}
        title={collapsed ? 'Show frames' : 'Hide frames'}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? '▴' : '▾'}
      </button>

      {!collapsed && (
        <>
          <button
            type="button"
            className="btn icon-btn timeline-play"
            aria-label={playing ? 'Pause' : 'Play'}
            title={playing ? 'Pause' : 'Play'}
            onClick={() => store.togglePlay()}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

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
              aria-label="Add frame"
              title="Add frame"
              onClick={() => store.addFrame()}
            >
              <PlusIcon />
            </button>
          </div>

          <div className="timeline-controls">
            <button
              type="button"
              className="btn"
              title="Duplicate this frame"
              onClick={() => store.duplicateFrame()}
            >
              ⧉
            </button>
            <button
              type="button"
              className="btn"
              title="Move frame left"
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
              title="Move frame right"
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
              title="Delete this frame"
              disabled={frames.length <= 1}
              onClick={() => store.deleteFrame(doc.activeFrameId ?? '')}
            >
              ✕
            </button>

            <label className="timeline-fps" title="Frames per second">
              <input
                type="range"
                min={MIN_FPS}
                max={MAX_FPS}
                value={settings.fps}
                onChange={(e) => store.setAnimation({ fps: Number(e.target.value) })}
                aria-label="Frames per second"
              />
              <span>{settings.fps} fps</span>
            </label>

            <button
              type="button"
              className={`btn${settings.loop ? ' primary' : ''}`}
              title="Loop playback"
              aria-pressed={settings.loop}
              onClick={() => store.setAnimation({ loop: !settings.loop })}
            >
              Loop
            </button>
            <button
              type="button"
              className={`btn${settings.onionSkin ? ' primary' : ''}`}
              title="Onion skin: ghost the previous frame while you draw"
              aria-pressed={settings.onionSkin}
              onClick={() => store.setAnimation({ onionSkin: !settings.onionSkin })}
            >
              Onion
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
                  aria-label="Onion skin opacity"
                  title="Onion skin opacity"
                />
                <button
                  type="button"
                  className={`btn${settings.onionNext ? ' primary' : ''}`}
                  title="Also ghost the next frame"
                  aria-pressed={settings.onionNext}
                  onClick={() => store.setAnimation({ onionNext: !settings.onionNext })}
                >
                  Next
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
