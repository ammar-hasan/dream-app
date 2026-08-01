/**
 * Central application store (Zustand).
 *
 * The store is a thin reactive wrapper around the framework-free engine:
 * tool state machines produce operations, every mutation goes through the
 * History stack as an invertible command, and React subscribes to the result.
 */

import { create } from 'zustand';
import { createDocument, createLayer, genId } from '../engine/document';
import {
  activeFrameIndex,
  animationSettingsOf,
  blankFrame,
  cloneFrame,
  isAnimated,
  presentationFrames,
  MAX_FPS,
  MIN_FPS,
} from '../engine/animation';
import {
  addFrameCommand,
  addLayerCommand,
  addOperationCommand,
  cropDocumentCommand,
  duplicateFrameCommand,
  History,
  moveFrameCommand,
  moveLayerCommand,
  removeFrameCommand,
  removeLayerCommand,
  replaceLayerContentCommand,
  resizeDocumentCommand,
  setAnimationEnabledCommand,
  transformLayerCommand,
  translateLayerCommand,
  updateLayerCommand,
} from '../engine/history';
import type { PixelBuffer } from '../engine/filters';
import { distance, normalizeRect } from '../engine/geometry';
import {
  alignOps,
  angleBetween,
  bringForward,
  computeSnap,
  createComponentFromOps,
  deleteOps,
  distributeOps,
  duplicateOps,
  expandSelectionWithGroups,
  groupOps,
  hitTestOperations,
  instantiateComponent,
  marqueeSelect,
  rotateOperation,
  rotateOperation90,
  scaleOperationAbout,
  selectedOps,
  selectionUnionBounds,
  sendBackward,
  snapTargets,
  supportsFreeRotation,
  ungroupOps,
  type AlignMode,
  type SnapGuide,
} from '../engine/selection';
import { translateOperation, type FlipDirection, type RotateDirection } from '../engine/transform';
import {
  createFillOperation,
  createTextOperation,
  DRAWING_TOOLS,
  nextZoomIn,
  nextZoomOut,
  panBy as panOffset,
  clampZoom,
  type DrawingTool,
  type RasterSource,
} from '../engine/tools';
import { DEFAULT_SETTINGS } from '../engine/tools/types';
import type {
  AnimationSettings,
  Color,
  Component,
  DreamDocument,
  ImageOp,
  Operation,
  Point,
  Rect,
  ToolId,
  ToolSettings,
  WorkspaceMode,
} from '../engine/types';

const HISTORY_LIMIT = 200;
const HINT_STORAGE_KEY = 'dream:hint-dismissed';
/** Selection handle size / rotate-handle offset, in screen pixels. */
const HANDLE_PX = 10;
const ROTATE_GAP_PX = 22;

export interface DraftState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: DrawingTool<any>;
  state: unknown;
}

/** In-progress move-tool drag on the active layer. */
export interface MoveDraft {
  origin: Point;
  delta: Point;
}

/** In-progress crop selection (two doc-space corners). */
export interface CropDraft {
  from: Point;
  to: Point;
  /** True while the pointer is still down; a placed selection keeps `to` fixed. */
  dragging: boolean;
}

/** Live filter preview that replaces a layer's rendering while adjusting. */
export interface AdjustPreview {
  layerId: string;
  buffer: PixelBuffer;
}

export type CornerHandle = 'nw' | 'ne' | 'sw' | 'se';

/** In-progress Select-tool gesture (Design mode). */
export interface SelectDraft {
  kind: 'marquee' | 'move' | 'scale' | 'rotate';
  /** Pointer-down point (document space). */
  from: Point;
  /** Latest pointer point (document space). */
  to: Point;
  /** Corner being dragged, for scale. */
  handle?: CornerHandle;
  /** Union bounds of the selection when the drag started. */
  bounds: Rect;
  /** Snap guides to render while moving. */
  guides: SnapGuide[];
  /** Transformed copies of the selected ops (move/scale/rotate preview). */
  preview: Operation[] | null;
  /** True once the pointer moved enough to make the gesture commitable. */
  changed: boolean;
}

export interface NewDocumentOptions {
  width: number;
  height: number;
  name?: string;
  background?: Color;
}

export interface DreamStore {
  doc: DreamDocument;
  activeLayerId: string;
  mode: WorkspaceMode;
  tool: ToolId;
  settings: ToolSettings;
  draft: DraftState | null;
  previewOp: Operation | null;
  /** Document-space anchor for the in-progress text input, if any. */
  pendingText: Point | null;
  moveDraft: MoveDraft | null;
  cropDraft: CropDraft | null;
  adjustPreview: AdjustPreview | null;
  /** Design mode: ids of the selected ops on the active layer. */
  selection: string[];
  selectDraft: SelectDraft | null;
  snappingEnabled: boolean;
  zoom: number;
  /** Screen-space translation of the document origin. */
  offset: Point;
  spacePanning: boolean;
  /** Document-space pointer position for the status bar. */
  pointerPos: Point | null;
  hintDismissed: boolean;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** True while the animation is playing in the viewport (editing paused). */
  playing: boolean;
  /** Frame index currently shown by playback; null when not playing. */
  playbackFrame: number | null;
  /** Slide index while in Present mode. */
  presentIndex: number;
  /** Workspace to return to when leaving Present mode. */
  lastEditMode: 'draw' | 'design';

