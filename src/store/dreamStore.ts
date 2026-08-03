/**
 * Central application store (Zustand).
 *
 * The store is a thin reactive wrapper around the framework-free engine:
 * tool state machines produce operations, every mutation goes through the
 * History stack as an invertible command, and React subscribes to the result.
 */

import { create } from 'zustand';
import { createDocument, createFrame, createLayer, genId } from '../engine/document';
import {
  activeFrameIndex,
  animationSettingsOf,
  blankFrame,
  cloneFrame,
  isAnimated,
  MAX_FRAME_CAPTION_LENGTH,
  presentationFrames,
  MAX_FPS,
  MIN_FPS,
} from '../engine/animation';
import {
  addFrameCommand,
  addHotspotCommand,
  addLayerCommand,
  addOperationCommand,
  addOperationsCommand,
  addStoryboardFramesCommand,
  cropDocumentCommand,
  duplicateFrameCommand,
  History,
  moveFrameCommand,
  moveLayerCommand,
  removeFrameCommand,
  removeHotspotCommand,
  removeLayerCommand,
  replaceLayerContentCommand,
  resizeDocumentCommand,
  setAnimationEnabledCommand,
  setFrameCaptionsCommand,
  setFramePresentationCommand,
  transformLayerCommand,
  translateLayerCommand,
  updateHotspotCommand,
  updateLayerCommand,
} from '../engine/history';
import { createHotspot, MIN_HOTSPOT_SIZE } from '../engine/hotspots';
import type { PixelBuffer } from '../engine/filters';
import { distance, normalizeRect, pointInRect } from '../engine/geometry';
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
  lassoSelect,
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
import { mirrorOperations, type SymmetryMode } from '../engine/symmetry';
import { createStamp, STAMP_SIZES, type StampId, type StampSize } from '../engine/stamps';
import { createStarterScene, type SceneId } from '../engine/starterScenes';
import { clampGameSettings, gameSetupOf, isGameTemplateId } from '../game/core';
import {
  createFillOperation,
  createTextOperation,
  DEFAULT_WAND_TOLERANCE,
  DRAWING_TOOLS,
  eraseMask,
  extractPatch,
  nextZoomIn,
  nextZoomOut,
  panBy as panOffset,
  clampZoom,
  stampPatch,
  wandMask,
  type DrawingTool,
  type RasterSource,
} from '../engine/tools';
import { DEFAULT_SETTINGS } from '../engine/tools/types';
import type {
  AnimationSettings,
  Color,
  Component,
  DreamDocument,
  GameCast,
  GameSettings,
  GameTemplateId,
  Hotspot,
  HotspotTransition,
  ImageOp,
  Narration,
  Operation,
  Point,
  RasterPatch,
  Rect,
  SlidePresentation,
  ToolId,
  ToolSettings,
  WorkspaceMode,
} from '../engine/types';

const HISTORY_LIMIT = 200;
const HINT_STORAGE_KEY = 'dream:hint-dismissed';
const HIGH_SCORE_PREFIX = 'dream:high-score:';
/** Selection handle size / rotate-handle offset, in screen pixels. */
const HANDLE_PX = 10;
const ROTATE_GAP_PX = 22;

/** The project's best Catch! score, persisted per project in localStorage. */
export function readHighScore(docId: string): number {
  try {
    const raw = globalThis.localStorage?.getItem(HIGH_SCORE_PREFIX + docId);
    const score = raw ? Number(raw) : 0;
    return Number.isFinite(score) && score > 0 ? Math.floor(score) : 0;
  } catch {
    return 0;
  }
}

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

/**
 * Magic-wand floating selection: the clicked region lifted out of the active
 * layer as a patch. `base` is the layer's raster with the region erased; the
 * document itself is untouched until the region is moved (bake on commit),
 * deleted, or copied to a new layer — each one undoable command.
 */
