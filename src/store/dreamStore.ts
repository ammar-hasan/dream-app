/**
 * Central application store (Zustand).
 *
 * The store is a thin reactive wrapper around the framework-free engine:
 * tool state machines produce operations, every mutation goes through the
 * History stack as an invertible command, and React subscribes to the result.
 */

import { create } from 'zustand';
import { createDocument, createLayer } from '../engine/document';
import {
  addLayerCommand,
  addOperationCommand,
  History,
  moveLayerCommand,
  removeLayerCommand,
  updateLayerCommand,
} from '../engine/history';
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
import type { Color, DreamDocument, Operation, Point, ToolId, ToolSettings } from '../engine/types';

const HISTORY_LIMIT = 200;
const HINT_STORAGE_KEY = 'dream:hint-dismissed';

export interface DraftState {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: DrawingTool<any>;
  state: unknown;
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
  tool: ToolId;
  settings: ToolSettings;
  draft: DraftState | null;
  previewOp: Operation | null;
  /** Document-space anchor for the in-progress text input, if any. */
  pendingText: Point | null;
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

  setTool(tool: ToolId): void;
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

  undo(): void;
  redo(): void;

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

  return {
    doc: initialDoc,
    activeLayerId: initialDoc.layers[0].id,
    tool: 'brush',
    settings: { ...DEFAULT_SETTINGS },
    draft: null,
    previewOp: null,
    pendingText: null,
    zoom: 1,
    offset: { x: 0, y: 0 },
    spacePanning: false,
    pointerPos: null,
    hintDismissed: readHintDismissed(),
    isDirty: false,
    canUndo: false,
    canRedo: false,

    setTool: (tool) => set({ tool, draft: null, previewOp: null, pendingText: null }),
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
        draft: null,
        previewOp: null,
        pendingText: null,
        zoom: 1,
        offset: { x: 0, y: 0 },
        isDirty: false,
        canUndo: false,
        canRedo: false,
      });
    },

    loadDocument: (doc) => {
      history.clear();
      set({
        doc,
        activeLayerId: doc.layers[doc.layers.length - 1]?.id ?? '',
        draft: null,
        previewOp: null,
        pendingText: null,
        zoom: 1,
        offset: { x: 0, y: 0 },
        isDirty: false,
        canUndo: false,
        canRedo: false,
      });
    },

    pointerDown: (point, event = {}) => {
      const { tool, settings } = get();
      if (tool === 'text') {
        set({ pendingText: point });
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
      const { draft, settings } = get();
      if (!draft) return;
      draft.tool.update(draft.state, { point, shiftKey: !!event.shiftKey }, settings);
      set({ previewOp: draft.tool.preview(draft.state, settings) });
    },

    pointerUp: (point, event = {}) => {
      const { draft, settings } = get();
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
      if (get().doc.layers.some((l) => l.id === id)) set({ activeLayerId: id });
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
      set((s) => ({ activeLayerId: reconcileActiveLayer(get().doc, s.activeLayerId) }));
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

    undo: () => {
      const next = history.undo(get().doc);
      set((s) => ({
        doc: next,
        activeLayerId: reconcileActiveLayer(next, s.activeLayerId),
        draft: null,
        previewOp: null,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        isDirty: true,
      }));
    },

    redo: () => {
      const next = history.redo(get().doc);
      set((s) => ({
        doc: next,
        activeLayerId: reconcileActiveLayer(next, s.activeLayerId),
        draft: null,
        previewOp: null,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
        isDirty: true,
      }));
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
