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
import { animationSettingsOf, frameIndexAtTime, onionSkinTargets } from '../engine/animation';
import { normalizeRect } from '../engine/geometry';
import { selectedOps, selectionBounds, unionBounds } from '../engine/selection';
import { mirrorOperations, SYMMETRY_TOOLS } from '../engine/symmetry';
import { clampZoom, nextZoomIn, nextZoomOut, pickColor, zoomAtPoint } from '../engine/tools';
import type { RasterSource } from '../engine/tools';
import type { Point, Rect } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { getComponent } from '../storage/components';
import { importImageFiles } from './importImage';
import { TextOverlay } from './TextOverlay';
import { useT } from './i18n';
import { DreamMark } from './icons';

/** Accent used for all selection chrome, matching --accent in app.css. */
const ACCENT = '#6d7cff';

/** Paint a raw RGBA buffer onto the canvas at (x, y), honoring opacity. */
function blitBuffer(
  ctx: CanvasRenderingContext2D,
  buffer: RasterSource,
  x: number,
  y: number,
  alpha: number,
): void {
  const scratch = document.createElement('canvas');
  scratch.width = buffer.width;
  scratch.height = buffer.height;
  const scratchCtx = scratch.getContext('2d');
  if (!scratchCtx) return;
  scratchCtx.putImageData(new ImageData(buffer.data, buffer.width, buffer.height), 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(scratch, x, y);
  ctx.restore();
}

function corners(r: Rect): Point[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x, y: r.y + r.height },
    { x: r.x + r.width, y: r.y + r.height },
  ];
}