export interface WandDraft {
  layerId: string;
  base: RasterSource;
  patch: RasterPatch;
  /** Drag offset applied to the patch (document pixels). */
  offset: Point;
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

export interface StoryboardFrameInput {
  pixels: PixelBuffer;
  caption: string;
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
  /** Mirror mode: strokes/shapes commit with reflected copies (one undo). */
  symmetry: SymmetryMode;
  /** Magic-wand floating region, if any. */
  wandDraft: WandDraft | null;
  /** In-progress wand drag (pointer is down on the floating region). */
  wandDrag: { origin: Point; start: Point } | null;
  /** Wand color-match tolerance (per-channel 0..255). */
  wandTolerance: number;
  /** In-progress lasso polygon (Design mode), doc-space points. */
  lassoDraft: Point[] | null;
  /** In-progress Link-tool drag (app mode), doc-space corners. */
  linkDraft: { from: Point; to: Point } | null;
  /** Link rect awaiting the "go to frame…" dialog, if any. */
  pendingHotspot: Rect | null;
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
  /** Frame the current presentation/app preview started on (restart target). */
  presentStart: number;
  /** Present mode flavor: a slideshow, or an app preview driven by hotspots. */
  presentStyle: 'slides' | 'app';
  /** Play mode: true while a Catch! run is live (drives the Play view). */
  gameRunning: boolean;
  /** Workspace to return to when leaving Present mode. */
  lastEditMode: 'draw' | 'design';
  /** Right-side AI panel visibility (UI state, not persisted per project). */
  aiPanelOpen: boolean;
  /** Voice-first storyboard builder visibility and optional spoken seed. */
  storyboardOpen: boolean;
  storyboardPrompt: string;

  toggleAiPanel(): void;
  openStoryboard(prompt?: string): void;
  closeStoryboard(): void;

  setTool(tool: ToolId): void;
  /** Switch workspace mode; persisted with the document (not undoable). */
  setMode(mode: WorkspaceMode): void;
  /** The stamp the stamp tool will place (picker selection). */
  stamp: StampId;
  /** Stamp placement size (S/M/L). */
  stampSize: StampSize;
  setStamp(stamp: StampId): void;
  setStampSize(size: StampSize): void;
  /** Place the current stamp at a document point — ONE undoable command. */
  placeStamp(point: Point): void;
  /** Insert a coloring-book starter scene as a new layer (undoable). */
  insertStarterScene(scene: SceneId, name: string): void;
  setColor(color: Color): void;
  setSize(size: number): void;
  setOpacity(opacity: number): void;
  setFontSize(fontSize: number): void;
  setFontFamily(fontFamily: string): void;
  setFillShapes(fillShapes: boolean): void;
  setDensity(density: number): void;
  setSymmetry(symmetry: SymmetryMode): void;

  // --- Magic wand -------------------------------------------------------------
  setWandTolerance(tolerance: number): void;
  /** Start a wand selection; the viewport supplies the active layer's raster. */
  applyWandAt(point: Point, raster: RasterSource): void;
  /** Begin dragging the floating region; false when the point is outside it. */
  beginWandDrag(point: Point): boolean;
  /** Bake the floating region back (moved) — one undoable command. */
  commitWand(): void;
  /** Discard the floating region, restoring the layer as it was. */
  cancelWand(): void;
  /** Remove the region from the layer (one undoable command). */
  deleteWandRegion(): void;
  /** Copy the region onto a new layer at its current offset. */
  copyWandToLayer(): void;

  newDocument(options: NewDocumentOptions): void;
  loadDocument(doc: DreamDocument): void;

  pointerDown(point: Point, event?: { shiftKey?: boolean; pressure?: number }): void;
  pointerMove(point: Point, event?: { shiftKey?: boolean; pressure?: number }): void;
  pointerUp(point: Point, event?: { shiftKey?: boolean }): void;
  /** Commit a flood fill; the viewport supplies the active layer's raster. */
  applyFillAt(point: Point, raster: RasterSource): void;
  /** Commit the text typed at `pendingText`. */
  commitText(text: string): void;
  cancelText(): void;

