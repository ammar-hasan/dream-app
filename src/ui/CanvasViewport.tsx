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

import { useCallback, useEffect, useRef, useState } from 'react';
import { renderDocument, renderLayer, renderOperation } from '../engine/renderer';
import { LayerCache } from '../engine/layerCache';
import { animationSettingsOf, frameIndexAtTime, onionSkinTargets } from '../engine/animation';
import { activeHotspots } from '../engine/hotspots';
import { distance, normalizeRect } from '../engine/geometry';
import {
  hitTestOperations,
  selectedOps,
  selectionBounds,
  selectionUnionBounds,
  unionBounds,
} from '../engine/selection';
import { mirrorOperations, SYMMETRY_TOOLS } from '../engine/symmetry';
import { clampZoom, nextZoomIn, nextZoomOut, pickColor, zoomAtPoint } from '../engine/tools';
import { translateOperation } from '../engine/transform';
import type { RasterSource } from '../engine/tools';
import type { Component, ImageOp, Operation, Point, Rect } from '../engine/types';
import { useDreamStore } from '../store/dreamStore';
import { useUiPrefs } from '../store/uiPrefs';
import { getComponent } from '../storage/components';
import { importImageFiles } from './importImage';
import { playNarration } from './narration';
import { TextOverlay } from './TextOverlay';
import { useT } from './i18n';
import { DreamMark, SelectIcon } from './icons';
import { pulseHaptic } from './haptics';
import { activeComponentDrag, endComponentDrag, onComponentDragEnd } from './componentDrag';

/** Accent used for all selection chrome, matching --accent in app.css. */
const ACCENT = '#6d7cff';
const HANDLE_PX = 10;
const ROTATE_GAP_PX = 22;
const FOOTPRINT_TOOLS = new Set(['brush', 'pencil', 'eraser', 'spray']);

type SelectHover =
  | { kind: 'object'; opId: string }
  | { kind: 'scale'; handle: 'nw' | 'ne' | 'sw' | 'se' }
  | { kind: 'rotate' }
  | { kind: 'locked' }
  | null;
type DropFeedback = 'component' | 'image' | 'invalid' | null;
interface ComponentDropPreview {
  component: Component;
  at: Point;
}

