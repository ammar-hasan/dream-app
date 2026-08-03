/**
 * Core domain types for the Dream engine.
 *
 * The engine is pure TypeScript: no DOM, no React, no framework imports.
 * Everything here must stay unit-testable in Node.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Color is always a normalized '#rrggbb' hex string. See color.ts helpers. */
export type Color = string;

export type ToolId =
  | 'select'
  | 'lasso'
  | 'link'
  | 'brush'
  | 'pencil'
  | 'eraser'
  | 'spray'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'fill'
  | 'wand'
  | 'stamp'
  | 'eyedropper'
  | 'text'
  | 'move'
  | 'crop'
  | 'pan'
  | 'zoom';

/**
 * Workspace mode: 'draw' is the default MS-Paint-simple experience; 'design'
 * reveals pro features (select tool, components, alignment); 'play' turns the
 * drawing into a mini-game; 'present' turns the document's frames into a
 * full-viewport slide deck (no editing). Persisted with the document, except
 * that 'present' and 'play' are session-only — loading a document saved
 * mid-game or mid-presentation starts in 'draw'.
 * Older saved documents have no `mode` — treat as 'draw'.
 */
export type WorkspaceMode = 'draw' | 'design' | 'play' | 'present';

/** A rectangular RGBA pixel buffer extracted from a larger raster. */
export interface RasterPatch {
  x: number;
  y: number;
  width: number;
  height: number;
  /** RGBA bytes, length = width * height * 4. */
  data: Uint8ClampedArray;
}

interface OperationBase {
  id: string;
  color: Color;
  /** 0..1, multiplied with the owning layer's opacity at render time. */
  opacity: number;
  /**
   * Design mode: ops sharing a groupId on the same layer select and
   * transform as one unit. Metadata only — no scene graph.
   */
  groupId?: string;
}

/** Freehand polyline drawn by brush, pencil, eraser or spray. */
export interface StrokeOp extends OperationBase {
  kind: 'stroke';
  tool: 'brush' | 'pencil' | 'eraser' | 'spray';
  points: Point[];
  /** Stroke width in document pixels. */
  size: number;
  /**
   * Optional per-point width multiplier from pen pressure (same length as
   * `points`). Absent = uniform width — mouse/touch strokes render exactly
   * as before.
   */
  widths?: number[];
  /** Spray only: PRNG seed so the dot scatter is identical on every redraw. */
  seed?: number;
  /** Spray only: dot density (1..100). */
  density?: number;
}

export type ShapeKind = 'line' | 'rectangle' | 'ellipse';

/** Parametric shape between two corner points. */
export interface ShapeOp extends OperationBase {
  kind: 'shape';
  shape: ShapeKind;
  from: Point;
  to: Point;
  /** Outline width in document pixels. */
  size: number;
  /**
   * Rectangle/ellipse only: paint the interior with `color` instead of
   * stroking the outline. Absent/false = outline (the classic behavior).
   */
  fill?: boolean;
}

/**
 * Flood fill, baked to a raster patch at commit time (like MS Paint).
 * Baking keeps undo/redo trivial and rendering deterministic.
 */
export interface FillOp extends OperationBase {
  kind: 'fill';
  /** Where the user clicked, in document pixels. */
  origin: Point;
  patch: RasterPatch;
}

export interface TextOp extends OperationBase {
  kind: 'text';
  position: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
}

/**
 * A raster image placed on the canvas (import, or a baked filter result).
 * Like flood fill, pixels are baked into a RasterPatch so undo/redo and
 * IndexedDB serialization stay trivial (structured clone handles the bytes).
 */
export interface ImageOp extends OperationBase {
  kind: 'image';
  /** Scale factor applied to the patch at render time (1 = native size). */
  scale: number;
  /** patch.x/patch.y is the top-left corner in document pixels. */
  patch: RasterPatch;
}

export type Operation = StrokeOp | ShapeOp | FillOp | TextOp | ImageOp;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  /** 0..1 */
  opacity: number;
  locked: boolean;
  /** Bottom-to-top paint order. */
  operations: Operation[];
}

/** How an app-mode hotspot animates the move to its target frame. */
export type HotspotTransition = 'none' | 'fade' | 'slide';

/**
 * App mode: a tappable rectangle on a frame ("screen") that jumps to another
 * frame when tapped in the app preview or the exported standalone HTML.
 * Pure document data — additive and backward compatible.
 */
export interface Hotspot {
  id: string;
  /** Tap area in document pixels. */
  rect: Rect;
  targetFrameId: string;
  transition: HotspotTransition;
}

export type SlideTransition = 'none' | 'fade' | 'slide';

/** Optional presentation behavior attached to one frame/slide. */
export interface SlidePresentation {
  /** Transition used when entering this slide. */
  transition?: SlideTransition;
  /** Auto-advance delay; absent means wait for the presenter. */
  durationMs?: number;
  /** Presenter-only speaker notes shown in Presenter view. */
  notes?: string;
  /** Optional on-screen caption burned into video exports for this frame. */
  caption?: string;
}

/**
 * One animation frame (or presentation slide, or app screen): it owns its
 * own layer stack, exactly like the top-level document did before animation
 * existed. `hotspots` link frames into an interactive prototype (app mode);
 * absent on old saves.
 */