  selectLayer(id: string): void;
  addLayer(): void;
  deleteLayer(id: string): void;
  /** Remove every operation on the active layer (one undoable command). */
  clearLayer(): void;
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
  applyLayerRaster(buffer: PixelBuffer, label?: string): void;
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
  /** Add a reviewed AI-painted storyboard as one undoable frame batch. */
  addStoryboardFrames(scenes: readonly StoryboardFrameInput[]): void;
  duplicateFrame(): void;
  deleteFrame(id: string): void;
  moveFrame(id: string, toIndex: number): void;
  /** Edit per-slide transition, timing and notes (one undoable command). */
  setFramePresentation(frameId: string, presentation: SlidePresentation | undefined): void;
  /** Edit frame-synchronized video captions as one undoable command. */
  setFrameCaptions(captions: readonly string[]): void;
  /** Playback/onion-skin preferences (fps, loop, onion…); not undoable. */
  setAnimation(patch: Partial<AnimationSettings>): void;
  /** Save/replace (or clear, with null) the narration take; not undoable. */
  setNarration(narration: Narration | null): void;
  /** Session toggle: play the narration track during playback/Present. */
  narrationMuted: boolean;
  setNarrationMuted(muted: boolean): void;
  play(): void;
  pause(): void;
  togglePlay(): void;
  /** Driver hook: show frame `index` while playing. */
  setPlaybackFrame(index: number): void;

  // --- Present mode ----------------------------------------------------------
  presentNext(): void;
  presentPrev(): void;
  /** App preview: jump straight to a frame (hotspot taps, restart). */
  presentGoTo(index: number): void;
  /** App preview: back to the frame the preview started on. */
  presentRestart(): void;
  /** Slideshow vs app preview; reset to 'slides' whenever Present opens. */
  setPresentStyle(style: 'slides' | 'app'): void;
  /** Open Present mode as an app preview (the "Preview app" button/voice). */
  previewApp(): void;

  // --- App mode: hotspots ------------------------------------------------------
  /** Commit the pendingHotspot rect as a link to a frame (undoable). */
  addHotspot(targetFrameId: string, transition: HotspotTransition): void;
  /** Abandon the pending link rect (dialog cancelled). */
  cancelHotspot(): void;
  /** Delete a hotspot from the active frame (undoable). */
  removeHotspot(id: string): void;
  /** Edit a hotspot's target/transition on the active frame (undoable). */
  updateHotspot(id: string, patch: Partial<Pick<Hotspot, 'targetFrameId' | 'transition'>>): void;

  // --- Play mode (game templates) -------------------------------------------
  /** Cast a layer into a game role (null = back to the default sprite). */
  setGameCast(role: keyof GameCast, layerId: string | null): void;
  /** Difficulty knobs (fall speed, spawn interval, lives); not undoable. */
  setGameSettings(patch: Partial<GameSettings>): void;
  /** Choose the game template (Catch!, Flappy Dream, Maze Runner, Dream Jumper). */
  setGameTemplate(template: GameTemplateId): void;
  /** Add a named layer for a game role and make it active; returns its id. */
  createCastLayer(name: string): string;
  startGame(): void;
  stopGame(): void;
  /** Persist the score when it beats the project's best; true on a record. */
  recordHighScore(score: number): boolean;

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
  /** Move the selection so its bounding box is centered on the canvas. */
  centerSelection(): void;

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
    stamp: 'star',
    stampSize: 'medium',
    settings: { ...DEFAULT_SETTINGS },
    draft: null,
    previewOp: null,
    pendingText: null,
    moveDraft: null,
    cropDraft: null,
    adjustPreview: null,
    symmetry: 'off',
    wandDraft: null,
    wandDrag: null,
    wandTolerance: DEFAULT_WAND_TOLERANCE,
    lassoDraft: null,
    linkDraft: null,
    pendingHotspot: null,
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
    presentStart: 0,
    presentStyle: 'slides',
    gameRunning: false,
    lastEditMode: 'draw',
    aiPanelOpen: false,
    storyboardOpen: false,
    storyboardPrompt: '',

    toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
    openStoryboard: (prompt = '') => set({ storyboardOpen: true, storyboardPrompt: prompt }),
    closeStoryboard: () => set({ storyboardOpen: false, storyboardPrompt: '' }),

    setTool: (tool) => {
      get().commitWand(); // a floating wand region settles before switching
      set({
        tool,
        draft: null,
        previewOp: null,
        pendingText: null,
        moveDraft: null,
        cropDraft: null,
        adjustPreview: null,
        wandDrag: null,
        lassoDraft: null,
        linkDraft: null,
        selection: [],
        selectDraft: null,
      });
    },

    setMode: (mode) =>
      set((s) => {
        const startIndex = Math.max(0, activeFrameIndex(s.doc));
        return {
          mode,
          // Persisted with the document but intentionally NOT undoable:
          // flipping your workspace on an undo would be jarring.
          doc: { ...s.doc, mode },
          isDirty: true,
          // Enter the mode with its natural tool; never leave a design-only
          // tool active in Draw mode, where it is hidden.
          tool:
            mode === 'design'
              ? 'select'
              : s.tool === 'select' || s.tool === 'lasso' || s.tool === 'link'
                ? 'brush'
                : s.tool,
          // Remember where to return when a presentation or game ends; start
          // the deck on the active frame and stop any playback.
          lastEditMode: mode === 'draw' || mode === 'design' ? mode : s.lastEditMode,
          presentIndex: mode === 'present' ? startIndex : s.presentIndex,
          presentStart: mode === 'present' ? startIndex : s.presentStart,
          presentStyle: 'slides',
          playing: false,
          playbackFrame: null,
          gameRunning: false,
          selection: [],
          selectDraft: null,
          draft: null,
          previewOp: null,
          pendingText: null,
          moveDraft: null,
          cropDraft: null,
          adjustPreview: null,
          wandDraft: null,
          wandDrag: null,
          lassoDraft: null,
          linkDraft: null,
          pendingHotspot: null,
        };
      }),
    setColor: (color) => set((s) => ({ settings: { ...s.settings, color } })),
    setSize: (size) => set((s) => ({ settings: { ...s.settings, size } })),
    setOpacity: (opacity) =>
      set((s) => ({ settings: { ...s.settings, opacity: Math.min(1, Math.max(0, opacity)) } })),
    setFontSize: (fontSize) => set((s) => ({ settings: { ...s.settings, fontSize } })),
    setFontFamily: (fontFamily) => set((s) => ({ settings: { ...s.settings, fontFamily } })),
    setFillShapes: (fillShapes) => set((s) => ({ settings: { ...s.settings, fillShapes } })),
    setDensity: (density) =>
      set((s) => ({ settings: { ...s.settings, density: Math.min(100, Math.max(1, density)) } })),
    setSymmetry: (symmetry) => set({ symmetry }),

    setStamp: (stamp) => set({ stamp }),
    setStampSize: (stampSize) => set({ stampSize }),

    placeStamp: (point) => {
      const layer = activeLayer();
      if (!layer || layer.locked) return;
      const ops = createStamp(get().stamp, point, STAMP_SIZES[get().stampSize]);
      execute(addOperationsCommand(layer.id, ops));
      get().dismissHint();
    },

    insertStarterScene: (scene, name) => {
      const { doc } = get();
      const ops = createStarterScene(scene, doc.width, doc.height);
      if (ops.length === 0) return;
      const layer = createLayer(name, ops);
      execute(addLayerCommand(layer));
      set({ activeLayerId: layer.id });
      get().dismissHint();
    },

    setWandTolerance: (tolerance) =>
      set({ wandTolerance: Math.min(255, Math.max(0, Math.round(tolerance))) }),