/** A transient image operation used only to compose exact live previews. */
function previewImage(buffer: RasterSource, x: number, y: number, id: string): ImageOp {
  return {
    kind: 'image',
    id,
    color: '#000000',
    opacity: 1,
    scale: 1,
    patch: { x, y, width: buffer.width, height: buffer.height, data: buffer.data },
  };
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
  const [panning, setPanning] = useState(false);
  const [selectHover, setSelectHover] = useState<SelectHover>(null);
  const [zoomingOut, setZoomingOut] = useState(false);
  const [dropFeedback, setDropFeedback] = useState<DropFeedback>(null);
  const [componentDropPreview, setComponentDropPreview] = useState<ComponentDropPreview | null>(
    null,
  );
  const [editInviteIds, setEditInviteIds] = useState<string[] | null>(null);
  const dropFeedbackRef = useRef<DropFeedback>(null);
  const rotationDetentRef = useRef<string | null>(null);
  const snapDetentRef = useRef<string | null>(null);
  const drawStartIdsRef = useRef<Set<string> | null>(null);

  const doc = useDreamStore((s) => s.doc);
  const activeLayerId = useDreamStore((s) => s.activeLayerId);
  const mode = useDreamStore((s) => s.mode);
  const tool = useDreamStore((s) => s.tool);
  const settings = useDreamStore((s) => s.settings);
  const pointerPos = useDreamStore((s) => s.pointerPos);
  const previewOp = useDreamStore((s) => s.previewOp);
  const pendingText = useDreamStore((s) => s.pendingText);
  const moveDraft = useDreamStore((s) => s.moveDraft);
  const cropDraft = useDreamStore((s) => s.cropDraft);
  const adjustPreview = useDreamStore((s) => s.adjustPreview);
  const effectsPreview = useDreamStore((s) => s.effectsPreview);
  const maskEditing = useDreamStore((s) => s.maskEditing);
  const maskMode = useDreamStore((s) => s.maskMode);
  const symmetry = useDreamStore((s) => s.symmetry);
  const wandDraft = useDreamStore((s) => s.wandDraft);
  const wandDrag = useDreamStore((s) => s.wandDrag);
  const lassoDraft = useDreamStore((s) => s.lassoDraft);
  const linkDraft = useDreamStore((s) => s.linkDraft);
  const selection = useDreamStore((s) => s.selection);
  const selectDraft = useDreamStore((s) => s.selectDraft);
  const gridVisible = useDreamStore((s) => s.gridVisible);
  const gridSize = useDreamStore((s) => s.gridSize);
  const zoom = useDreamStore((s) => s.zoom);
  const offset = useDreamStore((s) => s.offset);
  const spacePanning = useDreamStore((s) => s.spacePanning);
  const hintDismissed = useDreamStore((s) => s.hintDismissed);
  const playing = useDreamStore((s) => s.playing);
  const playbackFrame = useDreamStore((s) => s.playbackFrame);
  const kidMode = useUiPrefs((s) => s.kidMode);
  const haptics = useUiPrefs((s) => s.haptics);
  const editHintSeen = useUiPrefs((s) => s.editHintSeen);
  const skinCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Incremental compositor: one bitmap per layer, re-rendered only when the
  // layer's ops change — stroke previews, pan and zoom cost one drawImage
  // per layer instead of the whole document.
  const layerCacheRef = useRef<LayerCache | null>(null);
  const cachedDocIdRef = useRef<string | null>(null);

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

  // Narration sync: the take plays from time 0 alongside the flipbook.
  const narration = useDreamStore((s) => s.doc.narration);
  const narrationMuted = useDreamStore((s) => s.narrationMuted);
  useEffect(() => {
    if (!playing || narrationMuted || !narration) return;
    const playback = playNarration(narration);
    return () => playback.stop();
  }, [playing, narrationMuted, narration]);

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

    const activeLayer = doc.layers.find((l) => l.id === activeLayerId);
    const previewOps =
      previewOp && !maskEditing
        ? symmetry === 'off'
          ? [previewOp]
          : mirrorOperations(previewOp, symmetry, { width: doc.width, height: doc.height })
        : [];

    // Every live document preview stays in its owning layer. That preserves
    // stack order, layer opacity and blend mode throughout the gesture instead
    // of briefly painting the active layer above everything else.
    let displayDoc = doc;
    const replaceDisplayOperations = (layerId: string, operations: Operation[]) => {
      displayDoc = {
        ...displayDoc,
        layers: displayDoc.layers.map((layer) =>
          layer.id === layerId ? { ...layer, operations } : layer,
        ),
      };
    };
    if (selectDraft?.preview && activeLayer) {
      const byId = new Map(selectDraft.preview.map((op) => [op.id, op]));
      replaceDisplayOperations(
        activeLayerId,
        activeLayer.operations.map((op) => byId.get(op.id) ?? op),
      );
    }
    if (moveDraft && activeLayer) {
      replaceDisplayOperations(
        activeLayerId,
        activeLayer.operations.map((op) =>
          translateOperation(op, moveDraft.delta.x, moveDraft.delta.y),
        ),
      );
    }
    if (adjustPreview) {
      displayDoc = {
        ...displayDoc,
        layers: displayDoc.layers.map((layer) =>
          layer.id === adjustPreview.layerId
            ? { ...layer, adjustments: adjustPreview.adjustments }
            : layer,
        ),
      };
    }
    if (effectsPreview) {
      displayDoc = {
        ...displayDoc,
        layers: displayDoc.layers.map((layer) =>
          layer.id === effectsPreview.layerId
            ? { ...layer, effects: effectsPreview.effects }
            : layer,
        ),
      };
    }
    if (maskEditing && previewOp?.kind === 'stroke' && activeLayer?.mask?.enabled) {
      displayDoc = {
        ...displayDoc,
        layers: displayDoc.layers.map((layer) =>
          layer.id === activeLayerId && layer.mask
            ? {
                ...layer,
                mask: {
                  ...layer.mask,
                  strokes: [
                    ...layer.mask.strokes,
                    {
                      id: '__mask-preview',
                      mode: maskMode,
                      points: previewOp.points,
                      size: previewOp.size,
                      opacity: previewOp.opacity,
                      ...(previewOp.widths ? { widths: previewOp.widths } : {}),
                    },
                  ],
                },
              }
            : layer,
        ),
      };
    }
    if (wandDraft) {
      replaceDisplayOperations(wandDraft.layerId, [
        previewImage(wandDraft.base, 0, 0, '__wand-base-preview'),
        previewImage(
          wandDraft.patch,
          wandDraft.patch.x + wandDraft.offset.x,
          wandDraft.patch.y + wandDraft.offset.y,
          '__wand-patch-preview',
        ),
      ]);
    }
    if (previewOps.length > 0 && activeLayer) {
      const displayLayer = displayDoc.layers.find((layer) => layer.id === activeLayerId);
      replaceDisplayOperations(activeLayerId, [
        ...(displayLayer?.operations ?? activeLayer.operations),
        ...previewOps,
      ]);
    }

    // Playback swaps the active frame's stack for the frame being shown.
    if (playing && playbackFrame != null && doc.frames) {
      const frame = doc.frames[playbackFrame];
      if (frame) displayDoc = { ...displayDoc, layers: frame.layers };
    }
    const cache = (layerCacheRef.current ??= new LayerCache());
    if (cachedDocIdRef.current !== doc.id) {
      // Another document was opened: every cached bitmap belongs to the old one.
      cache.clear();
      cachedDocIdRef.current = doc.id;
    }
    cache.render(displayDoc, ctx);

    // Design's workspace grid is guidance only: it sits above artwork while
    // editing, but never enters the document renderer or any export.
    if (!playing && mode === 'design' && gridVisible) {
      ctx.save();
      ctx.strokeStyle = ACCENT;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = gridSize; x < doc.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, doc.height);
      }
      for (let y = gridSize; y < doc.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(doc.width, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Component drags show the exact prospective copy at its eventual origin.
    // The native drag image stays small; this canvas preview carries scale and
    // placement, with translucency keeping the underlying work readable.
    if (componentDropPreview && !playing) {
      const { component, at } = componentDropPreview;
      const px = 1 / zoom;
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.globalAlpha = 0.58;
      for (const op of component.operations) renderOperation(op, ctx);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.5 * px;
      ctx.setLineDash([6 * px, 4 * px]);
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = 6 * px;
      ctx.strokeRect(0, 0, component.width, component.height);
      ctx.restore();
    }

    // The wand pixels are already in displayDoc; only its selection chrome is
    // drawn above the document.
    if (wandDraft) {
      const wandLayer = doc.layers.find((l) => l.id === wandDraft.layerId);
      if (wandLayer?.visible) {
        const px = wandDraft.patch.x + wandDraft.offset.x;
        const py = wandDraft.patch.y + wandDraft.offset.y;
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

      // Before a click, reveal the exact topmost object that Select will grab.
      // This is deliberately lighter than committed selection chrome.
      if (selectHover?.kind === 'object' && !selection.includes(selectHover.opId)) {
        const hovered = activeLayer.operations.find((op) => op.id === selectHover.opId);
        if (hovered) {
          const bounds = selectionBounds(hovered);
          ctx.save();
          ctx.strokeStyle = ACCENT;
          ctx.globalAlpha = 0.82;
          ctx.lineWidth = 1.5 * px;
          ctx.setLineDash([3 * px, 3 * px]);
          ctx.shadowColor = ACCENT;
          ctx.shadowBlur = 5 * px;
          ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
          ctx.restore();
        }
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

    // Link tool (app mode): the active frame's hotspots as soft accent-tinted
    // dashed rects with a tiny link glyph, plus the in-progress drag.
    if (!playing && tool === 'link') {
      const px = 1 / zoom;
      const drawHotspot = (rect: Rect, glyph: boolean) => {
        ctx.fillStyle = 'rgba(109, 124, 255, 0.10)';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = ACCENT;
        ctx.lineWidth = px;
        ctx.setLineDash([4 * px, 4 * px]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.setLineDash([]);
        if (glyph && rect.width > 14 * px && rect.height > 14 * px) {
          // Tiny link glyph in the top-end corner: ring + diagonal chain bar.
          const gx = rect.x + rect.width - 7 * px;
          const gy = rect.y + 7 * px;
          ctx.lineWidth = 1.5 * px;
          ctx.beginPath();
          ctx.arc(gx - 2 * px, gy + 2 * px, 3 * px, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + 3.5 * px, gy - 3.5 * px);
          ctx.stroke();
        }
      };
      for (const hotspot of activeHotspots(doc)) drawHotspot(hotspot.rect, true);
      if (linkDraft) drawHotspot(normalizeRect(linkDraft.from, linkDraft.to), false);
    }

    // Modern paint tools disclose their exact footprint before the mark lands.
    // Two contrast rings stay legible over both light and dark artwork; the
    // tiny center dot keeps very fine brushes locatable without inflating size.
    const showFootprint =
      !playing &&
      pointerPos &&
      (maskEditing || FOOTPRINT_TOOLS.has(tool)) &&
      !activeLayer?.locked &&
      activeLayer?.visible !== false &&
      pointerPos.x >= 0 &&
      pointerPos.y >= 0 &&
      pointerPos.x <= doc.width &&
      pointerPos.y <= doc.height;
    if (showFootprint) {
      const radius = settings.size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pointerPos.x, pointerPos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 2.5 / zoom;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pointerPos.x, pointerPos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(35, 40, 56, 0.9)';
      ctx.lineWidth = 1 / zoom;
      ctx.stroke();
      if (!previewOp) {
        ctx.beginPath();
        ctx.arc(pointerPos.x, pointerPos.y, 1.25 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(35, 40, 56, 0.9)';
        ctx.fill();
      }
      ctx.restore();
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
    renderLayer(layer, offCtx, { projectColors: state.doc.projectColors });
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
    renderLayer(layer, offCtx, { projectColors: state.doc.projectColors });
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

  const dismissEditInvite = () => {
    setEditInviteIds(null);
    useUiPrefs.getState().markEditHintSeen();
  };

  const focusActiveModeTab = () => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.mode-tab.active')?.focus();
    });
  };

  const offerEditForNewOperations = (before: Set<string> | null) => {
    if (!before || useUiPrefs.getState().editHintSeen) return;
    const state = useDreamStore.getState();
    if (state.mode !== 'draw' || useUiPrefs.getState().kidMode) return;
    const layer = state.doc.layers.find((candidate) => candidate.id === state.activeLayerId);
    if (!layer || layer.locked) return;
    const added = layer.operations
      .filter((operation) => !before.has(operation.id))
      .map((operation) => operation.id);
    if (added.length > 0) setEditInviteIds(added);
  };

  const acceptEditInvite = () => {
    const ids = editInviteIds;
    if (!ids) return;
    dismissEditInvite();
    useDreamStore.getState().editOperations(ids);
    focusActiveModeTab();
    if (useDreamStore.getState().selection.some((id) => ids.includes(id))) {
      pulseHaptic('target', haptics);
    }
  };

  useEffect(() => {
    if (mode === 'design' && !editHintSeen) useUiPrefs.getState().markEditHintSeen();
  }, [editHintSeen, mode]);

  useEffect(() => {
    if (!editInviteIds) return;
    const layer = doc.layers.find((candidate) => candidate.id === activeLayerId);
    const present = new Set(layer?.operations.map((operation) => operation.id) ?? []);
    if (mode !== 'draw' || kidMode || editInviteIds.some((id) => !present.has(id))) {
      dismissEditInvite();
    }
  }, [activeLayerId, doc.layers, editInviteIds, kidMode, mode]);

  const updateSelectHover = (point: Point) => {
    if (playing || maskEditing || mode !== 'design' || tool !== 'select') {
      setSelectHover(null);
      return;
    }
    const layer = doc.layers.find((candidate) => candidate.id === activeLayerId);
    let next: SelectHover = null;
    if (layer?.locked) {
      next = { kind: 'locked' };
    } else if (layer) {
      const bounds = selectionUnionBounds(layer.operations, selection);
      const handleSize = HANDLE_PX / zoom;
      if (bounds) {
        const rotate = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y - ROTATE_GAP_PX / zoom,
        };
        if (distance(point, rotate) <= handleSize) {
          next = { kind: 'rotate' };
        } else {
          const handles = [
            ['nw', { x: bounds.x, y: bounds.y }],
            ['ne', { x: bounds.x + bounds.width, y: bounds.y }],
            ['sw', { x: bounds.x, y: bounds.y + bounds.height }],
            ['se', { x: bounds.x + bounds.width, y: bounds.y + bounds.height }],
          ] as const;
          const handle = handles.find(
            ([, candidate]) =>
              Math.abs(point.x - candidate.x) <= handleSize &&
              Math.abs(point.y - candidate.y) <= handleSize,
          )?.[0];
          if (handle) next = { kind: 'scale', handle };
        }
      }
      if (!next) {
        const hit = hitTestOperations(layer.operations, point, 5 / zoom);
        if (hit) next = { kind: 'object', opId: hit.id };
      }
    }
    setSelectHover((current) =>
      current?.kind === next?.kind &&
      (current?.kind !== 'object' || current.opId === (next as { opId: string }).opId) &&
      (current?.kind !== 'scale' ||
        current.handle === (next as { handle: 'nw' | 'ne' | 'sw' | 'se' }).handle)
        ? current
        : next,
    );
  };

  useEffect(() => setSelectHover(null), [activeLayerId, maskEditing, mode, playing, tool]);

  // --- Pointer routing ----------------------------------------------------

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const panning = e.button === 1 || tool === 'pan' || spacePanning;
    if (panning) {
      panRef.current = { startX: e.clientX, startY: e.clientY, origin: { ...offset } };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;
    if (playing) return; // watching, not editing — pause first
    const point = toDocPoint(e.clientX, e.clientY);
    if (editInviteIds) dismissEditInvite();
    const state = useDreamStore.getState();
    const layer = state.doc.layers.find((candidate) => candidate.id === state.activeLayerId);
    drawStartIdsRef.current =
      state.mode === 'draw' && !useUiPrefs.getState().kidMode && !useUiPrefs.getState().editHintSeen
        ? new Set(layer?.operations.map((operation) => operation.id) ?? [])
        : null;
    rotationDetentRef.current = null;
    snapDetentRef.current = null;
    if (tool === 'zoom') {
      zoomAtClientPoint(e.clientX, e.clientY, e.altKey ? 'out' : 'in');
      return;
    }
    if (tool === 'fill') {
      doFill(point);
      offerEditForNewOperations(drawStartIdsRef.current);
      drawStartIdsRef.current = null;
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
    setZoomingOut(tool === 'zoom' && e.altKey);
    if (panRef.current) {
      const { startX, startY, origin } = panRef.current;
      useDreamStore.getState().setViewport({
        offset: { x: origin.x + e.clientX - startX, y: origin.y + e.clientY - startY },
      });
      return;
    }
    const point = toDocPoint(e.clientX, e.clientY);
    updateSelectHover(point);
    const pressure = e.pointerType === 'pen' ? e.pressure : undefined;
    useDreamStore.getState().pointerMove(point, { shiftKey: e.shiftKey, pressure });
    const activeDraft = useDreamStore.getState().selectDraft;
    const snapDetent =
      activeDraft?.kind === 'move' && activeDraft.guides.length > 0
        ? activeDraft.guides
            .map((guide) => `${guide.axis}:${guide.position}`)
            .sort()
            .join('|')
        : null;
    if (snapDetent && snapDetentRef.current !== snapDetent) {
      pulseHaptic('detent', haptics);
    }
    snapDetentRef.current = snapDetent;

    const rotation = activeDraft?.rotation;
    if (rotation && rotation.snap !== 'free') {
      const step = rotation.snap === '15' ? Math.PI / 12 : Math.PI / 2;
      const detent = `${rotation.snap}:${Math.round(rotation.angle / step)}`;
      if (rotationDetentRef.current !== null && rotationDetentRef.current !== detent) {
        pulseHaptic('detent', haptics);
      }
      rotationDetentRef.current = detent;
    } else {
      rotationDetentRef.current = null;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panRef.current) {
      panRef.current = null;
      setPanning(false);
      return;
    }
    const point = toDocPoint(e.clientX, e.clientY);
    const drawStartIds = drawStartIdsRef.current;
    drawStartIdsRef.current = null;
    useDreamStore.getState().pointerUp(point, { shiftKey: e.shiftKey });
    offerEditForNewOperations(drawStartIds);
    rotationDetentRef.current = null;
    snapDetentRef.current = null;
    updateSelectHover(point);
  };

  const clearPointerFeedback = () => {
    setSelectHover(null);
    setZoomingOut(false);
    useDreamStore.getState().setPointerPos(null);
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

  const selectCursor = (() => {
    if (selectDraft?.kind === 'move' || selectDraft?.kind === 'rotate') return 'grabbing';
    if (selectDraft?.kind === 'scale') {
      return selectDraft.handle === 'ne' || selectDraft.handle === 'sw'
        ? 'nesw-resize'
        : 'nwse-resize';
    }
    if (selectDraft?.kind === 'marquee') return 'crosshair';
    if (selectHover?.kind === 'locked') return 'not-allowed';
    if (selectHover?.kind === 'rotate') return 'var(--cursor-rotate)';
    if (selectHover?.kind === 'object') return 'grab';
    if (selectHover?.kind === 'scale') {
      return selectHover.handle === 'ne' || selectHover.handle === 'sw'
        ? 'nesw-resize'
        : 'nwse-resize';
    }
    return 'default';
  })();
  const pointerLayer = doc.layers.find((layer) => layer.id === activeLayerId);
  const pointerLayerEditable = !!pointerLayer && !pointerLayer.locked && pointerLayer.visible;
  const footprintCursor =
    pointerPos &&
    (maskEditing || FOOTPRINT_TOOLS.has(tool)) &&
    pointerLayerEditable &&
    pointerPos.x >= 0 &&
    pointerPos.y >= 0 &&
    pointerPos.x <= doc.width &&
    pointerPos.y <= doc.height;
  const cursor = playing
    ? 'default'
    : panning
      ? 'grabbing'
      : footprintCursor
        ? 'none'
        : maskEditing
          ? 'crosshair'
          : tool === 'pan' || spacePanning
            ? 'grab'
            : tool === 'text'
              ? 'text'
              : tool === 'move'
                ? moveDraft
                  ? 'grabbing'
                  : 'grab'
                : tool === 'wand' && wandDrag
                  ? 'grabbing'
                  : tool === 'select'
                    ? selectCursor
                    : tool === 'zoom'
                      ? zoomingOut
                        ? 'zoom-out'
                        : 'zoom-in'
                      : tool === 'fill'
                        ? 'cell'
                        : tool === 'stamp'
                          ? 'copy'
                          : 'crosshair';

  const dropKind = (transfer: DataTransfer): DropFeedback => {
    if (transfer.types.includes('application/x-dream-component')) return 'component';
    const files = [...transfer.items].filter((item) => item.kind === 'file');
    if (files.some((item) => item.type.startsWith('image/'))) return 'image';
    if ([...transfer.files].some((file) => file.type.startsWith('image/'))) return 'image';
    return 'invalid';
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const kind = dropKind(e.dataTransfer);
    e.dataTransfer.dropEffect = kind === 'invalid' ? 'none' : 'copy';
    if (dropFeedbackRef.current !== kind) {
      dropFeedbackRef.current = kind;
      setDropFeedback(kind);
      pulseHaptic(kind === 'invalid' ? 'refusal' : 'target', haptics);
    }
    const dragged = kind === 'component' ? activeComponentDrag() : null;
    if (dragged) {
      const point = toDocPoint(e.clientX, e.clientY);
      setComponentDropPreview({
        component: dragged,
        at: { x: point.x - dragged.width / 2, y: point.y - dragged.height / 2 },
      });
    } else if (componentDropPreview) setComponentDropPreview(null);
  };

  const clearDropFeedback = () => {
    dropFeedbackRef.current = null;
    setDropFeedback(null);
    setComponentDropPreview(null);
  };

  useEffect(
    () =>
      onComponentDragEnd(() => {
        dropFeedbackRef.current = null;
        setDropFeedback(null);
        setComponentDropPreview(null);
      }),
    [],
  );

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const kind = dropKind(e.dataTransfer);
    const draggedComponent = activeComponentDrag();
    clearDropFeedback();
    endComponentDrag();
    if (kind === 'invalid') return;
    const componentId = e.dataTransfer.getData('application/x-dream-component');
    if (componentId) {
      // Drop a component instance at the drop point (centered on the cursor).
      void (async () => {
        const component =
          draggedComponent?.id === componentId ? draggedComponent : await getComponent(componentId);
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

  const dropMessage = componentDropPreview
    ? t('drop.componentNamed', { name: componentDropPreview.component.name })
    : dropFeedback
      ? t(`drop.${dropFeedback}`)
      : null;
  const rotationFeedback =
    selectDraft?.kind === 'rotate' && selectDraft.rotation
      ? {
          text: t(`rotation.${selectDraft.rotation.snap}`, {
            angle: String(Math.round((selectDraft.rotation.angle * 180) / Math.PI) || 0),
          }),
          left: offset.x + selectDraft.to.x * zoom + 14,
          top: offset.y + selectDraft.to.y * zoom + 14,
        }
      : null;
  const snapFeedback =
    selectDraft?.kind === 'move' && selectDraft.guides.length > 0
      ? {
          text: selectDraft.guides.some((guide) => guide.source === 'grid')
            ? t('design.snappedGrid', { size: gridSize })
            : t('design.snapped'),
          left: offset.x + selectDraft.to.x * zoom + 14,
          top: offset.y + selectDraft.to.y * zoom + 14,
        }
      : null;

  return (
    <div
      className="viewport"
      ref={wrapRef}
      data-drop-state={dropFeedback ?? undefined}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) clearDropFeedback();
      }}
      onDrop={onDrop}
    >
      <canvas
        ref={canvasRef}
        className="viewport-canvas"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => {
          if (useDreamStore.getState().penDraft) useDreamStore.getState().finishPen(false);
        }}
        onPointerLeave={clearPointerFeedback}
        onPointerCancel={() => {
          panRef.current = null;
          drawStartIdsRef.current = null;
          rotationDetentRef.current = null;
          snapDetentRef.current = null;
          setPanning(false);
          clearPointerFeedback();
        }}
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
      {editInviteIds && !editHintSeen && (
        <aside className="edit-invite" aria-label={t('hint.editQuestion')}>
          <SelectIcon aria-hidden="true" />
          <p role="status">{t('hint.editQuestion')}</p>
          <button type="button" className="btn primary" onClick={acceptEditInvite}>
            {t('hint.editAction')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              dismissEditInvite();
              focusActiveModeTab();
            }}
          >
            {t('common.close')}
          </button>
        </aside>
      )}
      {dropMessage && (
        <div className="drop-feedback" role="status">
          {dropMessage}
        </div>
      )}
      {rotationFeedback && (
        <div
          className="rotation-feedback"
          role="status"
          aria-live="off"
          style={{ left: rotationFeedback.left, top: rotationFeedback.top }}
        >
          {rotationFeedback.text}
        </div>
      )}
      {snapFeedback && (
        <div
          className="snap-feedback"
          role="status"
          aria-live="off"
          style={{ left: snapFeedback.left, top: snapFeedback.top }}
        >
          {snapFeedback.text}
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