  setTool(tool: ToolId): void;
  /** Switch workspace mode; persisted with the document (not undoable). */
  setMode(mode: WorkspaceMode): void;
  setColor(color: Color): void;
  setSize(size: number): void;
  setOpacity(opacity: number): void;
  setFontSize(fontSize: number): void;
  setFontFamily(fontFamily: string): void;

  newDocument(options: NewDocumentOptions): void;
  loadDocument(doc: DreamDocument): void;

  pointerDown(point: Point, event?: { shiftKey?: boolean }): void;
  pointerMove(point: Point, event?: { shiftKey?: boolean }): void;
  pointerUp(point: Point, event?: { shiftKey?: boolean }): void;
  /** Commit a flood fill; the viewport supplies the active layer's raster. */
  applyFillAt(point: Point, raster: RasterSource): void;
  /** Commit the text typed at `pendingText`. */
  commitText(text: string): void;
  cancelText(): void;

  selectLayer(id: string): void;
  addLayer(): void;
  deleteLayer(id: string): void;
  renameLayer(id: string, name: string): void;
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerLocked(id: string, locked: boolean): void;
  moveLayer(id: string, toIndex: number): void;

  /** Place a decoded image as a new layer, centered (scaled down to fit). */
  importImage(buffer: PixelBuffer, name?: string): void;
  /** Show (or clear) the live filter preview for a layer. */
  setAdjustPreview(preview: AdjustPreview | null): void;
  /** Bake the previewed raster into the layer as an undoable command. */
  applyLayerRaster(buffer: PixelBuffer): void;
  flipLayer(direction: FlipDirection): void;
  rotateLayer(direction: RotateDirection): void;
  /** Commit the current cropDraft as a document crop. */
  applyCrop(): void;
  cancelCrop(): void;
  resizeDocument(width: number, height: number): void;

  undo(): void;
  redo(): void;

  // --- Animation: frames, playback, onion skin ------------------------------
  /** Turn animation on (layers become frame 1) or off (keeps active frame). */
  toggleAnimation(): void;
  /** Switch the active frame — navigation, intentionally NOT undoable. */
  selectFrame(id: string): void;
  addFrame(): void;
  duplicateFrame(): void;
  deleteFrame(id: string): void;
  moveFrame(id: string, toIndex: number): void;
  /** Playback/onion-skin preferences (fps, loop, onion…); not undoable. */
  setAnimation(patch: Partial<AnimationSettings>): void;
  play(): void;
  pause(): void;
  togglePlay(): void;
  /** Driver hook: show frame `index` while playing. */
  setPlaybackFrame(index: number): void;

  // --- Present mode ----------------------------------------------------------
  presentNext(): void;
  presentPrev(): void;

  // --- Design mode: selection ---------------------------------------------
  setSelection(ids: string[]): void;
  clearSelection(): void;
  setSnapping(enabled: boolean): void;
  /** Arrow-key nudge; one undoable command per call. */
  nudgeSelection(dx: number, dy: number): void;
  deleteSelection(): void;
  /** Duplicate with a small offset; the clones become the selection. */
  duplicateSelection(): void;
  groupSelection(): void;
  ungroupSelection(): void;
  bringForwardSelection(): void;
  sendBackwardSelection(): void;
  alignSelection(mode: AlignMode): void;
  distributeSelection(axis: 'horizontal' | 'vertical'): void;
  /** Build a library component from the current selection (null when empty). */
  createComponentFromSelection(name: string): Component | null;
  /** Insert a component as a new layer (centered unless `at` is given). */
  insertComponentInstance(component: Component, at?: Point): void;

  zoomIn(): void;
  zoomOut(): void;
  /** Set zoom (and optionally offset, e.g. from zoomAtPoint) directly. */
  setViewport(view: { zoom?: number; offset?: Point }): void;
  panBy(dx: number, dy: number): void;
  setSpacePanning(active: boolean): void;
  setPointerPos(point: Point | null): void;

  dismissHint(): void;
  markSaved(): void;
}

/** One History per app session; reset whenever a document is replaced. */
const history = new History(HISTORY_LIMIT);