    applyWandAt: (point, raster) => {
      get().commitWand(); // settle a previous floating region first
      const layer = activeLayer();
      if (!layer || layer.locked) return;
      const mask = wandMask(raster, point, get().wandTolerance);
      const patch = mask ? extractPatch(raster, mask) : null;
      if (!mask || !patch) {
        set({ wandDraft: null, wandDrag: null });
        return;
      }
      set({
        wandDraft: {
          layerId: layer.id,
          base: eraseMask(raster, mask),
          patch,
          offset: { x: 0, y: 0 },
        },
        wandDrag: null,
      });
      get().dismissHint();
    },

    beginWandDrag: (point) => {
      const { wandDraft } = get();
      if (!wandDraft) return false;
      const rect = {
        x: wandDraft.patch.x + wandDraft.offset.x,
        y: wandDraft.patch.y + wandDraft.offset.y,
        width: wandDraft.patch.width,
        height: wandDraft.patch.height,
      };
      if (!pointInRect(point, rect)) return false;
      set({ wandDrag: { origin: point, start: { ...wandDraft.offset } } });
      return true;
    },

    commitWand: () => {
      const { doc, wandDraft } = get();
      if (!wandDraft) return;
      set({ wandDraft: null, wandDrag: null });
      const dx = Math.round(wandDraft.offset.x);
      const dy = Math.round(wandDraft.offset.y);
      if (dx === 0 && dy === 0) return; // never moved — the layer is untouched
      const layer = doc.layers.find((l) => l.id === wandDraft.layerId);
      if (!layer || layer.locked) return;
      const stamped = stampPatch(wandDraft.base, wandDraft.patch, dx, dy);
      const op: ImageOp = {
        kind: 'image',
        id: genId('op'),
        color: '#000000',
        opacity: 1,
        scale: 1,
        patch: { x: 0, y: 0, width: stamped.width, height: stamped.height, data: stamped.data },
      };
      execute(replaceLayerContentCommand(doc, layer.id, [op], 'Move region'));
    },

    cancelWand: () => set({ wandDraft: null, wandDrag: null }),

    deleteWandRegion: () => {
      const { doc, wandDraft } = get();
      if (!wandDraft) return;
      set({ wandDraft: null, wandDrag: null });
      const layer = doc.layers.find((l) => l.id === wandDraft.layerId);
      if (!layer || layer.locked) return;
      const op: ImageOp = {
        kind: 'image',
        id: genId('op'),
        color: '#000000',
        opacity: 1,
        scale: 1,
        patch: {
          x: 0,
          y: 0,
          width: wandDraft.base.width,
          height: wandDraft.base.height,
          data: wandDraft.base.data,
        },
      };
      execute(replaceLayerContentCommand(doc, layer.id, [op], 'Delete region'));
    },

