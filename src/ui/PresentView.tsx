/**
 * Present mode: frames become slides. Full-viewport rendering, arrow keys /
 * click / Space to advance, Esc to exit. No editing here — a presentation is
 * just an animation stepped through manually (a document without frames is a
 * one-slide deck).
 */

import { useEffect, useReducer, useRef } from 'react';
import { presentationFrames } from '../engine/animation';
import { renderDocument } from '../engine/renderer';
import { useDreamStore } from '../store/dreamStore';

const ADVANCE_KEYS = new Set(['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter']);
const BACK_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);

export function PresentView() {
  const doc = useDreamStore((s) => s.doc);
  const presentIndex = useDreamStore((s) => s.presentIndex);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, forceRedraw] = useReducer((x: number) => x + 1, 0);

  const frames = presentationFrames(doc);
  const index = Math.min(presentIndex, frames.length - 1);

  const exit = () => {
    const store = useDreamStore.getState();
    store.setMode(store.lastEditMode);
  };

  // Redraw on every render (doc/index changes) — same pattern as the editor.
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

    const frame = frames[index];
    if (!frame) return;
    const scale = Math.min(width / doc.width, height / doc.height) * 0.94;
    ctx.translate((width - doc.width * scale) / 2, (height - doc.height * scale) / 2);
    ctx.scale(scale, scale);
    renderDocument({ ...doc, layers: frame.layers }, ctx);
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useDreamStore.getState();
      if (e.key === 'Escape') {
        e.preventDefault();
        store.setMode(store.lastEditMode);
      } else if (ADVANCE_KEYS.has(e.key)) {
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

  return (
    <div className="present-view" onClick={() => useDreamStore.getState().presentNext()}>
      <canvas ref={canvasRef} className="present-canvas" />
      <div className="present-counter" aria-live="polite">
        {index + 1} / {frames.length}
      </div>
      <button
        type="button"
        className="btn present-exit"
        onClick={(e) => {
          e.stopPropagation();
          exit();
        }}
      >
        Exit
      </button>
    </div>
  );
}
