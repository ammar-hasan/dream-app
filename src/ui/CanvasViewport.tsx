/**
 * Canvas viewport.
 *
 * Responsibilities:
 * - DPR-aware sizing and redrawing (document + live preview operation).
 * - Pointer routing: drawing tools go to the store; pan/zoom/fill/eyedropper
 *   are handled here because they need viewport state or rendered pixels.
 * - Wheel zoom anchored at the cursor, Space-drag panning.
 *
 * Raster tools (fill, eyedropper) render the relevant content to an
 * offscreen canvas and read pixels back — the engine stays DOM-free.
 */

import { useCallback, useEffect, useRef } from 'react';
import { renderDocument, renderLayer, renderOperation } from '../engine/renderer';
import { nextZoomIn, nextZoomOut, pickColor, zoomAtPoint } from '../engine/tools';
import type { Point } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { TextOverlay } from './TextOverlay';

export function CanvasViewport() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panRef = useRef<{ startX: number; startY: number; origin: Point } | null>(null);

  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const tool = useDreamStore((s) => s.tool);
  const previewOp = useDreamStore((s) => s.previewOp);
  const pendingText = useDreamStore((s) => s.pendingText);
  const zoom = useDreamStore((s) => s.zoom);
  const offset = useDreamStore((s) => s.offset);
  const spacePanning = useDreamStore((s) => s.spacePanning);
  const hintDismissed = useDreamStore((s) => s.hintDismissed);

  // Redraw whenever the subscribed state changes (effect runs every render).
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return; // jsdom and very old browsers: nothing to draw on

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#e9ebef';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Soft shadow + page border make the document read as a sheet of paper.
    ctx.fillStyle = 'rgba(15, 23, 42, 0.10)';
    ctx.fillRect(3, 5, doc.width, doc.height);
    renderDocument(doc, ctx);
    ctx.strokeStyle = '#c9ced6';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(0, 0, doc.width, doc.height);

    const activeLayer = doc.layers.find((l) => l.id === activeLayerId);
    if (previewOp) {
      renderOperation(previewOp, ctx, { layerOpacity: activeLayer?.opacity ?? 1 });
    }
    ctx.restore();
  });

  /** Client event → document coordinates. */
  const toDocPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      return {
        x: (clientX - left - offset.x) / zoom,
        y: (clientY - top - offset.y) / zoom,
      };
    },
    [offset, zoom],
  );

  // --- Raster tools -------------------------------------------------------

  const doFill = (point: Point) => {
    const state = useDreamStore.getState();
    const layer = state.doc.layers.find((l) => l.id === state.activeLayerId);
    if (!layer || layer.locked) return;
    const off = document.createElement('canvas');
    off.width = state.doc.width;
    off.height = state.doc.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    renderLayer(layer, offCtx);
    const image = offCtx.getImageData(0, 0, off.width, off.height);
    state.applyFillAt(point, { data: image.data, width: off.width, height: off.height });
  };

  const doEyedropper = (point: Point) => {
    const state = useDreamStore.getState();
    const off = document.createElement('canvas');
    off.width = state.doc.width;
    off.height = state.doc.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    renderDocument(state.doc, offCtx);
    const image = offCtx.getImageData(0, 0, off.width, off.height);
    const color = pickColor({ data: image.data, width: off.width, height: off.height }, point);
    if (color) state.setColor(color);
  };

  const zoomAtClientPoint = (clientX: number, clientY: number, direction: 'in' | 'out') => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const state = useDreamStore.getState();
    const next = direction === 'in' ? nextZoomIn(state.zoom) : nextZoomOut(state.zoom);
    const focal = { x: clientX - rect.left, y: clientY - rect.top };
    state.setViewport({ zoom: next, offset: zoomAtPoint(state.offset, state.zoom, next, focal) });
  };

  // --- Pointer routing ----------------------------------------------------

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const panning = e.button === 1 || tool === 'pan' || spacePanning;
    if (panning) {
      panRef.current = { startX: e.clientX, startY: e.clientY, origin: { ...offset } };
      return;
    }
    if (e.button !== 0) return;
    const point = toDocPoint(e.clientX, e.clientY);
    if (tool === 'zoom') {
      zoomAtClientPoint(e.clientX, e.clientY, e.altKey ? 'out' : 'in');
      return;
    }
    if (tool === 'fill') {
      doFill(point);
      return;
    }
    if (tool === 'eyedropper') {
      doEyedropper(point);
      return;
    }
    useDreamStore.getState().pointerDown(point, { shiftKey: e.shiftKey });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      const { startX, startY, origin } = panRef.current;
      useDreamStore
        .getState()
        .setViewport({
          offset: { x: origin.x + e.clientX - startX, y: origin.y + e.clientY - startY },
        });
      return;
    }
    const point = toDocPoint(e.clientX, e.clientY);
    useDreamStore.getState().pointerMove(point, { shiftKey: e.shiftKey });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      panRef.current = null;
      return;
    }
    const point = toDocPoint(e.clientX, e.clientY);
    useDreamStore.getState().pointerUp(point, { shiftKey: e.shiftKey });
  };

  // Wheel zoom (non-passive so we can prevent page scroll).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAtClientPoint(e.clientX, e.clientY, e.deltaY < 0 ? 'in' : 'out');
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [zoom, offset]);

  const cursor = tool === 'pan' || spacePanning ? 'grab' : tool === 'text' ? 'text' : 'crosshair';

  return (
    <div className="viewport" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="viewport-canvas"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => useDreamStore.getState().setPointerPos(null)}
      />
      {pendingText && (
        <TextOverlay
          screenPos={{
            x: offset.x + pendingText.x * zoom,
            y: offset.y + pendingText.y * zoom,
          }}
        />
      )}
      {!hintDismissed && (
        <div className="hint-overlay" aria-hidden="true">
          <div className="hint-card">Pick a brush and start dreaming</div>
        </div>
      )}
    </div>
  );
}