    copyWandToLayer: () => {
      const { wandDraft } = get();
      if (!wandDraft) return;
      const op: ImageOp = {
        kind: 'image',
        id: genId('op'),
        color: '#000000',
        opacity: 1,
        scale: 1,
        patch: {
          ...wandDraft.patch,
          x: Math.round(wandDraft.patch.x + wandDraft.offset.x),
          y: Math.round(wandDraft.patch.y + wandDraft.offset.y),
        },
      };
      const layer = createLayer(`Region ${get().doc.layers.length + 1}`, [op]);
      execute(addLayerCommand(layer));
      set({ wandDraft: null, wandDrag: null, activeLayerId: layer.id });
    },

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
        wandDraft: null,
        wandDrag: null,
        lassoDraft: null,
        linkDraft: null,
        pendingHotspot: null,
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
        presentStart: 0,
        presentStyle: 'slides',
        gameRunning: false,
        lastEditMode: 'draw',
      });
    },

    loadDocument: (doc) => {
      history.clear();
      // Saves from before slice 3 have no mode; 'present' and 'play' are
      // session-only, so a project saved mid-game/mid-presentation reopens
      // in Draw.
      const mode = doc.mode === 'present' || doc.mode === 'play' ? 'draw' : (doc.mode ?? 'draw');
      set((s) => ({
        doc: { ...doc, mode },
        activeLayerId: doc.layers[doc.layers.length - 1]?.id ?? '',
        mode,
        tool: mode === 'draw' && (s.tool === 'select' || s.tool === 'link') ? 'brush' : s.tool,
        draft: null,
        previewOp: null,
        pendingText: null,
        moveDraft: null,
        cropDraft: null,
        adjustPreview: null,
        wandDraft: null,
        wandDrag: null,
        lassoDraft: null,
        linkDraft: null,
        pendingHotspot: null,
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
        presentStart: 0,
        presentStyle: 'slides',
        gameRunning: false,
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
      if (tool === 'lasso') {
        const layer = activeLayer();
        if (!layer || layer.locked) {
          set({ selection: [] });
          return;
        }
        if (!event.shiftKey) set({ selection: [] });
        set({ lassoDraft: [point] });
        return;
      }
      if (tool === 'link') {
        // Hotspots connect frames — without an animation there is nothing
        // to link to, so the drag is ignored (the panel explains why).
        if (!get().doc.frames) return;
        set({ linkDraft: { from: point, to: point } });
        return;
      }
      if (tool === 'text') {
        set({ pendingText: point });
        return;
      }
      if (tool === 'stamp') {
        // Click-to-place: no drag gesture, one undo per stamp.
        get().placeStamp(point);
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
      const state = machine.begin(
        { point, shiftKey: !!event.shiftKey, pressure: event.pressure },
        settings,
      );
      set({ draft: { tool: machine, state }, previewOp: machine.preview(state, settings) });
    },

    pointerMove: (point, event = {}) => {
      set({ pointerPos: point });
      const {
        draft,
        settings,
        moveDraft,
        cropDraft,
        selectDraft,
        lassoDraft,
        linkDraft,
        wandDrag,
        wandDraft,
      } = get();
      if (lassoDraft) {
        set({ lassoDraft: [...lassoDraft, point] });
        return;
      }
      if (linkDraft) {
        set({ linkDraft: { ...linkDraft, to: point } });
        return;
      }
      if (wandDrag && wandDraft) {
        set({
          wandDraft: {
            ...wandDraft,
            offset: {
              x: wandDrag.start.x + point.x - wandDrag.origin.x,
              y: wandDrag.start.y + point.y - wandDrag.origin.y,
            },
          },
        });
        return;
      }
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
      draft.tool.update(
        draft.state,
        { point, shiftKey: !!event.shiftKey, pressure: event.pressure },
        settings,
      );
      set({ previewOp: draft.tool.preview(draft.state, settings) });
    },

    pointerUp: (point, event = {}) => {
      const {
        draft,
        settings,
        moveDraft,
        cropDraft,
        selectDraft,
        lassoDraft,
        linkDraft,
        wandDrag,
      } = get();
      if (linkDraft) {
        set({ linkDraft: null });
        const rect = normalizeRect(linkDraft.from, point);
        // Tiny drags are slips; a real rect opens the "go to frame…" dialog.
        if (rect.width >= MIN_HOTSPOT_SIZE && rect.height >= MIN_HOTSPOT_SIZE) {
          set({ pendingHotspot: rect });
        }
        return;
      }
      if (lassoDraft) {
        set({ lassoDraft: null });
        const layer = activeLayer();
        if (!layer || lassoDraft.length < 3) return;
        const ids = expandSelectionWithGroups(
          layer.operations,
          lassoSelect(layer.operations, lassoDraft).map((op) => op.id),
        );
        set((s) => ({
          selection: event.shiftKey
            ? [...s.selection, ...ids.filter((id) => !s.selection.includes(id))]
            : ids,
        }));
        return;
      }
      // The wand region stays floating after the drag so Delete / copy still apply.
      if (wandDrag) {
        set({ wandDrag: null });
        return;
      }
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
        // Mirror mode: the op and its reflected copies land as ONE command,
        // so a single undo removes the whole symmetric gesture.
        const { doc, symmetry } = get();
        const ops = mirrorOperations(op, symmetry, { width: doc.width, height: doc.height });
        execute(addOperationsCommand(get().activeLayerId, ops));
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
        set({
          activeLayerId: id,
          selection: [],
          selectDraft: null,
          wandDraft: null,
          wandDrag: null,
        });
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

    clearLayer: () => {
      const layer = activeLayer();
      if (!layer || layer.locked || layer.operations.length === 0) return;
      execute(replaceLayerContentCommand(get().doc, layer.id, [], 'Clear layer'));
      set({ selection: [], selectDraft: null });
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

    applyLayerRaster: (buffer, label = 'Apply filter') => {
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
      execute(replaceLayerContentCommand(get().doc, layer.id, [op], label));
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
          wandDraft: null,
          wandDrag: null,
          lassoDraft: null,
          linkDraft: null,
          pendingHotspot: null,
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
          wandDraft: null,
          wandDrag: null,
          lassoDraft: null,
          linkDraft: null,
          pendingHotspot: null,
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

    addStoryboardFrames: (scenes) => {
      const { doc } = get();
      const frames = scenes
        .filter(({ pixels }) => pixels.width > 0 && pixels.height > 0)
        .map(({ pixels, caption }, index) => {
          const scale = Math.min(doc.width / pixels.width, doc.height / pixels.height);
          const op: ImageOp = {
            kind: 'image',
            id: genId('op'),
            color: '#000000',
            opacity: 1,
            scale,
            patch: {
              x: Math.round((doc.width - pixels.width * scale) / 2),
              y: Math.round((doc.height - pixels.height * scale) / 2),
              width: pixels.width,
              height: pixels.height,
              data: pixels.data,
            },
          };
          const frame = createFrame([createLayer(caption.trim() || `Story ${index + 1}`, [op])]);
          const cleanCaption = caption.trim().slice(0, MAX_FRAME_CAPTION_LENGTH);
          return cleanCaption ? { ...frame, presentation: { caption: cleanCaption } } : frame;
        });
      if (frames.length === 0) return;
      set({ playing: false, playbackFrame: null });
      execute(addStoryboardFramesCommand(doc, frames));
      get().dismissHint();
      set((state) => ({
        activeLayerId: reconcileActiveLayer(get().doc, state.activeLayerId),
        selection: [],
        selectDraft: null,
      }));
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

    setFramePresentation: (frameId, presentation) => {
      const { doc } = get();
      const current = doc.frames?.find((frame) => frame.id === frameId)?.presentation;
      if (!doc.frames?.some((frame) => frame.id === frameId)) return;
      if (
        current?.transition === presentation?.transition &&
        current?.durationMs === presentation?.durationMs &&
        current?.notes === presentation?.notes &&
        current?.caption === presentation?.caption
      ) {
        return;
      }
      execute(setFramePresentationCommand(doc, frameId, presentation));
    },

    setFrameCaptions: (captions) => {
      const { doc } = get();
      if (!doc.frames) return;
      const updates = doc.frames.map((frame, index) => ({
        frameId: frame.id,
        caption: captions[index]?.trim() || undefined,
      }));
      if (
        updates.every(
          ({ frameId, caption }) =>
            doc.frames?.find((frame) => frame.id === frameId)?.presentation?.caption === caption,
        )
      ) {
        return;
      }
      execute(setFrameCaptionsCommand(doc, updates));
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

    setNarration: (narration) =>
      set((s) => ({
        // Metadata like `mode` and `animation`: persisted, but undo must
        // never delete or resurrect a recording.
        doc: narration === null ? { ...s.doc, narration: undefined } : { ...s.doc, narration },
        isDirty: true,
      })),

    narrationMuted: false,

    setNarrationMuted: (muted) => set({ narrationMuted: muted }),

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

    presentGoTo: (index) =>
      set((s) => ({
        presentIndex: Math.max(0, Math.min(index, presentationFrames(s.doc).length - 1)),
      })),

    presentRestart: () => set((s) => ({ presentIndex: s.presentStart })),

    setPresentStyle: (style) => set({ presentStyle: style }),

    previewApp: () => {
      get().setMode('present');
      set({ presentStyle: 'app' });
    },

    // --- App mode: hotspots ------------------------------------------------------

    addHotspot: (targetFrameId, transition) => {
      const { doc, pendingHotspot } = get();
      const frameId = doc.activeFrameId;
      set({ pendingHotspot: null });
      if (!pendingHotspot || !frameId) return;
      if (!doc.frames?.some((f) => f.id === targetFrameId)) return;
      execute(addHotspotCommand(frameId, createHotspot(pendingHotspot, targetFrameId, transition)));
    },

    cancelHotspot: () => set({ pendingHotspot: null }),

    removeHotspot: (id) => {
      const { doc } = get();
      const frameId = doc.activeFrameId;
      if (!frameId) return;
      execute(removeHotspotCommand(doc, frameId, id));
    },

    updateHotspot: (id, patch) => {
      const { doc } = get();
      const frameId = doc.activeFrameId;
      if (!frameId) return;
      execute(updateHotspotCommand(doc, frameId, id, patch));
    },

    // --- Play mode (game templates) ------------------------------------------

    setGameCast: (role, layerId) =>
      set((s) => {
        const cast = { ...s.doc.game?.cast };
        if (layerId) cast[role] = layerId;
        else delete cast[role];
        // Metadata like `mode`: persisted, but undo must never re-cast.
        // `settings` and `template` are carried through untouched.
        return {
          doc: { ...s.doc, game: { ...s.doc.game, cast } },
          isDirty: true,
        };
      }),

    setGameSettings: (patch) =>
      set((s) => {
        const setup = gameSetupOf(s.doc);
        const settings = clampGameSettings({ ...setup.settings, ...patch });
        return { doc: { ...s.doc, game: { ...s.doc.game, ...setup, settings } }, isDirty: true };
      }),

    setGameTemplate: (template) =>
      set((s) => {
        if (!isGameTemplateId(template) || gameSetupOf(s.doc).template === template) return {};
        return {
          doc: {
            ...s.doc,
            game: { cast: { ...s.doc.game?.cast }, settings: s.doc.game?.settings, template },
          },
          isDirty: true,
        };
      }),

    createCastLayer: (name) => {
      const layer = createLayer(name);
      execute(addLayerCommand(layer));
      set({ activeLayerId: layer.id });
      return layer.id;
    },

    startGame: () => set({ gameRunning: true }),
    stopGame: () => set({ gameRunning: false }),

    recordHighScore: (score) => {
      const best = readHighScore(get().doc.id);
      const rounded = Math.max(0, Math.floor(score));
      if (rounded <= best) return false;
      try {
        globalThis.localStorage?.setItem(HIGH_SCORE_PREFIX + get().doc.id, String(rounded));
      } catch {
        // storage unavailable — the record simply doesn't persist
      }
      return true;
    },

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

    centerSelection: () => {
      const layer = activeLayer();
      const { doc, selection } = get();
      if (!layer || layer.locked || selection.length === 0) return;
      const bounds = selectionUnionBounds(layer.operations, selection);
      if (!bounds) return;
      const dx = Math.round(doc.width / 2 - (bounds.x + bounds.width / 2));
      const dy = Math.round(doc.height / 2 - (bounds.y + bounds.height / 2));
      if (dx === 0 && dy === 0) return;
      mutateSelection('Center selection', (ops, ids) => {
        const wanted = new Set(ids);
        return ops.map((op) => (wanted.has(op.id) ? translateOperation(op, dx, dy) : op));
      });
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