export function CanvasViewport() {
  const t = useT();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panRef = useRef<{ startX: number; startY: number; origin: Point } | null>(null);

  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const mode = useDreamStore((s) => s.mode);
  const tool = useDreamStore((s) => s.tool);
  const previewOp = useDreamStore((s) => s.previewOp);
  const pendingText = useDreamStore((s) => s.pendingText);
  const moveDraft = useDreamStore((s) => s.moveDraft);
  const cropDraft = useDreamStore((s) => s.cropDraft);
  const adjustPreview = useDreamStore((s) => s.adjustPreview);
  const symmetry = useDreamStore((s) => s.symmetry);
  const wandDraft = useDreamStore((s) => s.wandDraft);
  const lassoDraft = useDreamStore((s) => s.lassoDraft);
  const selection = useDreamStore((s) => s.selection);
  const selectDraft = useDreamStore((s) => s.selectDraft);
  const zoom = useDreamStore((s) => s.zoom);
  const offset = useDreamStore((s) => s.offset);
  const spacePanning = useDreamStore((s) => s.spacePanning);
  const hintDismissed = useDreamStore((s) => s.hintDismissed);
  const playing = useDreamStore((s) => s.playing);
  const playbackFrame = useDreamStore((s) => s.playbackFrame);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const skinCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback driver: while playing, a rAF loop maps elapsed time to a frame
  // index via the pure engine function; editing is paused in the store.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const state = useDreamStore.getState();
      if (!state.playing || !state.doc.frames) return;
      const { fps, loop } = animationSettingsOf(state.doc);
      const { index, done } = frameIndexAtTime(now - start, fps, state.doc.frames.length, loop);
      if (done) {
        state.pause();
        return;
      }
      state.setPlaybackFrame(index);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

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
    // No opaque surround fill: the CSS viewport background (and its dreamy
    // ambient blobs) shows through, so the theme owns the surround color.

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Soft shadow + page border make the document read as a sheet of paper.
    ctx.fillStyle = 'rgba(15, 23, 42, 0.10)';
    ctx.fillRect(3, 5, doc.width, doc.height);

    // Onion skin: ghost neighbouring frames beneath the current one. Each
    // ghost renders to a scratch canvas first so globalAlpha applies to the
    // whole frame (renderOperation overwrites alpha per op).
    if (!playing) {
      const skins = onionSkinTargets(doc);
      if (skins.length > 0) {
        let scratch = skinCanvasRef.current;
        if (!scratch) {
          scratch = document.createElement('canvas');
          skinCanvasRef.current = scratch;
        }
        scratch.width = doc.width;
        scratch.height = doc.height;
        const skinCtx = scratch.getContext('2d');
        if (skinCtx) {
          for (const skin of skins) {
            skinCtx.clearRect(0, 0, doc.width, doc.height);
            renderDocument({ ...doc, layers: skin.frame.layers }, skinCtx, { background: false });
            ctx.save();
            ctx.globalAlpha = skin.opacity;
            ctx.drawImage(scratch, 0, 0);
            ctx.restore();
          }
        }
      }
    }

    // While moving or adjusting, the affected layer renders separately.
    const activeLayer = doc.layers.find((l) => l.id === activeLayerId);
    const detached = new Set<string>();
    if (moveDraft) detached.add(activeLayerId);
    if (adjustPreview) detached.add(adjustPreview.layerId);
    if (wandDraft) detached.add(wandDraft.layerId);

    // During a select-transform drag, swap the selected ops for their
    // transformed preview copies (z-order within the layer is preserved).
    let displayDoc = doc;
    if (selectDraft?.preview && activeLayer) {
      const byId = new Map(selectDraft.preview.map((op) => [op.id, op]));
      displayDoc = {
        ...doc,
        layers: doc.layers.map((layer) =>
          layer.id === activeLayerId
            ? { ...layer, operations: layer.operations.map((op) => byId.get(op.id) ?? op) }
            : layer,
        ),
      };
    }

    // Playback swaps the active frame's stack for the frame being shown.
    if (playing && playbackFrame != null && doc.frames) {
      const frame = doc.frames[playbackFrame];
      if (frame) displayDoc = { ...displayDoc, layers: frame.layers };
    }
    renderDocument(displayDoc, ctx, { layerFilter: (layer) => !detached.has(layer.id) });

    if (adjustPreview) {
      const layer = doc.layers.find((l) => l.id === adjustPreview.layerId);
      if (layer?.visible) {
        const scratch = document.createElement('canvas');
        scratch.width = adjustPreview.buffer.width;
        scratch.height = adjustPreview.buffer.height;
        const scratchCtx = scratch.getContext('2d');
        if (scratchCtx) {
          scratchCtx.putImageData(
            new ImageData(
              adjustPreview.buffer.data,
              adjustPreview.buffer.width,
              adjustPreview.buffer.height,
            ),
            0,
            0,
          );
          ctx.save();
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(scratch, 0, 0);
          ctx.restore();
        }
      }
    }

    if (moveDraft && activeLayer?.visible) {
      ctx.save();
      ctx.translate(moveDraft.delta.x, moveDraft.delta.y);
      renderLayer(activeLayer, ctx);
      ctx.restore();
    }

    // Wand floating region: the layer's raster with the region erased, then
    // the lifted patch at its drag offset, boxed in accent dashes.
    if (wandDraft) {
      const wandLayer = doc.layers.find((l) => l.id === wandDraft.layerId);
      if (wandLayer?.visible) {
        blitBuffer(ctx, wandDraft.base, 0, 0, wandLayer.opacity);
        const px = wandDraft.patch.x + wandDraft.offset.x;
        const py = wandDraft.patch.y + wandDraft.offset.y;
        blitBuffer(ctx, wandDraft.patch, px, py, wandLayer.opacity);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([5 / zoom, 4 / zoom]);
        ctx.strokeRect(px, py, wandDraft.patch.width, wandDraft.patch.height);
        ctx.setLineDash([]);
      }
    }

    ctx.strokeStyle = '#c9ced6';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(0, 0, doc.width, doc.height);

    if (previewOp && !playing) {
      // Mirror mode: the in-progress gesture blooms live across the axes.
      const previewOps =
        symmetry === 'off'
          ? [previewOp]
          : mirrorOperations(previewOp, symmetry, { width: doc.width, height: doc.height });
      for (const op of previewOps) {
        renderOperation(op, ctx, { layerOpacity: activeLayer?.opacity ?? 1 });
      }
    }

    // Mirror axes: soft dashed center lines that fade toward the edges.
    if (!playing && !kidMode && symmetry !== 'off' && SYMMETRY_TOOLS.includes(tool)) {
      const px = 1 / zoom;
      const fade = (from: number, to: number, horizontal: boolean) => {
        const g = horizontal
          ? ctx.createLinearGradient(from, 0, to, 0)
          : ctx.createLinearGradient(0, from, 0, to);
        g.addColorStop(0, 'rgba(109, 124, 255, 0)');
        g.addColorStop(0.2, 'rgba(109, 124, 255, 0.85)');
        g.addColorStop(0.8, 'rgba(109, 124, 255, 0.85)');
        g.addColorStop(1, 'rgba(109, 124, 255, 0)');
        return g;
      };
      ctx.save();
      ctx.lineWidth = 1.5 * px;
      ctx.setLineDash([10 * px, 7 * px]);
      ctx.shadowColor = 'rgba(109, 124, 255, 0.5)';
      ctx.shadowBlur = 8 * px;
      if (symmetry === 'vertical' || symmetry === 'quad') {
        ctx.strokeStyle = fade(0, doc.height, false);
        ctx.beginPath();
        ctx.moveTo(doc.width / 2, 0);
        ctx.lineTo(doc.width / 2, doc.height);
        ctx.stroke();
      }
      if (symmetry === 'horizontal' || symmetry === 'quad') {
        ctx.strokeStyle = fade(0, doc.width, true);
        ctx.beginPath();
        ctx.moveTo(0, doc.height / 2);
        ctx.lineTo(doc.width, doc.height / 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Crop selection: dim everything outside the rect, dash the outline.
    if (cropDraft) {
      const rect = normalizeRect(cropDraft.from, cropDraft.to);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, doc.width, rect.y);
      ctx.fillRect(0, rect.y + rect.height, doc.width, doc.height - rect.y - rect.height);
      ctx.fillRect(0, rect.y, rect.x, rect.height);
      ctx.fillRect(rect.x + rect.width, rect.y, doc.width - rect.x - rect.width, rect.height);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.setLineDash([]);
    }

    // --- Design mode: selection chrome -------------------------------------
    if (!playing && mode === 'design' && tool === 'select' && activeLayer) {
      const px = 1 / zoom;

      // Snap guides: thin accent lines spanning the dragged bounds.
      if (selectDraft && selectDraft.guides.length > 0) {
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = px;
        for (const guide of selectDraft.guides) {
          ctx.beginPath();
          if (guide.axis === 'x') {
            ctx.moveTo(guide.position, guide.from);
            ctx.lineTo(guide.position, guide.to);
          } else {
            ctx.moveTo(guide.from, guide.position);
            ctx.lineTo(guide.to, guide.position);
          }
          ctx.stroke();
        }
      }

      if (selectDraft?.kind === 'marquee') {
        const rect = normalizeRect(selectDraft.from, selectDraft.to);
        ctx.fillStyle = 'rgba(109, 124, 255, 0.08)';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = px;
        ctx.setLineDash([4 * px, 4 * px]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]);
      }

      if (selection.length > 0) {
        // Per-op boxes follow the live transform preview while dragging.
        const displayOps = selectDraft?.preview ?? selectedOps(activeLayer, selection);
        const boxes = displayOps.map(selectionBounds);
        ctx.strokeStyle = 'rgba(109, 124, 255, 0.5)';
        ctx.lineWidth = px;
        for (const b of boxes) ctx.strokeRect(b.x, b.y, b.width, b.height);

        const union = unionBounds(boxes);
        if (union) {
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 1.5 * px;
          ctx.strokeRect(union.x, union.y, union.width, union.height);

          // Corner resize handles: soft rounded squares with a gentle lift.
          const hs = 9 * px;
          const hr = 2.5 * px;
          ctx.lineWidth = px;
          for (const p of corners(union)) {
            const hx = p.x - hs / 2;
            const hy = p.y - hs / 2;
            ctx.save();
            ctx.shadowColor = 'rgba(15, 23, 42, 0.28)';
            ctx.shadowBlur = 3 * px;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(hx, hy, hs, hs, hr);
            ctx.fill();
            ctx.restore();
            ctx.beginPath();
            ctx.roundRect(hx, hy, hs, hs, hr);
            ctx.stroke();
          }

          // Rotation handle: a circle floating above the top-center.
          const rx = union.x + union.width / 2;
          const ry = union.y - 22 * px;
          const rr = 5 * px;
          ctx.beginPath();
          ctx.moveTo(rx, union.y);
          ctx.lineTo(rx, ry + rr);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(rx, ry, rr, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Lasso: the in-progress freehand loop (Design mode).
    if (lassoDraft && lassoDraft.length > 1) {
      const px = 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(lassoDraft[0].x, lassoDraft[0].y);
      for (const p of lassoDraft.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(109, 124, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = px;
      ctx.setLineDash([4 * px, 4 * px]);
      ctx.stroke();
      ctx.setLineDash([]);
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

  const doWand = (point: Point) => {
    const state = useDreamStore.getState();
    const layer = state.doc.layers.find((l) => l.id === state.activeLayerId);
    if (!layer || layer.locked) return;
    // Clicking the floating region grabs it instead of re-selecting.
    if (state.beginWandDrag(point)) return;
    const off = document.createElement('canvas');
    off.width = state.doc.width;
    off.height = state.doc.height;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    renderLayer(layer, offCtx);
    const image = offCtx.getImageData(0, 0, off.width, off.height);
    state.applyWandAt(point, { data: image.data, width: off.width, height: off.height });
  };

  const zoomAtClientPoint = (clientX: number, clientY: number, direction: 'in' | 'out') => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const state = useDreamStore.getState();
    const next = direction === 'in' ? nextZoomIn(state.zoom) : nextZoomOut(state.zoom);
    const focal = { x: clientX - rect.left, y: clientY - rect.top };
    state.setViewport({ zoom: next, offset: zoomAtPoint(state.offset, state.zoom, next, focal) });
  };

  /** Fit the whole document in the viewport, centered with a small margin. */
  const fitToWindow = () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const state = useDreamStore.getState();
    const margin = 48;
    const fit = Math.min(
      (wrap.clientWidth - margin) / state.doc.width,
      (wrap.clientHeight - margin) / state.doc.height,
    );
    const zoom = clampZoom(fit);
    state.setViewport({
      zoom,
      offset: {
        x: (wrap.clientWidth - state.doc.width * zoom) / 2,
        y: (wrap.clientHeight - state.doc.height * zoom) / 2,
      },
    });
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
    if (playing) return; // watching, not editing — pause first
    const point = toDocPoint(e.clientX, e.clientY);
    if (tool === 'zoom') {
      zoomAtClientPoint(e.clientX, e.clientY, e.altKey ? 'out' : 'in');
      return;
    }
    if (tool === 'fill') {
      doFill(point);
      return;
    }
    if (tool === 'wand') {
      doWand(point);
      return;
    }
    if (tool === 'eyedropper') {
      doEyedropper(point);
      return;
    }
    // Stylus pressure flows to the stroke tools; mouse/touch stay uniform.
    const pressure = e.pointerType === 'pen' ? e.pressure : undefined;
    useDreamStore.getState().pointerDown(point, { shiftKey: e.shiftKey, pressure });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      const { startX, startY, origin } = panRef.current;
      useDreamStore.getState().setViewport({
        offset: { x: origin.x + e.clientX - startX, y: origin.y + e.clientY - startY },
      });
      return;
    }
    const point = toDocPoint(e.clientX, e.clientY);
    const pressure = e.pointerType === 'pen' ? e.pressure : undefined;
    useDreamStore.getState().pointerMove(point, { shiftKey: e.shiftKey, pressure });
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

  const cursor =
    tool === 'pan' || spacePanning
      ? 'grab'
      : tool === 'text'
        ? 'text'
        : tool === 'move'
          ? 'move'
          : tool === 'select'
            ? 'default'
            : 'crosshair';

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const componentId = e.dataTransfer.getData('application/x-dream-component');
    if (componentId) {
      // Drop a component instance at the drop point (centered on the cursor).
      void (async () => {
        const component = await getComponent(componentId);
        if (!component) return;
        const point = toDocPoint(e.clientX, e.clientY);
        useDreamStore.getState().insertComponentInstance(component, {
          x: point.x - component.width / 2,
          y: point.y - component.height / 2,
        });
      })();
      return;
    }
    void importImageFiles(e.dataTransfer.files);
  };

  return (
    <div className="viewport" ref={wrapRef} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
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
          <div className="hint-card">
            <DreamMark className="hint-mark" />
            <p className="hint-text">{t('hint.firstRun')}</p>
          </div>
        </div>
      )}
      {!kidMode && (
        <div className="zoom-pill">
          <button
            type="button"
            className="zoom-pill-btn"
            aria-label={t('toolbar.zoomOut')}
            data-tooltip={t('toolbar.zoomOut')}
            onClick={() => useDreamStore.getState().zoomOut()}
          >
            −
          </button>
          <button
            type="button"
            className="zoom-pill-value"
            aria-label={t('zoom.fit')}
            data-tooltip={t('zoom.fit')}
            onClick={fitToWindow}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="zoom-pill-btn"
            aria-label={t('toolbar.zoomIn')}
            data-tooltip={t('toolbar.zoomIn')}
            onClick={() => useDreamStore.getState().zoomIn()}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