export interface Frame {
  id: string;
  /** Bottom-to-top stacking order: layers[0] is painted first. */
  layers: Layer[];
  /** App-mode links out of this screen; undefined = none. */
  hotspots?: Hotspot[];
  /** Per-frame presentation and video-delivery metadata; absent on old saves. */
  presentation?: SlidePresentation;
}

/**
 * Playback / onion-skin preferences, persisted with the document but updated
 * outside History (like `mode`): undo must never change how fast you watch
 * your flipbook. Absent on old saves — defaults apply (see animation.ts).
 */
export interface AnimationSettings {
  /** Frames per second during playback, 1..24. */
  fps: number;
  /** Loop playback (true) or stop on the last frame (false). */
  loop: boolean;
  /** Show the previous frame faintly beneath the current one. */
  onionSkin: boolean;
  /** Also ghost the NEXT frame (useful when in-betweening). */
  onionNext: boolean;
  /** 0..1 opacity of onion-skinned frames. */
  onionOpacity: number;
}

/**
 * Play mode: which layer plays which role in the mini-game. Any role left
 * undefined gets a friendly procedurally-drawn default (see game/defaults.ts).
 * Which roles a template actually uses is declared by the template itself
 * (see game/template.ts).
 */
export interface GameCast {
  /** Layer id of the character the player controls. */
  hero?: string;
  /** Layer id of a collectible (+1 point). Catch! and Dream Jumper. */
  good?: string;
  /** Layer id of the bad falling thing (-1 life). Catch! only. */
  bad?: string;
  /** Layer id drawn as gates or platforms. Flappy Dream and Dream Jumper. */
  obstacle?: string;
  /** Layer id painted as the backdrop; undefined = the rest of the document. */
  background?: string;
}

/** Play-mode difficulty knobs. */
export interface GameSettings {
  /** Base fall speed in document pixels per second. */
  fallSpeed: number;
  /** Average seconds between falling things (smaller = busier sky). */
  spawnInterval: number;
  /** Lives per run. */
  lives: number;
}

/**
 * A voice narration take for the whole document: one track, starting at time
 * 0 of the animation/presentation (per-frame tracks are deliberately out of
 * scope). The audio lives as a data URL so it persists through IndexedDB and
 * `.dream` files like any other string. Additive; absent on old saves.
 */
export interface Narration {
  /** `data:audio/webm;base64,...` (the codec depends on the recording device). */
  audio: string;
  /** Take length in milliseconds. */
  durationMs: number;
}

/**
 * The Play-mode game templates. `'catch'` is the original; old documents
 * without a `template` field resolve to it.
 */
export type GameTemplateId = 'catch' | 'flappy' | 'maze' | 'platformer';

/**
 * Play-mode setup, persisted with the document but updated outside History
 * (like `mode` and `animation`): undo must never re-cast your game. Absent on
 * old saves — defaults apply (see game/core.ts). `settings` stays undefined
 * until the user touches a knob, so kid mode can apply its gentler defaults.
 */
export interface GameSetup {
  /** Which template Play mode runs; undefined (old saves) = 'catch'. */
  template?: GameTemplateId;
  cast: GameCast;
  settings?: GameSettings;
}

export interface DreamDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  background: Color;
  /**
   * Bottom-to-top stacking order: layers[0] is painted first.
   *
   * When `frames` is present this array ALWAYS mirrors the layer stack of the
   * frame identified by `activeFrameId` — every existing command, the
   * renderer and persistence keep working on `layers` unchanged, and the
   * document helpers in document.ts write edits through to the owning frame.
   */
  layers: Layer[];
  /**
   * Animation frames in play order. `undefined` (old saves and fresh
   * documents) means animation is off and `layers` is the whole story.
   */
  frames?: Frame[];
  /** Which frame is being edited; `layers` mirrors that frame's stack. */
  activeFrameId?: string;
  /** Playback/onion-skin preferences; undefined = defaults. */
  animation?: AnimationSettings;
  /** Workspace mode persisted per project; undefined (old saves) = 'draw'. */
  mode?: WorkspaceMode;
  /** Play-mode casting + settings; undefined = friendly defaults. */
  game?: GameSetup;
  /**
   * The voice narration take; undefined = none. Updated outside History
   * (like `mode` and `animation`): undo must never delete a recording.
   */
  narration?: Narration;
  createdAt: number;
  updatedAt: number;
}

/**
 * A named, reusable group of operations in the user's component library
 * (stored in IndexedDB, shared across projects). Coordinates are relative
 * to the component's top-left corner. Instances are plain copies — editing
 * a component does NOT update already-inserted instances.
 */
export interface Component {
  id: string;
  name: string;
  /** Operations relative to (0, 0) = top-left of the content bounds. */
  operations: Operation[];
  /** Native content size in document pixels. */
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
}

/** User-adjustable settings shared by the drawing tools. */
export interface ToolSettings {
  color: Color;
  size: number;
  /** 0..1 */
  opacity: number;
  fontSize: number;
  fontFamily: string;
  /** Rectangle/ellipse: fill with the current color instead of an outline. */
  fillShapes: boolean;
  /** Spray density, 1..100. */
  density: number;
}