function readHintDismissed(): boolean {
  try {
    return globalThis.localStorage?.getItem(HINT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const initialDoc = createDocument({ width: 1024, height: 768 });

export const useDreamStore = create<DreamStore>()((set, get) => {
  /** Run a document mutation through history and publish the result. */
  const execute = (command: Parameters<History['execute']>[1]) => {
    const next = history.execute(get().doc, command);
    set({ doc: next, isDirty: true, canUndo: history.canUndo, canRedo: history.canRedo });
  };

  const activeLayer = () => get().doc.layers.find((l) => l.id === get().activeLayerId);

  /** After undo/redo the active layer may be gone; fall back to the top layer. */
  const reconcileActiveLayer = (doc: DreamDocument, activeLayerId: string) =>
    doc.layers.some((l) => l.id === activeLayerId)
      ? activeLayerId
      : (doc.layers[doc.layers.length - 1]?.id ?? '');

  /** Keep only selection ids that still exist on the active layer. */
  const reconcileSelection = (doc: DreamDocument, activeLayerId: string, selection: string[]) => {
    const layer = doc.layers.find((l) => l.id === activeLayerId);
    if (!layer) return [];
    const present = new Set(layer.operations.map((op) => op.id));
    return selection.filter((id) => present.has(id));
  };

  /** Run fn over the active layer's ops as one undoable command. */
  const mutateSelection = (label: string, fn: (ops: Operation[], ids: string[]) => Operation[]) => {
    const layer = activeLayer();
    const { doc, selection } = get();
    if (!layer || layer.locked || selection.length === 0) return;
    execute(replaceLayerContentCommand(doc, layer.id, fn(layer.operations, selection), label));
  };

  const rotateHandlePos = (bounds: Rect): Point => ({
    x: bounds.x + bounds.width / 2,
    y: bounds.y - ROTATE_GAP_PX / get().zoom,
  });

  const cornerHandlePoints = (bounds: Rect): [CornerHandle, Point][] => [
    ['nw', { x: bounds.x, y: bounds.y }],
    ['ne', { x: bounds.x + bounds.width, y: bounds.y }],
    ['sw', { x: bounds.x, y: bounds.y + bounds.height }],
    ['se', { x: bounds.x + bounds.width, y: bounds.y + bounds.height }],
  ];

  return {
    doc: initialDoc,
    activeLayerId: initialDoc.layers[0].id,
    mode: initialDoc.mode ?? 'draw',
    tool: 'brush',
    settings: { ...DEFAULT_SETTINGS },
    draft: null,
    previewOp: null,
    pendingText: null,
    moveDraft: null,
    cropDraft: null,
    adjustPreview: null,
    selection: [],
    selectDraft: null,
    snappingEnabled: true,
    zoom: 1,
    offset: { x: 0, y: 0 },
    spacePanning: false,
    pointerPos: null,
    hintDismissed: readHintDismissed(),
    isDirty: false,
    canUndo: false,
    canRedo: false,
    playing: false,
    playbackFrame: null,
    presentIndex: 0,
    lastEditMode: 'draw',

    setTool: (tool) =>
      set({
        tool,
        draft: null,
        previewOp: null,
        pendingText: null,
        moveDraft: null,
        cropDraft: null,
        adjustPreview: null,
        selection: [],
        selectDraft: null,
      }),

    setMode: (mode) =>
      set((s) => ({
        mode,
        // Persisted with the document but intentionally NOT undoable:
        // flipping your workspace on an undo would be jarring.
        doc: { ...s.doc, mode },
        isDirty: true,
        // Enter the mode with its natural tool; never leave the select
        // tool active in Draw mode, where it is hidden.
        tool: mode === 'design' ? 'select' : s.tool === 'select' ? 'brush' : s.tool,
        // Remember where to return when a presentation ends; start the deck
        // on the active frame and stop any playback.
        lastEditMode: mode === 'present' ? s.lastEditMode : mode,
        presentIndex: mode === 'present' ? Math.max(0, activeFrameIndex(s.doc)) : s.presentIndex,
        playing: false,
        playbackFrame: null,
        selection: [],
        selectDraft: null,
        draft: null,
        previewOp: null,
        pendingText: null,
        moveDraft: null,
        cropDraft: null,
        adjustPreview: null,
      })),
    setColor: (color) => set((s) => ({ settings: { ...s.settings, color } })),
    setSize: (size) => set((s) => ({ settings: { ...s.settings, size } })),
    setOpacity: (opacity) =>
      set((s) => ({ settings: { ...s.settings, opacity: Math.min(1, Math.max(0, opacity)) } })),
    setFontSize: (fontSize) => set((s) => ({ settings: { ...s.settings, fontSize } })),
    setFontFamily: (fontFamily) => set((s) => ({ settings: { ...s.settings, fontFamily } })),

    newDocument: (options) => {
      const doc = createDocument(options);
      history.clear();
      set({
        doc,
        activeLayerId: doc.layers[0].id,
        mode: doc.mode ?? 'draw',
        tool: 'brush',
        draft: null,
        previewOp: null,
        pendingText: null,
        moveDraft: null,
        cropDraft: null,
        adjustPreview: null,
        selection: [],
        selectDraft: null,
        zoom: 1,
        offset: { x: 0, y: 0 },
        isDirty: false,
        canUndo: false,
        canRedo: false,
        playing: false,
        playbackFrame: null,
        presentIndex: 0,
        lastEditMode: 'draw',
      });
    },

    loadDocument: (doc) => {
      history.clear();
      // Saves from before slice 3 have no mode; 'present' is session-only,
      // so a project saved mid-presentation reopens in Draw.
      const mode = doc.mode === 'present' ? 'draw' : (doc.mode ?? 'draw');
      set((s) => ({
        doc: { ...doc, mode },
        activeLayerId: doc.layers[doc.layers.length - 1]?.id ?? '',
        mode,
        tool: mode === 'draw' && s.tool === 'select' ? 'brush' : s.tool,
        draft: null,
        previewOp: null,
        pendingText: null,
        moveDraft: null,
        cropDraft: null,
        adjustPreview: null,
        selection: [],
        selectDraft: null,
        zoom: 1,
        offset: { x: 0, y: 0 },
        isDirty: false,
        canUndo: false,
        canRedo: false,
        playing: false,
        playbackFrame: null,
        presentIndex: 0,
        lastEditMode: 'draw',
      }));
    },

    pointerDown: (point, event = {}) => {
      const { tool, settings } = get();
      if (get().playing) return; // watching, not editing — pause first
      if (tool === 'select') {
        const layer = activeLayer();
        if (!layer || layer.locked) {
          set({ selection: [], selectDraft: null });
          return;
        }
        const zoom = get().zoom;
        const handleSize = HANDLE_PX / zoom;
        const shift = !!event.shiftKey;
        const { selection } = get();
        const bounds = selectionUnionBounds(layer.operations, selection);

        // Handles win over content when the selection box is under the cursor.
        if (bounds) {
          if (distance(point, rotateHandlePos(bounds)) <= handleSize) {
            set({
              selectDraft: {
                kind: 'rotate',
                from: point,
                to: point,
                bounds,
                guides: [],
                preview: null,
                changed: false,
              },
            });
            return;
          }
          for (const [handle, p] of cornerHandlePoints(bounds)) {
            if (Math.abs(point.x - p.x) <= handleSize && Math.abs(point.y - p.y) <= handleSize) {
              set({
                selectDraft: {
                  kind: 'scale',
                  from: point,
                  to: point,
                  handle,
                  bounds,
                  guides: [],
                  preview: null,
                  changed: false,
                },
              });
              return;
            }
          }
        }

        const hit = hitTestOperations(layer.operations, point, 5 / zoom);
        if (hit) {
          const hitIds = expandSelectionWithGroups(layer.operations, [hit.id]);
          let next: string[];
          if (shift) {
            const allIn = hitIds.every((id) => selection.includes(id));
            next = allIn
              ? selection.filter((id) => !hitIds.includes(id))
              : [...selection, ...hitIds.filter((id) => !selection.includes(id))];
          } else {
            // Clicking an already-selected op keeps a multi-selection intact
            // so it can be dragged as a whole.
            next = hitIds.every((id) => selection.includes(id)) ? selection : hitIds;
          }
          const nextBounds = selectionUnionBounds(layer.operations, next);
          set({
            selection: next,
            selectDraft:
              next.length > 0 && nextBounds
                ? {
                    kind: 'move',
                    from: point,
                    to: point,
                    bounds: nextBounds,
                    guides: [],
                    preview: null,
                    changed: false,
                  }
                : null,
          });
          return;
        }

        if (!shift) set({ selection: [] });
        set({
          selectDraft: {
            kind: 'marquee',
            from: point,
            to: point,
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            guides: [],
            preview: null,
            changed: false,
          },
        });
        return;
      }
      if (tool === 'text') {
        set({ pendingText: point });
        return;
      }
      if (tool === 'move') {
        const layer = activeLayer();
        if (!layer || layer.locked) return;
        set({ moveDraft: { origin: point, delta: { x: 0, y: 0 } } });
        return;
      }
      if (tool === 'crop') {
        set({ cropDraft: { from: point, to: point, dragging: true } });
        return;
      }
      const machine = DRAWING_TOOLS[tool];
      if (!machine) return;
      const layer = activeLayer();
      if (!layer || layer.locked) return;
      const state = machine.begin({ point, shiftKey: !!event.shiftKey }, settings);
      set({ draft: { tool: machine, state }, previewOp: machine.preview(state, settings) });
    },

    pointerMove: (point, event = {}) => {
      set({ pointerPos: point });
      const { draft, settings, moveDraft, cropDraft, selectDraft } = get();
      if (selectDraft) {
        const layer = activeLayer();
        if (!layer) return;
        const { doc, selection, zoom, snappingEnabled } = get();
        const shift = !!event.shiftKey;
        const changed = selectDraft.changed || distance(point, selectDraft.from) * zoom > 2;
        const next: SelectDraft = { ...selectDraft, to: point, changed };

        if (selectDraft.kind === 'move') {
          let dx = point.x - selectDraft.from.x;
          let dy = point.y - selectDraft.from.y;
          let guides: SnapGuide[] = [];
          if (snappingEnabled) {
            const moved = {
              ...selectDraft.bounds,
              x: selectDraft.bounds.x + dx,
              y: selectDraft.bounds.y + dy,
            };
            const snap = computeSnap(
              moved,
              snapTargets(layer.operations, selection),
              { width: doc.width, height: doc.height },
              6 / zoom,
            );
            dx += snap.dx;
            dy += snap.dy;
            guides = snap.guides;
          }
          next.guides = guides;
          next.preview = selectedOps(layer, selection).map((op) => translateOperation(op, dx, dy));
        } else if (selectDraft.kind === 'scale') {
          // Uniform scale about the corner opposite the dragged one.
          const opposite: Record<CornerHandle, CornerHandle> = {
            nw: 'se',
            ne: 'sw',
            sw: 'ne',
            se: 'nw',
          };
          const anchor = cornerHandlePoints(selectDraft.bounds).find(
            ([h]) => h === opposite[selectDraft.handle ?? 'se'],
          )?.[1];
          if (!anchor) return;
          const start = distance(selectDraft.from, anchor);
          const factor = start < 1e-6 ? 1 : distance(point, anchor) / start;
          next.preview = selectedOps(layer, selection).map((op) =>
            scaleOperationAbout(op, anchor, factor),
          );
        } else if (selectDraft.kind === 'rotate') {
          const center = {
            x: selectDraft.bounds.x + selectDraft.bounds.width / 2,
            y: selectDraft.bounds.y + selectDraft.bounds.height / 2,
          };
          const ops = selectedOps(layer, selection);
          const angle = angleBetween(center, selectDraft.from, point);
          if (ops.every(supportsFreeRotation)) {
            // Shift snaps free rotation to 15° steps.
            const snapped = shift ? Math.round(angle / (Math.PI / 12)) * (Math.PI / 12) : angle;
            next.preview = ops.map((op) => rotateOperation(op, center, snapped));
          } else {
            // Rectangle/ellipse shapes and raster ops only support 90° steps.
            const turns = Math.round(angle / (Math.PI / 2));
            next.preview = ops.map((op) => rotateOperation90(op, center, turns));
          }
        }
        set({ selectDraft: next });
        return;
      }
      if (moveDraft) {
        set({
          moveDraft: {
            ...moveDraft,
            delta: { x: point.x - moveDraft.origin.x, y: point.y - moveDraft.origin.y },
          },
        });
        return;
      }
      if (cropDraft) {
        if (cropDraft.dragging) set({ cropDraft: { ...cropDraft, to: point } });
        return;
      }
      if (!draft) return;
      draft.tool.update(draft.state, { point, shiftKey: !!event.shiftKey }, settings);
      set({ previewOp: draft.tool.preview(draft.state, settings) });
    },

    pointerUp: (point, event = {}) => {
      const { draft, settings, moveDraft, cropDraft, selectDraft } = get();
      if (selectDraft) {
        const layer = activeLayer();
        set({ selectDraft: null });
        if (!layer) return;
        if (selectDraft.kind === 'marquee') {
          const rect = normalizeRect(selectDraft.from, point);
          const ids =
            rect.width < 1 && rect.height < 1
              ? []
              : expandSelectionWithGroups(
                  layer.operations,
                  marqueeSelect(layer.operations, rect).map((op) => op.id),
                );
          set((s) => ({
            selection: event.shiftKey
              ? [...s.selection, ...ids.filter((id) => !s.selection.includes(id))]
              : ids,
          }));
          return;
        }
        if (selectDraft.changed && selectDraft.preview) {
          const labels = {
            move: 'Move selection',
            scale: 'Scale selection',
            rotate: 'Rotate selection',
          } as const;
          const byId = new Map(selectDraft.preview.map((op) => [op.id, op]));
          const operations = layer.operations.map((op) => byId.get(op.id) ?? op);
          execute(
            replaceLayerContentCommand(get().doc, layer.id, operations, labels[selectDraft.kind]),
          );
        }
        return;
      }
      if (moveDraft) {
        const dx = Math.round(point.x - moveDraft.origin.x);
        const dy = Math.round(point.y - moveDraft.origin.y);
        set({ moveDraft: null });
        if (dx !== 0 || dy !== 0) {
          execute(translateLayerCommand(get().activeLayerId, dx, dy));
        }
        return;
      }
      if (cropDraft) {
        // Keep the selection on screen; Apply crop (button/Enter) commits it.
        const rect = normalizeRect(cropDraft.from, point);
        set({
          cropDraft:
            rect.width >= 1 && rect.height >= 1
              ? { from: cropDraft.from, to: point, dragging: false }
              : null,
        });
        return;
      }
      if (!draft) return;
      draft.tool.update(draft.state, { point, shiftKey: !!event.shiftKey }, settings);
      const op = draft.tool.commit(draft.state, settings);
      set({ draft: null, previewOp: null });
      if (op) {
        execute(addOperationCommand(get().activeLayerId, op));
        get().dismissHint();
      }
    },

    applyFillAt: (point, raster) => {
      const layer = activeLayer();
      if (!layer || layer.locked) return;
      const op = createFillOperation(point, get().settings, raster);
      if (op) {
        execute(addOperationCommand(layer.id, op));
        get().dismissHint();
      }
    },

    commitText: (text) => {
      const { pendingText, settings } = get();
      set({ pendingText: null });
      if (!pendingText) return;
      const layer = activeLayer();
      if (!layer || layer.locked) return;
      const op = createTextOperation(pendingText, text, settings);
      if (op) {
        execute(addOperationCommand(layer.id, op));
        get().dismissHint();
      }
    },

    cancelText: () => set({ pendingText: null }),

    selectLayer: (id) => {
      if (get().doc.layers.some((l) => l.id === id))
        set({ activeLayerId: id, selection: [], selectDraft: null });
    },

    addLayer: () => {
      const layer = createLayer(`Layer ${get().doc.layers.length + 1}`);
      execute(addLayerCommand(layer));
      set({ activeLayerId: layer.id });
    },

    deleteLayer: (id) => {
      const { doc } = get();
      if (doc.layers.length <= 1) return; // a document always keeps one layer
      execute(removeLayerCommand(doc, id));
      set((s) => {
        const activeLayerId = reconcileActiveLayer(get().doc, s.activeLayerId);
        return {
          activeLayerId,
          selection: reconcileSelection(get().doc, activeLayerId, s.selection),
          selectDraft: null,
        };
      });
    },

    renameLayer: (id, name) => {
      const trimmed = name.trim();
      if (trimmed === '') return;
      execute(updateLayerCommand(get().doc, id, { name: trimmed }, 'Rename layer'));
    },

    setLayerVisibility: (id, visible) =>
      execute(updateLayerCommand(get().doc, id, { visible }, 'Toggle layer')),

    setLayerOpacity: (id, opacity) =>
      execute(
        updateLayerCommand(
          get().doc,
          id,
          { opacity: Math.min(1, Math.max(0, opacity)) },
          'Layer opacity',
        ),
      ),

    setLayerLocked: (id, locked) =>
      execute(updateLayerCommand(get().doc, id, { locked }, 'Toggle layer lock')),

    moveLayer: (id, toIndex) => {
      const { doc } = get();
      const clamped = Math.max(0, Math.min(toIndex, doc.layers.length - 1));
      if (doc.layers.findIndex((l) => l.id === id) === clamped) return;
      execute(moveLayerCommand(doc, id, clamped));
    },

    importImage: (buffer, name) => {
      const { doc } = get();
      if (buffer.width < 1 || buffer.height < 1) return;
      const scale = Math.min(1, doc.width / buffer.width, doc.height / buffer.height);
      const op: ImageOp = {
        kind: 'image',
        id: genId('op'),
        color: '#000000', // unused by image ops; required by the op base
        opacity: 1,
        scale,
        patch: {
          x: Math.round((doc.width - buffer.width * scale) / 2),
          y: Math.round((doc.height - buffer.height * scale) / 2),
          width: buffer.width,
          height: buffer.height,
          data: buffer.data,
        },
      };
      const layer = createLayer(name?.trim() || `Image ${doc.layers.length + 1}`, [op]);
      execute(addLayerCommand(layer));
      set({ activeLayerId: layer.id, adjustPreview: null });
      get().dismissHint();
    },

    setAdjustPreview: (preview) => set({ adjustPreview: preview }),

    applyLayerRaster: (buffer) => {
      const layer = activeLayer();
      if (!layer || layer.locked) return;
      const op: ImageOp = {
        kind: 'image',
        id: genId('op'),
        color: '#000000',
        opacity: 1,
        scale: 1,
        patch: { x: 0, y: 0, width: buffer.width, height: buffer.height, data: buffer.data },
      };
      execute(replaceLayerContentCommand(get().doc, layer.id, [op], 'Apply filter'));
      set({ adjustPreview: null });
    },

    flipLayer: (direction) => {
      const layer = activeLayer();
      if (!layer || layer.locked || layer.operations.length === 0) return;
      execute(
        transformLayerCommand(
          layer.id,
          direction === 'horizontal' ? 'flip-horizontal' : 'flip-vertical',
        ),
      );
    },

    rotateLayer: (direction) => {
      const layer = activeLayer();
      if (!layer || layer.locked || layer.operations.length === 0) return;
      execute(transformLayerCommand(layer.id, direction === 'cw' ? 'rotate-cw' : 'rotate-ccw'));
    },

    applyCrop: () => {
      const { doc, cropDraft } = get();
      if (!cropDraft) return;
      const rect = normalizeRect(cropDraft.from, cropDraft.to);
      // Clamp to the document bounds.
      const x = Math.max(0, Math.round(rect.x));
      const y = Math.max(0, Math.round(rect.y));
      const width = Math.min(doc.width - x, Math.round(rect.width));
      const height = Math.min(doc.height - y, Math.round(rect.height));
      set({ cropDraft: null });
      if (width < 1 || height < 1) return;
      if (x === 0 && y === 0 && width === doc.width && height === doc.height) return;
      execute(cropDocumentCommand(doc, { x, y, width, height }));
    },

    cancelCrop: () => set({ cropDraft: null }),

    resizeDocument: (width, height) => {
      const { doc } = get();
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      if (w === doc.width && h === doc.height) return;
      execute(resizeDocumentCommand(doc, w, h));
    },

    undo: () => {
      const next = history.undo(get().doc);
      set((s) => {
        const activeLayerId = reconcileActiveLayer(next, s.activeLayerId);
        return {
          doc: next,
          activeLayerId,
          selection: reconcileSelection(next, activeLayerId, s.selection),
          selectDraft: null,
          draft: null,
          previewOp: null,
          moveDraft: null,
          cropDraft: null,
          adjustPreview: null,
          canUndo: history.canUndo,
          canRedo: history.canRedo,
          isDirty: true,
          playing: false,
          playbackFrame: null,
        };
      });
    },

    redo: () => {
      const next = history.redo(get().doc);
      set((s) => {
        const activeLayerId = reconcileActiveLayer(next, s.activeLayerId);
        return {
          doc: next,
          activeLayerId,
          selection: reconcileSelection(next, activeLayerId, s.selection),
          selectDraft: null,
          draft: null,
          previewOp: null,
          moveDraft: null,
          cropDraft: null,
          adjustPreview: null,
          canUndo: history.canUndo,
          canRedo: history.canRedo,
          isDirty: true,
          playing: false,
          playbackFrame: null,
        };
      });
    },

    // --- Animation: frames, playback, onion skin ------------------------------

    toggleAnimation: () => {
      const { doc } = get();
      set({ playing: false, playbackFrame: null });
      execute(setAnimationEnabledCommand(doc, !isAnimated(doc)));
      // Enabling wraps the current stack in frame 1 — the active layer still
      // exists; disabling may drop it if frames were edited. Reconcile either way.
      set((s) => ({ activeLayerId: reconcileActiveLayer(get().doc, s.activeLayerId) }));
    },

    selectFrame: (id) => {
      const { doc } = get();
      const frame = doc.frames?.find((f) => f.id === id);
      if (!frame || doc.activeFrameId === id) return;
      // Navigation, not a document mutation: no history entry, no dirty flag.
      set({
        doc: { ...doc, activeFrameId: id, layers: frame.layers },
        activeLayerId: frame.layers[frame.layers.length - 1]?.id ?? '',
        selection: [],
        selectDraft: null,
        draft: null,
        previewOp: null,
        pendingText: null,
        moveDraft: null,
        cropDraft: null,
        adjustPreview: null,
        playing: false,
        playbackFrame: null,
      });
    },

    addFrame: () => {
      const { doc } = get();
      if (!doc.frames) return; // timeline is only reachable when animated
      execute(addFrameCommand(doc, blankFrame()));
      set((s) => ({ activeLayerId: reconcileActiveLayer(get().doc, s.activeLayerId) }));
    },

    duplicateFrame: () => {
      const { doc } = get();
      const active = doc.frames?.find((f) => f.id === doc.activeFrameId);
      if (!active) return;
      execute(duplicateFrameCommand(doc, cloneFrame(active), active.id));
      set((s) => ({ activeLayerId: reconcileActiveLayer(get().doc, s.activeLayerId) }));
    },

    deleteFrame: (id) => {
      const { doc } = get();
      if (!doc.frames || doc.frames.length <= 1) return;
      execute(removeFrameCommand(doc, id));
      set((s) => ({
        activeLayerId: reconcileActiveLayer(get().doc, s.activeLayerId),
        selection: [],
        selectDraft: null,
      }));
    },

    moveFrame: (id, toIndex) => {
      const { doc } = get();
      if (!doc.frames) return;
      const clamped = Math.max(0, Math.min(toIndex, doc.frames.length - 1));
      if (doc.frames.findIndex((f) => f.id === id) === clamped) return;
      execute(moveFrameCommand(doc, id, clamped));
    },

    setAnimation: (patch) =>
      set((s) => {
        const current = animationSettingsOf(s.doc);
        const next: AnimationSettings = { ...current, ...patch };
        next.fps = Math.max(MIN_FPS, Math.min(MAX_FPS, Math.round(next.fps)));
        next.onionOpacity = Math.min(1, Math.max(0, next.onionOpacity));
        // Metadata like `mode`: persisted, but undo must not touch it.
        return { doc: { ...s.doc, animation: next }, isDirty: true };
      }),

    play: () => {
      const { doc } = get();
      if (!doc.frames || doc.frames.length === 0) return;
      set({ playing: true, playbackFrame: activeFrameIndex(doc) });
    },

    pause: () => set({ playing: false, playbackFrame: null }),

    togglePlay: () => (get().playing ? get().pause() : get().play()),

    setPlaybackFrame: (index) => {
      if (get().playing) set({ playbackFrame: index });
    },

    // --- Present mode ----------------------------------------------------------

    presentNext: () =>
      set((s) => ({
        presentIndex: Math.min(s.presentIndex + 1, presentationFrames(s.doc).length - 1),
      })),

    presentPrev: () => set((s) => ({ presentIndex: Math.max(0, s.presentIndex - 1) })),

    // --- Design mode: selection ---------------------------------------------

    setSelection: (ids) => set({ selection: ids }),

    clearSelection: () => set({ selection: [], selectDraft: null }),

    setSnapping: (enabled) => set({ snappingEnabled: enabled }),

    nudgeSelection: (dx, dy) => {
      mutateSelection('Move selection', (ops, ids) => {
        const wanted = new Set(ids);
        return ops.map((op) => (wanted.has(op.id) ? translateOperation(op, dx, dy) : op));
      });
    },

    deleteSelection: () => {
      mutateSelection('Delete selection', deleteOps);
      set({ selection: [] });
    },

    duplicateSelection: () => {
      const layer = activeLayer();
      const { doc, selection } = get();
      if (!layer || layer.locked || selection.length === 0) return;
      const { ops, cloneIds } = duplicateOps(layer.operations, selection, { x: 12, y: 12 });
      execute(replaceLayerContentCommand(doc, layer.id, ops, 'Duplicate'));
      set({ selection: cloneIds });
    },

    groupSelection: () => {
      if (get().selection.length < 2) return;
      const groupId = genId('group');
      mutateSelection('Group', (ops, ids) => groupOps(ops, ids, groupId));
    },

    ungroupSelection: () => mutateSelection('Ungroup', ungroupOps),

    bringForwardSelection: () => mutateSelection('Bring forward', bringForward),

    sendBackwardSelection: () => mutateSelection('Send backward', sendBackward),

    alignSelection: (mode) => {
      if (get().selection.length < 2) return;
      mutateSelection('Align', (ops, ids) => alignOps(ops, ids, mode));
    },

    distributeSelection: (axis) => {
      if (get().selection.length < 3) return;
      mutateSelection('Distribute', (ops, ids) => distributeOps(ops, ids, axis));
    },

    createComponentFromSelection: (name) => {
      const layer = activeLayer();
      const { selection } = get();
      if (!layer || selection.length === 0) return null;
      const trimmed = name.trim();
      if (trimmed === '') return null;
      return createComponentFromOps(trimmed, selectedOps(layer, selection));
    },

    insertComponentInstance: (component, at) => {
      const { doc } = get();
      if (component.operations.length === 0) return;
      const origin = at ?? {
        x: (doc.width - component.width) / 2,
        y: (doc.height - component.height) / 2,
      };
      const ops = instantiateComponent(component, origin);
      const layer = createLayer(component.name, ops);
      execute(addLayerCommand(layer));
      set({ activeLayerId: layer.id, selection: ops.map((op) => op.id) });
    },

    zoomIn: () => set((s) => ({ zoom: nextZoomIn(s.zoom) })),
    zoomOut: () => set((s) => ({ zoom: nextZoomOut(s.zoom) })),
    setViewport: ({ zoom, offset }) =>
      set((s) => ({
        zoom: zoom !== undefined ? clampZoom(zoom) : s.zoom,
        offset: offset ?? s.offset,
      })),
    panBy: (dx, dy) => set((s) => ({ offset: panOffset(s.offset, dx, dy) })),
    setSpacePanning: (active) => set({ spacePanning: active }),
    setPointerPos: (point) => set({ pointerPos: point }),

    dismissHint: () => {
      if (get().hintDismissed) return;
      set({ hintDismissed: true });
      try {
        globalThis.localStorage?.setItem(HINT_STORAGE_KEY, '1');
      } catch {
        // storage unavailable (private mode etc.) — hint simply returns next launch
      }
    },

    markSaved: () => set({ isDirty: false }),
  };
});
